'use client';

import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Browser-side Supabase client. Only ever used for the OAuth handshake and
 * sign-out; all reads and writes go through server actions in lib/data.ts.
 */
export function createSupabaseBrowserClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or run with NEXT_PUBLIC_DEMO=true.',
    );
  }
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
