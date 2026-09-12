import { cookies } from 'next/headers';
import { demoState } from '@/lib/demo/store';
import type { Profile } from '@/types';

/** Demo mode's stand-in for a Supabase session: one cookie holding a profile id. */
export const DEMO_COOKIE = 'tr_demo_user';

export async function getDemoProfile(): Promise<Profile | null> {
  const cookieStore = await cookies();
  const id = cookieStore.get(DEMO_COOKIE)?.value;
  if (!id) return null;
  return demoState().profiles.find((profile) => profile.id === id) ?? null;
}

export async function setDemoProfile(id: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEMO_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearDemoProfile(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_COOKIE);
}
