'use server';

import { revalidatePath } from 'next/cache';
import { failure, type ActionResult } from '@/lib/action-result';
import { connectDemoStrava } from '@/lib/demo/strava';
import { requireProfile } from '@/lib/data';
import { IS_DEMO } from '@/lib/env';
import { disconnectStrava, syncStrava } from '@/lib/strava/sync';
import type { StravaSyncResult } from '@/lib/strava/types';

function revalidateTrainingSurfaces() {
  revalidatePath('/dashboard');
  // Imported sessions feed the same totals a manual log does.
  revalidatePath('/');
  revalidatePath('/admin');
}

export async function syncStravaAction(): Promise<ActionResult<StravaSyncResult>> {
  try {
    const result = await syncStrava();
    revalidateTrainingSurfaces();

    if (result.imported === 0) {
      return { ok: true, message: 'Already up to date.', data: result };
    }
    return {
      ok: true,
      message: `Pulled ${result.imported} activit${result.imported === 1 ? 'y' : 'ies'} from Strava.`,
      data: result,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function disconnectStravaAction(): Promise<ActionResult> {
  try {
    await disconnectStrava();
    revalidateTrainingSurfaces();
    return { ok: true, message: 'Strava disconnected. Imported sessions removed.' };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Demo mode only. There is no OAuth round trip to make, so the connect button
 * points here instead of at Strava.
 */
export async function connectDemoStravaAction(): Promise<ActionResult> {
  try {
    if (!IS_DEMO) throw new Error('Not available outside demo mode.');
    const profile = await requireProfile();
    connectDemoStrava(profile.id);
    revalidateTrainingSurfaces();
    return { ok: true, message: 'Strava connected.' };
  } catch (error) {
    return failure(error);
  }
}
