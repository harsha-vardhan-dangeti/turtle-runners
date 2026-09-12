import { RaceClock } from '@/components/RaceClock';
import { RsvpButton } from '@/components/landing/RsvpButton';
import { paceGroupsFor } from '@/lib/club';
import { hasPin, mapDirectionsUrl, mapEmbedSrc } from '@/lib/maps';
import {
  formatLongDate,
  formatTime,
  isoDayOfWeek,
  istInstant,
  nextOccurrence,
  relativeDay,
} from '@/lib/time';
import {
  EVENT_TYPE_EMOJI,
  EVENT_TYPE_LABEL,
  type EventWithRsvp,
  type WeeklySession,
} from '@/types';

interface NextSessionCardProps {
  event: EventWithRsvp | null;
  signedIn: boolean;
  schedule: WeeklySession[];
}

/** Falls back to the recurring weekly schedule if nothing is published yet. */
function fallbackSession(schedule: WeeklySession[]) {
  const upcoming = schedule
    .map((session) => ({ session, ...nextOccurrence(session.iso_dow, session.time) }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  return upcoming[0] ?? null;
}

export function NextSessionCard({ event, signedIn, schedule }: NextSessionCardProps) {
  const fallback = event ? null : fallbackSession(schedule);
  if (!event && !fallback) return null;

  const title = event ? event.title : (fallback?.session.title ?? '');
  const type = event ? event.type : (fallback?.session.type ?? 'run');
  const date = event ? event.date : (fallback?.date ?? '');
  const time = event ? event.time : (fallback?.session.time ?? '');
  const location = event ? event.location : (fallback?.session.location ?? '');
  const note = event ? event.note : (fallback?.session.note ?? null);
  const paceGroups = fallback
    ? fallback.session.pace_groups
    : paceGroupsFor(type, isoDayOfWeek(date), schedule);
  const startsAt = istInstant(date, time);

  // The map follows the session, not the club's home base: a Saturday ride
  // meeting on the ORR must not send people to the lake.
  const place = event
    ? { lat: event.lat, lng: event.lng, location: event.location }
    : {
        lat: fallback?.session.lat ?? null,
        lng: fallback?.session.lng ?? null,
        location,
      };

  return (
    <section
      id="next-session"
      aria-labelledby="next-session-title"
      className="dark-section relative overflow-hidden rounded-3xl border border-white/10 text-white shadow-turtle-lg"
    >
      <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-green-bright">
              Next session
            </p>
            <span className="chip-dark">
              <span aria-hidden="true">{EVENT_TYPE_EMOJI[type]}</span> {EVENT_TYPE_LABEL[type]}
            </span>
            {!event ? (
              <span className="chip-dark">From the weekly schedule</span>
            ) : null}
          </div>

          <h2 id="next-session-title" className="display mt-4 text-4xl sm:text-5xl">
            {title}
          </h2>

          <p className="mt-3 text-lg font-semibold text-green-bright">
            {relativeDay(date)} · {formatTime(time)}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {formatLongDate(date)} · {location}
          </p>

          {note ? <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70">{note}</p> : null}

          {paceGroups.length > 0 ? (
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Pace groups
              </p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {paceGroups.map((group) => (
                  <li key={group} className="chip-dark">
                    {group}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-7">
            <RaceClock targetIso={startsAt.toISOString()} />
          </div>

          <div className="mt-6">
            {event ? (
              <RsvpButton
                eventId={event.id}
                going={event.going}
                count={event.rsvp_count}
                signedIn={signedIn}
                tone="dark"
              />
            ) : (
              <p className="text-sm text-white/60">
                Nothing published for this one yet — turn up anyway, we always do.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            <iframe
              title={`Map of ${location}`}
              src={mapEmbedSrc(place)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[260px] w-full border-0 lg:h-full lg:min-h-[380px]"
            />
          </div>
          <a
            href={mapDirectionsUrl(place)}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-dark w-full"
          >
            <span aria-hidden="true">🧭</span> Get directions
          </a>
          {!hasPin(place) ? (
            <p className="text-center text-xs text-white/40">
              Searching for &ldquo;{location}&rdquo; — an admin can pin the exact spot.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
