import { NextResponse } from 'next/server';
import { HAS_SUPABASE } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Google redirects here after consent. We exchange the code for a session
 * cookie, make sure a profile row exists, then send the member on.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error_description') ?? searchParams.get('error');
  const next = searchParams.get('next') ?? '/dashboard';

  // Behind a proxy (Vercel), origin is the internal host.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const base =
    process.env.NODE_ENV === 'development' || !forwardedHost
      ? origin
      : `${forwardedProto}://${forwardedHost}`;

  if (!HAS_SUPABASE) {
    return NextResponse.redirect(`${base}/auth/error?reason=not-configured`);
  }

  if (oauthError) {
    return NextResponse.redirect(
      `${base}/auth/error?reason=${encodeURIComponent(oauthError)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${base}/auth/error?reason=missing-code`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${base}/auth/error?reason=${encodeURIComponent(error.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const metadata = user.user_metadata ?? {};
    const name =
      (typeof metadata.full_name === 'string' && metadata.full_name) ||
      (typeof metadata.name === 'string' && metadata.name) ||
      user.email?.split('@')[0] ||
      'Turtle';

    // The auth trigger normally handles this; the upsert covers projects
    // created before the trigger existed. Role is never set here.
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        name,
        avatar_url: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );
  }

  const safeNext = next.startsWith('/') ? next : '/dashboard';
  return NextResponse.redirect(`${base}${safeNext}`);
}
