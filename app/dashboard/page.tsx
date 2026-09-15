import type { Metadata } from 'next';
import Link from 'next/link';
import { BibCard } from '@/components/BibCard';
import { SignedOutPanel } from '@/components/SignedOutPanel';
import { LogSessionForm } from '@/components/dashboard/LogSessionForm';
import { SessionsTable } from '@/components/dashboard/SessionsTable';
import { StravaActivities } from '@/components/dashboard/StravaActivities';
import { StravaCard } from '@/components/dashboard/StravaCard';
import { StravaStats } from '@/components/dashboard/StravaStats';
import { UpcomingList } from '@/components/dashboard/UpcomingList';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/nav/SiteHeader';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Reveal } from '@/components/ui/Reveal';
import { firstName } from '@/lib/club';
import {
  getCurrentProfile,
  getLoggableGrounds,
  getMemberDashboard,
  getUpcomingEvents,
} from '@/lib/data';
import { HAS_STRAVA, IS_DEMO } from '@/lib/env';
import { getStravaConnection, getStravaOverview } from '@/lib/strava/sync';
import { istHour, istToday, relativeDay } from '@/lib/time';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your week: volume against target, recent sessions and what you have RSVP’d to.',
};

function greeting(): string {
  const hour = istHour();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentProfile();
  // The OAuth callback can only redirect, so it reports its outcome here.
  const stravaStatus = (await searchParams).strava;

  if (!profile) {
    return (
      <>
        <SiteHeader variant="app" />
        <main id="main">
          <SignedOutPanel />
        </main>
        <SiteFooter />
      </>
    );
  }

  const [events, data, grounds] = await Promise.all([
    getUpcomingEvents(5),
    getMemberDashboard(),
    // Optional picker: a failure here should cost the dropdown, not the page.
    getLoggableGrounds().catch(() => []),
  ]);

  // Strava is optional and remote: a failure here must not take the whole
  // dashboard down, so the page degrades to the disconnected state instead.
  const stravaConnection = await getStravaConnection().catch(() => null);
  const stravaOverview = stravaConnection ? await getStravaOverview().catch(() => null) : null;
  const stravaSessions = data.sessions.filter((session) => session.source === 'strava').slice(0, 6);

  return (
    <>
      <SiteHeader variant="app" />

      <main id="main" className="section py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">Turtle Runners</p>
            <h1 className="display mt-2 text-[clamp(2.4rem,7vw,4.5rem)]">
              {greeting()}, <span className="text-gradient">{firstName(profile.name)}</span>.
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LogSessionForm
              today={istToday()}
              grounds={grounds.map(({ id, title, sport, subtitle }) => ({ id, title, sport, subtitle }))}
            />
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-ink px-5 py-2.5 text-white shadow-turtle">
              <span aria-hidden="true" className="text-xl leading-none">
                🔥
              </span>
              <span className="display text-3xl leading-none text-green-bright">{data.streak}</span>
              <span className="text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-white/60">
                week
                <br />
                streak
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="min-w-0 space-y-5 lg:col-span-2">
            <Reveal>
              <section aria-labelledby="volume-title" className="card p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="volume-title" className="display text-2xl">
                    This week
                  </h2>
                  <p className="text-sm text-ink-muted">
                    Targets follow your level:{' '}
                    <Link
                      href="/profile"
                      className="font-semibold text-green-deep underline underline-offset-4"
                    >
                      change it
                    </Link>
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-1 justify-items-center gap-8 sm:grid-cols-3">
                  <ProgressRing
                    label="Run"
                    emoji="🏃"
                    unit="km"
                    value={data.volume.run}
                    target={data.targets.run}
                  />
                  <ProgressRing
                    label="Bike"
                    emoji="🚴"
                    unit="km"
                    value={data.volume.bike}
                    target={data.targets.bike}
                  />
                  <ProgressRing
                    label="Swim"
                    emoji="🏊"
                    unit="km"
                    value={data.volume.swim}
                    target={data.targets.swim}
                  />
                </div>
              </section>
            </Reveal>

            <Reveal index={1}>
              <SessionsTable sessions={data.sessions} totalSessions={data.totalSessions} />
            </Reveal>

            {stravaSessions.length > 0 ? (
              <Reveal index={2}>
                <StravaActivities sessions={stravaSessions} />
              </Reveal>
            ) : null}
          </div>

          <div className="min-w-0 space-y-5">
            <Reveal index={1}>
              <section aria-labelledby="log-title" className="card p-6">
                <p className="label">Your log</p>
                <h2 id="log-title" className="display text-2xl">
                  {data.totalSessions} session{data.totalSessions === 1 ? '' : 's'}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {data.lastSessionDate
                    ? `Last one ${relativeDay(data.lastSessionDate).toLowerCase()}.`
                    : 'Nothing logged yet — your first one starts the streak.'}
                </p>

                <div className="mt-5 flex items-center justify-between rounded-xl bg-green-tint/60 px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-green-deep">
                    This week
                  </span>
                  <span className="display text-xl text-green-deep">
                    {(data.volume.run + data.volume.bike + data.volume.swim).toFixed(1)} km
                  </span>
                </div>
              </section>
            </Reveal>

            <Reveal index={2}>
              <StravaCard
                connection={stravaConnection}
                configured={HAS_STRAVA}
                isDemo={IS_DEMO}
                status={typeof stravaStatus === 'string' ? stravaStatus : undefined}
              />
            </Reveal>

            {stravaOverview ? (
              <Reveal index={3}>
                <StravaStats overview={stravaOverview} />
              </Reveal>
            ) : null}

            <Reveal index={3}>
              <BibCard
                id={profile.id}
                name={profile.name}
                sport={profile.sport}
                level={profile.level}
                goal={profile.goal}
                role={profile.role}
              />
            </Reveal>

            <Reveal index={3}>
              <UpcomingList events={events} />
            </Reveal>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
