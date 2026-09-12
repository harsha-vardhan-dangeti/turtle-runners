import { TestimonialQueue } from '@/components/admin/TestimonialQueue';
import { getAllTestimonials } from '@/lib/data';

export default async function AdminTestimonialsPage() {
  const testimonials = await getAllTestimonials();
  return <TestimonialQueue testimonials={testimonials} />;
}
