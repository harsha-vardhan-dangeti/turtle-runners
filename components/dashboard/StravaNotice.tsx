import type { ReactNode } from 'react';

/**
 * Readable outcomes for the ?strava= status the OAuth callback redirects with.
 *
 * The callback cannot render anything itself — it can only redirect — so every
 * branch it takes has to be explained here or the member sees a silent failure.
 */
const NOTICES: Record<string, { tone: 'ok' | 'warn' | 'error'; title: string; body: string }> = {
  connected: {
    tone: 'ok',
    title: 'Strava connected',
    body: 'Press Sync now to pull in your recent runs, rides and swims.',
  },
  cancelled: {
    tone: 'warn',
    title: 'Connection cancelled',
    body: 'You pressed Cancel on Strava, so nothing was linked. You can try again any time.',
  },
  badstate: {
    tone: 'error',
    title: 'That link did not match',
    body: 'The connection link expired or was opened from somewhere else. Start again from this page.',
  },
  inuse: {
    tone: 'error',
    title: 'Already linked',
    body: 'That Strava account is connected to another Turtle Runners member. Disconnect it there first.',
  },
  signedout: {
    tone: 'error',
    title: 'You were signed out',
    body: 'Sign in again, then reconnect Strava.',
  },
  unconfigured: {
    tone: 'error',
    title: 'Strava is not set up here',
    body: 'This deployment has no Strava credentials yet. Ask an admin to add them.',
  },
  failed: {
    tone: 'error',
    title: 'Strava could not finish',
    body: 'Something went wrong talking to Strava. Wait a moment and try again.',
  },
};

const TONE_CLASS: Record<'ok' | 'warn' | 'error', string> = {
  ok: 'border-green-primary/30 bg-green-tint text-green-deep',
  warn: 'border-hairline bg-white text-ink-muted',
  error: 'border-red-200 bg-red-50 text-red-800',
};

export function StravaNotice({ status }: { status?: string }): ReactNode {
  if (!status) return null;

  const notice = NOTICES[status];
  if (!notice) return null;

  return (
    <div
      role="status"
      className={`mb-4 rounded-xl border px-4 py-3 text-sm ${TONE_CLASS[notice.tone]}`}
    >
      <p className="font-semibold">{notice.title}</p>
      <p className="mt-0.5 text-[13px] opacity-90">{notice.body}</p>
    </div>
  );
}
