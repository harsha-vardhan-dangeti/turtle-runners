import { RaceClock } from '@/components/RaceClock';
import { AddToCalendar } from '@/components/landing/AddToCalendar';
import { RsvpButton } from '@/components/landing/RsvpButton';
import { SessionRsvp } from '@/components/landing/SessionRsvp';
import { paceGroupsFor } from '@/lib/club';
import { hasPin, mapDirectionsUrl, mapEmbedSrc } from '@/lib/maps';
import { upcomingOccurrence } from '@/lib/occurrence';
import {
  formatDate,
  formatLongDate,
  formatTime,
  isoDayOfWeek,
  istInstant,
  relativeDay,
} from '@/lib/time';
import {
  EVENT_TYPE_EMOJI,
  EVENT_TYPE_LABEL,
  type EventWithRsvp,
  type OccurrenceChange,
  type SessionRsvpSummary,
  type WeeklySession,
} from '@/types';

interface NextSessionCardProps {
  event: EventWithRsvp | null;
  signedIn: boolean;
  schedule: WeeklySession[];
  sessionRsvps?: Record<string, SessionRsvpSummary>;
  /** Cancelled and moved dates, keyed by session id. */
  changes?: Record<string, OccurrenceChange[]>;
}

/**
 * Falls back to the recurring weekly schedule if nothing is published yet.
 * The card counts down to the soonest session that is actually happening; any
 * cancelled one before it becomes a heads-up rather than a dead countdown.
 */
function fallbackSession(schedule: WeeklySession[], changes: Record<string, OccurrenceChange[]>) {
  const upcoming = schedule
    .map((session) => ({ session, ...upcomingOccurrence(session, changes[session.id]) }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  const next = upcoming.find((item) => !item.cancelled) ?? null;
  const skipped = next ? upcoming.filter((item) => item.cancelled && item.at < next.at) : [];
  return next ? { ...next, skipped } : null;
}

export function NextSessionCard({
  event,
  signedIn,
  schedule,
  sessionRsvps = {},
  changes = {},
}: NextSessionCardProps) {
  const fallback = event ? null : fallbackSession(schedule, changes);
  if (!event && !fallback) return null;

  const title = event ? event.title : (fallback?.session.title ?? '');
  const type = event ? event.type : (fallback?.session.type ?? 'run');
  const date = event ? event.date : (fallback?.date ?? '');
  // A moved week's own time and place, not the template's.
  const time = event ? event.time : (fallback?.time ?? '');
  const location = event ? event.location : (fallback?.location ?? '');
  const note = event ? event.note : (fallback?.session.note ?? null);
  const paceGroups = fallback
    ? fallback.session.pace_groups
    : paceGroupsFor(type, isoDayOfWeek(date), schedule);
  const startsAt = istInstant(date, time);
  // The RSVP control shows the pace groups itself, with places left.
  const fallbackRsvp = fallback ? sessionRsvps[fallback.session.id] : undefined;

  // The map follows the session, not the club's home base: a Saturday ride
  // meeting on the ORR must not send people to the lake.
  const place = event
    ? { lat: event.lat, lng: event.lng, location: event.location }
    : {
        lat: fallback?.lat ?? null,
        lng: fallback?.lng ?? null,
        location,
      };

  return (
    <section
      id="next-session"
      aria-labelledby="next-session-title"
      className="dark-section relative overflow-hidden rounded-3xl border border-white/10 text-white shadow-turtle-lg"
    >
      {fallback && fallback.skipped.length > 0 ? (
        <div className="border-b border-amber-300/30 bg-amber-400/15 px-6 py-3 text-sm text-amber-100 sm:px-9">
          {fallback.skipped.map((item) => (
            <p key={item.session.id}>
              <span aria-hidden="true">⚠</span> <strong>{item.session.title}</strong> on{' '}
              {formatDate(item.date)} is cancelled
              {item.change?.reason ? `: ${item.change.reason}` : '.'}
            </p>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10">
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

          {fallback?.change?.status === 'moved' && !fallbackRsvp ? (
            <p className="mt-3 inline-flex rounded-lg border border-amber-300/30 bg-amber-400/15 px-3 py-1.5 text-sm text-amber-100">
              <span aria-hidden="true">↻</span>&nbsp;Moved this week
              {fallback.change.reason ? `: ${fallback.change.reason}` : ''}
            </p>
          ) : null}

          <p className="mt-3 text-lg font-semibold text-green-bright">
            {relativeDay(date)} · {formatTime(time)}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {formatLongDate(date)} · {location}
          </p>

          {note ? <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70">{note}</p> : null}

          {paceGroups.length > 0 && !fallbackRsvp ? (
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
            ) : fallbackRsvp ? (
              <SessionRsvp summary={fallbackRsvp} signedIn={signedIn} tone="dark" />
            ) : (
              <p className="text-sm text-white/60">
                Nothing published for this one yet — turn up anyway, we always do.
              </p>
            )}
          </div>

          <div className="mt-4">
            {event ? (
              <AddToCalendar event={event} tone="dark" />
            ) : fallback ? (
              <AddToCalendar session={fallback.session} tone="dark" />
            ) : null}
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
