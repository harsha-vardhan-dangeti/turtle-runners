'use server';

import { revalidatePath } from 'next/cache';
import { failure, type ActionResult } from '@/lib/action-result';
import { clearSessionChange, setSessionChange } from '@/lib/data';
import { parsePin } from '@/lib/maps';
import { formatDate } from '@/lib/time';

function revalidateChangeSurfaces() {
  // The next-session card, the schedule rows, "your week" and the attendee
  // lists all show the change; the calendar routes are rendered per request.
  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/admin/schedule');
}

export async function setSessionChangeAction(
  sessionId: string,
  occursOn: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occursOn)) throw new Error('Pick a date.');
    const status = String(formData.get('status') ?? '');
    if (status !== 'cancelled' && status !== 'moved') throw new Error('Choose cancel or move.');

    const reason = String(formData.get('reason') ?? '').trim().slice(0, 200) || null;

    if (status === 'cancelled') {
      await setSessionChange(sessionId, occursOn, {
        status,
        reason,
        new_time: null,
        new_location: null,
        new_lat: null,
        new_lng: null,
      });
      revalidateChangeSurfaces();
      return { ok: true, message: `Cancelled for ${formatDate(occursOn)}.` };
    }

    const time = String(formData.get('new_time') ?? '').trim();
    const location = String(formData.get('new_location') ?? '').trim().slice(0, 160);
    const pin = location ? parsePin(String(formData.get('new_pin') ?? '')) : null;
    if (time && !/^\d{2}:\d{2}/.test(time)) throw new Error('Pick a new start time.');
    if (!time && !location) throw new Error('A move needs a new time, a new place, or both.');

    await setSessionChange(sessionId, occursOn, {
      status,
      reason,
      new_time: time ? time.slice(0, 5) : null,
      new_location: location || null,
      new_lat: pin?.lat ?? null,
      new_lng: pin?.lng ?? null,
    });
    revalidateChangeSurfaces();
    return { ok: true, message: `Moved for ${formatDate(occursOn)}.` };
  } catch (error) {
    return failure(error);
  }
}

export async function clearSessionChangeAction(sessionId: string, occursOn: string): Promise<ActionResult> {
  try {
    await clearSessionChange(sessionId, occursOn);
    revalidateChangeSurfaces();
    return { ok: true, message: `${formatDate(occursOn)} is back to normal.` };
  } catch (error) {
    return failure(error);
  }
}
