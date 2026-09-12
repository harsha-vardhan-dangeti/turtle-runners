import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { HAS_STRAVA, SITE_URL } from '@/lib/env';
import { getCurrentProfile } from '@/lib/data';
import { STRAVA_STATE_COOKIE, stravaAuthorizeUrl } from '@/lib/strava/client';

/**
 * Starts the Strava OAuth flow.
 *
 * The `state` nonce is generated here and stored in an httpOnly cookie so the
 * callback can prove the response belongs to a flow this browser actually
 * started. Without it, an attacker can hand the member a crafted callback URL
 * and bind their own Strava account to the member's profile.
 */
export async function GET() {
  const base = SITE_URL.replace(/\/$/, '');

  if (!HAS_STRAVA) {
    return NextResponse.redirect(`${base}/dashboard?strava=unconfigured`);
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.redirect(`${base}/dashboard`);
  }

  const state = randomBytes(32).toString('hex');
  const response = NextResponse.redirect(stravaAuthorizeUrl(state));

  response.cookies.set(STRAVA_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: base.startsWith('https://'),
    path: '/',
    maxAge: 10 * 60,
  });

  return response;
}
