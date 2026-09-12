'use server';

import { revalidatePath } from 'next/cache';
import { moderateTestimonial, submitTestimonial } from '@/lib/data';
import { failure, type ActionResult } from '@/lib/action-result';

export async function submitTestimonialAction(formData: FormData): Promise<ActionResult> {
  try {
    await submitTestimonial(String(formData.get('text') ?? ''));
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/testimonials');
    return {
      ok: true,
      message: 'Thanks — an admin will read it before it goes on the site.',
    };
  } catch (error) {
    return failure(error);
  }
}

export async function moderateTestimonialAction(
  id: string,
  status: 'approved' | 'rejected',
): Promise<ActionResult> {
  try {
    await moderateTestimonial(id, status);
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/testimonials');
    return {
      ok: true,
      message: status === 'approved' ? 'Published to Turtle Voices.' : 'Rejected.',
    };
  } catch (error) {
    return failure(error);
  }
}
