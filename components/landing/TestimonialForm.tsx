'use client';

import { useRef, useState, useTransition } from 'react';
import { useToast } from '@/components/ui/Toast';
import { submitTestimonialAction } from '@/app/actions/testimonials';

const MAX = 280;

/** Members write here; nothing appears on the site until an admin approves it. */
export function TestimonialForm() {
  const [text, setText] = useState('');
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement | null>(null);
  const { toast } = useToast();

  const remaining = MAX - text.length;
  const tooShort = text.trim().length > 0 && text.trim().length < 20;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await submitTestimonialAction(formData);
      toast(result.message, result.ok ? 'success' : 'error');
      if (result.ok) {
        setText('');
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="card p-6">
      <label htmlFor="testimonial-text" className="label">
        Add your voice
      </label>
      <textarea
        id="testimonial-text"
        name="text"
        required
        rows={4}
        maxLength={MAX}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="What would you tell someone standing at the gate on their first Sunday?"
        aria-describedby="testimonial-help"
        className="field resize-none"
      />
      <div className="mt-2 flex items-center justify-between gap-4">
        <p id="testimonial-help" className="text-xs text-ink-muted">
          {tooShort ? 'A little more — 20 characters minimum.' : 'An admin reads every submission before it goes live.'}
        </p>
        <p
          className={`text-xs font-semibold tabular-nums ${remaining < 20 ? 'text-green-deep' : 'text-ink-muted'}`}
          aria-live="polite"
        >
          {remaining}
        </p>
      </div>
      <button
        type="submit"
        disabled={pending || text.trim().length < 20}
        className="btn-primary mt-4 w-full sm:w-auto"
      >
        {pending ? 'Sending…' : 'Submit for review'}
      </button>
    </form>
  );
}
