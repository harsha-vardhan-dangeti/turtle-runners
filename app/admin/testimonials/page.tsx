import { TestimonialQueue } from '@/components/admin/TestimonialQueue';
import { getAllTestimonials, getCurrentProfile } from '@/lib/data';

export default async function AdminTestimonialsPage() {
  // The layout renders the signed-out and non-admin panels, but layouts and
  // pages render concurrently: without this guard the data call below throws
  // NOT_AUTHENTICATED first and the error page wins the race.
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') return null;

  const testimonials = await getAllTestimonials();
  return <TestimonialQueue testimonials={testimonials} />;
}
