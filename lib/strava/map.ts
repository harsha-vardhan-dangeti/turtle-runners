import type { SessionSport } from '@/types';
import type {
  StravaActivity,
  StravaGear,
  StravaGearSummary,
  StravaSportTotals,
  StravaTotals,
} from '@/lib/strava/types';

/**
 * Strava activity type to the club's three sports.
 *
 * Anything not listed is deliberately absent rather than defaulted. Walks,
 * hikes, yoga and gym work are real training, but they are not triathlon
 * volume and would distort the weekly rings and the club distance totals.
 */
const SPORT_BY_STRAVA_TYPE: Record<string, SessionSport> = {
  Run: 'run',
  TrailRun: 'run',
  VirtualRun: 'run',
  Treadmill: 'run',
  Ride: 'bike',
  VirtualRide: 'bike',
  GravelRide: 'bike',
  MountainBikeRide: 'bike',
  EBikeRide: 'bike',
  Handcycle: 'bike',
  Velomobile: 'bike',
  Swim: 'swim',
};

/** The sport this activity counts as, or null if it does not count. */
export function sportForActivity(activity: StravaActivity): SessionSport | null {
  // sport_type is the current field; type is the legacy one older activities carry.
  const key = activity.sport_type ?? activity.type ?? '';
  return SPORT_BY_STRAVA_TYPE[key] ?? null;
}

/**
 * The session's date, taken from the athlete's local clock.
 *
 * start_date_local is already shifted into the athlete's timezone, so slicing
 * the date off it is correct. Parsing it as a Date and formatting in UTC would
 * push a 5:45am Hyderabad run back onto the previous day.
 */
export function localDate(activity: StravaActivity): string {
  return activity.start_date_local.slice(0, 10);
}

/** Mirrors the check constraints on public.sessions. */
const MIN_DISTANCE_M = 1;
const MAX_DISTANCE_M = 1_000_000;
const MIN_DURATION_S = 1;
const MAX_DURATION_S = 200_000;

export interface MappedActivity {
  strava_activity_id: number;
  date: string;
  sport: SessionSport;
  title: string;
  distance_m: number;
  duration_s: number;
}

/**
 * Turns a Strava activity into a session row, or null if it should be skipped.
 *
 * Returning null rather than clamping is deliberate: an activity that falls
 * outside the column constraints is not a session we can represent honestly,
 * and inserting a clamped version would quietly corrupt the member's totals.
 */
export function mapActivity(activity: StravaActivity): MappedActivity | null {
  const sport = sportForActivity(activity);
  if (!sport) return null;

  const distance_m = Math.round(activity.distance);
  const duration_s = Math.round(activity.moving_time);

  if (!Number.isFinite(distance_m) || distance_m < MIN_DISTANCE_M) return null;
  if (!Number.isFinite(duration_s) || duration_s < MIN_DURATION_S) return null;
  if (distance_m > MAX_DISTANCE_M || duration_s > MAX_DURATION_S) return null;

  const date = localDate(activity);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const title = (activity.name ?? '').trim() || 'Strava activity';

  return {
    strava_activity_id: activity.id,
    date,
    sport,
    title: title.slice(0, 120),
    distance_m,
    duration_s,
  };
}

function round(value: number, places = 1): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function toSportTotals(totals: StravaTotals | undefined): StravaSportTotals {
  if (!totals) return { count: 0, km: 0, hours: 0 };
  return {
    count: totals.count ?? 0,
    km: round((totals.distance ?? 0) / 1000),
    hours: round((totals.moving_time ?? 0) / 3600),
  };
}

export function toGearSummary(gear: StravaGear[] | undefined, kind: 'shoes' | 'bike') {
  return (gear ?? []).map(
    (item): StravaGearSummary => ({
      id: item.id,
      name: item.name,
      km: round((item.distance ?? 0) / 1000),
      primary: Boolean(item.primary),
      kind,
    }),
  );
}
