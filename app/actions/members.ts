'use server';

import { revalidatePath } from 'next/cache';
import { setMemberRemoved, setMemberRole } from '@/lib/data';
import { failure, type ActionResult } from '@/lib/action-result';
import type { Role } from '@/types';

export async function setRoleAction(userId: string, role: Role): Promise<ActionResult> {
  try {
    await setMemberRole(userId, role);
    revalidatePath('/admin/members');
    revalidatePath('/admin');
    return {
      ok: true,
      message: role === 'admin' ? 'Promoted to admin.' : 'Back to member.',
    };
  } catch (error) {
    return failure(error);
  }
}

export async function removeMemberAction(userId: string): Promise<ActionResult> {
  try {
    await setMemberRemoved(userId, true);
    revalidatePath('/admin/members');
    revalidatePath('/admin');
    // Their name comes off the testimonial wall and the member count.
    revalidatePath('/');
    return { ok: true, message: 'Member removed from the club.' };
  } catch (error) {
    return failure(error);
  }
}

export async function reinstateMemberAction(userId: string): Promise<ActionResult> {
  try {
    await setMemberRemoved(userId, false);
    revalidatePath('/admin/members');
    revalidatePath('/admin');
    revalidatePath('/');
    return { ok: true, message: 'Member reinstated.' };
  } catch (error) {
    return failure(error);
  }
}
