import type { StravaWidgets } from '@/types';

/**
 * Strava's club widgets, from the embed code Strava gives club members.
 *
 * Strava's "Share this club" dialog hands out two iframes, both pointing at
 *   https://www.strava.com/clubs/<club id>/latest-rides/<token>?show_rides=…
 * show_rides=false is the club summary; true adds the latest activities. The
 * token cannot be derived from the club id, so an admin pastes the code once.
 */

const WIDGET_ADDRESS = /strava\.com\/clubs\/(\d{1,20})\/latest-rides\/([A-Za-z0-9]{16,80})/i;

/**
 * Accepts either iframe snippet from Strava, or just its address. Returns null
 * for empty input (which removes the widgets) and throws a message an admin
 * can act on for anything else.
 */
export function parseStravaWidgetCode(input: string): StravaWidgets | null {
  const text = input.trim();
  if (!text) return null;

  const match = text.match(WIDGET_ADDRESS);
  if (!match) {
    throw new Error(
      "That doesn't look like Strava's widget code. On your club's Strava page open Share, copy one of the widget embed codes, and paste it here.",
    );
  }
  return { clubId: match[1]!, token: match[2]! };
}

export const STRAVA_WIDGET_SIZES = {
  summary: { width: 300, height: 160 },
  activities: { width: 300, height: 454 },
} as const;

export function stravaWidgetSrc(widgets: StravaWidgets, kind: 'summary' | 'activities'): string {
  return `https://www.strava.com/clubs/${widgets.clubId}/latest-rides/${widgets.token}?show_rides=${
    kind === 'activities' ? 'true' : 'false'
  }`;
}

export function stravaClubUrl(clubId: string): string {
  return `https://www.strava.com/clubs/${clubId}`;
}
