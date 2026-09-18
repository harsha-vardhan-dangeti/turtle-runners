'use server';

import { revalidatePath } from 'next/cache';
import { deleteSession, logSession } from '@/lib/data';
import { failure, type ActionResult } from '@/lib/action-result';
import { MAX_SPEED_MS, parseDuration } from '@/lib/stats';
import { istToday } from '@/lib/time';
import { isSessionSport } from '@/types';

function revalidateTrainingSurfaces() {
  revalidatePath('/dashboard');
  // The club stats band on the landing page is a live sum of these.
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function logSessionAction(formData: FormData): Promise<ActionResult> {
  try {
    const sport = String(formData.get('sport') ?? '');
    const date = String(formData.get('date') ?? '');
    const title = String(formData.get('title') ?? '').trim();
    const distanceRaw = String(formData.get('distance') ?? '').trim();
    const durationRaw = String(formData.get('duration') ?? '').trim();
    const note = String(formData.get('note') ?? '').trim();
    // Optional. lib/data.ts checks it is a real ground for this sport.
    const groundId = String(formData.get('ground_id') ?? '').trim() || null;

    if (!isSessionSport(sport)) throw new Error('Pick a sport.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Pick a date.');
    if (date > istToday()) throw new Error('That date is in the future.');
    if (!title) throw new Error('Give the session a name.');

    const distance = Number(distanceRaw);
    if (!Number.isFinite(distance) || distance <= 0) throw new Error('How far did you go?');

    // Swims are entered in metres, everything else in kilometres.
    const distance_m = Math.round(sport === 'swim' ? distance : distance * 1000);
    if (distance_m < 1) throw new Error('That distance is too small to log.');
    if (distance_m > 1000000) throw new Error('That is over 1000 km — check the distance.');

    const duration_s = parseDuration(durationRaw);
    if (distance_m / duration_s > MAX_SPEED_MS[sport]) {
      throw new Error('That is faster than anyone has ever gone. Check the distance and the time.');
    }

    await logSession({
      date,
      sport,
      title: title.slice(0, 120),
      distance_m,
      duration_s,
      note: note ? note.slice(0, 500) : null,
      ground_id: groundId,
    });

    revalidateTrainingSurfaces();
    return { ok: true, message: 'Logged. Nice work.' };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteSessionAction(id: string): Promise<ActionResult> {
  try {
    await deleteSession(id);
    revalidateTrainingSurfaces();
    return { ok: true, message: 'Session removed.' };
  } catch (error) {
    return failure(error);
  }
}
