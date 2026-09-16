import 'server-only';

import { IS_DEMO } from '@/lib/env';
import {
  demoStravaConnection,
  demoStravaOverview,
  demoStravaSync,
  disconnectDemoStrava,
} from '@/lib/demo/strava';
import { getTrainingGrounds, requireProfile } from '@/lib/data';
import { fetchActivitiesSince, fetchAthlete, fetchAthleteStats } from '@/lib/strava/client';
import { mapActivity, matchGround, toGearSummary, toSportTotals } from '@/lib/strava/map';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type {
  StravaConnectionSummary,
  StravaOverview,
  StravaSyncResult,
} from '@/lib/strava/types';

/** How far back a first-time sync reaches. */
const FIRST_SYNC_DAYS = 180;
/** Re-sync overlap, so an activity edited just after a sync is still picked up. */
const OVERLAP_MINUTES = 60;

/**
 * The member's connection, display fields only.
 *
 * This is the ONLY function that reads strava_connections on behalf of the UI,
 * and it deliberately never selects the token columns. Nothing that returns to
 * a component should be able to carry a credential by accident.
 */
export async function getStravaConnection(): Promise<StravaConnectionSummary | null> {
  const profile = await requireProfile();

  if (IS_DEMO) return demoStravaConnection(profile.id);

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('strava_connections')
    .select('athlete_id, athlete_name, athlete_avatar, last_synced_at, created_at')
    .eq('user_id', profile.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    athleteId: data.athlete_id,
    athleteName: data.athlete_name,
    athleteAvatar: data.athlete_avatar,
    lastSyncedAt: data.last_synced_at,
    connectedAt: data.created_at,
  };
}

/**
 * One member's connection, for the admin member view. Display columns only,
 * exactly like getStravaConnection: tokens never leave this file.
 */
export async function getStravaConnectionForMember(
  userId: string,
): Promise<StravaConnectionSummary | null> {
  const admin = await requireProfile();
  if (admin.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) return demoStravaConnection(userId);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('strava_connections')
    .select('athlete_id, athlete_name, athlete_avatar, last_synced_at, created_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    athleteId: data.athlete_id,
    athleteName: data.athlete_name,
    athleteAvatar: data.athlete_avatar,
    lastSyncedAt: data.last_synced_at,
    connectedAt: data.created_at,
  };
}

/** Year-to-date totals, all-time records and gear. */
export async function getStravaOverview(): Promise<StravaOverview | null> {
  const profile = await requireProfile();

  if (IS_DEMO) return demoStravaOverview(profile.id);

  const connection = await getStravaConnection();
  if (!connection) return null;

  const [stats, athlete] = await Promise.all([
    fetchAthleteStats(profile.id, connection.athleteId),
    fetchAthlete(profile.id),
  ]);

  return {
    connection,
    ytd: {
      run: toSportTotals(stats.ytd_run_totals),
      bike: toSportTotals(stats.ytd_ride_totals),
      swim: toSportTotals(stats.ytd_swim_totals),
    },
    allTime: {
      run: toSportTotals(stats.all_run_totals),
      bike: toSportTotals(stats.all_ride_totals),
      swim: toSportTotals(stats.all_swim_totals),
    },
    records: {
      biggestRideKm: stats.biggest_ride_distance
        ? Math.round(stats.biggest_ride_distance / 100) / 10
        : null,
      biggestClimbM: stats.biggest_climb_elevation_gain
        ? Math.round(stats.biggest_climb_elevation_gain)
        : null,
    },
    gear: [...toGearSummary(athlete.shoes, 'shoes'), ...toGearSummary(athlete.bikes, 'bike')].sort(
      (a, b) => b.km - a.km,
    ),
  };
}

/**
 * Pulls recent activities and writes them into `sessions`.
 *
 * Idempotent by design: rows are upserted on strava_activity_id, which carries
 * a partial unique index. Running this twice imports nothing the second time
 * rather than duplicating the member's whole history.
 */
export async function syncStrava(): Promise<StravaSyncResult> {
  const profile = await requireProfile();

  if (IS_DEMO) return demoStravaSync(profile.id);

  const connection = await getStravaConnection();
  if (!connection) throw new Error('STRAVA_NOT_CONNECTED');

  const since = connection.lastSyncedAt
    ? new Date(connection.lastSyncedAt).getTime() - OVERLAP_MINUTES * 60 * 1000
    : Date.now() - FIRST_SYNC_DAYS * 24 * 60 * 60 * 1000;

  const activities = await fetchActivitiesSince(profile.id, Math.floor(since / 1000));

  // Every ground, including hidden ones: a member's run still happened at the
  // lake even if the card is off the landing page this month.
  const grounds = await getTrainingGrounds(true).catch(() => []);

  const rows = [];
  let skipped = 0;

  for (const activity of activities) {
    const mapped = mapActivity(activity);
    if (!mapped) {
      skipped += 1;
      continue;
    }
    const { start, ...row } = mapped;
    rows.push({
      ...row,
      user_id: profile.id,
      note: null,
      source: 'strava' as const,
      ground_id: matchGround({ sport: mapped.sport, start }, grounds),
    });
  }

  const admin = createSupabaseAdminClient();

  if (rows.length > 0) {
    const { error } = await admin
      .from('sessions')
      .upsert(rows, { onConflict: 'strava_activity_id' });
    if (error) throw new Error(error.message);
  }

  const { error: stampError } = await admin
    .from('strava_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', profile.id);
  if (stampError) throw new Error(stampError.message);

  return { imported: rows.length, updated: 0, skipped };
}

/**
 * Removes the connection and every session it imported.
 *
 * Manually logged sessions are untouched. Leaving orphaned Strava rows behind
 * would keep inflating the member's totals after they disconnected, which is
 * not what "disconnect" means to anyone.
 */
export async function disconnectStrava(): Promise<void> {
  const profile = await requireProfile();

  if (IS_DEMO) {
    disconnectDemoStrava(profile.id);
    return;
  }

  const admin = createSupabaseAdminClient();

  const { error: sessionError } = await admin
    .from('sessions')
    .delete()
    .eq('user_id', profile.id)
    .eq('source', 'strava');
  if (sessionError) throw new Error(sessionError.message);

  const { error } = await admin.from('strava_connections').delete().eq('user_id', profile.id);
  if (error) throw new Error(error.message);
}
