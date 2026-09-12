'use client';

import { useEffect, useState, useTransition } from 'react';
import { useToast } from '@/components/ui/Toast';
import { rsvpAction } from '@/app/actions/events';

interface RsvpButtonProps {
  eventId: string;
  going: boolean;
  count: number;
  signedIn: boolean;
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md';
}

/** Optimistic toggle: flips instantly, reverts and toasts if the server says no. */
export function RsvpButton({
  eventId,
  going,
  count,
  signedIn,
  tone = 'light',
  size = 'md',
}: RsvpButtonProps) {
  const [optimisticGoing, setOptimisticGoing] = useState(going);
  const [optimisticCount, setOptimisticCount] = useState(count);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  // Re-sync when the server sends fresh numbers after revalidation.
  useEffect(() => {
    setOptimisticGoing(going);
    setOptimisticCount(count);
  }, [going, count]);

  function onClick() {
    if (!signedIn) {
      toast('Sign in to save your spot.', 'info');
      return;
    }

    const nextGoing = !optimisticGoing;
    setOptimisticGoing(nextGoing);
    setOptimisticCount((value) => Math.max(0, value + (nextGoing ? 1 : -1)));

    startTransition(async () => {
      const result = await rsvpAction(eventId);
      if (!result.ok) {
        setOptimisticGoing(!nextGoing);
        setOptimisticCount((value) => Math.max(0, value + (nextGoing ? -1 : 1)));
        toast(result.message, 'error');
        return;
      }
      if (result.data) {
        setOptimisticGoing(result.data.going);
        setOptimisticCount(result.data.count);
      }
      toast(result.message, 'success');
    });
  }

  const sizeClass = size === 'sm' ? 'px-4 py-2 text-xs' : '';

  const className = optimisticGoing
    ? `btn border border-green-bright/40 bg-green-bright/15 text-green-bright hover:bg-green-bright/25 ${sizeClass}`
    : tone === 'dark'
      ? `btn bg-green-bright text-ink hover:-translate-y-0.5 hover:shadow-turtle-lg ${sizeClass}`
      : `btn-primary ${sizeClass}`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={optimisticGoing}
        className={className}
      >
        <span aria-hidden="true">{optimisticGoing ? '✓' : '＋'}</span>
        {optimisticGoing ? "You're going" : "I'm in"}
      </button>
      <p
        className={`text-sm ${tone === 'dark' ? 'text-white/60' : 'text-ink-muted'}`}
        aria-live="polite"
      >
        <span className="display text-base">{optimisticCount}</span>{' '}
        {optimisticCount === 1 ? 'turtle' : 'turtles'} in
      </p>
    </div>
  );
}
