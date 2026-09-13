'use server';

import { revalidatePath } from 'next/cache';
import { failure, type ActionResult } from '@/lib/action-result';
import {
  createTrainingGround,
  deleteTrainingGround,
  updateTrainingGround,
  type TrainingGroundInput,
} from '@/lib/data';
import { isSessionSport } from '@/types';

/** Mirrors the check constraint on training_grounds.elevation. */
function parseElevation(raw: string): number[] {
  const parts = raw
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return [];
  if (parts.length < 2 || parts.length > 64) {
    throw new Error('The elevation profile needs between 2 and 64 numbers.');
  }

  return parts.map((part) => {
    const value = Number(part);
    if (!Number.isFinite(value)) throw new Error(`"${part}" is not a number.`);
    if (value < 0 || value > 1) {
      throw new Error('Elevation values must be between 0 and 1.');
    }
    return Math.round(value * 1000) / 1000;
  });
}

/** Route points, submitted as a JSON array from the waypoint editor. */
function parseWaypoints(raw: string): { lat: number; lng: number }[] {
  if (!raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The route points could not be read. Re-add them and try again.');
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(
      (p): p is { lat: number; lng: number } =>
        typeof p === 'object' &&
        p !== null &&
        Number.isFinite((p as { lat: unknown }).lat) &&
        Number.isFinite((p as { lng: unknown }).lng),
    )
    .slice(0, 25)
    .map((p) => ({ lat: p.lat, lng: p.lng }));
}

/** Three label/value pairs, submitted as stat-label-0, stat-value-0, and so on. */
function parseStats(formData: FormData) {
  const stats: { label: string; value: string }[] = [];
  for (let i = 0; i < 6; i += 1) {
    const label = String(formData.get(`stat-label-${i}`) ?? '').trim();
    const value = String(formData.get(`stat-value-${i}`) ?? '').trim();
    // A row with only one half filled in is a mistake worth naming.
    if (label && !value) throw new Error(`Stat "${label}" has no value.`);
    if (!label && value) throw new Error(`A stat value "${value}" has no label.`);
    if (label && value) stats.push({ label: label.slice(0, 40), value: value.slice(0, 40) });
  }
  return stats;
}

function readForm(formData: FormData): TrainingGroundInput {
  const sport = String(formData.get('sport') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const subtitle = String(formData.get('subtitle') ?? '').trim();
  const gpx = String(formData.get('gpx') ?? '').trim();
  const strava = String(formData.get('strava') ?? '').trim();
  const latRaw = String(formData.get('lat') ?? '').trim();
  const lngRaw = String(formData.get('lng') ?? '').trim();
  const positionRaw = String(formData.get('position') ?? '0').trim();

  if (!isSessionSport(sport)) throw new Error('Pick a sport.');
  if (!title) throw new Error('Give the ground a name.');
  if (title.length > 80) throw new Error('That name is too long.');
  if (!subtitle) throw new Error('Add a location line.');
  if (subtitle.length > 160) throw new Error('That location line is too long.');

  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;
  if (lat !== null && !Number.isFinite(lat)) throw new Error('That latitude is not a number.');
  if (lng !== null && !Number.isFinite(lng)) throw new Error('That longitude is not a number.');

  const position = Number(positionRaw);

  return {
    sport,
    title,
    subtitle,
    stats: parseStats(formData),
    elevation: parseElevation(String(formData.get('elevation') ?? '')),
    waypoints: parseWaypoints(String(formData.get('waypoints') ?? '')),
    gpx: gpx || null,
    strava: strava || null,
    lat,
    lng,
    position: Number.isFinite(position) ? position : 0,
    active: formData.get('active') === 'on',
  };
}

function revalidateGroundSurfaces() {
  // The cards render on the landing page; the manager lives in admin.
  revalidatePath('/');
  revalidatePath('/admin/grounds');
}

export async function createGroundAction(formData: FormData): Promise<ActionResult> {
  try {
    await createTrainingGround(readForm(formData));
    revalidateGroundSurfaces();
    return { ok: true, message: 'Training ground added.' };
  } catch (error) {
    return failure(error);
  }
}

export async function updateGroundAction(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await updateTrainingGround(id, readForm(formData));
    revalidateGroundSurfaces();
    return { ok: true, message: 'Training ground saved.' };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteGroundAction(id: string): Promise<ActionResult> {
  try {
    await deleteTrainingGround(id);
    revalidateGroundSurfaces();
    return { ok: true, message: 'Training ground removed.' };
  } catch (error) {
    return failure(error);
  }
}
