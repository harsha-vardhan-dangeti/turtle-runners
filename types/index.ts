/** Domain types shared by the Supabase and demo-mode data sources. */

export type Sport = 'run' | 'bike' | 'swim' | 'all';
/** A logged session is exactly one sport — 'all' is a profile concept only. */
export type SessionSport = 'run' | 'bike' | 'swim';
export type Level = 'starting' | 'regular' | 'racing' | 'chasing';
export type Role = 'member' | 'admin';
export type EventType = 'run' | 'bike' | 'swim' | 'brick' | 'social';
export type TestimonialStatus = 'pending' | 'approved' | 'rejected';
/** Where a logged session came from. */
export type SessionSource = 'manual' | 'strava';

export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  sport: Sport;
  level: Level;
  goal: string | null;
  role: Role;
  joined_at: string;
  /** Non-null means removed from the club. Reversible by an admin. */
  removed_at: string | null;
  removed_by: string | null;
}

export interface ClubEvent {
  id: string;
  title: string;
  type: EventType;
  /** ISO date, e.g. 2026-08-25 */
  date: string;
  /** 24h clock in IST, e.g. 05:45 */
  time: string;
  location: string;
  /** Optional precise meeting point; falls back to searching `location`. */
  lat: number | null;
  lng: number | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EventWithRsvp extends ClubEvent {
  rsvp_count: number;
  going: boolean;
}

export interface Rsvp {
  event_id: string;
  user_id: string;
  created_at: string;
}

export interface Testimonial {
  id: string;
  user_id: string;
  text: string;
  status: TestimonialStatus;
  created_at: string;
}

export interface TestimonialWithAuthor extends Testimonial {
  author_name: string;
  author_avatar: string | null;
  author_role_label: string;
}

/** A training session a member logged, or that Strava imported for them. */
export interface TrainingSession {
  id: string;
  user_id: string;
  date: string;
  sport: SessionSport;
  title: string;
  /** Always metres, for every sport, so totals are one sum. */
  distance_m: number;
  duration_s: number;
  note: string | null;
  source: SessionSource;
  /** Set only on imported sessions; links the row back to Strava. */
  strava_activity_id: number | null;
  /** Where this happened, when we know. Matched from Strava or picked by hand. */
  ground_id: string | null;
  created_at: string;
}

/** A session plus any personal best it represents, derived at read time. */
export interface TrainingSessionWithPb extends TrainingSession {
  pb: string | null;
}

export interface GroundStat {
  label: string;
  value: string;
}

/** A route card on the landing page. Admin-managed; falls back to defaults. */
export interface TrainingGround {
  id: string;
  sport: SessionSport;
  title: string;
  subtitle: string;
  stats: GroundStat[];
  /** Normalised 0-1 samples, drawn as a self-drawing SVG line. */
  elevation: number[];
  /** Route points the profile was generated from. Admin-only; not rendered. */
  waypoints: { lat: number; lng: number }[];
  gpx: string | null;
  strava: string | null;
  /** Short-lived warning: waterlogged path, pool closed. Null when all is well. */
  status_note: string | null;
  /** Where exactly to stand, which beats a pin for a first-timer. */
  meet_at: string | null;
  parking: string | null;
  facilities: string | null;
  /** Meeting point; components build the map links from this. */
  lat: number | null;
  lng: number | null;
  position: number;
  active: boolean;
  created_at: string;
}

/** One of the club's recurring weekly sessions. */
export interface WeeklySession {
  id: string;
  /** ISO weekday: 1 = Monday … 7 = Sunday */
  iso_dow: number;
  title: string;
  type: EventType;
  /** 24h IST, e.g. "05:45" */
  time: string;
  location: string;
  /** Optional precise meeting point; falls back to searching `location`. */
  lat: number | null;
  lng: number | null;
  note: string | null;
  pace_groups: string[];
  active: boolean;
  /** The training ground this session meets at, when one is set. */
  ground_id: string | null;
  created_at: string;
}

export interface WeeklyVolume {
  run: number;
  bike: number;
  swim: number;
}

export interface MemberDashboard {
  /** Consecutive weeks with at least one logged session. */
  streak: number;
  volume: WeeklyVolume;
  targets: WeeklyVolume;
  sessions: TrainingSessionWithPb[];
  /** Null until the member logs their first session. */
  lastSessionDate: string | null;
  totalSessions: number;
}

export interface ClubStats {
  runKm: number;
  rideKm: number;
  swimKm: number;
  members: number;
}

export interface AdminOverview {
  members: number;
  admins: number;
  nextEvent: EventWithRsvp | null;
  nextEventRsvps: number;
  weeklyKm: number;
  pendingTestimonials: number;
  attendance: { label: string; value: number }[];
}

export const SPORT_LABEL: Record<Sport, string> = {
  run: 'Run',
  bike: 'Bike',
  swim: 'Swim',
  all: 'All three',
};

export const SPORT_EMOJI: Record<Sport, string> = {
  run: '🏃',
  bike: '🚴',
  swim: '🏊',
  all: '🔺',
};

export const LEVEL_LABEL: Record<Level, string> = {
  starting: 'Just starting',
  regular: 'Regular training',
  racing: 'Racing this season',
  chasing: 'Chasing a 70.3 / full',
};

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  run: 'Run',
  bike: 'Bike',
  swim: 'Swim',
  brick: 'Brick',
  social: 'Social',
};

export const EVENT_TYPE_EMOJI: Record<EventType, string> = {
  run: '🏃',
  bike: '🚴',
  swim: '🏊',
  brick: '🧱',
  social: '☕',
};

export const SPORTS: Sport[] = ['run', 'bike', 'swim', 'all'];
export const SESSION_SPORTS: SessionSport[] = ['run', 'bike', 'swim'];
export const LEVELS: Level[] = ['starting', 'regular', 'racing', 'chasing'];
export const EVENT_TYPES: EventType[] = ['run', 'bike', 'swim', 'brick', 'social'];

export function isSport(value: unknown): value is Sport {
  return typeof value === 'string' && (SPORTS as string[]).includes(value);
}

export function isLevel(value: unknown): value is Level {
  return typeof value === 'string' && (LEVELS as string[]).includes(value);
}

export function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && (EVENT_TYPES as string[]).includes(value);
}

export function isSessionSport(value: unknown): value is SessionSport {
  return typeof value === 'string' && (SESSION_SPORTS as string[]).includes(value);
}
