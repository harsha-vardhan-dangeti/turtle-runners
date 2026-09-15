'use server';

import { revalidatePath } from 'next/cache';
import { failure, type ActionResult } from '@/lib/action-result';
import { setStravaWidgets } from '@/lib/data';
import { parseStravaWidgetCode } from '@/lib/strava/widgets';

function revalidateWidgetSurfaces() {
  revalidatePath('/');
  revalidatePath('/admin/branding');
}

export async function saveStravaWidgetsAction(formData: FormData): Promise<ActionResult> {
  try {
    const widgets = parseStravaWidgetCode(String(formData.get('code') ?? ''));
    if (!widgets) throw new Error('Paste the widget code from Strava first.');
    await setStravaWidgets(widgets);
    revalidateWidgetSurfaces();
    return { ok: true, message: 'Strava widgets saved. They now show on the club page.' };
  } catch (error) {
    return failure(error);
  }
}

export async function removeStravaWidgetsAction(): Promise<ActionResult> {
  try {
    await setStravaWidgets(null);
    revalidateWidgetSurfaces();
    return { ok: true, message: 'Strava widgets removed from the club page.' };
  } catch (error) {
    return failure(error);
  }
}
