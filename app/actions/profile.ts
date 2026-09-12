'use server';

import { revalidatePath } from 'next/cache';
import { updateProfile } from '@/lib/data';
import { failure, type ActionResult } from '@/lib/action-result';
import { isLevel, isSport, type Level, type Sport } from '@/types';

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  try {
    const sport = String(formData.get('sport') ?? '');
    const level = String(formData.get('level') ?? '');
    const goal = String(formData.get('goal') ?? '');

    if (!isSport(sport)) throw new Error('Pick a primary sport.');
    if (!isLevel(level)) throw new Error('Pick where you are right now.');

    await updateProfile({
      sport: sport as Sport,
      level: level as Level,
      goal: goal.trim() || null,
    });

    revalidatePath('/profile');
    revalidatePath('/dashboard');
    revalidatePath('/');
    return { ok: true, message: 'Profile saved.' };
  } catch (error) {
    return failure(error);
  }
}
