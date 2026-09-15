'use client';

import { useTransition } from 'react';
import { StravaMark } from '@/components/dashboard/StravaMark';
import { StravaNotice } from '@/components/dashboard/StravaNotice';
import { useToast } from '@/components/ui/Toast';
import {
  connectDemoStravaAction,
  disconnectStravaAction,
  syncStravaAction,
} from '@/app/actions/strava';
import type { StravaConnectionSummary } from '@/lib/strava/types';

function relativeSync(iso: string | null): string {
  if (!iso) return 'never synced';

  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'synced just now';
  if (minutes < 60) return `synced ${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `synced ${hours}h ago`;
  return `synced ${Math.round(hours / 24)}d ago`;
}

/** What a member is actually agreeing to, in the order they will meet it. */
const CONNECT_STEPS = [
  {
    title: 'Sign in at Strava',
    body: 'The button takes you to Strava. If you are already signed in there, this step passes in a blink.',
  },
  {
    title: 'Approve the connection',
    body: 'Strava asks what Turtle Runners may see. Leave the private activities box ticked if you want those counted too.',
  },
  {
    title: 'Come back and sync',
    body: 'You land back here. Press Sync now and your last six months of runs, rides and swims drop into your log.',
  },
];

interface StravaCardProps {
  connection: StravaConnectionSummary | null;
  /** False when the deployment has no Strava credentials configured. */
  configured: boolean;
  isDemo: boolean;
  /** The ?strava= status the OAuth callback redirected back with, if any. */
  status?: string;
}

export function StravaCard({ connection, configured, isDemo, status }: StravaCardProps) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      toast(result.message, result.ok ? 'success' : 'error');
    });
  }

  if (!connection) {
    return (
      <section aria-labelledby="strava-title" className="card p-6">
        <StravaNotice status={status} />

        <p className="label">Training data</p>
        <h2 id="strava-title" className="display text-2xl">
          Connect Strava
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Pull your runs, rides and swims straight into your log. Your rings, streak and club total
          all count them automatically.
        </p>

        <ol className="mt-5 space-y-3">
          {CONNECT_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-tint text-xs font-bold text-green-deep"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{step.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-xl border border-hairline bg-white/60 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            What comes across
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            Runs, rides and swims only. Walks, hikes, yoga and gym sessions are left alone. Your
            activities stay private to you. The club page only shows combined distance, and the
            leaderboard shows your monthly totals only if you join it.
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            Changed your mind later? Disconnecting removes everything Strava imported and leaves
            anything you logged by hand untouched.
          </p>
        </div>

        {configured || isDemo ? (
          isDemo ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(connectDemoStravaAction)}
              className="btn-primary mt-5 !bg-none"
              style={{ backgroundColor: '#FC4C02' }}
            >
              <StravaMark /> {pending ? 'Connecting…' : 'Connect with Strava'}
            </button>
          ) : (
            <a
              href="/api/strava/connect"
              className="btn mt-5 text-white shadow-turtle hover:-translate-y-0.5"
              style={{ backgroundColor: '#FC4C02' }}
            >
              <StravaMark /> Connect with Strava
            </a>
          )
        ) : (
          <p className="mt-5 rounded-xl bg-green-tint/60 px-4 py-3 text-xs text-green-deep">
            Strava is not configured on this deployment yet.
          </p>
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="strava-title" className="card p-6">
      <StravaNotice status={status} />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label">Connected</p>
          <h2 id="strava-title" className="display truncate text-2xl">
            {connection.athleteName ?? 'Strava athlete'}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{relativeSync(connection.lastSyncedAt)}</p>
        </div>
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: '#FC4C02' }}
        >
          <StravaMark size={18} />
        </span>
      </div>

      {connection.lastSyncedAt === null ? (
        <p className="mt-4 rounded-xl bg-green-tint/60 px-4 py-3 text-[13px] leading-relaxed text-green-deep">
          Last step: press Sync now to pull your last six months of activities. After this, sync
          whenever you want the newest ones.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(syncStravaAction)}
          className="btn-primary"
        >
          {pending ? 'Syncing…' : 'Sync now'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (
              !window.confirm(
                'Disconnect Strava? Sessions imported from Strava will be removed. Anything you logged by hand stays.',
              )
            ) {
              return;
            }
            run(disconnectStravaAction);
          }}
          className="btn-ghost"
        >
          Disconnect
        </button>
      </div>

      <p className="mt-4 text-[11px] text-ink-muted">Powered by Strava</p>
    </section>
  );
}
