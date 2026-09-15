'use client';

import { useTransition } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { leaveSessionAction, rsvpSessionAction } from '@/app/actions/session-rsvps';
import { formatDate } from '@/lib/time';
import type { SessionRsvpSummary } from '@/types';

interface SessionRsvpProps {
  summary: SessionRsvpSummary;
  signedIn: boolean;
  tone?: 'light' | 'dark';
  /** Hides the attendee faces, for tight spots like a dashboard row. */
  compact?: boolean;
}

/**
 * RSVP to a weekly session's next occurrence, with an optional pace group.
 *
 * Picking a group is optional on purpose: a nervous first-timer should not
 * have to classify themselves to say they are coming. Tapping a group joins
 * with it, or moves you into it; tapping your own group again drops it.
 */
export function SessionRsvp({ summary, signedIn, tone = 'light', compact = false }: SessionRsvpProps) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const dark = tone === 'dark';
  const mine = summary.mine;

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    if (!signedIn) {
      toast('Sign in to save your spot.', 'info');
      return;
    }
    startTransition(async () => {
      const result = await action();
      toast(result.message, result.ok ? 'success' : 'error');
    });
  }

  const join = (group: string | null) => run(() => rsvpSessionAction(summary.sessionId, group));
  const leave = () => run(() => leaveSessionAction(summary.sessionId));

  const muted = dark ? 'text-white/60' : 'text-ink-muted';
  const primary = mine
    ? dark
      ? 'border border-green-bright/40 bg-green-bright/15 text-green-bright'
      : 'border border-green-primary/30 bg-green-tint text-green-deep'
    : dark
      ? 'bg-green-bright text-ink hover:-translate-y-0.5 hover:shadow-turtle-lg'
      : 'btn-primary';

  return (
    <div className="space-y-2.5" aria-busy={pending}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {mine ? (
          <>
            <span className={`btn px-4 py-2 text-xs ${primary}`}>
              <span aria-hidden="true">✓</span> You&apos;re in
              {mine.paceGroup ? ` · ${mine.paceGroup}` : ''}
            </span>
            <button
              type="button"
              onClick={leave}
              disabled={pending}
              className={`text-xs font-semibold underline underline-offset-4 ${muted} hover:opacity-80`}
            >
              Can&apos;t make it
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => join(null)}
            disabled={pending}
            className={`btn px-4 py-2 text-xs ${primary}`}
          >
            <span aria-hidden="true">＋</span> I&apos;m in
          </button>
        )}

        <p className={`text-sm ${muted}`} aria-live="polite">
          <span className={`display text-base ${dark ? 'text-white' : 'text-ink'}`}>{summary.total}</span>{' '}
          {summary.total === 1 ? 'turtle' : 'turtles'} in for {formatDate(summary.occursOn)}
        </p>
      </div>

      {summary.groups.length > 0 ? (
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${dark ? 'text-white/45' : 'text-ink-muted'}`}>
            {mine ? 'Your pace group' : 'Pick a pace group (optional)'}
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {summary.groups.map((group) => {
              const selected = mine?.paceGroup === group.name;
              const blocked = group.full && !selected;
              const places =
                group.limit === null ? `${group.count}` : group.full ? 'full' : `${group.count}/${group.limit}`;
              const style = selected
                ? dark
                  ? 'border-green-bright bg-green-bright/20 text-green-bright'
                  : 'border-green-primary bg-green-tint text-green-deep'
                : blocked
                  ? dark
                    ? 'border-white/10 text-white/35'
                    : 'border-hairline text-ink-muted/60'
                  : dark
                    ? 'border-white/15 bg-white/5 text-white/85 hover:border-green-bright/50'
                    : 'border-hairline bg-white text-ink hover:border-green-primary/50';

              return (
                <li key={group.name}>
                  <button
                    type="button"
                    disabled={pending || blocked}
                    aria-pressed={selected}
                    onClick={() => join(selected ? null : group.name)}
                    title={
                      blocked
                        ? `${group.name} is full`
                        : selected
                          ? 'Tap again to go without a group'
                          : `Join the ${group.name} group`
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed ${style}`}
                  >
                    {selected ? <span aria-hidden="true">✓</span> : null}
                    {group.name}
                    <span className={`font-semibold ${blocked ? '' : dark ? 'text-white/55' : 'text-ink-muted'}`}>
                      · {places}
                    </span>
                  </button>
                </li>
              );
            })}
            {summary.ungrouped > 0 ? (
              <li className={`inline-flex items-center px-1 text-xs ${muted}`}>
                + {summary.ungrouped} not picked
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {!compact && summary.attendees.length > 0 ? (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {summary.attendees.slice(0, 6).map((person) => (
              <span key={person.id} title={person.pace_group ? `${person.name} · ${person.pace_group}` : person.name}>
                <Avatar name={person.name} src={person.avatar_url} size={26} className="ring-2 ring-white" />
              </span>
            ))}
          </div>
          <p className={`text-xs ${muted}`}>
            {summary.attendees
              .slice(0, 3)
              .map((person) => person.name.split(/\s+/)[0])
              .join(', ')}
            {summary.attendees.length > 3 ? ` and ${summary.attendees.length - 3} more` : ''}
          </p>
        </div>
      ) : null}
    </div>
  );
}
