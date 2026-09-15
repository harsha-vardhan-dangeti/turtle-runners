'use client';

import { useTransition } from 'react';
import { useToast } from '@/components/ui/Toast';
import { setLeaderboardOptInAction } from '@/app/actions/leaderboard';

/** Join or leave the board in one tap, without a trip to the profile page. */
export function LeaderboardOptIn({ onBoard }: { onBoard: boolean }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function toggle() {
    startTransition(async () => {
      const result = await setLeaderboardOptInAction(!onBoard);
      toast(result.message, result.ok ? 'success' : 'error');
    });
  }

  return onBoard ? (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="text-xs font-semibold text-ink-muted underline underline-offset-4 hover:text-ink"
    >
      {pending ? 'Leaving…' : 'Leave the board'}
    </button>
  ) : (
    <button type="button" onClick={toggle} disabled={pending} className="btn-primary">
      {pending ? 'Joining…' : 'Join the board'}
    </button>
  );
}
