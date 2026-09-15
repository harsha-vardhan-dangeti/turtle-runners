import type { EventType, TrainingGround, WeeklySession } from '@/types';

/** Club-wide constants: one place for every piece of real-world detail. */

export const CLUB = {
  name: 'Turtle Runners',
  tagline: 'Swim · Bike · Run · Hyderabad',
  homeBase: 'Durgam Cheruvu Lake Front Park',
  city: 'Hyderabad, India',
  timezone: 'Asia/Kolkata',
  whatsapp: 'https://chat.whatsapp.com/turtle-runners',
  strava: 'https://www.strava.com/clubs/2337097',
  instagram: 'https://www.instagram.com/turtlerunners',
  email: 'hello@turtlerunners.club',
} as const;


/**
 * The club's starting rhythm. Admins edit the live copy in the database
 * (`weekly_sessions`); this is what seeds it, and what demo mode and the
 * offline fallback render.
 */
// Real geocoded meeting points; admins can re-pin from Admin → Schedule.
export const DEFAULT_WEEKLY_SCHEDULE: WeeklySession[] = [
  {
    id: 'wk-tue-track',
    iso_dow: 2,
    title: 'Track intervals',
    type: 'run',
    time: '05:45',
    location: 'Gachibowli Athletics Stadium',
    lat: 17.4462,
    lng: 78.3441,
    note: 'Warm-up together at 5:45, main set 6:05. Bring a headlamp in winter.',
    pace_groups: ['6:30+ /km', '5:45–6:30 /km', '5:00–5:45 /km', 'Sub 5:00 /km'],
    pace_group_limits: {},
    active: true,
    ground_id: null,
    created_at: '2021-06-14T00:00:00.000Z',
  },
  {
    id: 'wk-thu-swim',
    iso_dow: 4,
    title: 'Swim squad',
    type: 'swim',
    time: '06:00',
    location: 'GMC Balayogi pool, Gachibowli',
    lat: 17.4462,
    lng: 78.3441,
    note: 'Lane 1 is the learner lane and it is never empty. Coached drills, then a main set.',
    pace_groups: ['Learner lane', '2:30 /100m', '2:00 /100m', 'Sub 1:45 /100m'],
    pace_group_limits: {},
    active: true,
    ground_id: null,
    created_at: '2021-06-14T00:00:00.000Z',
  },
  {
    id: 'wk-sat-ride',
    iso_dow: 6,
    title: 'Long ride',
    type: 'bike',
    time: '05:30',
    location: 'ORR service roads',
    lat: 17.418,
    lng: 78.364,
    note: 'Rolling out sharp at 5:30 from the lake. Two groups, both regroup at every exit.',
    pace_groups: ['22–25 km/h', '25–28 km/h', '28–32 km/h', '32+ km/h'],
    pace_group_limits: {},
    active: true,
    ground_id: null,
    created_at: '2021-06-14T00:00:00.000Z',
  },
  {
    id: 'wk-sun-long',
    iso_dow: 7,
    title: 'Long run + monthly brick',
    type: 'run',
    time: '06:00',
    location: 'Durgam Cheruvu Lake Front Park',
    lat: 17.4311,
    lng: 78.392,
    note: 'Long run every week. First Sunday of the month we make it a brick — ride, then run.',
    pace_groups: ['Walk–run', '7:00+ /km', '6:00–7:00 /km', 'Sub 6:00 /km'],
    pace_group_limits: {},
    active: true,
    ground_id: null,
    created_at: '2021-06-14T00:00:00.000Z',
  },
];

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/** 1 = Monday … 7 = Sunday. */
export function dayName(isoDow: number): string {
  return DAY_NAMES[isoDow - 1] ?? '';
}

export function dayShort(isoDow: number): string {
  return dayName(isoDow).slice(0, 3);
}

/** Sorted the way the week runs, not the way rows came back. */
export function sortSchedule(schedule: WeeklySession[]): WeeklySession[] {
  return [...schedule].sort((a, b) => a.iso_dow - b.iso_dow || a.time.localeCompare(b.time));
}

const TICKER_REFRAINS = ['All levels welcome', 'Chai after, always'];

/** Weekly sessions interleaved with the two things we always say. */
export function tickerItems(schedule: WeeklySession[], formatTime: (time: string) => string): string[] {
  const active = sortSchedule(schedule.filter((session) => session.active));
  if (active.length === 0) return TICKER_REFRAINS;

  return active.flatMap((session, index) => [
    `${dayShort(session.iso_dow)} · ${session.title} · ${formatTime(session.time)}`,
    TICKER_REFRAINS[index % TICKER_REFRAINS.length] ?? TICKER_REFRAINS[0]!,
  ]);
}

/**
 * Pace groups belong to the session, not to the sport: the Sunday long run and
 * Tuesday's track intervals are both runs, but the groups are nothing alike.
 * Match on the weekday first, fall back to the sport, and show nothing at all
 * for a social.
 *
 * @param isoDow ISO weekday of the session date (1 = Monday … 7 = Sunday)
 */
export function paceGroupsFor(
  type: EventType,
  isoDow: number,
  schedule: WeeklySession[] = DEFAULT_WEEKLY_SCHEDULE,
): string[] {
  if (type === 'social') return [];

  const active = schedule.filter((session) => session.active);

  const sameDay = active.find((session) => session.iso_dow === isoDow);
  if (sameDay && (sameDay.type === type || type === 'brick')) return sameDay.pace_groups;

  return active.find((session) => session.type === type)?.pace_groups ?? [];
}

/**
 * Fallback route cards. Used only when the training_grounds table is empty,
 * so a fresh database still renders a complete landing page.
 */
export const DEFAULT_TRAINING_GROUNDS: TrainingGround[] = [
  {
    id: 'lake-loop',
    sport: 'run',
    title: 'Lake loop',
    subtitle: 'Durgam Cheruvu Lake Front Park',
    stats: [
      { label: 'Distance', value: '5.2 km' },
      { label: 'Elevation', value: '42 m' },
      { label: 'Surface', value: 'Paved path' },
    ],
    elevation: [0.2, 0.28, 0.24, 0.42, 0.55, 0.48, 0.62, 0.5, 0.38, 0.44, 0.3, 0.22],
    waypoints: [],
    gpx: '/routes/lake-loop.gpx',
    strava: 'https://www.strava.com/clubs/2337097',
    lat: 17.4311,
    lng: 78.392,
    position: 0,
    active: true,
    status_note: null,
    meet_at: null,
    parking: null,
    facilities: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'orr-loop',
    sport: 'bike',
    title: 'ORR loop',
    subtitle: 'Outer Ring Road service roads',
    stats: [
      { label: 'Distance', value: '42 km' },
      { label: 'Elevation', value: '180 m' },
      { label: 'Surface', value: 'Smooth tarmac' },
    ],
    elevation: [0.15, 0.3, 0.52, 0.4, 0.66, 0.78, 0.6, 0.72, 0.48, 0.34, 0.42, 0.18],
    waypoints: [],
    gpx: '/routes/orr-loop.gpx',
    strava: 'https://www.strava.com/clubs/2337097',
    lat: 17.418,
    lng: 78.364,
    position: 1,
    active: true,
    status_note: null,
    meet_at: null,
    parking: null,
    facilities: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'gmc-pool',
    sport: 'swim',
    title: 'GMC pool',
    subtitle: 'GMC Balayogi Stadium, Gachibowli',
    stats: [
      { label: 'Length', value: '50 m' },
      { label: 'Lanes', value: '8' },
      { label: 'Water', value: 'Outdoor, heated' },
    ],
    elevation: [0.5, 0.48, 0.52, 0.47, 0.53, 0.46, 0.54, 0.47, 0.52, 0.49, 0.51, 0.5],
    waypoints: [],
    gpx: '/routes/gmc-pool.gpx',
    strava: 'https://www.strava.com/clubs/2337097',
    lat: 17.4462,
    lng: 78.3441,
    position: 2,
    active: true,
    status_note: null,
    meet_at: null,
    parking: null,
    facilities: null,
    created_at: '2026-01-01T00:00:00Z',
  },
];

export const FAQS = [
  {
    q: 'Do I have to do all three sports?',
    a: 'No — start with one. Plenty of turtles came for the Sunday run and only touched a bike a year later. Pick the session that fits your week, show up, and let the rest happen when it happens.',
  },
  {
    q: "What if I can't swim?",
    a: 'Lane 1 is the learner lane and it is never empty. Thursday mornings we have members who started with a kickboard and a lot of nerves, and coaches who have taught dozens of adults to swim. You will not be the only beginner in the water.',
  },
  {
    q: 'Do I need an expensive bike?',
    a: 'No. Saturday rides have hybrids, ten-year-old MTBs and a couple of tri bikes, and the group regroups at every exit. Bring whatever rolls, a helmet, and working brakes — that is the entire kit list.',
  },
];

/** Deterministic race-bib number from a user id — same id, same bib, forever. */
export function bibNumber(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return String(1000 + (hash % 9000));
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
