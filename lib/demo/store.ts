import { DEFAULT_TRAINING_GROUNDS, DEFAULT_WEEKLY_SCHEDULE, sortSchedule } from '@/lib/club';
import { DEMO_MEMBER_ID, DEMO_PROFILES, DEMO_TESTIMONIALS, SESSION_NAMES } from '@/lib/demo/fixtures';
import { addDays, isPast, istToday, isoDayOfWeek, nextOccurrence } from '@/lib/time';
import type {
  ClubBranding,
  ClubEvent,
  StravaWidgets,
  OccurrenceChange,
  Profile,
  Rsvp,
  SessionSport,
  Testimonial,
  TrainingGround,
  TrainingSession,
  WeeklySession,
} from '@/types';

/**
 * In-memory database for demo mode.
 *
 * Kept on globalThis so it survives Next's dev-server hot reloads. It is per
 * process, so a serverless deployment in demo mode resets whenever the
 * instance recycles — that is fine for a demo and is called out in the README.
 */

export interface DemoSessionRsvp {
  weekly_session_id: string;
  occurs_on: string;
  user_id: string;
  pace_group: string | null;
  created_at: string;
}

export interface DemoState {
  profiles: Profile[];
  weeklySessions: WeeklySession[];
  events: ClubEvent[];
  rsvps: Rsvp[];
  testimonials: Testimonial[];
  sessions: TrainingSession[];
  trainingGrounds: TrainingGround[];
  /** RSVPs to weekly session occurrences, keyed like the session_rsvps table. */
  sessionRsvps: DemoSessionRsvp[];
  /** Cancelled and moved dates, like the session_changes table. */
  sessionChanges: OccurrenceChange[];
  /** An uploaded logo is kept as a data URL: there is no Storage in demo mode. */
  branding: ClubBranding;
  /** The pasted Strava widget code, or null until an admin adds one. */
  stravaWidgets: StravaWidgets | null;
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — used only to make the seeded training history look lived-in. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isFirstSundayOfMonth(ymd: string): boolean {
  const day = Number(ymd.slice(8, 10));
  return isoDayOfWeek(ymd) === 7 && day <= 7;
}

/** Turns the recurring weekly schedule into concrete event rows. */
function seedEvents(schedule: WeeklySession[]): ClubEvent[] {
  const today = istToday();
  const events: ClubEvent[] = [];
  const active = sortSchedule(schedule.filter((session) => session.active));

  for (let offset = -42; offset <= 21; offset += 1) {
    const date = addDays(today, offset);
    const session = active.find((item) => item.iso_dow === isoDayOfWeek(date));
    if (!session) continue;

    const brick = session.iso_dow === 7 && isFirstSundayOfMonth(date);
    events.push({
      id: `evt-${date}`,
      title: brick ? 'Long run + brick' : session.title,
      type: brick ? 'brick' : session.type,
      date,
      time: session.time,
      location: session.location,
      lat: session.lat,
      lng: session.lng,
      note: brick
        ? 'First Sunday of the month: 40 min ride straight into a 5 km run. Rack your bike by the boardwalk.'
        : session.note,
      created_by: DEMO_PROFILES[0]?.id ?? null,
      created_at: new Date().toISOString(),
    });
  }

  const past = events.filter((event) => isPast(event.date, event.time));
  const upcoming = events.filter((event) => !isPast(event.date, event.time));
  return [...past.slice(-8), ...upcoming.slice(0, 4)];
}

/**
 * Deterministic RSVPs so counts do not jump between renders. People turn up
 * more for their own sport, and Sunday is always the busiest morning.
 */
function seedRsvps(events: ClubEvent[], profiles: Profile[]): Rsvp[] {
  const rsvps: Rsvp[] = [];
  for (const event of events) {
    const sundayBonus = isoDayOfWeek(event.date) === 7 ? 12 : 0;
    profiles.forEach((profile) => {
      const affinity = profile.sport === 'all' || profile.sport === event.type ? 26 : 0;
      const roll = hash(`${event.id}:${profile.id}`) % 100;
      if (roll < 30 + affinity + sundayBonus) {
        rsvps.push({
          event_id: event.id,
          user_id: profile.id,
          created_at: new Date().toISOString(),
        });
      }
    });
  }
  return rsvps;
}

const LEVEL_ORDER: Profile['level'][] = ['starting', 'regular', 'racing', 'chasing'];

/**
 * A believable crowd for each weekly session's next occurrence: beginners in
 * the slowest group, racers in the fastest, a few who have not picked. The
 * demo member is left out so RSVPing can be tried from a clean slate.
 */
function seedSessionRsvps(schedule: WeeklySession[], profiles: Profile[]): DemoSessionRsvp[] {
  const rows: DemoSessionRsvp[] = [];
  for (const session of schedule.filter((item) => item.active)) {
    const occursOn = nextOccurrence(session.iso_dow, session.time).date;
    for (const profile of profiles) {
      if (profile.id === DEMO_MEMBER_ID) continue;
      const roll = hash(`${session.id}:${profile.id}`) % 100;
      const affinity = profile.sport === 'all' || profile.sport === session.type ? 30 : 0;
      if (roll >= 35 + affinity) continue;

      const groups = session.pace_groups;
      const index = Math.min(groups.length - 1, LEVEL_ORDER.indexOf(profile.level));
      rows.push({
        weekly_session_id: session.id,
        occurs_on: occursOn,
        user_id: profile.id,
        pace_group: groups.length > 0 && roll % 4 !== 0 ? (groups[index] ?? null) : null,
        created_at: new Date().toISOString(),
      });
    }
  }
  return rows;
}

/** How hard each level trains, per session. */
const LEVEL_SCALE: Record<Profile['level'], number> = {
  starting: 0.6,
  regular: 1,
  racing: 1.35,
  chasing: 1.6,
};

/** Metres and seconds that read like a real morning out. */
function buildSession(
  profile: Profile,
  date: string,
  sport: SessionSport,
  rng: () => number,
  clubTitle?: string,
): TrainingSession {
  // Club mornings are the long ones; solo midweek sessions are shorter.
  const scale = LEVEL_SCALE[profile.level] * (clubTitle ? 1 : 0.55);
  const names = SESSION_NAMES[sport];
  // Club mornings keep the club's name for the session; solo days get a
  // generic one, so nothing ends up called "Sunday long run" on a Friday.
  const title =
    clubTitle ?? names[Math.min(names.length - 1, Math.floor(rng() * names.length))] ?? 'Session';

  let distance_m: number;
  let duration_s: number;

  if (sport === 'run') {
    distance_m = Math.round((4000 + rng() * 12000) * scale);
    duration_s = Math.round((distance_m / 1000) * (300 + rng() * 120));
  } else if (sport === 'bike') {
    distance_m = Math.round((20000 + rng() * 45000) * scale);
    duration_s = Math.round((distance_m / 1000) * (3600 / (23 + rng() * 10)));
  } else {
    distance_m = Math.round((800 + rng() * 1800) * scale);
    duration_s = Math.round((distance_m / 100) * (105 + rng() * 55));
  }

  return {
    id: `ses-${profile.id.slice(0, 8)}-${date}-${sport}`,
    user_id: profile.id,
    date,
    sport,
    title,
    distance_m,
    duration_s,
    note: null,
    source: 'manual',
    strava_activity_id: null,
    ground_id: null,
    created_at: new Date(`${date}T12:00:00Z`).toISOString(),
  };
}

/**
 * Ten weeks of training history so the dashboard, the streak and the club
 * stats band all have something real to compute over.
 */
function seedSessions(profiles: Profile[], schedule: WeeklySession[]): TrainingSession[] {
  const today = istToday();
  const sessions: TrainingSession[] = [];
  const active = schedule.filter((session) => session.active);

  for (const profile of profiles) {
    const rng = makeRng(hash(`sessions:${profile.id}`));

    for (let offset = 70; offset >= 0; offset -= 1) {
      const date = addDays(today, -offset);
      if (date > today) continue;

      const dow = isoDayOfWeek(date);
      const clubSession = active.find((item) => item.iso_dow === dow);

      let sport: SessionSport | null = null;
      let clubTitle: string | undefined;
      if (clubSession && clubSession.type !== 'social' && clubSession.type !== 'brick') {
        // Turns up to the club session most weeks, in their own sport more often.
        const keen = profile.sport === 'all' || profile.sport === clubSession.type ? 0.82 : 0.45;
        if (rng() < keen) {
          sport = clubSession.type as SessionSport;
          clubTitle = clubSession.title;
        }
      } else if (rng() < 0.3) {
        sport = rng() < 0.7 ? 'run' : 'bike';
      }

      if (sport) sessions.push(buildSession(profile, date, sport, rng, clubTitle));
    }
  }

  return sessions;
}

function createState(): DemoState {
  const profiles = DEMO_PROFILES.map((profile) => ({ ...profile }));
  const weeklySessions = DEFAULT_WEEKLY_SCHEDULE.map((session) => ({ ...session }));
  const events = seedEvents(weeklySessions);
  const sessionRsvps = seedSessionRsvps(weeklySessions, profiles);

  // Give the Sunday long run capped groups, one of them already full, so the
  // demo shows every state a pace-group chip can be in.
  const sunday = weeklySessions.find((session) => session.id === 'wk-sun-long');
  if (sunday) {
    const fastest = sunday.pace_groups[sunday.pace_groups.length - 1];
    const second = sunday.pace_groups[sunday.pace_groups.length - 2];
    const taken = sessionRsvps.filter(
      (row) => row.weekly_session_id === sunday.id && row.pace_group === fastest,
    ).length;
    sunday.pace_group_limits = {
      ...(fastest ? { [fastest]: Math.max(taken, 1) } : {}),
      ...(second ? { [second]: 8 } : {}),
    };
  }

  return {
    profiles,
    weeklySessions,
    events,
    rsvps: seedRsvps(events, profiles),
    testimonials: DEMO_TESTIMONIALS.map((testimonial) => ({ ...testimonial })),
    sessions: seedSessions(profiles, weeklySessions),
    // Seeded from the same defaults the live table falls back to.
    trainingGrounds: DEFAULT_TRAINING_GROUNDS.map((ground) => ({ ...ground })),
    sessionRsvps,
    sessionChanges: [],
    branding: { useCustomLogo: false, logoUrl: null },
    stravaWidgets: null,
  };
}

const globalForDemo = globalThis as typeof globalThis & { __turtleDemoState?: DemoState };

export function demoState(): DemoState {
  if (!globalForDemo.__turtleDemoState) {
    globalForDemo.__turtleDemoState = createState();
  }
  const state = globalForDemo.__turtleDemoState;
  // A store created by older code survives hot reloads; give it the
  // collections added since, rather than crashing on the first read.
  state.sessionRsvps ??= [];
  state.sessionChanges ??= [];
  state.branding ??= { useCustomLogo: false, logoUrl: null };
  state.stravaWidgets ??= null;
  for (const session of state.weeklySessions) session.pace_group_limits ??= {};
  return state;
}

/** Rebuilds the seeded data from scratch. Exported for the demo reset action. */
export function resetDemoState(): void {
  globalForDemo.__turtleDemoState = createState();
}

export function demoId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
