import 'server-only';

import {
  SITE_URL,
  STRAVA_CALLBACK_ORIGIN,
  STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET,
} from '@/lib/env';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type {
  StravaActivity,
  StravaAthlete,
  StravaAthleteStats,
  StravaTokenResponse,
} from '@/lib/strava/types';

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API = 'https://www.strava.com/api/v3';

/**
 * activity:read_all includes activities the member marked private. Without it
 * a member's private morning run silently never imports, which reads as a bug.
 */
const SCOPE = 'read,activity:read_all';

/** Refresh this far before the token actually dies, to absorb clock skew. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export const STRAVA_REDIRECT_PATH = '/api/strava/callback';

/**
 * Holds the OAuth `state` nonce between /connect and /callback.
 *
 * Lives here rather than in the route file because a Next.js route module may
 * only export route handlers and a fixed set of config values; exporting a
 * constant from one type-checks in dev but fails `next build`.
 */
export const STRAVA_STATE_COOKIE = 'tr_strava_state';

export function stravaRedirectUri(): string {
  // STRAVA_CALLBACK_ORIGIN wins when set: it names the domain Strava's own
  // settings still point at. See lib/env.ts.
  const origin = STRAVA_CALLBACK_ORIGIN || SITE_URL;
  return `${origin.replace(/\/$/, '')}${STRAVA_REDIRECT_PATH}`;
}

export function stravaAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: stravaRedirectUri(),
    response_type: 'code',
    approval_prompt: 'auto',
    scope: SCOPE,
    state,
  });
  return `${STRAVA_AUTH_URL}?${params.toString()}`;
}

/**
 * Turns a Strava error response into something a member can read.
 * A raw 429 stack trace in a toast helps nobody.
 */
async function stravaError(response: Response): Promise<Error> {
  if (response.status === 429) {
    return new Error('Strava is rate limiting us right now. Try again in a few minutes.');
  }
  if (response.status === 401) {
    return new Error('STRAVA_UNAUTHORIZED');
  }
  let detail = '';
  try {
    detail = (await response.text()).slice(0, 200);
  } catch {
    // Body already consumed or unreadable; the status alone will do.
  }
  return new Error(`Strava request failed (${response.status}). ${detail}`.trim());
}

async function postToken(body: Record<string, string>): Promise<StravaTokenResponse> {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      ...body,
    }),
    cache: 'no-store',
  });

  if (!response.ok) throw await stravaError(response);
  return (await response.json()) as StravaTokenResponse;
}

/** Exchanges the one-time code from the callback for a token pair. */
export function exchangeCode(code: string): Promise<StravaTokenResponse> {
  return postToken({ code, grant_type: 'authorization_code' });
}

function refreshTokens(refreshToken: string): Promise<StravaTokenResponse> {
  return postToken({ refresh_token: refreshToken, grant_type: 'refresh_token' });
}

interface StoredConnection {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  athlete_id: number;
}

/**
 * Returns a usable access token for this member, refreshing and persisting a
 * new pair when the current one is close to expiring.
 *
 * Strava access tokens last about six hours, so refresh is not an edge case —
 * it is the normal path for anyone who connected yesterday.
 */
export async function getValidAccessToken(
  userId: string,
): Promise<{ token: string; athleteId: number }> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from('strava_connections')
    .select('access_token, refresh_token, expires_at, athlete_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('STRAVA_NOT_CONNECTED');

  const connection = data as StoredConnection;
  const expiresAt = new Date(connection.expires_at).getTime();

  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > REFRESH_MARGIN_MS) {
    return { token: connection.access_token, athleteId: connection.athlete_id };
  }

  const refreshed = await refreshTokens(connection.refresh_token);
  await admin
    .from('strava_connections')
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
    })
    .eq('user_id', userId);

  return { token: refreshed.access_token, athleteId: connection.athlete_id };
}

/**
 * Calls the Strava API for a member. On a 401 it refreshes once and retries,
 * which covers a token revoked or expired between our check and the call.
 */
async function stravaFetch<T>(userId: string, path: string, retry = true): Promise<T> {
  const { token } = await getValidAccessToken(userId);

  const response = await fetch(`${STRAVA_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (response.status === 401 && retry) {
    // Force the refresh path by expiring our stored copy, then try once more.
    const admin = createSupabaseAdminClient();
    await admin
      .from('strava_connections')
      .update({ expires_at: new Date(0).toISOString() })
      .eq('user_id', userId);
    return stravaFetch<T>(userId, path, false);
  }

  if (!response.ok) throw await stravaError(response);
  return (await response.json()) as T;
}

/** Strava caps page size at 200. */
const PER_PAGE = 100;
/** Hard ceiling per sync, so one member cannot drain the app's rate limit. */
const MAX_PAGES = 5;

/**
 * Activities after the given instant, newest pages first.
 * `after` is Unix seconds, per Strava's API.
 */
export async function fetchActivitiesSince(
  userId: string,
  afterUnixSeconds: number,
): Promise<StravaActivity[]> {
  const all: StravaActivity[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const batch = await stravaFetch<StravaActivity[]>(
      userId,
      `/athlete/activities?after=${afterUnixSeconds}&page=${page}&per_page=${PER_PAGE}`,
    );

    all.push(...batch);
    // A short page means we have reached the end; stop rather than spend calls.
    if (batch.length < PER_PAGE) break;
  }

  return all;
}

export function fetchAthlete(userId: string): Promise<StravaAthlete> {
  return stravaFetch<StravaAthlete>(userId, '/athlete');
}

export function fetchAthleteStats(userId: string, athleteId: number): Promise<StravaAthleteStats> {
  return stravaFetch<StravaAthleteStats>(userId, `/athletes/${athleteId}/stats`);
}
