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
  /** Where it started, when Strava recorded it. Used to match a ground. */
  start: { lat: number; lng: number } | null;
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

  const latlng = activity.start_latlng;
  const start =
    Array.isArray(latlng) && latlng.length === 2 && Number.isFinite(latlng[0]) && Number.isFinite(latlng[1])
      ? { lat: latlng[0], lng: latlng[1] }
      : null;

  return {
    strava_activity_id: activity.id,
    date,
    sport,
    title: title.slice(0, 120),
    distance_m,
    duration_s,
    start,
  };
}

/** Metres between two coordinates. Haversine; good to a few metres locally. */
export function metresBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * The ground an activity most likely happened at, or null.
 *
 * Deliberately conservative. A wrong match quietly attributes someone's run to
 * the wrong place and corrupts that ground's stats, which is worse than no
 * match at all. Sport must agree, and the start must be within the radius.
 */
export function matchGround<T extends { id: string; sport: SessionSport; lat: number | null; lng: number | null }>(
  activity: { sport: SessionSport; start: { lat: number; lng: number } | null },
  grounds: T[],
  radiusM = 600,
): string | null {
  if (!activity.start) return null;

  let best: { id: string; d: number } | null = null;
  for (const ground of grounds) {
    if (ground.sport !== activity.sport) continue;
    if (ground.lat === null || ground.lng === null) continue;
    const d = metresBetween(activity.start, { lat: ground.lat, lng: ground.lng });
    if (d <= radiusM && (!best || d < best.d)) best = { id: ground.id, d };
  }
  return best?.id ?? null;
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
