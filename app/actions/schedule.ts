'use server';

import { revalidatePath } from 'next/cache';
import {
  createWeeklySession,
  deleteWeeklySession,
  updateWeeklySession,
  type WeeklySessionInput,
} from '@/lib/data';
import { failure, type ActionResult } from '@/lib/action-result';
import { parsePin } from '@/lib/maps';
import { isEventType } from '@/types';

function revalidateScheduleSurfaces() {
  // The schedule drives the landing page list, the ticker and the countdown
  // fallback, so everything public has to be rebuilt.
  revalidatePath('/');
  revalidatePath('/admin/schedule');
  revalidatePath('/admin');
}

function parseWeeklySession(formData: FormData): WeeklySessionInput {
  const isoDow = Number(formData.get('iso_dow'));
  const title = String(formData.get('title') ?? '').trim();
  const type = String(formData.get('type') ?? '');
  const time = String(formData.get('time') ?? '');
  const location = String(formData.get('location') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const paceGroups = String(formData.get('pace_groups') ?? '');
  const pin = parsePin(String(formData.get('pin') ?? ''));

  if (!Number.isInteger(isoDow) || isoDow < 1 || isoDow > 7) throw new Error('Pick a day.');
  if (!title) throw new Error('Give the session a title.');
  if (!isEventType(type)) throw new Error('Pick a session type.');
  if (!/^\d{2}:\d{2}/.test(time)) throw new Error('Pick a start time.');
  if (!location) throw new Error('Where is everyone meeting?');

  return {
    iso_dow: isoDow,
    title: title.slice(0, 120),
    type,
    time: time.slice(0, 5),
    location: location.slice(0, 160),
    lat: pin?.lat ?? null,
    lng: pin?.lng ?? null,
    note: note ? note.slice(0, 500) : null,
    pace_groups: paceGroups
      .split(',')
      .map((group) => group.trim())
      .filter(Boolean)
      .slice(0, 8),
    active: formData.get('active') !== null,
  };
}

export async function createWeeklySessionAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await createWeeklySession(parseWeeklySession(formData));
    revalidateScheduleSurfaces();
    return { ok: true, message: `"${session.title}" added to the weekly schedule.` };
  } catch (error) {
    return failure(error);
  }
}

export async function updateWeeklySessionAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await updateWeeklySession(id, parseWeeklySession(formData));
    revalidateScheduleSurfaces();
    return { ok: true, message: `"${session.title}" updated.` };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteWeeklySessionAction(id: string): Promise<ActionResult> {
  try {
    await deleteWeeklySession(id);
    revalidateScheduleSurfaces();
    return { ok: true, message: 'Removed from the weekly schedule.' };
  } catch (error) {
    return failure(error);
  }
}
