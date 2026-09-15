import { addDays, istInstant, istToday, isoDayOfWeek } from '@/lib/time';
import type { OccurrenceChange, WeeklySession } from '@/types';

export interface Occurrence {
  /** IST date, YYYY-MM-DD. */
  date: string;
  /** When it actually starts, a moved time included. */
  at: Date;
  time: string;
  location: string;
  lat: number | null;
  lng: number | null;
  change: OccurrenceChange | null;
  cancelled: boolean;
}

function resolve(session: WeeklySession, date: string, changes: OccurrenceChange[]): Occurrence {
  const change = changes.find((item) => item.occurs_on === date) ?? null;
  const moved = change?.status === 'moved' ? change : null;
  const time = moved?.new_time ?? session.time;
  const newPlace = Boolean(moved?.new_location);
  return {
    date,
    at: istInstant(date, time),
    time,
    location: newPlace ? moved!.new_location! : session.location,
    // A new place without a pin must not keep the old place's pin.
    lat: newPlace ? (moved!.new_lat ?? null) : session.lat,
    lng: newPlace ? (moved!.new_lng ?? null) : session.lng,
    change,
    cancelled: change?.status === 'cancelled',
  };
}

/**
 * The next date of a weekly session that has not started yet, with that
 * date's cancellation or move applied. A cancelled date is still returned, so
 * the site can say "cancelled this week" rather than silently skip ahead.
 *
 * Mirrors public.session_next_occurrence() in migration 0013: the two must
 * agree, or the database refuses RSVPs the page offers.
 */
export function upcomingOccurrence(
  session: WeeklySession,
  changes: OccurrenceChange[] = [],
  now: Date = new Date(),
): Occurrence {
  const today = istToday(now);
  const date = addDays(today, (session.iso_dow - isoDayOfWeek(today) + 7) % 7);
  const first = resolve(session, date, changes);
  return first.at.getTime() <= now.getTime() ? resolve(session, addDays(date, 7), changes) : first;
}

/** The next few dates a session runs, for the admin's cancel/move picker. */
export function upcomingDates(session: WeeklySession, count: number, changes: OccurrenceChange[] = []): string[] {
  const first = upcomingOccurrence(session, changes).date;
  return Array.from({ length: count }, (_, index) => addDays(first, index * 7));
}
