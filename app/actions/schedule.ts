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
    ground_id: String(formData.get('ground_id') ?? '').trim() || null,
    ...parsePaceGroups(formData),
    active: formData.get('active') !== null,
  };
}

const MAX_GROUPS = 8;

/**
 * Pace group rows from the schedule form: pace_group_name_0 with an optional
 * pace_group_limit_0, and so on. Mirrors weekly_sessions_tidy_limits.
 */
function parsePaceGroups(formData: FormData) {
  const pace_groups: string[] = [];
  const pace_group_limits: Record<string, number> = {};

  for (let i = 0; i < MAX_GROUPS; i += 1) {
    const name = String(formData.get(`pace_group_name_${i}`) ?? '').trim().slice(0, 60);
    const limitRaw = String(formData.get(`pace_group_limit_${i}`) ?? '').trim();
    if (!name) {
      if (limitRaw) throw new Error('A pace group has places but no name.');
      continue;
    }
    if (pace_groups.includes(name)) throw new Error(`"${name}" is listed twice.`);
    pace_groups.push(name);

    if (limitRaw) {
      const limit = Number(limitRaw);
      if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
        throw new Error(`Places for "${name}" must be a whole number from 1 to 500, or blank for no limit.`);
      }
      pace_group_limits[name] = limit;
    }
  }

  return { pace_groups, pace_group_limits };
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
