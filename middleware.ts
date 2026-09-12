import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { HAS_SUPABASE, IS_DEMO, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

/**
 * Keeps the Supabase auth cookie fresh on every request. Without this, an
 * expired access token is never refreshed for Server Components.
 * Demo mode has no Supabase session, so it short-circuits.
 */
export async function middleware(request: NextRequest) {
  if (IS_DEMO || !HAS_SUPABASE) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|routes/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|gpx)$).*)'],
};
