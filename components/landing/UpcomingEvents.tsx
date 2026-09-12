import { RsvpButton } from '@/components/landing/RsvpButton';
import { Reveal } from '@/components/ui/Reveal';
import { mapDirectionsUrl } from '@/lib/maps';
import { formatDate, formatTime, relativeDay } from '@/lib/time';
import { EVENT_TYPE_EMOJI, EVENT_TYPE_LABEL, type EventWithRsvp } from '@/types';

/** Everything published after the next session. */
export function UpcomingEvents({ events, signedIn }: { events: EventWithRsvp[]; signedIn: boolean }) {
  if (events.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="label">Also coming up</h3>
      <ul className="mt-3 grid gap-3 md:grid-cols-3">
        {events.map((event, index) => (
          <Reveal as="li" key={event.id} index={index} className="h-full">
            <article className="card card-hover flex h-full flex-col p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="chip">
                  <span aria-hidden="true">{EVENT_TYPE_EMOJI[event.type]}</span>
                  {EVENT_TYPE_LABEL[event.type]}
                </span>
                <p className="text-xs font-semibold text-ink-muted">{relativeDay(event.date)}</p>
              </div>

              <h4 className="display mt-3 text-2xl">{event.title}</h4>
              <p className="mt-1 text-sm text-ink-muted">
                {formatDate(event.date)} · {formatTime(event.time)}
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">{event.location}</p>
              <a
                href={mapDirectionsUrl(event)}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-green-deep underline underline-offset-4"
              >
                <span aria-hidden="true">🧭</span> Directions
                <span className="sr-only"> to {event.title}</span>
              </a>

              <div className="mt-auto pt-4">
                <RsvpButton
                  eventId={event.id}
                  going={event.going}
                  count={event.rsvp_count}
                  signedIn={signedIn}
                  size="sm"
                />
              </div>
            </article>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}
