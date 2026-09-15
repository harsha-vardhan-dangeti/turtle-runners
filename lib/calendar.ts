import { CLUB, dayName } from '@/lib/club';
import { SITE_URL } from '@/lib/env';
import { mapDirectionsUrl } from '@/lib/maps';
import { formatDate, formatTime, IST_TZ, nextOccurrence } from '@/lib/time';
import type { ClubEvent, EventType, WeeklySession } from '@/types';

/**
 * Calendar files, calendar links and share links, with no API keys.
 *
 * Times are written in Asia/Kolkata with an embedded VTIMEZONE rather than
 * converted to UTC. That matters for the weekly sessions: a 05:15 run is the
 * previous day in UTC, and a UTC recurrence rule would put it on the wrong
 * weekday for everyone.
 */

/** How long each kind of session is blocked out in a calendar. A guess, not a promise. */
const DURATION_MINUTES: Record<EventType, number> = {
  run: 90,
  bike: 180,
  swim: 75,
  brick: 150,
  social: 90,
};

const ICAL_DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

/** Absolute base for links that leave the site (calendar apps, WhatsApp). */
export function siteBase(): string {
  return SITE_URL.replace(/\/$/, '');
}

/** One occurrence that differs from the weekly template. Filled in by the cancel/move feature. */
export interface OccurrenceChange {
  occurs_on: string;
  status: 'cancelled' | 'moved';
  reason: string | null;
  new_time: string | null;
  new_location: string | null;
}

// ---------------------------------------------------------------------------
// Local date-time arithmetic, on naive IST wall-clock values
// ---------------------------------------------------------------------------

/** "2026-09-17" + "06:00" → "20260917T060000" */
function localStamp(ymd: string, hhmm: string): string {
  return `${ymd.replaceAll('-', '')}T${hhmm.slice(0, 5).replace(':', '')}00`;
}

/** Adds minutes to a wall-clock time without ever consulting a timezone. */
function addMinutes(ymd: string, hhmm: string, minutes: number): { ymd: string; hhmm: string } {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCMinutes(h * 60 + m + minutes);
  return { ymd: d.toISOString().slice(0, 10), hhmm: d.toISOString().slice(11, 16) };
}

function utcStamp(date: Date = new Date()): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// ---------------------------------------------------------------------------
// iCalendar (RFC 5545)
// ---------------------------------------------------------------------------

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

const encoder = new TextEncoder();

/**
 * Lines longer than 75 octets must be folded. Counted in UTF-8 bytes, not
 * characters, and never splitting a character: an emoji is four bytes.
 */
function fold(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  // Continuation lines start with a space, which counts towards their 75.
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${IST_TZ}`,
  'BEGIN:STANDARD',
  'DTSTART:19700101T000000',
  'TZOFFSETFROM:+0530',
  'TZOFFSETTO:+0530',
  'TZNAME:IST',
  'END:STANDARD',
  'END:VTIMEZONE',
];

function calendar(name: string, events: string[][]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Turtle Runners//Club calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    `X-WR-TIMEZONE:${IST_TZ}`,
    // Subscribed calendars re-fetch on roughly this cadence.
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
    ...VTIMEZONE,
    ...events.flat(),
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

function describe(note: string | null, place: { lat: number | null; lng: number | null; location: string }) {
  return [note, `Directions: ${mapDirectionsUrl(place)}`, siteBase()].filter(Boolean).join('\n\n');
}

function eventBlock(event: ClubEvent): string[] {
  const end = addMinutes(event.date, event.time, DURATION_MINUTES[event.type]);
  return [
    'BEGIN:VEVENT',
    `UID:event-${event.id}@turtlerunners`,
    `DTSTAMP:${utcStamp()}`,
    `DTSTART;TZID=${IST_TZ}:${localStamp(event.date, event.time)}`,
    `DTEND;TZID=${IST_TZ}:${localStamp(end.ymd, end.hhmm)}`,
    `SUMMARY:${escapeText(`${CLUB.name} · ${event.title}`)}`,
    `LOCATION:${escapeText(event.location)}`,
    `DESCRIPTION:${escapeText(describe(event.note, event))}`,
    ...(event.lat !== null && event.lng !== null ? [`GEO:${event.lat};${event.lng}`] : []),
    `URL:${siteBase()}/#next-session`,
    'END:VEVENT',
  ];
}

/**
 * A weekly session as one recurring event, starting from its next occurrence.
 * Cancelled weeks become EXDATEs; moved weeks become an override event for
 * that one date (RECURRENCE-ID), so the rest of the series is untouched.
 */
function sessionBlocks(session: WeeklySession, changes: OccurrenceChange[] = []): string[][] {
  const first = nextOccurrence(session.iso_dow, session.time).date;
  const minutes = DURATION_MINUTES[session.type];
  const end = addMinutes(first, session.time, minutes);
  const uid = `session-${session.id}@turtlerunners`;
  const summary = escapeText(`${CLUB.name} · ${session.title}`);

  const upcoming = changes.filter((change) => change.occurs_on >= first);
  const cancelled = upcoming.filter((change) => change.status === 'cancelled');
  const moved = upcoming.filter((change) => change.status === 'moved');

  const series = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${utcStamp()}`,
    `DTSTART;TZID=${IST_TZ}:${localStamp(first, session.time)}`,
    `DTEND;TZID=${IST_TZ}:${localStamp(end.ymd, end.hhmm)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${ICAL_DAYS[session.iso_dow - 1]}`,
    ...cancelled.map(
      (change) => `EXDATE;TZID=${IST_TZ}:${localStamp(change.occurs_on, session.time)}`,
    ),
    `SUMMARY:${summary}`,
    `LOCATION:${escapeText(session.location)}`,
    `DESCRIPTION:${escapeText(describe(session.note, session))}`,
    ...(session.lat !== null && session.lng !== null ? [`GEO:${session.lat};${session.lng}`] : []),
    `URL:${siteBase()}/#schedule`,
    'END:VEVENT',
  ];

  const overrides = moved.map((change) => {
    const time = change.new_time ?? session.time;
    const location = change.new_location ?? session.location;
    const until = addMinutes(change.occurs_on, time, minutes);
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${utcStamp()}`,
      `RECURRENCE-ID;TZID=${IST_TZ}:${localStamp(change.occurs_on, session.time)}`,
      `DTSTART;TZID=${IST_TZ}:${localStamp(change.occurs_on, time)}`,
      `DTEND;TZID=${IST_TZ}:${localStamp(until.ymd, until.hhmm)}`,
      `SUMMARY:${escapeText(`${CLUB.name} · ${session.title} (moved)`)}`,
      `LOCATION:${escapeText(location)}`,
      `DESCRIPTION:${escapeText(
        describe(change.reason ? `Moved this week: ${change.reason}` : 'Moved this week.', {
          lat: change.new_location ? null : session.lat,
          lng: change.new_location ? null : session.lng,
          location,
        }),
      )}`,
      'END:VEVENT',
    ];
  });

  return [series, ...overrides];
}

export function eventIcs(event: ClubEvent): string {
  return calendar(`${CLUB.name} · ${event.title}`, [eventBlock(event)]);
}

export function sessionIcs(session: WeeklySession, changes?: OccurrenceChange[]): string {
  return calendar(`${CLUB.name} · ${session.title}`, sessionBlocks(session, changes));
}

/** Every active weekly session plus the published events: the subscribable club feed. */
export function clubFeedIcs(
  schedule: WeeklySession[],
  events: ClubEvent[],
  changesBySession: Record<string, OccurrenceChange[]> = {},
): string {
  return calendar(CLUB.name, [
    ...schedule
      .filter((session) => session.active)
      .flatMap((session) => sessionBlocks(session, changesBySession[session.id])),
    ...events.map(eventBlock),
  ]);
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export function eventIcsPath(id: string): string {
  return `/calendar/event/${encodeURIComponent(id)}`;
}

export function sessionIcsPath(id: string): string {
  return `/calendar/session/${encodeURIComponent(id)}`;
}

/** webcal:// makes Apple Calendar and Outlook offer to subscribe rather than import once. */
export function clubFeedWebcalUrl(): string {
  return `${siteBase()}/calendar.ics`.replace(/^https?:\/\//, 'webcal://');
}

export function clubFeedGoogleUrl(): string {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(clubFeedWebcalUrl())}`;
}

function googleTemplateUrl(params: Record<string, string>): string {
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: 'TEMPLATE',
    ctz: IST_TZ,
    ...params,
  }).toString()}`;
}

export function eventGoogleUrl(event: ClubEvent): string {
  const end = addMinutes(event.date, event.time, DURATION_MINUTES[event.type]);
  return googleTemplateUrl({
    text: `${CLUB.name} · ${event.title}`,
    dates: `${localStamp(event.date, event.time)}/${localStamp(end.ymd, end.hhmm)}`,
    location: event.location,
    details: describe(event.note, event),
  });
}

export function sessionGoogleUrl(session: WeeklySession): string {
  const first = nextOccurrence(session.iso_dow, session.time).date;
  const end = addMinutes(first, session.time, DURATION_MINUTES[session.type]);
  return googleTemplateUrl({
    text: `${CLUB.name} · ${session.title}`,
    dates: `${localStamp(first, session.time)}/${localStamp(end.ymd, end.hhmm)}`,
    recur: `RRULE:FREQ=WEEKLY;BYDAY=${ICAL_DAYS[session.iso_dow - 1]}`,
    location: session.location,
    details: describe(session.note, session),
  });
}

function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function eventShareUrl(event: ClubEvent): string {
  return whatsappUrl(
    [
      `🐢 ${CLUB.name}: ${event.title}`,
      `${formatDate(event.date)} · ${formatTime(event.time)}`,
      `📍 ${event.location}`,
      `Directions: ${mapDirectionsUrl(event)}`,
      `All levels welcome → ${siteBase()}/#next-session`,
    ].join('\n'),
  );
}

export function sessionShareUrl(session: WeeklySession): string {
  return whatsappUrl(
    [
      `🐢 ${CLUB.name}: ${session.title}`,
      `Every ${dayName(session.iso_dow)} · ${formatTime(session.time)}`,
      `📍 ${session.location}`,
      `Directions: ${mapDirectionsUrl(session)}`,
      `All levels welcome → ${siteBase()}/#schedule`,
    ].join('\n'),
  );
}

/** Headers for a calendar file the browser should download or hand to a calendar app. */
export function icsHeaders(filename: string, cacheSeconds = 600): HeadersInit {
  return {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': `inline; filename="${filename.replace(/[^\w.-]+/g, '-')}"`,
    'Cache-Control': `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
  };
}
