/**
 * Environment surface for the whole app.
 *
 * NEXT_PUBLIC_* values are inlined at build time, so these constants are safe
 * to import from both server and client components.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const HAS_SUPABASE = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/** Explicit demo flag, or an implicit fallback when no keys are configured. */
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === 'true' || !HAS_SUPABASE;

/**
 * Service role key. Bypasses Row Level Security, so it is server-only and must
 * never gain a NEXT_PUBLIC_ prefix. Used solely by lib/supabase/admin.ts to
 * reach strava_connections, which no client is allowed to read.
 */
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID ?? '';
export const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET ?? '';

/**
 * Encrypts Strava tokens at rest: 32 random bytes, base64. Server-only, like
 * the service role key, and deliberately kept out of Supabase so a database
 * dump alone holds no usable token. Generate with `openssl rand -base64 32`.
 * Changing it means every member reconnects Strava. See lib/strava/tokens.ts.
 */
export const STRAVA_TOKEN_KEY = process.env.STRAVA_TOKEN_KEY?.trim() ?? '';

/**
 * Strava is only wired up when the app can call it and store the tokens
 * safely. Without the encryption key it stays off rather than falling back
 * to storing tokens in the clear.
 */
export const HAS_STRAVA =
  STRAVA_CLIENT_ID.length > 0 &&
  STRAVA_CLIENT_SECRET.length > 0 &&
  SUPABASE_SERVICE_ROLE_KEY.length > 0 &&
  // 32 bytes in base64. A regex rather than Buffer: this module is also
  // bundled for the browser, where the key is empty and Buffer is absent.
  /^[A-Za-z0-9+/]{43}=$/.test(STRAVA_TOKEN_KEY);

/**
 * Where Strava sends members back after they approve.
 *
 * Strava allows a single Authorization Callback Domain per application, and
 * it rejects any redirect_uri outside it. When the site moves, the app keeps
 * working by asking Strava for the domain Strava still knows: set this to
 * that origin, and the move's redirect carries the callback to the new
 * address. Unset once Strava's own setting names the current domain.
 */
export const STRAVA_CALLBACK_ORIGIN = process.env.STRAVA_CALLBACK_ORIGIN?.trim() || '';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
