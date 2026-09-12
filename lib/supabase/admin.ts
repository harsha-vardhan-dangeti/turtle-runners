import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Service role Supabase client. Bypasses Row Level Security entirely.
 *
 * This exists for exactly one reason: `strava_connections` holds live OAuth
 * bearer tokens, so it has RLS enabled with no policies and is unreachable via
 * the anon key. Reading it requires the service role.
 *
 * Rules for this file:
 *   * `server-only` above makes importing it from a client component a build
 *     error rather than a leak.
 *   * Never return a token from a function that a client component can call.
 *   * Prefer createSupabaseServerClient() for anything else. RLS is the app's
 *     actual protection and this client throws it away.
 */
export function createSupabaseAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('STRAVA_NOT_CONFIGURED');
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
