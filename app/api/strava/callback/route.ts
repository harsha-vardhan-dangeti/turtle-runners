import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentProfile } from '@/lib/data';
import { HAS_STRAVA, SITE_URL } from '@/lib/env';
import { STRAVA_STATE_COOKIE, exchangeCode } from '@/lib/strava/client';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { sealToken } from '@/lib/strava/tokens';

/** Constant-time compare, so the nonce check cannot be probed by timing. */
function sameNonce(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Completes the Strava OAuth flow.
 *
 * Order matters here: the `state` nonce is verified against the cookie BEFORE
 * the authorization code is exchanged. Checking afterwards would still have
 * burned the code and contacted Strava on an unverified request.
 */
export async function GET(request: NextRequest) {
  const base = SITE_URL.replace(/\/$/, '');
  const back = (status: string) => NextResponse.redirect(`${base}/dashboard?strava=${status}`);

  if (!HAS_STRAVA) return back('unconfigured');

  const params = request.nextUrl.searchParams;

  // The member pressed Cancel on Strava's consent screen.
  if (params.get('error')) return back('cancelled');

  const code = params.get('code');
  const state = params.get('state');
  const expected = request.cookies.get(STRAVA_STATE_COOKIE)?.value;

  if (!code || !state || !expected || !sameNonce(state, expected)) {
    return back('badstate');
  }

  const profile = await getCurrentProfile();
  if (!profile) return back('signedout');

  try {
    const tokens = await exchangeCode(code);
    const athlete = tokens.athlete;

    if (!athlete?.id) return back('failed');

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from('strava_connections').upsert(
      {
        user_id: profile.id,
        athlete_id: athlete.id,
        athlete_name: [athlete.firstname, athlete.lastname].filter(Boolean).join(' ') || null,
        athlete_avatar: athlete.profile ?? null,
        // Encrypted before they leave the app. See lib/strava/tokens.ts.
        access_token: sealToken(tokens.access_token, profile.id),
        refresh_token: sealToken(tokens.refresh_token, profile.id),
        expires_at: new Date(tokens.expires_at * 1000).toISOString(),
        scope: params.get('scope') ?? '',
      },
      { onConflict: 'user_id' },
    );

    // A unique violation here means this Strava athlete is already bound to a
    // different member, which is a real conflict rather than a transient error.
    if (error) return back(error.code === '23505' ? 'inuse' : 'failed');

    const response = back('connected');
    response.cookies.delete(STRAVA_STATE_COOKIE);
    return response;
  } catch {
    return back('failed');
  }
}
