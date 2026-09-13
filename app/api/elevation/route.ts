import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/data';
import { ElevationError, fetchProfile } from '@/lib/elevation';
import type { Pin } from '@/lib/maps';

/** Refuse silly requests before they reach the upstream service. */
const MAX_WAYPOINTS = 25;

/**
 * Proxy for the admin elevation lookup.
 *
 * Admin-gated for the same reason as the places proxy: without the check this
 * is an open elevation service running on our quota and our IP.
 */
export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }

  let waypoints: Pin[];
  let samples: number | undefined;
  try {
    const body = await request.json();
    waypoints = Array.isArray(body?.waypoints) ? body.waypoints : [];
    samples = typeof body?.samples === 'number' ? body.samples : undefined;
  } catch {
    return NextResponse.json({ error: 'Could not read that request.' }, { status: 400 });
  }

  const clean = waypoints
    .filter(
      (p): p is Pin =>
        typeof p?.lat === 'number' &&
        typeof p?.lng === 'number' &&
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lng) &&
        Math.abs(p.lat) <= 90 &&
        Math.abs(p.lng) <= 180,
    )
    .slice(0, MAX_WAYPOINTS);

  if (clean.length < 2) {
    return NextResponse.json({ error: 'Add at least two points along the route.' }, { status: 400 });
  }

  try {
    const profileData = await fetchProfile(clean, samples);
    return NextResponse.json(profileData);
  } catch (error) {
    const message =
      error instanceof ElevationError ? error.message : 'Elevation lookup failed. Try again.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
