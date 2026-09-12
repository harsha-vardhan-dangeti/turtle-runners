/**
 * Place search for the admin location picker.
 *
 * Uses Photon (photon.komoot.io), an OpenStreetMap-backed geocoder built for
 * type-ahead search. It needs no API key and no billing account, which is the
 * whole reason it is here — see the note in the README about swapping in
 * Google Places or a self-hosted Photon if coverage is not good enough.
 *
 * This module is the only place that knows which provider is in use.
 */

export interface PlaceResult {
  id: string;
  /** Short label: "Gachibowli Athletics Stadium" */
  name: string;
  /** Everything after the name: "Gachibowli, Hyderabad, Telangana" */
  description: string;
  lat: number;
  lng: number;
}

/** Results are ranked around the club, so local places come first. */
const BIAS = { lat: 17.4239, lng: 78.3898 };

const ENDPOINT = 'https://photon.komoot.io/api/';

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, unknown>;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Builds "street, district, city, state" without duplicates or empty gaps. */
function describe(properties: Record<string, unknown>): string {
  const parts = [
    [text(properties.housenumber), text(properties.street)].filter(Boolean).join(' ') || null,
    text(properties.district),
    text(properties.city) ?? text(properties.county),
    text(properties.state),
    text(properties.country),
  ].filter((part): part is string => Boolean(part));

  const seen = new Set<string>();
  return parts
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(', ');
}

export class PlaceSearchError extends Error {}

/**
 * Searches for a place. Throws PlaceSearchError with a message worth showing
 * to the admin when the upstream service is unreachable or slow.
 */
export async function searchPlaces(query: string, limit = 6): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const url = new URL(ENDPOINT);
  url.searchParams.set('q', q);
  url.searchParams.set('lat', String(BIAS.lat));
  url.searchParams.set('lon', String(BIAS.lng));
  url.searchParams.set('limit', String(Math.min(limit, 10)));
  url.searchParams.set('lang', 'en');

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        // Identifies the app to the geocoder, as their usage policy asks.
        'User-Agent': 'TurtleRunners/1.0 (club web app)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 3600 },
    });
  } catch {
    throw new PlaceSearchError('Place search is not responding. Try again, or paste coordinates.');
  }

  if (!response.ok) {
    throw new PlaceSearchError('Place search failed. Try again, or paste coordinates.');
  }

  const body = (await response.json()) as { features?: PhotonFeature[] };

  const results: PlaceResult[] = [];
  // Photon returns several OSM objects for one real place — the lake polygon,
  // a node, two halves of a bridge. Rows that read identically are noise an
  // admin cannot choose between, so the first of each label wins.
  const seen = new Set<string>();

  for (const feature of body.features ?? []) {
    const coordinates = feature.geometry?.coordinates;
    const properties = feature.properties ?? {};
    if (!coordinates || coordinates.length < 2) continue;

    const [lng, lat] = coordinates;
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;

    const name = text(properties.name) ?? text(properties.street) ?? text(properties.city);
    if (!name) continue;

    const id = `${properties.osm_type ?? 'p'}${properties.osm_id ?? `${lat},${lng}`}`;
    const description = describe(properties);
    const fingerprint = `${name}|${description}`.toLowerCase();
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);

    results.push({
      id,
      name,
      description,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    });
  }

  return results;
}
