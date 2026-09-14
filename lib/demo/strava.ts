import { demoState } from '@/lib/demo/store';
import { addDays, istToday } from '@/lib/time';
import type {
  StravaConnectionSummary,
  StravaOverview,
  StravaSyncResult,
} from '@/lib/strava/types';
import type { SessionSport, TrainingSession } from '@/types';

/**
 * Demo mode's Strava stand-in.
 *
 * Lets the whole connect, sync and disconnect flow be demonstrated with no
 * Strava application, no tokens and no network. Kept on globalThis for the
 * same reason as the rest of the demo store: it must survive hot reloads.
 */

interface DemoStravaState {
  connected: Set<string>;
  syncedAt: Map<string, string>;
}

const globalForStrava = globalThis as typeof globalThis & {
  __turtleDemoStrava?: DemoStravaState;
};

function state(): DemoStravaState {
  if (!globalForStrava.__turtleDemoStrava) {
    globalForStrava.__turtleDemoStrava = { connected: new Set(), syncedAt: new Map() };
  }
  return globalForStrava.__turtleDemoStrava;
}

export function connectDemoStrava(userId: string): void {
  state().connected.add(userId);
}

export function disconnectDemoStrava(userId: string): void {
  state().connected.delete(userId);
  state().syncedAt.delete(userId);

  const store = demoState();
  store.sessions = store.sessions.filter(
    (session) => !(session.user_id === userId && session.source === 'strava'),
  );
}

export function demoStravaConnection(userId: string): StravaConnectionSummary | null {
  if (!state().connected.has(userId)) return null;

  const profile = demoState().profiles.find((item) => item.id === userId);
  return {
    athleteId: 1234567,
    athleteName: profile?.name ?? 'Demo Athlete',
    athleteAvatar: null,
    lastSyncedAt: state().syncedAt.get(userId) ?? null,
    connectedAt: new Date().toISOString(),
  };
}

const DEMO_ACTIVITIES: { sport: SessionSport; title: string; distance_m: number; duration_s: number }[] =
  [
    { sport: 'run', title: 'Morning loop at the lake', distance_m: 10200, duration_s: 3180 },
    { sport: 'bike', title: 'ORR spin', distance_m: 42000, duration_s: 5400 },
    { sport: 'swim', title: 'Pool session', distance_m: 1800, duration_s: 2400 },
    { sport: 'run', title: 'Easy shakeout', distance_m: 5400, duration_s: 1860 },
  ];

export function demoStravaSync(userId: string): StravaSyncResult {
  if (!state().connected.has(userId)) throw new Error('STRAVA_NOT_CONNECTED');

  const store = demoState();
  let imported = 0;

  DEMO_ACTIVITIES.forEach((activity, index) => {
    const activityId = 900000 + index;
    const already = store.sessions.some((s) => s.strava_activity_id === activityId);
    if (already) return;

    const session: TrainingSession = {
      id: `ses-strava-${userId.slice(0, 8)}-${activityId}`,
      user_id: userId,
      date: addDays(istToday(), -index),
      sport: activity.sport,
      title: activity.title,
      distance_m: activity.distance_m,
      duration_s: activity.duration_s,
      note: null,
      source: 'strava',
      strava_activity_id: activityId,
      ground_id: null,
      created_at: new Date().toISOString(),
    };
    store.sessions.push(session);
    imported += 1;
  });

  state().syncedAt.set(userId, new Date().toISOString());
  return { imported, updated: 0, skipped: 0 };
}

export function demoStravaOverview(userId: string): StravaOverview | null {
  const connection = demoStravaConnection(userId);
  if (!connection) return null;

  return {
    connection,
    ytd: {
      run: { count: 84, km: 712.4, hours: 68.2 },
      bike: { count: 41, km: 1480.9, hours: 61.5 },
      swim: { count: 26, km: 48.3, hours: 21.4 },
    },
    allTime: {
      run: { count: 512, km: 4188.6, hours: 402.1 },
      bike: { count: 233, km: 8740.2, hours: 351.8 },
      swim: { count: 140, km: 260.7, hours: 118.9 },
    },
    records: { biggestRideKm: 128.4, biggestClimbM: 1140 },
    gear: [
      { id: 'b1', name: 'Canyon Endurace', km: 4820.5, primary: true, kind: 'bike' },
      { id: 'g1', name: 'Nike Pegasus 40', km: 642.3, primary: true, kind: 'shoes' },
      { id: 'g2', name: 'Saucony Endorphin', km: 281.7, primary: false, kind: 'shoes' },
    ],
  };
}
