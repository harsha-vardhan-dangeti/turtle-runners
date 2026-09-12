import { addDays, istToday, isoDayOfWeek } from '@/lib/time';
import type {
  Level,
  MemberDashboard,
  SessionSport,
  TrainingSession,
  TrainingSessionWithPb,
  WeeklyVolume,
} from '@/types';

/**
 * Training analytics, computed from what members actually logged.
 *
 * Every function here is pure: pass it sessions, get numbers back. Nothing is
 * generated, estimated or seeded — if a member logged nothing, they see zero.
 */

/** Weekly km targets by level. The one number the club still decides for you. */
const TARGETS: Record<Level, WeeklyVolume> = {
  starting: { run: 15, bike: 40, swim: 1.5 },
  regular: { run: 32, bike: 90, swim: 3 },
  racing: { run: 45, bike: 140, swim: 5 },
  chasing: { run: 55, bike: 180, swim: 6.5 },
};

export function targetsFor(level: Level): WeeklyVolume {
  return TARGETS[level];
}

/** Monday-anchored start of the IST week containing `now`. */
export function weekStart(now: Date = new Date()): string {
  const today = istToday(now);
  return addDays(today, -(isoDayOfWeek(today) - 1));
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Sums distance by sport over sessions on or after `from`, in kilometres. */
export function volumeSince(sessions: TrainingSession[], from: string): WeeklyVolume {
  const totals: WeeklyVolume = { run: 0, bike: 0, swim: 0 };
  for (const session of sessions) {
    if (session.date < from) continue;
    totals[session.sport] += session.distance_m;
  }
  return {
    run: round(totals.run / 1000),
    bike: round(totals.bike / 1000),
    swim: round(totals.swim / 1000, 2),
  };
}

/**
 * Consecutive weeks with at least one logged session.
 *
 * The current week only breaks a streak once it is over, so logging nothing by
 * Monday lunchtime does not wipe out three months of consistency.
 */
export function computeStreak(sessions: TrainingSession[], now: Date = new Date()): number {
  if (sessions.length === 0) return 0;

  const weeks = new Set<string>();
  for (const session of sessions) {
    weeks.add(addDays(session.date, -(isoDayOfWeek(session.date) - 1)));
  }

  const thisWeek = weekStart(now);
  let cursor = weeks.has(thisWeek) ? thisWeek : addDays(thisWeek, -7);
  let streak = 0;

  while (weeks.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }

  return streak;
}

function paceSecondsPerKm(session: TrainingSession): number {
  return session.duration_s / (session.distance_m / 1000);
}

/** Minimum distance before a "fastest" badge means anything. */
const PB_MINIMUM_M: Record<SessionSport, number> = { run: 5000, bike: 20000, swim: 1000 };

const LONGEST_LABEL: Record<SessionSport, string> = {
  run: 'Longest run',
  bike: 'Longest ride',
  swim: 'Longest swim',
};

const FASTEST_LABEL: Record<SessionSport, string> = {
  run: 'Fastest 5K+',
  bike: 'Fastest 20K+',
  swim: 'Fastest 1K+',
};

/**
 * Marks personal bests across a member's whole history: the longest session per
 * sport, and the fastest over a distance worth comparing.
 */
export function derivePbs(all: TrainingSession[]): Map<string, string> {
  const badges = new Map<string, string>();
  const sports: SessionSport[] = ['run', 'bike', 'swim'];

  for (const sport of sports) {
    const ofSport = all.filter((session) => session.sport === sport);
    if (ofSport.length === 0) continue;

    const longest = ofSport.reduce((best, session) =>
      session.distance_m > best.distance_m ? session : best,
    );
    badges.set(longest.id, LONGEST_LABEL[sport]);

    const eligible = ofSport.filter((session) => session.distance_m >= PB_MINIMUM_M[sport]);
    if (eligible.length === 0) continue;

    const fastest = eligible.reduce((best, session) =>
      paceSecondsPerKm(session) < paceSecondsPerKm(best) ? session : best,
    );
    // A session can only wear one badge; longest wins, it is the rarer feat.
    if (!badges.has(fastest.id)) badges.set(fastest.id, FASTEST_LABEL[sport]);
  }

  return badges;
}

export function withPbs(
  sessions: TrainingSession[],
  badges: Map<string, string>,
): TrainingSessionWithPb[] {
  return sessions.map((session) => ({ ...session, pb: badges.get(session.id) ?? null }));
}

/** "10.3 km" for run and bike, "2,150 m" for swim. */
export function formatDistance(session: Pick<TrainingSession, 'sport' | 'distance_m'>): string {
  if (session.sport === 'swim') {
    return `${session.distance_m.toLocaleString('en-IN')} m`;
  }
  return `${round(session.distance_m / 1000)} km`;
}

/** "5:24 /km", "28.4 km/h", "2:05 /100m" — whichever the sport is measured in. */
export function formatEffort(session: Pick<TrainingSession, 'sport' | 'distance_m' | 'duration_s'>): string {
  if (session.distance_m <= 0 || session.duration_s <= 0) return '—';

  if (session.sport === 'bike') {
    const kmh = session.distance_m / 1000 / (session.duration_s / 3600);
    return `${round(kmh)} km/h`;
  }

  const per = session.sport === 'swim' ? 100 : 1000;
  const seconds = session.duration_s / (session.distance_m / per);
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  const unit = session.sport === 'swim' ? '/100m' : '/km';
  return `${minutes}:${String(remainder).padStart(2, '0')} ${unit}`;
}

/** "1:12:40" or "48:15" — always the shortest form that fits. */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Accepts "45:30", "1:12:40" or plain minutes ("45"), and returns seconds.
 * Throws with a message the member can act on.
 */
export function parseDuration(input: string): number {
  const trimmed = input.trim();
  if (!/^\d{1,2}(:\d{1,2}){0,2}$/.test(trimmed)) {
    throw new Error('Time should look like 45:30 or 1:12:40.');
  }

  const parts = trimmed.split(':').map(Number);
  let seconds = 0;
  if (parts.length === 1) seconds = (parts[0] ?? 0) * 60;
  else if (parts.length === 2) seconds = (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  else seconds = (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);

  if (seconds <= 0) throw new Error('How long did it take?');
  if (seconds > 200000) throw new Error('That is over 55 hours — check the time.');
  return seconds;
}

/**
 * Everything the member dashboard needs, from the member's own sessions.
 * `all` should be their full history; `recent` is what the feed renders.
 */
export function buildDashboard(
  level: Level,
  all: TrainingSession[],
  recentLimit = 6,
  now: Date = new Date(),
): MemberDashboard {
  const sorted = [...all].sort((a, b) => b.date.localeCompare(a.date));
  const badges = derivePbs(all);

  return {
    streak: computeStreak(all, now),
    volume: volumeSince(all, weekStart(now)),
    targets: targetsFor(level),
    sessions: withPbs(sorted.slice(0, recentLimit), badges),
    lastSessionDate: sorted[0]?.date ?? null,
    totalSessions: all.length,
  };
}
