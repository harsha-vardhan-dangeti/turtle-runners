'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { IS_DEMO } from '@/lib/env';
import { clearDemoProfile, setDemoProfile } from '@/lib/demo/session';
import { demoState } from '@/lib/demo/store';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DEMO_ADMIN_ID, DEMO_MEMBER_ID } from '@/lib/demo/fixtures';

/** Demo mode's replacement for the Google OAuth round-trip. */
export async function demoSignInAction(role: 'member' | 'admin'): Promise<void> {
  if (!IS_DEMO) throw new Error('Demo sign-in is disabled when Supabase is configured.');

  const wanted = role === 'admin' ? DEMO_ADMIN_ID : DEMO_MEMBER_ID;
  const exists = demoState().profiles.some((profile) => profile.id === wanted);
  await setDemoProfile(exists ? wanted : (demoState().profiles[0]?.id ?? wanted));

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signOutAction(): Promise<void> {
  if (IS_DEMO) {
    await clearDemoProfile();
  } else {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  revalidatePath('/', 'layout');
  redirect('/');
}
