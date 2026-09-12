/**
 * Map links, without a Google Maps API key.
 *
 * Every session can carry a precise pin (lat/lng). When it does not, we fall
 * back to searching its location text, and finally to the club's home base —
 * so the map and the directions button always point somewhere sensible, and
 * never at the wrong side of the city.
 */

export interface MapPlace {
  lat?: number | null;
  lng?: number | null;
  location?: string | null;
}

/** Where the club meets when a session says nothing more specific. */
export const CLUB_HOME_QUERY = 'Durgam Cheruvu Lake Front Park, Hyderabad';

/** Appended to bare location text so "ORR service roads" resolves locally. */
const CITY_HINT = 'Hyderabad';

export function hasPin(place: MapPlace): boolean {
  return typeof place.lat === 'number' && typeof place.lng === 'number';
}

/** The `q=` value: precise coordinates when we have them, else a text search. */
export function mapQuery(place: MapPlace): string {
  if (hasPin(place)) return `${place.lat},${place.lng}`;

  const text = place.location?.trim();
  if (!text) return CLUB_HOME_QUERY;

  return text.toLowerCase().includes(CITY_HINT.toLowerCase()) ? text : `${text}, ${CITY_HINT}`;
}

/** Keyless embed — no API key, no billing account. */
export function mapEmbedSrc(place: MapPlace): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(mapQuery(place))}&output=embed`;
}

/** Universal cross-platform directions deep link. */
export function mapDirectionsUrl(place: MapPlace): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    mapQuery(place),
  )}`;
}

export interface Pin {
  lat: number;
  lng: number;
}

function validate(lat: number, lng: number): Pin {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Those coordinates are not numbers.');
  }
  if (lat < -90 || lat > 90) throw new Error('Latitude has to be between -90 and 90.');
  if (lng < -180 || lng > 180) throw new Error('Longitude has to be between -180 and 180.');
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

const SHORT_LINK = /(maps\.app\.goo\.gl|goo\.gl\/maps)/i;

/**
 * Accepts what an admin can realistically paste:
 *   17.4239, 78.3898
 *   https://www.google.com/maps/place/…/@17.4239,78.3898,17z/…
 *   https://www.google.com/maps?q=17.4239,78.3898
 *   …!3d17.4239!4d78.3898
 *
 * Returns null for empty input (which clears the pin) and throws a message
 * the admin can act on for anything it cannot read.
 */
export function parsePin(input: string): Pin | null {
  const text = input.trim();
  if (!text) return null;

  if (SHORT_LINK.test(text)) {
    throw new Error(
      'Short Google Maps links cannot be read. Open it, then copy the full link from the address bar — or paste the coordinates.',
    );
  }

  // Place URLs: .../@17.4239,78.3898,17z/...
  const at = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) return validate(Number(at[1]), Number(at[2]));

  // Google's internal place markers: !3d<lat>!4d<lng>
  const marker = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (marker) return validate(Number(marker[1]), Number(marker[2]));

  // Query parameters: ?q= / &query= / &destination=
  const param = text.match(
    /[?&](?:q|query|destination)=(-?\d+(?:\.\d+)?)(?:%2C|,)\s*(-?\d+(?:\.\d+)?)/i,
  );
  if (param) return validate(Number(param[1]), Number(param[2]));

  // Bare coordinates.
  const bare = text.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (bare) return validate(Number(bare[1]), Number(bare[2]));

  throw new Error(
    'Could not find coordinates in that. Paste a Google Maps link, or coordinates like 17.4239, 78.3898.',
  );
}

/** "17.4239, 78.3898" for display next to the field. */
export function formatPin(place: MapPlace): string | null {
  return hasPin(place) ? `${place.lat}, ${place.lng}` : null;
}
