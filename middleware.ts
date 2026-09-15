import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { HAS_SUPABASE, IS_DEMO, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

/** The club's address. */
const PRIMARY_HOST = 'turtlerunners.vercel.app';
/**
 * Earlier addresses, kept alive as permanent redirects so shared links and
 * subscribed calendar feeds (webcal://…/calendar.ics) follow the move.
 */
const LEGACY_HOSTS = new Set(['turtle-runners.vercel.app']);

/**
 * Sends the old address to the new one, then keeps the Supabase auth cookie
 * fresh on every request. Without the refresh, an expired access token is
 * never renewed for Server Components. Demo mode has no Supabase session, so
 * it short-circuits after the redirect check.
 */
export async function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.toLowerCase();
  if (host && LEGACY_HOSTS.has(host)) {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.host = PRIMARY_HOST;
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

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
