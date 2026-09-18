import Link from 'next/link';
import { SessionRsvp } from '@/components/landing/SessionRsvp';
import { dayName } from '@/lib/club';
import { formatTime, relativeDay } from '@/lib/time';
import { EVENT_TYPE_EMOJI, type SessionRsvpSummary, type WeeklySession } from '@/types';

/**
 * The member's week at a glance: which of the club's sessions they are in for,
 * and a one-tap RSVP for the rest. Ordered by what happens next, not by weekday.
 */
export function WeekSessions({
  schedule,
  sessionRsvps,
}: {
  schedule: WeeklySession[];
  sessionRsvps: Record<string, SessionRsvpSummary>;
}) {
  const rows = schedule
    .filter((session) => sessionRsvps[session.id])
    .map((session) => ({ session, summary: sessionRsvps[session.id]! }))
    .sort((a, b) =>
      `${a.summary.occursOn}T${a.session.time}`.localeCompare(`${b.summary.occursOn}T${b.session.time}`),
    );

  if (rows.length === 0) return null;
  const going = rows.filter((row) => row.summary.mine).length;

  return (
    <section aria-labelledby="week-sessions-title" className="card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="week-sessions-title" className="display text-2xl">
          This week&apos;s sessions
        </h2>
        <p className="text-sm text-ink-muted">
          {going === 0
            ? 'Not in for any yet. Tell the group you are coming.'
            : `You're in for ${going} of ${rows.length}.`}
        </p>
      </div>

      <ul className="mt-4 divide-y divide-hairline">
        {rows.map(({ session, summary }) => (
          <li key={session.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-start lg:gap-6">
            <div className="min-w-0 lg:w-48 lg:shrink-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-green-deep">
                {relativeDay(summary.occursOn) === dayName(session.iso_dow)
                  ? dayName(session.iso_dow)
                  : `${relativeDay(summary.occursOn)} · ${dayName(session.iso_dow)}`}
              </p>
              <h3 className="mt-1 text-base font-semibold">
                <span aria-hidden="true">{EVENT_TYPE_EMOJI[session.type]}</span> {session.title}
              </h3>
              <p className="mt-0.5 text-sm text-ink-muted">
                {formatTime(session.time)} · {session.location}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <SessionRsvp summary={summary} signedIn />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs text-ink-muted">
        RSVPs open for each session&apos;s next date and close when it starts.{' '}
        <Link href="/#schedule" className="tap-link font-semibold text-green-deep underline underline-offset-4">
          Full schedule
        </Link>
      </p>
    </section>
  );
}
