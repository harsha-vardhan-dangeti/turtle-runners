import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { HAS_SUPABASE, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Server-side Supabase client bound to the request's auth cookies.
 * Every query it makes is subject to Row Level Security — that, not any
 * check in this codebase, is what actually protects the data.
 */
export async function createSupabaseServerClient() {
  if (!HAS_SUPABASE) {
    throw new Error('Supabase environment variables are missing.');
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: the middleware refreshes the
          // session cookie instead, so this is safe to ignore.
        }
      },
    },
  });
}
