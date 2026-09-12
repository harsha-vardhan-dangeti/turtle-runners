import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/data';
import { PlaceSearchError, searchPlaces } from '@/lib/places';

/**
 * Proxy for the location picker's place search.
 *
 * Admin-gated on purpose: without the check this endpoint would be an open
 * geocoding proxy that anyone could point at the upstream service using our
 * server's quota and IP. It also keeps the admin's own IP out of the request.
 */
export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }

  const query = new URL(request.url).searchParams.get('q') ?? '';
  if (query.trim().length < 3) {
    return NextResponse.json({ results: [] });
  }
  if (query.length > 120) {
    return NextResponse.json({ error: 'That search is too long.' }, { status: 400 });
  }

  try {
    const results = await searchPlaces(query);
    return NextResponse.json(
      { results },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    );
  } catch (error) {
    const message =
      error instanceof PlaceSearchError
        ? error.message
        : 'Place search failed. Try again, or paste coordinates.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
