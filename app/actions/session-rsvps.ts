'use server';

import { revalidatePath } from 'next/cache';
import { failure, type ActionResult } from '@/lib/action-result';
import { leaveWeeklySession, removeSessionRsvp, rsvpToWeeklySession } from '@/lib/data';

function revalidateRsvpSurfaces() {
  // Counts show on the landing page, "your week" on the dashboard, and the
  // attendee lists in admin.
  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/admin/schedule');
}

export async function rsvpSessionAction(
  sessionId: string,
  paceGroup: string | null,
): Promise<ActionResult> {
  try {
    await rsvpToWeeklySession(sessionId, paceGroup);
    revalidateRsvpSurfaces();
    return {
      ok: true,
      message: paceGroup ? `You're in, with the ${paceGroup} group.` : "You're in. See you there.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function leaveSessionAction(sessionId: string): Promise<ActionResult> {
  try {
    await leaveWeeklySession(sessionId);
    revalidateRsvpSurfaces();
    return { ok: true, message: 'RSVP cancelled. Thanks for letting the group know.' };
  } catch (error) {
    return failure(error);
  }
}

export async function removeSessionRsvpAction(
  sessionId: string,
  occursOn: string,
  userId: string,
): Promise<ActionResult> {
  try {
    await removeSessionRsvp(sessionId, occursOn, userId);
    revalidateRsvpSurfaces();
    return { ok: true, message: 'Removed from this session.' };
  } catch (error) {
    return failure(error);
  }
}
