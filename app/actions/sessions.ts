'use server';

import { revalidatePath } from 'next/cache';
import { deleteSession } from '@/lib/data';
import { failure, type ActionResult } from '@/lib/action-result';

function revalidateTrainingSurfaces() {
  revalidatePath('/dashboard');
  // The club stats band on the landing page is a live sum of these.
  revalidatePath('/');
  revalidatePath('/admin');
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
