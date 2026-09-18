import type { MetadataRoute } from 'next';
import { CLUB } from '@/lib/club';

/**
 * Lets Android and iOS put the club on a home screen with its own name and
 * mark.
 *
 * `display: 'browser'` on purpose. A standalone web app on iOS finishes a
 * Google sign-in in Safari, not in the home-screen app, so the member lands
 * back in the app still signed out. Opening in the browser keeps sign-in,
 * Strava and the calendar links working exactly as they do from a link.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${CLUB.name} — Hyderabad triathlon club`,
    short_name: CLUB.name,
    description: 'Weekly runs, rides and swims at Durgam Cheruvu. RSVP, log sessions, see who is coming.',
    start_url: '/',
    display: 'browser',
    background_color: '#FAFDFB',
    theme_color: '#12A150',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
