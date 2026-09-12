'use server';

import { revalidatePath } from 'next/cache';
import { setMemberRole } from '@/lib/data';
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
