import type { Profile, Testimonial } from '@/types';

/**
 * Seed data for demo mode (NEXT_PUBLIC_DEMO=true or no Supabase keys).
 * Mirrors supabase/seed.sql, with a few extra members and approved quotes
 * so the landing page has something to show without a database.
 */

export const DEMO_ADMIN_ID = '11111111-1111-4111-8111-111111111111';
export const DEMO_MEMBER_ID = '22222222-2222-4222-8222-222222222222';

export const DEMO_PROFILES: Profile[] = [
  {
    id: DEMO_ADMIN_ID,
    name: 'Meera Rao',
    avatar_url: null,
    sport: 'all',
    level: 'chasing',
    goal: 'IRONMAN 70.3 Goa',
    role: 'admin',
    joined_at: '2021-06-14T04:30:00.000Z',
  },
  {
    id: DEMO_MEMBER_ID,
    name: 'Harsha Vardhan',
    avatar_url: null,
    sport: 'run',
    level: 'regular',
    goal: 'Hyderabad Marathon',
    role: 'member',
    joined_at: '2024-01-09T04:30:00.000Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Aditi Sharma',
    avatar_url: null,
    sport: 'swim',
    level: 'starting',
    goal: null,
    role: 'member',
    joined_at: '2025-02-18T04:30:00.000Z',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Rohit Menon',
    avatar_url: null,
    sport: 'bike',
    level: 'racing',
    goal: 'Deccan Cliffhanger',
    role: 'member',
    joined_at: '2023-08-02T04:30:00.000Z',
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Zoya Fernandes',
    avatar_url: null,
    sport: 'all',
    level: 'chasing',
    goal: 'IRONMAN 70.3 Goa',
    role: 'member',
    joined_at: '2022-11-27T04:30:00.000Z',
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Vikram Reddy',
    avatar_url: null,
    sport: 'run',
    level: 'starting',
    goal: 'First 10K',
    role: 'member',
    joined_at: '2025-09-06T04:30:00.000Z',
  },
  {
    id: '77777777-7777-4777-8777-777777777777',
    name: 'Priya Nair',
    avatar_url: null,
    sport: 'swim',
    level: 'racing',
    goal: 'Open-water 5 km',
    role: 'member',
    joined_at: '2024-05-21T04:30:00.000Z',
  },
  {
    id: '88888888-8888-4888-8888-888888888888',
    name: 'Sandeep Kulkarni',
    avatar_url: null,
    sport: 'bike',
    level: 'regular',
    goal: null,
    role: 'member',
    joined_at: '2025-03-30T04:30:00.000Z',
  },
  {
    id: '99999999-9999-4999-8999-999999999999',
    name: 'Ananya Iyer',
    avatar_url: null,
    sport: 'all',
    level: 'regular',
    goal: 'Chennai triathlon',
    role: 'member',
    joined_at: '2024-10-12T04:30:00.000Z',
  },
];

const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 86400000).toISOString();

export const DEMO_TESTIMONIALS: Testimonial[] = [
  {
    id: 'tst-1',
    user_id: '33333333-3333-4333-8333-333333333333',
    text: 'I could not swim one length in February. Lane 1 never once made me feel slow, and last Thursday I did 1500m without stopping.',
    status: 'approved',
    created_at: daysAgo(41),
  },
  {
    id: 'tst-2',
    user_id: '44444444-4444-4444-8444-444444444444',
    text: 'Every Saturday the fast group waits at every exit. Nobody gets dropped, nobody gets a lecture. That is the whole club in one sentence.',
    status: 'approved',
    created_at: daysAgo(33),
  },
  {
    id: 'tst-3',
    user_id: '55555555-5555-4555-8555-555555555555',
    text: 'I signed up for a 70.3 after two years of turning up on Sundays. The training was never the hard part — the group did that for me.',
    status: 'approved',
    created_at: daysAgo(26),
  },
  {
    id: 'tst-4',
    user_id: '66666666-6666-4666-8666-666666666666',
    text: 'Turned up alone on a Sunday with a borrowed pair of shoes. Walked half of it. Three people walked with me and nobody mentioned it again.',
    status: 'approved',
    created_at: daysAgo(18),
  },
  {
    id: 'tst-5',
    user_id: '77777777-7777-4777-8777-777777777777',
    text: 'The chai after the long run is doing more for my consistency than any training plan I have ever paid for.',
    status: 'approved',
    created_at: daysAgo(11),
  },
  {
    id: 'tst-6',
    user_id: '88888888-8888-4888-8888-888888888888',
    text: 'Rode my ten-year-old hybrid for the first six months. Not one person said anything about it except to ask if I was coming next week.',
    status: 'pending',
    created_at: daysAgo(3),
  },
  {
    id: 'tst-7',
    user_id: '99999999-9999-4999-8999-999999999999',
    text: 'Brick Sundays broke me for a month and then made me. Five in and I finally understand what everyone meant about running on jelly legs.',
    status: 'pending',
    created_at: daysAgo(1),
  },
];

/** Names used by the mock Strava-style feed on the member dashboard. */
export const SESSION_NAMES = {
  run: ['Lake loop easy', 'Tempo by the lake', 'Shakeout jog', 'Solo long run'],
  bike: ['Sweet spot intervals', 'Recovery spin', 'Solo ORR loop'],
  swim: ['Endurance set', 'Technique + pull', 'Open-water sim'],
} as const;
