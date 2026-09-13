import type { Pin } from '@/lib/maps';

/**
 * Elevation profiles for training grounds.
 *
 * Uses Open-Meteo's elevation endpoint, which needs no API key and no billing
 * account — the same reasoning that put Photon in lib/places.ts rather than
 * Google Places. Google's Elevation API would need a card on file for what is
 * a handful of lookups a year.
 *
 * This module is the only place that knows which provider is in use.
 */

const ENDPOINT = 'https://api.open-meteo.com/v1/elevation';

/** Open-Meteo accepts up to 100 coordinates per request. */
const MAX_SAMPLES = 100;
/** What the SVG line is drawn from; matches the built-in defaults. */
export const DEFAULT_SAMPLES = 12;

export class ElevationError extends Error {}

/**
 * Walks the waypoints and returns `count` evenly spaced points along them.
 *
 * Straight lines between waypoints, which is why the admin form asks for
 * several rather than just a start and an end: two points across Durgam
 * Cheruvu would sample the middle of the lake.
 */
export function samplePath(waypoints: Pin[], count: number): Pin[] {
  if (waypoints.length < 2) return waypoints.slice();

  // Cumulative distance along the path, in plain degrees. Good enough for
  // spacing samples; we are not measuring the route, only spreading points.
  const legs: number[] = [];
  let total = 0;
  for (let i = 1; i < waypoints.length; i += 1) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    if (!prev || !curr) continue;
    const d = Math.hypot(curr.lng - prev.lng, curr.lat - prev.lat);
    legs.push(d);
    total += d;
  }

  const first = waypoints[0];
  if (!first) return [];
  // Every waypoint on top of another: nothing to interpolate.
  if (total === 0) return [first];

  const out: Pin[] = [];
  for (let s = 0; s < count; s += 1) {
    const target = (total * s) / (count - 1);
    let walked = 0;
    let leg = 0;
    while (leg < legs.length - 1 && walked + (legs[leg] ?? 0) < target) {
      walked += legs[leg] ?? 0;
      leg += 1;
    }
    const legLength = legs[leg] ?? 0;
    const along = legLength === 0 ? 0 : (target - walked) / legLength;
    const a = waypoints[leg];
    const b = waypoints[leg + 1];
    if (!a || !b) continue;
    out.push({
      lat: a.lat + (b.lat - a.lat) * along,
      lng: a.lng + (b.lng - a.lng) * along,
    });
  }
  return out;
}

/**
 * Scales raw metres to the 0-1 range the SVG line expects.
 *
 * Min-max rather than absolute: Hyderabad sits around 500m, so absolute values
 * would draw every route as a flat line near the top. A genuinely flat route
 * (a pool) has no range to scale, so it becomes a centred line.
 */
export function normalise(metres: number[]): number[] {
  if (metres.length === 0) return [];
  const min = Math.min(...metres);
  const max = Math.max(...metres);
  const span = max - min;
  if (span < 0.5) return metres.map(() => 0.5);

  return metres.map((m) => {
    // Kept off the very edges so the stroke is never clipped by the viewBox.
    const scaled = 0.08 + ((m - min) / span) * 0.84;
    return Math.round(scaled * 1000) / 1000;
  });
}

export interface ElevationProfile {
  /** Normalised 0-1 values, ready for the elevation field. */
  points: number[];
  /** Real metres, so the form can offer a "Gain 42 m" stat. */
  metres: number[];
  gainM: number;
  minM: number;
  maxM: number;
}

/** Fetches and normalises an elevation profile along the given waypoints. */
export async function fetchProfile(
  waypoints: Pin[],
  samples = DEFAULT_SAMPLES,
): Promise<ElevationProfile> {
  if (waypoints.length < 2) {
    throw new ElevationError('Add at least two points along the route.');
  }

  const count = Math.max(2, Math.min(samples, MAX_SAMPLES));
  const path = samplePath(waypoints, count);
  if (path.length < 2) {
    throw new ElevationError('Those points are all in the same place.');
  }

  const url = `${ENDPOINT}?latitude=${path.map((p) => p.lat.toFixed(5)).join(',')}&longitude=${path
    .map((p) => p.lng.toFixed(5))
    .join(',')}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new ElevationError('Could not reach the elevation service. Try again in a moment.');
  }

  if (!response.ok) {
    throw new ElevationError(`The elevation service returned ${response.status}.`);
  }

  const body = (await response.json()) as { elevation?: unknown };
  const metres = Array.isArray(body.elevation)
    ? body.elevation.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    : [];

  if (metres.length < 2) {
    throw new ElevationError('The elevation service returned nothing usable for those points.');
  }

  // Total climb, counting only the ups — the number a cyclist recognises.
  let gain = 0;
  for (let i = 1; i < metres.length; i += 1) {
    const step = (metres[i] ?? 0) - (metres[i - 1] ?? 0);
    if (step > 0) gain += step;
  }

  return {
    points: normalise(metres),
    metres,
    gainM: Math.round(gain),
    minM: Math.round(Math.min(...metres)),
    maxM: Math.round(Math.max(...metres)),
  };
}
