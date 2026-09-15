'use client';

import { useState, useTransition } from 'react';
import { useToast } from '@/components/ui/Toast';
import { clearSessionChangeAction, setSessionChangeAction } from '@/app/actions/session-changes';
import { formatDate, formatTime } from '@/lib/time';
import type { OccurrenceChange, WeeklySession } from '@/types';

interface OccurrenceManagerProps {
  session: WeeklySession;
  /** The next few dates the session runs, computed on the server. */
  dates: string[];
  changes: OccurrenceChange[];
}

/**
 * Cancel or move one date of a weekly session: rain, a closed pool, a race
 * day. The template stays as it is; only that date changes, everywhere the
 * site shows it and in members' subscribed calendars.
 */
export function OccurrenceManager({ session, dates, changes }: OccurrenceManagerProps) {
  const [editing, setEditing] = useState<{ date: string; status: 'cancelled' | 'moved' } | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const upcomingChanges = changes.filter((change) => dates.includes(change.occurs_on));

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const formData = new FormData(event.currentTarget);
    formData.set('status', editing.status);
    const { date } = editing;
    startTransition(async () => {
      const result = await setSessionChangeAction(session.id, date, formData);
      toast(result.message, result.ok ? 'success' : 'error');
      if (result.ok) setEditing(null);
    });
  }

  function undo(date: string) {
    startTransition(async () => {
      const result = await clearSessionChangeAction(session.id, date);
      toast(result.message, result.ok ? 'success' : 'error');
    });
  }

  return (
    <details className="mt-3 rounded-xl border border-hairline bg-white" open={upcomingChanges.length > 0 || undefined}>
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-ink">
        Cancel or move a date
        {upcomingChanges.length > 0 ? (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
            {upcomingChanges.length} changed
          </span>
        ) : null}
      </summary>

      <ul className="divide-y divide-hairline border-t border-hairline">
        {dates.map((date) => {
          const change = changes.find((item) => item.occurs_on === date);
          const open = editing?.date === date;

          return (
            <li key={date} className="px-3 py-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-24 font-semibold text-ink">{formatDate(date)}</span>

                {change ? (
                  <>
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${
                        change.status === 'cancelled' ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {change.status === 'cancelled'
                        ? 'Cancelled'
                        : `Moved${change.new_time ? ` to ${formatTime(change.new_time)}` : ''}${
                            change.new_location ? ` · ${change.new_location}` : ''
                          }`}
                    </span>
                    {change.reason ? <span className="text-ink-muted">{change.reason}</span> : null}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => undo(date)}
                      className="ml-auto rounded-full border border-hairline px-2.5 py-1 font-semibold text-ink-muted hover:border-green-primary/40 hover:text-green-deep"
                    >
                      Undo
                    </button>
                  </>
                ) : open ? null : (
                  <span className="text-ink-muted">
                    As usual · {formatTime(session.time)}
                  </span>
                )}

                {!change && !open ? (
                  <span className="ml-auto flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditing({ date, status: 'cancelled' })}
                      className="rounded-full border border-hairline px-2.5 py-1 font-semibold text-ink-muted hover:border-[#8B1D1D]/40 hover:text-[#8B1D1D]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing({ date, status: 'moved' })}
                      className="rounded-full border border-hairline px-2.5 py-1 font-semibold text-ink-muted hover:border-amber-400 hover:text-amber-900"
                    >
                      Move
                    </button>
                  </span>
                ) : null}
              </div>

              {open ? (
                <form onSubmit={onSubmit} className="mt-2 space-y-2 rounded-lg bg-paper p-3">
                  <p className="font-semibold text-ink">
                    {editing.status === 'cancelled' ? 'Cancel' : 'Move'} {session.title} on {formatDate(date)}
                  </p>

                  {editing.status === 'moved' ? (
                    <div className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)]">
                      <label className="block">
                        <span className="mb-1 block text-[11px] text-ink-muted">New start</span>
                        <input
                          name="new_time"
                          type="time"
                          defaultValue={session.time.slice(0, 5)}
                          className="field py-1.5 text-xs"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] text-ink-muted">New place (blank keeps {session.location})</span>
                        <input name="new_location" maxLength={160} placeholder="Gachibowli Stadium track" className="field py-1.5 text-xs" />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-[11px] text-ink-muted">Pin for the new place (optional: Maps link or coordinates)</span>
                        <input name="new_pin" placeholder="17.4462, 78.3441" className="field py-1.5 text-xs" />
                      </label>
                    </div>
                  ) : null}

                  <label className="block">
                    <span className="mb-1 block text-[11px] text-ink-muted">
                      Reason, shown to members (optional)
                    </span>
                    <input
                      name="reason"
                      maxLength={200}
                      placeholder={editing.status === 'cancelled' ? 'Heavy rain forecast' : 'Pool closed for maintenance'}
                      className="field py-1.5 text-xs"
                    />
                  </label>

                  <div className="flex gap-2">
                    <button type="submit" disabled={pending} className="btn-primary px-4 py-1.5 text-xs">
                      {pending ? 'Saving…' : editing.status === 'cancelled' ? 'Cancel this date' : 'Save the move'}
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="btn-ghost px-4 py-1.5 text-xs">
                      Back
                    </button>
                  </div>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
