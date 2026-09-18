import type { AuditEntry } from '@/types';

/** "made Aditi an admin", read after the actor's name. */
function describe(entry: AuditEntry): string {
  const { action, summary } = entry;
  switch (action) {
    case 'member.promoted':
      return `made ${summary} an admin`;
    case 'member.demoted':
      return `made ${summary} a member again`;
    case 'member.removed':
      return `removed ${summary} from the club`;
    case 'member.reinstated':
      return `reinstated ${summary}`;
    case 'testimonial.approved':
      return `approved ${summary}`;
    case 'testimonial.rejected':
      return `rejected ${summary}`;
    case 'testimonial.deleted':
      return `deleted ${summary}`;
    case 'event.deleted':
      return `deleted the event ${summary}`;
    case 'weekly_session.deleted':
      return `deleted the weekly session ${summary}`;
    case 'training_ground.deleted':
      return `deleted the ground ${summary}`;
    case 'rsvp.removed':
      return `removed ${summary}`;
    case 'session.cancelled':
      return `cancelled ${summary}`;
    case 'session.moved':
      return `moved ${summary}`;
    case 'session.restored':
      return `put ${summary} back on`;
    default:
      // Branding entries carry a full sentence: "Uploaded a new club logo".
      return summary.charAt(0).toLowerCase() + summary.slice(1);
  }
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function ago(iso: string, now: number): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

/**
 * Recent admin activity, from the append-only audit log. The database writes
 * every entry itself, so this shows what happened even when it was done
 * straight through the API rather than these screens.
 */
export function AdminActivity({ entries }: { entries: AuditEntry[] }) {
  const now = Date.now();

  return (
    <section aria-labelledby="activity-title" className="card p-6">
      <h2 id="activity-title" className="display text-2xl">
        Recent admin activity
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Role changes, removals, moderation and cancellations. Recorded by the database; nobody can edit it.
      </p>

      {entries.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-hairline p-6 text-center text-sm text-ink-muted">
          Nothing yet. Changes admins make will show up here.
        </p>
      ) : (
        <ol className="mt-5 divide-y divide-hairline">
          {entries.map((entry) => {
            const reason = typeof entry.detail.reason === 'string' ? entry.detail.reason : null;
            return (
              <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <p className="min-w-0 break-words text-sm">
                  <span className="font-semibold">{entry.actorName ?? 'The system'}</span> {describe(entry)}
                  {reason ? <span className="text-ink-muted"> ({reason})</span> : null}
                </p>
                <time
                  dateTime={entry.at}
                  title={new Date(entry.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  className="shrink-0 text-xs tabular-nums text-ink-muted"
                >
                  {ago(entry.at, now)}
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
