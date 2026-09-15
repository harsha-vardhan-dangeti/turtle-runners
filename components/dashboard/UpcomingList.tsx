import { CalendarShare } from '@/components/landing/CalendarShare';
import { RsvpButton } from '@/components/landing/RsvpButton';
import { mapDirectionsUrl } from '@/lib/maps';
import { formatDate, formatTime, relativeDay } from '@/lib/time';
import { EVENT_TYPE_EMOJI, EVENT_TYPE_LABEL, type EventWithRsvp } from '@/types';

/** One-tap RSVP for everything published. */
export function UpcomingList({ events }: { events: EventWithRsvp[] }) {
  return (
    <section aria-labelledby="upcoming-title" className="card p-6">
      <h2 id="upcoming-title" className="display text-2xl">
        Upcoming events
      </h2>

      {events.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-hairline p-6 text-center text-sm text-ink-muted">
          No sessions published right now. The weekly four still run — check the schedule.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-hairline">
          {events.map((event) => (
            <li key={event.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip">
                    <span aria-hidden="true">{EVENT_TYPE_EMOJI[event.type]}</span>
                    {EVENT_TYPE_LABEL[event.type]}
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-green-deep">
                    {relativeDay(event.date)}
                  </p>
                </div>
                <h3 className="mt-2 text-base font-semibold">{event.title}</h3>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {formatDate(event.date)} · {formatTime(event.time)} · {event.location}
                </p>
                <a
                  href={mapDirectionsUrl(event)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-green-deep underline underline-offset-4"
                >
                  <span aria-hidden="true">🧭</span> Directions
                  <span className="sr-only"> to {event.title}</span>
                </a>
                <div className="mt-2">
                  <CalendarShare event={event} />
                </div>
              </div>
              <RsvpButton
                eventId={event.id}
                going={event.going}
                count={event.rsvp_count}
                signedIn
                size="sm"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
