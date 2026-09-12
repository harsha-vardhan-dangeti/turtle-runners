'use client';

import { useState, useTransition } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { moderateTestimonialAction } from '@/app/actions/testimonials';
import { formatDate } from '@/lib/time';
import type { TestimonialStatus, TestimonialWithAuthor } from '@/types';

const STATUS_STYLE: Record<TestimonialStatus, string> = {
  pending: 'chip-green',
  approved: 'chip',
  rejected: 'chip',
};

const STATUS_LABEL: Record<TestimonialStatus, string> = {
  pending: 'Pending',
  approved: 'Published',
  rejected: 'Rejected',
};

export function TestimonialQueue({ testimonials }: { testimonials: TestimonialWithAuthor[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const pending = testimonials.filter((item) => item.status === 'pending');
  const decided = testimonials.filter((item) => item.status !== 'pending');

  function moderate(id: string, status: 'approved' | 'rejected') {
    setPendingId(id);
    startTransition(async () => {
      const result = await moderateTestimonialAction(id, status);
      toast(result.message, result.ok ? 'success' : 'error');
      setPendingId(null);
    });
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="queue-title" className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="queue-title" className="display text-2xl">
              Moderation queue
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Nothing reaches the landing page until it is approved here.
            </p>
          </div>
          <span className="chip-green">{pending.length} waiting</span>
        </div>

        {pending.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-hairline p-8 text-center text-sm text-ink-muted">
            Queue is clear. Nice.
          </p>
        ) : (
          <ul className="mt-5 space-y-4">
            {pending.map((testimonial) => (
              <li key={testimonial.id} className="rounded-2xl border border-hairline p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={testimonial.author_name} src={testimonial.author_avatar} size={40} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{testimonial.author_name}</p>
                    <p className="text-xs text-ink-muted">
                      {testimonial.author_role_label} · {formatDate(testimonial.created_at.slice(0, 10))}
                    </p>
                  </div>
                </div>

                <blockquote className="mt-4 border-l-2 border-green-primary/40 pl-4 text-[15px] leading-relaxed">
                  {testimonial.text}
                </blockquote>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pendingId === testimonial.id}
                    onClick={() => moderate(testimonial.id, 'approved')}
                    className="btn-primary"
                  >
                    <span aria-hidden="true">✓</span> Approve
                  </button>
                  <button
                    type="button"
                    disabled={pendingId === testimonial.id}
                    onClick={() => moderate(testimonial.id, 'rejected')}
                    className="btn-ghost"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="decided-title" className="card p-6">
        <h2 id="decided-title" className="display text-2xl">
          Already reviewed
        </h2>

        {decided.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-hairline p-6 text-center text-sm text-ink-muted">
            Nothing reviewed yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-hairline">
            {decided.map((testimonial) => (
              <li key={testimonial.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{testimonial.author_name}</p>
                  <p className="mt-1 line-clamp-2 max-w-xl text-sm text-ink-muted">
                    {testimonial.text}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={STATUS_STYLE[testimonial.status]}>
                    {STATUS_LABEL[testimonial.status]}
                  </span>
                  <button
                    type="button"
                    disabled={pendingId === testimonial.id}
                    onClick={() =>
                      moderate(testimonial.id, testimonial.status === 'approved' ? 'rejected' : 'approved')
                    }
                    className="rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold transition-colors hover:border-green-primary/40 hover:text-green-deep"
                  >
                    {testimonial.status === 'approved' ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
