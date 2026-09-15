'use server';

import { revalidatePath } from 'next/cache';
import { failure, type ActionResult } from '@/lib/action-result';
import { setLeaderboardOptIn } from '@/lib/data';

export async function setLeaderboardOptInAction(show: boolean): Promise<ActionResult> {
  try {
    await setLeaderboardOptIn(show);
    revalidatePath('/leaderboard');
    revalidatePath('/profile');
    return {
      ok: true,
      message: show
        ? "You're on the board. Your sessions themselves stay private."
        : 'Off the board. Your totals are private again.',
    };
  } catch (error) {
    return failure(error);
  }
}
