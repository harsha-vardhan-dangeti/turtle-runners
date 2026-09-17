import { cache } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { safeAvatarUrl } from '@/lib/avatar';
import { IS_DEMO } from '@/lib/env';
import { demoId, demoState } from '@/lib/demo/store';
import { getDemoProfile } from '@/lib/demo/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DEFAULT_TRAINING_GROUNDS, DEFAULT_WEEKLY_SCHEDULE, sortSchedule } from '@/lib/club';
import { buildDashboard, volumeSince, weekStart } from '@/lib/stats';
import { upcomingOccurrence } from '@/lib/occurrence';
import { isPast, istToday } from '@/lib/time';
import {
  LEVEL_LABEL,
  SPORT_LABEL,
  type AdminOverview,
  type ClubBranding,
  type ClubEvent,
  type ClubStats,
  type EventType,
  type EventWithRsvp,
  type LeaderboardRow,
  type Level,
  type OccurrenceChange,
  type Profile,
  type Role,
  type SessionAttendee,
  type SessionRsvpSummary,
  type Sport,
  type MemberDashboard,
  type MemberSnapshot,
  type SessionSport,
  type StravaWidgets,
  type Testimonial,
  type TestimonialStatus,
  type TestimonialWithAuthor,
  type TrainingGround,
  type TrainingSession,
  type WeeklySession,
} from '@/types';

/**
 * The single data access layer.
 *
 * Everything above this file (pages, server actions) is source-agnostic:
 * flip NEXT_PUBLIC_DEMO and the same calls hit an in-memory store instead of
 * Postgres. Supabase is never imported anywhere else.
 */

export interface EventInput {
  title: string;
  type: EventType;
  date: string;
  time: string;
  location: string;
  lat: number | null;
  lng: number | null;
  note: string | null;
}

export interface ProfileInput {
  sport: Sport;
  level: Level;
  goal: string | null;
  show_on_leaderboard: boolean;
}

export interface WeeklySessionInput {
  iso_dow: number;
  title: string;
  type: EventType;
  time: string;
  location: string;
  lat: number | null;
  lng: number | null;
  note: string | null;
  pace_groups: string[];
  pace_group_limits: Record<string, number>;
  active: boolean;
  ground_id: string | null;
}

export interface TrainingGroundInput {
  sport: SessionSport;
  title: string;
  subtitle: string;
  stats: { label: string; value: string }[];
  elevation: number[];
  waypoints: { lat: number; lng: number }[];
  gpx: string | null;
  strava: string | null;
  lat: number | null;
  lng: number | null;
  position: number;
  active: boolean;
  status_note: string | null;
  meet_at: string | null;
  parking: string | null;
  facilities: string | null;
}

export interface SessionInput {
  date: string;
  sport: SessionSport;
  title: string;
  distance_m: number;
  duration_s: number;
  note: string | null;
  /** Where it happened, when the member picks one. */
  ground_id?: string | null;
}

function sortByWhen<T extends { date: string; time: string }>(items: T[], direction: 1 | -1 = 1) {
  return [...items].sort(
    (a, b) => direction * `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
  );
}

function authorRoleLabel(sport: Sport, level: Level): string {
  return `${SPORT_LABEL[sport]} · ${LEVEL_LABEL[level]}`;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/**
 * Memoised for the lifetime of one request.
 *
 * A single landing-page render asks "who is this?" four times — the header, the
 * page itself, the event list and the testimonial list. Without this, each of
 * those is a round-trip to Supabase's auth server plus a `profiles` select.
 * React's cache() collapses them into one; the admin pages save five or six.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  if (IS_DEMO) return getDemoProfile();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (data) {
    // Removed members keep their row — that is what stops the self-heal below
    // resurrecting them — but they are signed out as far as the app cares.
    return data.removed_at ? null : data;
  }

  // First sign-in and the auth trigger has not landed yet — create it now.
  const metadata = user.user_metadata ?? {};
  const fallbackName =
    (typeof metadata.full_name === 'string' && metadata.full_name) ||
    (typeof metadata.name === 'string' && metadata.name) ||
    user.email?.split('@')[0] ||
    'Turtle';

  const { data: created } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        name: fallbackName,
        avatar_url: safeAvatarUrl(metadata.avatar_url),
      },
      { onConflict: 'id' },
    )
    .select('*')
    .maybeSingle();

  return created ?? null;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error('NOT_AUTHENTICATED');
  return profile;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

async function decorateEvents(events: ClubEvent[], viewerId: string | null): Promise<EventWithRsvp[]> {
  if (IS_DEMO) {
    const { rsvps } = demoState();
    return events.map((event) => ({
      ...event,
      rsvp_count: rsvps.filter((rsvp) => rsvp.event_id === event.id).length,
      going: viewerId
        ? rsvps.some((rsvp) => rsvp.event_id === event.id && rsvp.user_id === viewerId)
        : false,
    }));
  }

  if (events.length === 0) return [];

  const supabase = await createSupabaseServerClient();
  const ids = events.map((event) => event.id);

  const { data: counts } = await supabase
    .from('public_event_rsvp_counts')
    .select('event_id, rsvp_count')
    .in('event_id', ids);

  const countMap = new Map((counts ?? []).map((row) => [row.event_id, row.rsvp_count]));

  let mine = new Set<string>();
  if (viewerId) {
    const { data: rows } = await supabase
      .from('rsvps')
      .select('event_id')
      .eq('user_id', viewerId)
      .in('event_id', ids);
    mine = new Set((rows ?? []).map((row) => row.event_id));
  }

  return events.map((event) => ({
    ...event,
    rsvp_count: countMap.get(event.id) ?? 0,
    going: mine.has(event.id),
  }));
}

export async function getUpcomingEvents(limit = 6): Promise<EventWithRsvp[]> {
  const viewer = await getCurrentProfile();

  if (IS_DEMO) {
    const upcoming = sortByWhen(
      demoState().events.filter((event) => !isPast(event.date, event.time)),
    ).slice(0, limit);
    return decorateEvents(upcoming, viewer?.id ?? null);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('date', istToday())
    .order('date', { ascending: true })
    .order('time', { ascending: true })
    .limit(limit + 4);

  if (error) throw new Error(error.message);

  const upcoming = (data ?? []).filter((event) => !isPast(event.date, event.time)).slice(0, limit);
  return decorateEvents(upcoming, viewer?.id ?? null);
}

export async function getNextEvent(): Promise<EventWithRsvp | null> {
  const [next] = await getUpcomingEvents(1);
  return next ?? null;
}

export async function getAllEvents(): Promise<EventWithRsvp[]> {
  const viewer = await getCurrentProfile();

  if (IS_DEMO) {
    return decorateEvents(sortByWhen(demoState().events, -1), viewer?.id ?? null);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: false })
    .order('time', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return decorateEvents(data ?? [], viewer?.id ?? null);
}

/** One event by id, or null. Public, like every event read: used by the calendar download. */
export async function getEventById(id: string): Promise<ClubEvent | null> {
  if (IS_DEMO) return demoState().events.find((event) => event.id === id) ?? null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
  // A malformed id is a 404 to the caller, not a crash.
  if (error) return null;
  return data;
}

export async function getPastEvents(limit = 6): Promise<EventWithRsvp[]> {
  const viewer = await getCurrentProfile();

  if (IS_DEMO) {
    const past = sortByWhen(
      demoState().events.filter((event) => isPast(event.date, event.time)),
      -1,
    ).slice(0, limit);
    return decorateEvents(past, viewer?.id ?? null);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .lte('date', istToday())
    .order('date', { ascending: false })
    .order('time', { ascending: false })
    .limit(limit + 4);

  if (error) throw new Error(error.message);
  const past = (data ?? []).filter((event) => isPast(event.date, event.time)).slice(0, limit);
  return decorateEvents(past, viewer?.id ?? null);
}

export async function toggleRsvp(eventId: string): Promise<{ going: boolean; count: number }> {
  const profile = await requireProfile();

  if (IS_DEMO) {
    const state = demoState();
    const index = state.rsvps.findIndex(
      (rsvp) => rsvp.event_id === eventId && rsvp.user_id === profile.id,
    );
    if (index >= 0) {
      state.rsvps.splice(index, 1);
    } else {
      state.rsvps.push({
        event_id: eventId,
        user_id: profile.id,
        created_at: new Date().toISOString(),
      });
    }
    const count = state.rsvps.filter((rsvp) => rsvp.event_id === eventId).length;
    return { going: index < 0, count };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from('rsvps')
    .select('event_id')
    .eq('event_id', eventId)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('rsvps')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', profile.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('rsvps').insert({ event_id: eventId, user_id: profile.id });
    if (error) throw new Error(error.message);
  }

  const { count } = await supabase
    .from('rsvps')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);

  return { going: !existing, count: count ?? 0 };
}

export async function createEvent(input: EventInput): Promise<ClubEvent> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    const event: ClubEvent = {
      id: demoId('evt'),
      ...input,
      created_by: profile.id,
      created_at: new Date().toISOString(),
    };
    demoState().events.push(event);
    return event;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('events')
    .insert({ ...input, created_by: profile.id })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateEvent(id: string, input: EventInput): Promise<ClubEvent> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    const state = demoState();
    const event = state.events.find((item) => item.id === id);
    if (!event) throw new Error('Event not found');
    Object.assign(event, input);
    return event;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('events')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    const state = demoState();
    state.events = state.events.filter((event) => event.id !== id);
    state.rsvps = state.rsvps.filter((rsvp) => rsvp.event_id !== id);
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

export async function getApprovedTestimonials(): Promise<TestimonialWithAuthor[]> {
  if (IS_DEMO) {
    const { testimonials, profiles } = demoState();
    // Mirrors the public_testimonials view: a removed member's quote comes down.
    const removed = new Set(profiles.filter((p) => p.removed_at).map((p) => p.id));
    return testimonials
      .filter((testimonial) => testimonial.status === 'approved' && !removed.has(testimonial.user_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((testimonial) => {
        const author = profiles.find((profile) => profile.id === testimonial.user_id);
        return {
          ...testimonial,
          author_name: author?.name ?? 'Turtle Runner',
          author_avatar: author?.avatar_url ?? null,
          author_role_label: author
            ? authorRoleLabel(author.sport, author.level)
            : 'Club member',
        };
      });
  }

  // Reads the definer-rights view so anonymous visitors can see quotes
  // without `profiles` being world-readable.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('public_testimonials')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    user_id: '',
    text: row.text,
    status: 'approved' as const,
    created_at: row.created_at,
    author_name: row.author_name,
    author_avatar: row.author_avatar,
    author_role_label: authorRoleLabel(row.author_sport, row.author_level),
  }));
}

export async function getAllTestimonials(): Promise<TestimonialWithAuthor[]> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    const { testimonials, profiles } = demoState();
    return [...testimonials]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((testimonial) => {
        const author = profiles.find((item) => item.id === testimonial.user_id);
        return {
          ...testimonial,
          author_name: author?.name ?? 'Turtle Runner',
          author_avatar: author?.avatar_url ?? null,
          author_role_label: author ? authorRoleLabel(author.sport, author.level) : 'Club member',
        };
      });
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: rows, error }, { data: people }] = await Promise.all([
    supabase.from('testimonials').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, name, avatar_url, sport, level'),
  ]);

  if (error) throw new Error(error.message);
  const byId = new Map((people ?? []).map((person) => [person.id, person]));

  return (rows ?? []).map((row) => {
    const author = byId.get(row.user_id);
    return {
      ...row,
      author_name: author?.name ?? 'Turtle Runner',
      author_avatar: author?.avatar_url ?? null,
      author_role_label: author ? authorRoleLabel(author.sport, author.level) : 'Club member',
    };
  });
}

export async function getMyTestimonials(): Promise<Testimonial[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];

  if (IS_DEMO) {
    return demoState()
      .testimonials.filter((testimonial) => testimonial.user_id === profile.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function submitTestimonial(text: string): Promise<Testimonial> {
  const profile = await requireProfile();
  const trimmed = text.trim();
  if (trimmed.length < 20) throw new Error('Tell us a little more — at least 20 characters.');
  if (trimmed.length > 280) throw new Error('Keep it under 280 characters.');

  if (IS_DEMO) {
    const testimonial: Testimonial = {
      id: demoId('tst'),
      user_id: profile.id,
      text: trimmed,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    demoState().testimonials.push(testimonial);
    return testimonial;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('testimonials')
    // status is pinned to 'pending' by RLS as well — nothing ever auto-publishes.
    .insert({ user_id: profile.id, text: trimmed, status: 'pending' })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function moderateTestimonial(
  id: string,
  status: Exclude<TestimonialStatus, 'pending'>,
): Promise<void> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    const testimonial = demoState().testimonials.find((item) => item.id === id);
    if (!testimonial) throw new Error('Testimonial not found');
    testimonial.status = status;
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('testimonials').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getPendingTestimonialCount(): Promise<number> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') return 0;

  if (IS_DEMO) {
    return demoState().testimonials.filter((item) => item.status === 'pending').length;
  }

  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from('testimonials')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export async function getMembers(query = ''): Promise<Profile[]> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');
  const term = query.trim();

  if (IS_DEMO) {
    return demoState()
      .profiles.filter((item) => item.name.toLowerCase().includes(term.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Removed members stay in this list on purpose: an admin has to be able to
  // see and reinstate them. Every other read filters them out.

  const supabase = await createSupabaseServerClient();
  let request = supabase.from('profiles').select('*').order('name');
  if (term) request = request.ilike('name', `%${term}%`);

  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function setMemberRole(userId: string, role: Role): Promise<void> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');
  if (profile.id === userId && role !== 'admin') {
    throw new Error('Promote another admin before stepping down.');
  }

  if (IS_DEMO) {
    const target = demoState().profiles.find((item) => item.id === userId);
    if (!target) throw new Error('Member not found');
    target.role = role;
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) throw new Error(error.message);
}

/**
 * Removes a member from the club, or puts them back.
 *
 * A flag rather than a delete: see the note in 0008_member_removal.sql. The
 * database trigger is the real guard — it refuses to remove an admin and
 * refuses the change at all from a non-admin, whatever the UI allows.
 */
export async function setMemberRemoved(userId: string, removed: boolean): Promise<void> {
  const actor = await requireProfile();
  if (actor.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    const target = demoState().profiles.find((item) => item.id === userId);
    if (!target) throw new Error('Member not found');
    if (removed && target.role === 'admin') {
      throw new Error('Demote this admin to member before removing them.');
    }
    target.removed_at = removed ? new Date().toISOString() : null;
    target.removed_by = removed ? actor.id : null;
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      removed_at: removed ? new Date().toISOString() : null,
      removed_by: removed ? actor.id : null,
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}

export async function updateProfile(input: ProfileInput): Promise<Profile> {
  const profile = await requireProfile();
  const goal = input.goal?.trim() ? input.goal.trim().slice(0, 120) : null;

  if (IS_DEMO) {
    const target = demoState().profiles.find((item) => item.id === profile.id);
    if (!target) throw new Error('Profile not found');
    target.sport = input.sport;
    target.level = input.level;
    target.goal = goal;
    target.show_on_leaderboard = input.show_on_leaderboard;
    return target;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .update({
      sport: input.sport,
      level: input.level,
      goal,
      show_on_leaderboard: input.show_on_leaderboard,
    })
    .eq('id', profile.id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getMemberCount(): Promise<number> {
  if (IS_DEMO) return demoState().profiles.filter((item) => !item.removed_at).length;

  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .is('removed_at', null);
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------

/** Real totals: what the club actually logged since Monday. */
export async function getClubStats(): Promise<ClubStats> {
  if (IS_DEMO) {
    const state = demoState();
    const volume = volumeSince(state.sessions, weekStart());
    return {
      runKm: Math.round(volume.run),
      rideKm: Math.round(volume.bike),
      swimKm: Math.round(volume.swim),
      members: state.profiles.filter((item) => !item.removed_at).length,
    };
  }

  // Definer-rights view: works for signed-out visitors, who cannot read
  // `sessions` or `profiles` directly.
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('public_week_volume').select('*').maybeSingle();

  return {
    runKm: Math.round((data?.run_m ?? 0) / 1000),
    rideKm: Math.round((data?.bike_m ?? 0) / 1000),
    swimKm: Math.round((data?.swim_m ?? 0) / 1000),
    members: data?.members ?? 0,
  };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  const [nextEvent, past, stats] = await Promise.all([
    getNextEvent(),
    getPastEvents(6),
    getClubStats(),
  ]);

  let members = 0;
  let admins = 0;
  let pending = 0;

  if (IS_DEMO) {
    const state = demoState();
    members = state.profiles.filter((item) => !item.removed_at).length;
    admins = state.profiles.filter((item) => item.role === 'admin').length;
    pending = state.testimonials.filter((item) => item.status === 'pending').length;
  } else {
    const supabase = await createSupabaseServerClient();
    const [all, adminRows, pendingRows] = await Promise.all([
      // The roster, not every account that ever signed in: removed members
      // are excluded here exactly as they are on the landing page.
      supabase.from('profiles').select('*', { count: 'exact', head: true }).is('removed_at', null),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase
        .from('testimonials')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ]);
    members = all.count ?? 0;
    admins = adminRows.count ?? 0;
    pending = pendingRows.count ?? 0;
  }

  return {
    members,
    admins,
    nextEvent,
    nextEventRsvps: nextEvent?.rsvp_count ?? 0,
    weeklyKm: stats.runKm + stats.rideKm + stats.swimKm,
    pendingTestimonials: pending,
    attendance: [...past]
      .reverse()
      .map((event) => ({ label: event.title, value: event.rsvp_count })),
  };
}

// ---------------------------------------------------------------------------
// Weekly schedule
// ---------------------------------------------------------------------------

/**
 * The club's recurring sessions. Public — the landing page renders these
 * before anyone signs in. Falls back to the built-in defaults if the table is
 * empty, so a fresh project never shows an empty schedule.
 */
export async function getWeeklySchedule(includeInactive = false): Promise<WeeklySession[]> {
  if (IS_DEMO) {
    const rows = demoState().weeklySessions;
    return sortSchedule(includeInactive ? rows : rows.filter((row) => row.active));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('weekly_sessions')
    .select('*')
    .order('iso_dow')
    .order('time');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return DEFAULT_WEEKLY_SCHEDULE;

  return sortSchedule(includeInactive ? data : data.filter((row) => row.active));
}

export async function createWeeklySession(input: WeeklySessionInput): Promise<WeeklySession> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    const session: WeeklySession = {
      id: demoId('wk'),
      ...input,
      created_at: new Date().toISOString(),
    };
    demoState().weeklySessions.push(session);
    return session;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('weekly_sessions')
    .insert(input)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateWeeklySession(
  id: string,
  input: WeeklySessionInput,
): Promise<WeeklySession> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    const state = demoState();
    const session = state.weeklySessions.find((item) => item.id === id);
    if (!session) throw new Error('Session not found');
    Object.assign(session, input);
    // Mirrors weekly_sessions_release_groups: a renamed or removed group
    // releases its future RSVPs to "no group".
    const today = istToday();
    for (const row of state.sessionRsvps) {
      if (
        row.weekly_session_id === id &&
        row.occurs_on >= today &&
        row.pace_group !== null &&
        !input.pace_groups.includes(row.pace_group)
      ) {
        row.pace_group = null;
      }
    }
    return session;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('weekly_sessions')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteWeeklySession(id: string): Promise<void> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    const state = demoState();
    if (state.sessionRsvps.some((row) => row.weekly_session_id === id)) {
      throw new Error(HAS_ATTENDANCE_MESSAGE);
    }
    state.weeklySessions = state.weeklySessions.filter((session) => session.id !== id);
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('weekly_sessions').delete().eq('id', id);
  // session_rsvps references it with on delete restrict: the attendance record.
  if (error?.code === '23503') throw new Error(HAS_ATTENDANCE_MESSAGE);
  if (error) throw new Error(error.message);
}

const HAS_ATTENDANCE_MESSAGE =
  'Members have RSVPd to this session, and those RSVPs are its attendance record. Pause it instead (untick "Running right now").';

// ---------------------------------------------------------------------------
// Weekly session RSVPs
// ---------------------------------------------------------------------------

/**
 * Only sessions backed by a real row can be RSVPd to. The built-in fallback
 * schedule (an empty table) has slug ids no foreign key accepts.
 */
function isRsvpable(session: WeeklySession): boolean {
  return session.active && (IS_DEMO || UUID.test(session.id));
}

interface RsvpRow {
  weekly_session_id: string;
  occurs_on: string;
  user_id: string;
  pace_group: string | null;
}

function summarise(
  session: WeeklySession,
  occursOn: string,
  counts: { pace_group: string | null; rsvp_count: number }[],
  viewerId: string | null,
  rows: RsvpRow[],
  people: Map<string, { name: string; avatar_url: string | null }>,
  change: OccurrenceChange | null,
): SessionRsvpSummary {
  const countFor = (group: string | null) =>
    counts.filter((row) => row.pace_group === group).reduce((sum, row) => sum + row.rsvp_count, 0);

  const groups = session.pace_groups.map((name) => {
    const count = countFor(name);
    const limit = session.pace_group_limits?.[name] ?? null;
    return { name, count, limit, full: limit !== null && count >= limit };
  });

  // Everyone, including RSVPs left in a group that has since been renamed.
  const total = counts.reduce((sum, row) => sum + row.rsvp_count, 0);
  const inNamedGroups = groups.reduce((sum, group) => sum + group.count, 0);

  const mineRow = viewerId ? rows.find((row) => row.user_id === viewerId) : undefined;
  const attendees: SessionAttendee[] = viewerId
    ? rows
        .map((row) => {
          const person = people.get(row.user_id);
          return person
            ? { id: row.user_id, name: person.name, avatar_url: person.avatar_url, pace_group: row.pace_group }
            : null;
        })
        .filter((row): row is SessionAttendee => row !== null)
    : [];

  return {
    sessionId: session.id,
    occursOn,
    total,
    groups,
    ungrouped: total - inNamedGroups,
    mine: mineRow ? { paceGroup: mineRow.pace_group } : null,
    attendees,
    change,
  };
}

/**
 * Who is coming to each active session's next occurrence, keyed by session id.
 *
 * Visitors get head-counts from the definer view; signed-in members also get
 * names and their own RSVP. Fails soft to an empty map, which hides every RSVP
 * control, so a Supabase hiccup costs the counts rather than the landing page.
 */
export async function getSessionRsvps(
  schedule: WeeklySession[],
): Promise<Record<string, SessionRsvpSummary>> {
  const sessions = schedule.filter(isRsvpable);
  if (sessions.length === 0) return {};

  const [viewer, changes] = await Promise.all([getCurrentProfile(), getSessionChanges()]);
  const upcoming = new Map(sessions.map((session) => [session.id, upcomingOccurrence(session, changes[session.id])]));
  const occurs = new Map([...upcoming].map(([id, occurrence]) => [id, occurrence.date]));
  const out: Record<string, SessionRsvpSummary> = {};

  if (IS_DEMO) {
    const state = demoState();
    const active = new Set(state.profiles.filter((p) => !p.removed_at).map((p) => p.id));
    const people = new Map(state.profiles.map((p) => [p.id, { name: p.name, avatar_url: p.avatar_url }]));
    for (const session of sessions) {
      const occursOn = occurs.get(session.id)!;
      const rows = state.sessionRsvps.filter(
        (row) => row.weekly_session_id === session.id && row.occurs_on === occursOn && active.has(row.user_id),
      );
      const counts = [...new Set(rows.map((row) => row.pace_group))].map((group) => ({
        pace_group: group,
        rsvp_count: rows.filter((row) => row.pace_group === group).length,
      }));
      out[session.id] = summarise(session, occursOn, counts, viewer?.id ?? null, rows, people, upcoming.get(session.id)!.change);
    }
    return out;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const ids = sessions.map((session) => session.id);
    const dates = [...new Set(occurs.values())];

    const { data: counts, error } = await supabase
      .from('public_session_rsvp_counts')
      .select('weekly_session_id, occurs_on, pace_group, rsvp_count')
      .in('weekly_session_id', ids)
      .in('occurs_on', dates);
    if (error) return {};

    let rows: RsvpRow[] = [];
    const people = new Map<string, { name: string; avatar_url: string | null }>();
    if (viewer) {
      const { data } = await supabase
        .from('session_rsvps')
        .select('weekly_session_id, occurs_on, user_id, pace_group')
        .in('weekly_session_id', ids)
        .in('occurs_on', dates)
        .order('created_at');
      rows = data ?? [];

      const userIds = [...new Set(rows.map((row) => row.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, removed_at')
          .in('id', userIds);
        for (const person of profiles ?? []) {
          if (!person.removed_at) people.set(person.id, { name: person.name, avatar_url: person.avatar_url });
        }
      }
    }

    for (const session of sessions) {
      const occursOn = occurs.get(session.id)!;
      out[session.id] = summarise(
        session,
        occursOn,
        (counts ?? []).filter((row) => row.weekly_session_id === session.id && row.occurs_on === occursOn),
        viewer?.id ?? null,
        rows.filter((row) => row.weekly_session_id === session.id && row.occurs_on === occursOn),
        people,
        upcoming.get(session.id)!.change,
      );
    }
    return out;
  } catch (error) {
    unstable_rethrow(error);
    return {};
  }
}

// ---------------------------------------------------------------------------
// Cancelled and moved dates
// ---------------------------------------------------------------------------

export interface SessionChangeInput {
  status: 'cancelled' | 'moved';
  reason: string | null;
  new_time: string | null;
  new_location: string | null;
  new_lat: number | null;
  new_lng: number | null;
}

/**
 * Cancelled and moved dates from today on, keyed by session id. Public: the
 * landing page, the calendar feed and RSVPs all need them. Memoised per
 * request, and fails soft to "no changes" so the schedule still renders.
 */
export const getSessionChanges = cache(async (): Promise<Record<string, OccurrenceChange[]>> => {
  const today = istToday();
  const group = (rows: OccurrenceChange[]) => {
    const out: Record<string, OccurrenceChange[]> = {};
    for (const row of rows) (out[row.weekly_session_id] ??= []).push(row);
    return out;
  };

  if (IS_DEMO) {
    return group(demoState().sessionChanges.filter((row) => row.occurs_on >= today));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('session_changes')
      .select('weekly_session_id, occurs_on, status, reason, new_time, new_location, new_lat, new_lng')
      .gte('occurs_on', today)
      .order('occurs_on');
    if (error) return {};
    return group(
      (data ?? []).map((row) => ({
        ...row,
        new_time: row.new_time ? row.new_time.slice(0, 5) : null,
        new_lat: row.new_lat === null ? null : Number(row.new_lat),
        new_lng: row.new_lng === null ? null : Number(row.new_lng),
      })),
    );
  } catch (error) {
    unstable_rethrow(error);
    return {};
  }
});

/** Admin: cancels or moves one date of a weekly session, replacing any earlier change to it. */
export async function setSessionChange(
  sessionId: string,
  occursOn: string,
  input: SessionChangeInput,
): Promise<void> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  const session = (await getWeeklySchedule(true)).find((item) => item.id === sessionId);
  if (!session || !(IS_DEMO || UUID.test(session.id))) throw new Error('That session cannot be changed.');

  if (IS_DEMO) {
    // Mirrors session_changes_guard.
    const day = new Date(`${occursOn}T00:00:00Z`).getUTCDay() || 7;
    if (day !== session.iso_dow) throw new Error('That date is not one this session runs on.');
    if (occursOn < istToday()) throw new Error('That date has already passed.');
    const state = demoState();
    state.sessionChanges = state.sessionChanges.filter(
      (row) => !(row.weekly_session_id === sessionId && row.occurs_on === occursOn),
    );
    state.sessionChanges.push({ weekly_session_id: sessionId, occurs_on: occursOn, ...input });
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('session_changes')
    .upsert(
      { weekly_session_id: sessionId, occurs_on: occursOn, ...input, created_by: profile.id },
      { onConflict: 'weekly_session_id,occurs_on' },
    );
  if (error) throw new Error(error.message);
}

/** Admin: puts a date back to the usual time and place. */
export async function clearSessionChange(sessionId: string, occursOn: string): Promise<void> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    const state = demoState();
    state.sessionChanges = state.sessionChanges.filter(
      (row) => !(row.weekly_session_id === sessionId && row.occurs_on === occursOn),
    );
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('session_changes')
    .delete()
    .eq('weekly_session_id', sessionId)
    .eq('occurs_on', occursOn);
  if (error) throw new Error(error.message);
}

async function rsvpableSession(sessionId: string): Promise<WeeklySession> {
  const session = (await getWeeklySchedule(true)).find((item) => item.id === sessionId);
  if (!session || !(IS_DEMO || UUID.test(session.id))) {
    throw new Error('RSVPs are not open for that session.');
  }
  if (!session.active) throw new Error('This session is paused right now.');
  return session;
}

/**
 * RSVPs the signed-in member to a session's next occurrence, or changes their
 * pace group if they are already in. The database re-checks every rule; the
 * demo branch mirrors them so the demo behaves the same.
 */
export async function rsvpToWeeklySession(sessionId: string, paceGroup: string | null): Promise<void> {
  const profile = await requireProfile();
  const session = await rsvpableSession(sessionId);
  const occurrence = upcomingOccurrence(session, (await getSessionChanges())[sessionId]);
  if (occurrence.cancelled) throw new Error('This session is cancelled that week.');
  const occursOn = occurrence.date;

  if (paceGroup !== null && !session.pace_groups.includes(paceGroup)) {
    throw new Error('That pace group is not on this session.');
  }

  if (IS_DEMO) {
    const state = demoState();
    const existing = state.sessionRsvps.find(
      (row) => row.weekly_session_id === sessionId && row.occurs_on === occursOn && row.user_id === profile.id,
    );
    const limit = paceGroup ? session.pace_group_limits?.[paceGroup] : undefined;
    if (paceGroup && limit !== undefined && existing?.pace_group !== paceGroup) {
      const active = new Set(state.profiles.filter((p) => !p.removed_at).map((p) => p.id));
      const taken = state.sessionRsvps.filter(
        (row) =>
          row.weekly_session_id === sessionId &&
          row.occurs_on === occursOn &&
          row.pace_group === paceGroup &&
          row.user_id !== profile.id &&
          active.has(row.user_id),
      ).length;
      if (taken >= limit) throw new Error(`The ${paceGroup} group is full.`);
    }
    if (existing) {
      existing.pace_group = paceGroup;
    } else {
      state.sessionRsvps.push({
        weekly_session_id: sessionId,
        occurs_on: occursOn,
        user_id: profile.id,
        pace_group: paceGroup,
        created_at: new Date().toISOString(),
      });
    }
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: readError } = await supabase
    .from('session_rsvps')
    .select('pace_group')
    .eq('weekly_session_id', sessionId)
    .eq('occurs_on', occursOn)
    .eq('user_id', profile.id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  const { error } = existing
    ? await supabase
        .from('session_rsvps')
        .update({ pace_group: paceGroup })
        .eq('weekly_session_id', sessionId)
        .eq('occurs_on', occursOn)
        .eq('user_id', profile.id)
    : await supabase
        .from('session_rsvps')
        .insert({ weekly_session_id: sessionId, occurs_on: occursOn, user_id: profile.id, pace_group: paceGroup });

  // The guard trigger's messages are written for members ("The 5:00 group is full.").
  if (error) throw new Error(error.message);
}

/** Withdraws the signed-in member from a session's next occurrence. */
export async function leaveWeeklySession(sessionId: string): Promise<void> {
  const profile = await requireProfile();
  const session = (await getWeeklySchedule(true)).find((item) => item.id === sessionId);
  if (!session) throw new Error('That session no longer exists.');
  const occursOn = upcomingOccurrence(session, (await getSessionChanges())[sessionId]).date;

  if (IS_DEMO) {
    const state = demoState();
    state.sessionRsvps = state.sessionRsvps.filter(
      (row) => !(row.weekly_session_id === sessionId && row.occurs_on === occursOn && row.user_id === profile.id),
    );
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('session_rsvps')
    .delete()
    .eq('weekly_session_id', sessionId)
    .eq('occurs_on', occursOn)
    .eq('user_id', profile.id);
  if (error) throw new Error(error.message);
}

/** Admin: takes a member off a session occurrence (the one who cannot make it and did not say). */
export async function removeSessionRsvp(sessionId: string, occursOn: string, userId: string): Promise<void> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    const state = demoState();
    state.sessionRsvps = state.sessionRsvps.filter(
      (row) => !(row.weekly_session_id === sessionId && row.occurs_on === occursOn && row.user_id === userId),
    );
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('session_rsvps')
    .delete()
    .eq('weekly_session_id', sessionId)
    .eq('occurs_on', occursOn)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Training log
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Training grounds
// ---------------------------------------------------------------------------

/**
 * Route cards for the landing page.
 *
 * An empty table falls back to DEFAULT_TRAINING_GROUNDS so a fresh database
 * still renders a complete page, exactly as the weekly schedule does.
 */
export async function getTrainingGrounds(includeInactive = false): Promise<TrainingGround[]> {
  if (IS_DEMO) {
    const rows = demoState().trainingGrounds;
    return includeInactive ? rows : rows.filter((row) => row.active);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('training_grounds')
    .select('*')
    .order('position')
    .order('created_at');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return DEFAULT_TRAINING_GROUNDS;

  return includeInactive ? data : data.filter((row) => row.active);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Grounds that can actually be written into sessions.ground_id.
 *
 * With Postgres behind it, an empty table falls back to the built-in cards,
 * whose slug ids ('lake-loop') no uuid foreign key will accept. Offering those
 * in the log form would turn "Log it" into a database error, so they are
 * filtered out. Demo mode stores those same slugs happily.
 */
function isStoredGround(ground: TrainingGround): boolean {
  return IS_DEMO || UUID.test(ground.id);
}

/** Active grounds a member can pick when logging a session by hand. */
export async function getLoggableGrounds(): Promise<TrainingGround[]> {
  return (await getTrainingGrounds()).filter(isStoredGround);
}

/**
 * Checks a hand-picked ground before it is stored. Hidden grounds are allowed,
 * as they are for Strava matching: the run still happened there.
 */
async function resolveGroundId(groundId: string | null | undefined, sport: SessionSport) {
  if (!groundId) return null;

  const ground = (await getTrainingGrounds(true)).find((item) => item.id === groundId);
  if (!ground || !isStoredGround(ground)) {
    throw new Error('That training ground no longer exists. Pick another, or leave it blank.');
  }
  if (ground.sport !== sport) {
    throw new Error(`${ground.title} is a ${SPORT_LABEL[ground.sport].toLowerCase()} ground. Pick one for this sport.`);
  }
  return ground.id;
}

/** What has actually happened at each ground. Keyed by ground id. */
export interface GroundActivity {
  /** Club-wide, all members. */
  clubSessions: number;
  clubKm: number;
  /** Just the signed-in member; zeros when signed out. */
  yourSessions: number;
  yourKm: number;
  /** The club's recurring sessions that meet here. */
  weekly: WeeklySession[];
}

/**
 * Turns the ground cards from a brochure into something worth revisiting.
 *
 * One query for all grounds rather than one per card. Signed-out visitors get
 * the club numbers and no personal ones, which is also the privacy line the
 * rest of the site draws.
 */
export async function getGroundActivity(): Promise<Record<string, GroundActivity>> {
  const profile = await getCurrentProfile();
  const schedule = await getWeeklySchedule();
  const out: Record<string, GroundActivity> = {};

  const blank = (): GroundActivity => ({
    clubSessions: 0,
    clubKm: 0,
    yourSessions: 0,
    yourKm: 0,
    weekly: [],
  });

  for (const session of schedule) {
    if (!session.ground_id) continue;
    (out[session.ground_id] ??= blank()).weekly.push(session);
  }

  if (IS_DEMO) {
    for (const row of demoState().sessions) {
      if (!row.ground_id) continue;
      const entry = (out[row.ground_id] ??= blank());
      entry.clubSessions += 1;
      entry.clubKm += row.distance_m / 1000;
      if (profile && row.user_id === profile.id) {
        entry.yourSessions += 1;
        entry.yourKm += row.distance_m / 1000;
      }
    }
  } else {
    // Training logs are private (0014), so the club's numbers come from a
    // definer view that exposes totals only, and "you" from your own rows.
    const supabase = await createSupabaseServerClient();
    const [{ data: club }, { data: mine }] = await Promise.all([
      supabase.from('public_ground_activity').select('ground_id, sessions, distance_m'),
      profile
        ? supabase.from('sessions').select('ground_id, distance_m').eq('user_id', profile.id).not('ground_id', 'is', null)
        : Promise.resolve({ data: [] as { ground_id: string | null; distance_m: number }[] }),
    ]);
    for (const row of club ?? []) {
      const entry = (out[row.ground_id] ??= blank());
      entry.clubSessions = row.sessions;
      entry.clubKm = Number(row.distance_m) / 1000;
    }
    for (const row of mine ?? []) {
      if (!row.ground_id) continue;
      const entry = (out[row.ground_id] ??= blank());
      entry.yourSessions += 1;
      entry.yourKm += row.distance_m / 1000;
    }
  }

  for (const entry of Object.values(out)) {
    entry.clubKm = Math.round(entry.clubKm * 10) / 10;
    entry.yourKm = Math.round(entry.yourKm * 10) / 10;
  }

  return out;
}

export async function createTrainingGround(input: TrainingGroundInput): Promise<TrainingGround> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    const row: TrainingGround = {
      ...input,
      id: demoId('grd'),
      created_at: new Date().toISOString(),
    };
    demoState().trainingGrounds.push(row);
    return row;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('training_grounds')
    .insert(input)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateTrainingGround(
  id: string,
  input: TrainingGroundInput,
): Promise<TrainingGround> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    const rows = demoState().trainingGrounds;
    const existing = rows.find((row) => row.id === id);
    if (!existing) throw new Error('Training ground not found');
    Object.assign(existing, input);
    return existing;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('training_grounds')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTrainingGround(id: string): Promise<void> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    const state = demoState();
    state.trainingGrounds = state.trainingGrounds.filter((row) => row.id !== id);
    // Mirrors sessions.ground_id `on delete set null`.
    for (const session of state.sessions) {
      if (session.ground_id === id) session.ground_id = null;
    }
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('training_grounds').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Every session the signed-in member has logged, newest first. */
export async function getMySessions(): Promise<TrainingSession[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];

  if (IS_DEMO) {
    return demoState()
      .sessions.filter((session) => session.user_id === profile.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', profile.id)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Rings, streak, PBs and the feed — all computed from the member's own log. */
export async function getMemberDashboard(): Promise<MemberDashboard> {
  const profile = await requireProfile();
  const sessions = await getMySessions();
  return buildDashboard(profile.level, sessions);
}

export async function logSession(input: SessionInput): Promise<TrainingSession> {
  const profile = await requireProfile();
  const ground_id = await resolveGroundId(input.ground_id, input.sport);

  if (IS_DEMO) {
    const session: TrainingSession = {
      id: demoId('ses'),
      user_id: profile.id,
      ...input,
      source: 'manual',
      strava_activity_id: null,
      ground_id,
      created_at: new Date().toISOString(),
    };
    demoState().sessions.push(session);
    return session;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('sessions')
    .insert({ ...input, ground_id, user_id: profile.id })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSession(id: string): Promise<void> {
  const profile = await requireProfile();

  if (IS_DEMO) {
    const state = demoState();
    state.sessions = state.sessions.filter(
      (session) => !(session.id === id && session.user_id === profile.id),
    );
    return;
  }

  // RLS also enforces ownership; the filter keeps the error message honest.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', profile.id);

  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Admin: one member, read-only
// ---------------------------------------------------------------------------

/**
 * Everything the admin member view shows about one member: the same numbers
 * they see on their own dashboard, plus what they have RSVPd to.
 *
 * Admin-only, and read-only by construction — it returns data and nothing
 * that acts. Members are told in the app that admins can see this.
 */
export async function getMemberSnapshot(userId: string): Promise<MemberSnapshot | null> {
  const admin = await requireProfile();
  if (admin.role !== 'admin') throw new Error('FORBIDDEN');

  const schedule = await getWeeklySchedule(true);
  const today = istToday();

  if (IS_DEMO) {
    const state = demoState();
    const profile = state.profiles.find((item) => item.id === userId);
    if (!profile) return null;

    const sessions = state.sessions
      .filter((row) => row.user_id === userId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const eventIds = new Set(
      state.rsvps.filter((row) => row.user_id === userId).map((row) => row.event_id),
    );

    return {
      profile,
      dashboard: buildDashboard(profile.level, sessions, 10),
      eventRsvps: (await getUpcomingEvents(20)).filter((event) => eventIds.has(event.id)),
      sessionRsvps: state.sessionRsvps
        .filter((row) => row.user_id === userId && row.occurs_on >= today)
        .map((row) => ({
          session: schedule.find((item) => item.id === row.weekly_session_id) ?? null,
          occursOn: row.occurs_on,
          paceGroup: row.pace_group,
        }))
        .filter((row): row is MemberSnapshot['sessionRsvps'][number] => row.session !== null)
        .sort((a, b) => a.occursOn.localeCompare(b.occursOn)),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (!profile) return null;

  // RLS lets admins read every session (migration 0014); members only their own.
  const [{ data: sessions }, { data: eventRows }, { data: sessionRows }] = await Promise.all([
    supabase.from('sessions').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('rsvps').select('event_id').eq('user_id', userId),
    supabase
      .from('session_rsvps')
      .select('weekly_session_id, occurs_on, pace_group')
      .eq('user_id', userId)
      .gte('occurs_on', today)
      .order('occurs_on'),
  ]);

  const eventIds = new Set((eventRows ?? []).map((row) => row.event_id));

  return {
    profile,
    dashboard: buildDashboard(profile.level, sessions ?? [], 10),
    eventRsvps: (await getUpcomingEvents(20)).filter((event) => eventIds.has(event.id)),
    sessionRsvps: (sessionRows ?? [])
      .map((row) => ({
        session: schedule.find((item) => item.id === row.weekly_session_id) ?? null,
        occursOn: row.occurs_on,
        paceGroup: row.pace_group,
      }))
      .filter((row): row is MemberSnapshot['sessionRsvps'][number] => row.session !== null),
  };
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

/**
 * This month's board: opted-in, active members only, members-only to read.
 * Unsorted; the page ranks by whichever measure is chosen. Returns null for a
 * signed-out visitor, and an empty board rather than an error if the view is
 * missing, so the page degrades instead of crashing.
 */
export async function getLeaderboard(): Promise<LeaderboardRow[] | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  if (IS_DEMO) {
    const state = demoState();
    const today = istToday();
    const monthStart = `${today.slice(0, 8)}01`;
    const weeksStart = addDaysLocal(weekStart(), -49);
    return state.profiles
      .filter((person) => person.show_on_leaderboard && !person.removed_at)
      .map((person) => {
        const mine = state.sessions.filter((row) => row.user_id === person.id);
        const month = mine.filter((row) => row.date >= monthStart);
        const sum = (rows: typeof mine) => rows.reduce((total, row) => total + row.distance_m, 0);
        return {
          user_id: person.id,
          name: person.name,
          avatar_url: person.avatar_url,
          sport: person.sport,
          level: person.level,
          run_m: sum(month.filter((row) => row.sport === 'run')),
          bike_m: sum(month.filter((row) => row.sport === 'bike')),
          swim_m: sum(month.filter((row) => row.sport === 'swim')),
          total_m: sum(month),
          sessions: month.length,
          active_days: new Set(month.map((row) => row.date)).size,
          active_weeks: new Set(
            mine.filter((row) => row.date >= weeksStart).map((row) => weekStart(new Date(`${row.date}T12:00:00+05:30`))),
          ).size,
        };
      });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('public_leaderboard').select('*');
    if (error) return [];
    return (data ?? []).map((row) => ({
      ...row,
      run_m: Number(row.run_m),
      bike_m: Number(row.bike_m),
      swim_m: Number(row.swim_m),
      total_m: Number(row.total_m),
    }));
  } catch (error) {
    unstable_rethrow(error);
    return [];
  }
}

function addDaysLocal(ymd: string, days: number): string {
  const date = new Date(`${ymd}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Joins or leaves the board, from the leaderboard page's one-tap button. */
export async function setLeaderboardOptIn(show: boolean): Promise<void> {
  const profile = await requireProfile();

  if (IS_DEMO) {
    const target = demoState().profiles.find((item) => item.id === profile.id);
    if (!target) throw new Error('Profile not found');
    target.show_on_leaderboard = show;
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('profiles')
    .update({ show_on_leaderboard: show })
    .eq('id', profile.id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Branding
// ---------------------------------------------------------------------------

const BRANDING_BUCKET = 'branding';
const DEFAULT_BRANDING: ClubBranding = { useCustomLogo: false, logoUrl: null };

/** A demo store created before branding existed survives hot reloads without it. */
function demoBranding(): ClubBranding {
  const state = demoState();
  state.branding ??= { ...DEFAULT_BRANDING };
  return state.branding;
}

/**
 * Which logo every page shows. Memoised per request: the header, the footer
 * and a signed-out panel can all ask during one render.
 *
 * Fails soft to the default mark. The logo is in every page header, so a
 * missing table (code deployed before migration 0011) or a Supabase hiccup
 * must never become an error page.
 */
export const getClubBranding = cache(async (): Promise<ClubBranding> => {
  if (IS_DEMO) return { ...demoBranding() };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('club_settings')
      .select('use_custom_logo, logo_url')
      .eq('id', true)
      .maybeSingle();

    if (error || !data) return DEFAULT_BRANDING;
    return {
      useCustomLogo: data.use_custom_logo && Boolean(data.logo_url),
      logoUrl: data.logo_url,
    };
  } catch (error) {
    // Reading cookies makes a page dynamic by throwing a signal Next.js has to
    // see; swallowing it would freeze the default mark into a static page.
    unstable_rethrow(error);
    return DEFAULT_BRANDING;
  }
});

export interface LogoUpload {
  bytes: ArrayBuffer;
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
  extension: 'png' | 'jpg' | 'webp';
}

/**
 * Stores a new logo and puts it live straight away.
 *
 * Uploading is itself the admin saying "use this": an upload that left the
 * site unchanged until a second click on the switch looked like a failed
 * upload. The switch stays for going back to the default mark.
 */
export async function uploadClubLogo(upload: LogoUpload): Promise<ClubBranding> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    const branding = demoBranding();
    branding.logoUrl = `data:${upload.contentType};base64,${Buffer.from(upload.bytes).toString('base64')}`;
    branding.useCustomLogo = true;
    return { ...branding };
  }

  const supabase = await createSupabaseServerClient();
  const { data: current, error: readError } = await supabase
    .from('club_settings')
    .select('logo_path')
    .eq('id', true)
    .single();
  if (readError) throw new Error(readError.message);

  // A fresh name every time, so browsers and the CDN never serve the old
  // image from cache under the new URL.
  const path = `logo-${Date.now()}.${upload.extension}`;
  const bucket = supabase.storage.from(BRANDING_BUCKET);

  const { error: uploadError } = await bucket.upload(path, upload.bytes, {
    contentType: upload.contentType,
    cacheControl: '31536000',
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);

  const logoUrl = bucket.getPublicUrl(path).data.publicUrl;

  const { data, error } = await supabase
    .from('club_settings')
    .update({
      logo_url: logoUrl,
      logo_path: path,
      use_custom_logo: true,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq('id', true)
    .select('use_custom_logo, logo_url')
    .single();

  if (error) {
    // Do not leave an orphaned file behind a failed save.
    await bucket.remove([path]);
    throw new Error(error.message);
  }

  // The old file is unreferenced now. Best effort: a leftover image is harmless.
  if (current.logo_path && current.logo_path !== path) {
    await bucket.remove([current.logo_path]);
  }

  return { useCustomLogo: data.use_custom_logo, logoUrl: data.logo_url };
}

/** Switches between the uploaded logo and the default mark. */
export async function setCustomLogoEnabled(enabled: boolean): Promise<void> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    const branding = demoBranding();
    if (enabled && !branding.logoUrl) throw new Error('Upload a logo first.');
    branding.useCustomLogo = enabled;
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (enabled) {
    const { logoUrl } = await getClubBranding();
    if (!logoUrl) throw new Error('Upload a logo first.');
  }

  // The check constraint refuses "on" without a logo, whatever this checked.
  const { error } = await supabase
    .from('club_settings')
    .update({
      use_custom_logo: enabled,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq('id', true);

  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Strava club widgets
// ---------------------------------------------------------------------------

/**
 * The club's Strava widget address, or null when none has been added. Public
 * (it renders on the landing page) and fail-soft, like the logo: a missing
 * column or a Supabase hiccup hides the widgets rather than the page.
 */
export const getStravaWidgets = cache(async (): Promise<StravaWidgets | null> => {
  if (IS_DEMO) return demoState().stravaWidgets;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('club_settings')
      .select('strava_club_id, strava_widget_token')
      .eq('id', true)
      .maybeSingle();
    if (error || !data?.strava_club_id || !data.strava_widget_token) return null;
    return { clubId: data.strava_club_id, token: data.strava_widget_token };
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
});

/** Admin: saves the club's Strava widget address, or removes it with null. */
export async function setStravaWidgets(widgets: StravaWidgets | null): Promise<void> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    demoState().stravaWidgets = widgets;
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('club_settings')
    .update({
      strava_club_id: widgets?.clubId ?? null,
      strava_widget_token: widgets?.token ?? null,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq('id', true);
  if (error) throw new Error(error.message);
}

/** Deletes the uploaded logo and goes back to the default mark. */
export async function removeClubLogo(): Promise<void> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') throw new Error('FORBIDDEN');

  if (IS_DEMO) {
    const branding = demoBranding();
    branding.useCustomLogo = false;
    branding.logoUrl = null;
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data: current, error: readError } = await supabase
    .from('club_settings')
    .select('logo_path')
    .eq('id', true)
    .single();
  if (readError) throw new Error(readError.message);

  const { error } = await supabase
    .from('club_settings')
    .update({
      use_custom_logo: false,
      logo_url: null,
      logo_path: null,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq('id', true);
  if (error) throw new Error(error.message);

  if (current.logo_path) {
    await supabase.storage.from(BRANDING_BUCKET).remove([current.logo_path]);
  }
}
