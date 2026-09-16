'use client';

import { useState, useTransition } from 'react';
import { useToast } from '@/components/ui/Toast';
import { deleteSessionAction } from '@/app/actions/sessions';
import { formatDistance, formatDuration, formatEffort } from '@/lib/stats';
import { formatDate } from '@/lib/time';
import { SPORT_EMOJI, type TrainingSessionWithPb } from '@/types';

interface SessionsTableProps {
  sessions: TrainingSessionWithPb[];
  totalSessions: number;
  /** Admin member view: show the log, offer nothing that changes it. */
  readOnly?: boolean;
}

/** The member's own training log. Every row is something they typed in. */
export function SessionsTable({ sessions, totalSessions, readOnly = false }: SessionsTableProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function onDelete(id: string) {
    startTransition(async () => {
      const result = await deleteSessionAction(id);
      toast(result.message, result.ok ? 'success' : 'error');
      setConfirmingId(null);
    });
  }

  return (
    <section aria-labelledby="sessions-title" className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="sessions-title" className="display text-2xl">
          Recent sessions
        </h2>
        {totalSessions > 0 ? (
          <span className="chip">
            {totalSessions} logged all time
          </span>
        ) : null}
      </div>

      {sessions.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-hairline p-8 text-center text-sm text-ink-muted">
          {readOnly
            ? 'Nothing logged yet.'
            : 'Nothing logged yet. Log your first session and the rings, the streak and this table all start filling in.'}
        </p>
      ) : (
        <div className="mt-5 -mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <caption className="sr-only">Your most recent training sessions</caption>
            <thead>
              <tr className="border-b border-hairline">
                {['Date', 'Session', 'Distance', 'Time', 'Pace', ''].map((heading, index) => (
                  <th
                    key={heading || `actions-${index}`}
                    scope="col"
                    className={`pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted ${
                      index >= 2 ? 'text-right' : ''
                    }`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {sessions.map((session) => (
                <tr key={session.id} className="transition-colors hover:bg-green-tint/40">
                  <td className="py-3.5 text-sm text-ink-muted">{formatDate(session.date)}</td>
                  <td className="py-3.5">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      <span aria-hidden="true">{SPORT_EMOJI[session.sport]}</span>
                      {session.title}
                      {session.pb ? (
                        <span className="rounded-full bg-green-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-green-deep">
                          🏅 {session.pb}
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="py-3.5 text-right text-sm font-semibold tabular-nums">
                    {formatDistance(session)}
                  </td>
                  <td className="py-3.5 text-right text-sm tabular-nums text-ink-muted">
                    {formatDuration(session.duration_s)}
                  </td>
                  <td className="py-3.5 text-right text-sm tabular-nums text-ink-muted">
                    {formatEffort(session)}
                  </td>
                  <td className="py-3.5 text-right">
                    {readOnly ? null : confirmingId === session.id ? (
                      <span className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onDelete(session.id)}
                          className="rounded-full bg-[#8B1D1D] px-2.5 py-1 text-[11px] font-semibold text-white"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="rounded-full border border-hairline px-2.5 py-1 text-[11px] font-semibold text-ink-muted"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingId(session.id)}
                        className="rounded-full border border-transparent px-2.5 py-1 text-[11px] font-semibold text-ink-muted transition-colors hover:border-hairline hover:text-ink"
                      >
                        <span className="sr-only">Delete {session.title}</span>
                        <span aria-hidden="true">Remove</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
