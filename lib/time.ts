/**
 * Every club session happens on India Standard Time (UTC+5:30, no DST).
 * These helpers keep date maths anchored to IST no matter where the
 * browser or the serverless region actually is.
 */

export const IST_TZ = 'Asia/Kolkata';
const IST_SUFFIX = '+05:30';

const ymdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's calendar date in Hyderabad, as YYYY-MM-DD. */
export function istToday(now: Date = new Date()): string {
  return ymdFormatter.format(now);
}

/** The exact instant a YYYY-MM-DD + HH:MM pairing happens in IST. */
export function istInstant(ymd: string, hhmm: string): Date {
  return new Date(`${ymd}T${hhmm.slice(0, 5)}:00${IST_SUFFIX}`);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoDayOfWeek(ymd: string): number {
  const day = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function addDays(ymd: string, days: number): string {
  const date = new Date(`${ymd}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The next date (today included, if it has not started yet) matching a weekday. */
export function nextOccurrence(
  isoDow: number,
  hhmm: string,
  now: Date = new Date(),
): { date: string; at: Date } {
  const today = istToday(now);
  const delta = (isoDow - isoDayOfWeek(today) + 7) % 7;
  let date = addDays(today, delta);
  if (istInstant(date, hhmm).getTime() <= now.getTime()) {
    date = addDays(date, 7);
  }
  return { date, at: istInstant(date, hhmm) };
}

export function isPast(ymd: string, hhmm: string, now: Date = new Date()): boolean {
  return istInstant(ymd, hhmm).getTime() < now.getTime();
}

const dateLabelFormatter = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

const longDateFormatter = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/** "Sat, 29 Aug" */
export function formatDate(ymd: string): string {
  return dateLabelFormatter.format(new Date(`${ymd}T00:00:00Z`));
}

/** "Saturday, 29 August" */
export function formatLongDate(ymd: string): string {
  return longDateFormatter.format(new Date(`${ymd}T00:00:00Z`));
}

export function weekdayName(ymd: string): string {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(`${ymd}T00:00:00Z`),
  );
}

/** "5:45 AM" from "05:45" or "05:45:00". */
export function formatTime(hhmm: string): string {
  const [rawHour = '0', rawMinute = '00'] = hhmm.split(':');
  const hour = Number(rawHour);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${rawMinute.padStart(2, '0')} ${suffix}`;
}

/** "Today", "Tomorrow", or "Saturday". */
export function relativeDay(ymd: string, now: Date = new Date()): string {
  const today = istToday(now);
  if (ymd === today) return 'Today';
  if (ymd === addDays(today, 1)) return 'Tomorrow';
  return weekdayName(ymd);
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

export function countdownTo(target: Date, now: Date = new Date()): Countdown {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: false,
  };
}

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** "3 months in" — used on member cards. */
export function memberSince(joinedAt: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(joinedAt));
}

/** Current hour (0–23) in Hyderabad — used for the dashboard greeting. */
export function istHour(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: IST_TZ,
      hour: '2-digit',
      hour12: false,
    }).format(now),
  );
}
