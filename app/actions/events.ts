'use server';

import { revalidatePath } from 'next/cache';
import {
  createEvent,
  deleteEvent,
  toggleRsvp,
  updateEvent,
  type EventInput,
} from '@/lib/data';
import { failure, type ActionResult } from '@/lib/action-result';
import { parsePin } from '@/lib/maps';
import { isEventType } from '@/types';

function revalidateEventSurfaces() {
  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/admin');
  revalidatePath('/admin/events');
}

export async function rsvpAction(
  eventId: string,
): Promise<ActionResult<{ going: boolean; count: number }>> {
  try {
    const result = await toggleRsvp(eventId);
    revalidateEventSurfaces();
    return {
      ok: true,
      message: result.going ? "You're in. See you there." : 'RSVP cancelled.',
      data: result,
    };
  } catch (error) {
    return failure(error);
  }
}

function parseEvent(formData: FormData): EventInput {
  const title = String(formData.get('title') ?? '').trim();
  const type = String(formData.get('type') ?? '');
  const date = String(formData.get('date') ?? '');
  const time = String(formData.get('time') ?? '');
  const location = String(formData.get('location') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  // Throws a message the admin can act on if the paste is unreadable.
  const pin = parsePin(String(formData.get('pin') ?? ''));

  if (!title) throw new Error('Give the session a title.');
  if (!isEventType(type)) throw new Error('Pick a session type.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Pick a date.');
  if (!/^\d{2}:\d{2}/.test(time)) throw new Error('Pick a start time.');
  if (!location) throw new Error('Where is everyone meeting?');

  return {
    title: title.slice(0, 120),
    type,
    date,
    time: time.slice(0, 5),
    location: location.slice(0, 160),
    lat: pin?.lat ?? null,
    lng: pin?.lng ?? null,
    note: note ? note.slice(0, 500) : null,
  };
}

export async function createEventAction(formData: FormData): Promise<ActionResult> {
  try {
    const event = await createEvent(parseEvent(formData));
    revalidateEventSurfaces();
    return { ok: true, message: `"${event.title}" published.` };
  } catch (error) {
    return failure(error);
  }
}

export async function updateEventAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const event = await updateEvent(id, parseEvent(formData));
    revalidateEventSurfaces();
    return { ok: true, message: `"${event.title}" updated.` };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteEventAction(id: string): Promise<ActionResult> {
  try {
    await deleteEvent(id);
    revalidateEventSurfaces();
    return { ok: true, message: 'Session deleted.' };
  } catch (error) {
    return failure(error);
  }
}
