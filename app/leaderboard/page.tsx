import type { Metadata } from 'next';
import Link from 'next/link';
import { SignedOutPanel } from '@/components/SignedOutPanel';
import { LeaderboardOptIn } from '@/components/leaderboard/LeaderboardOptIn';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/nav/SiteHeader';
import { Avatar } from '@/components/ui/Avatar';
import { getCurrentProfile, getLeaderboard } from '@/lib/data';
import { istToday } from '@/lib/time';
import { SPORT_EMOJI, type LeaderboardRow } from '@/types';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: "This month's club leaderboard: distance and consistency, for members who opt in.",
};

const MEASURES = {
  total: { label: 'All sports', emoji: '🔺' },
  run: { label: 'Run', emoji: SPORT_EMOJI.run },
  bike: { label: 'Ride', emoji: SPORT_EMOJI.bike },
  swim: { label: 'Swim', emoji: SPORT_EMOJI.swim },
  weeks: { label: 'Consistency', emoji: '🔥' },
} as const;

type Measure = keyof typeof MEASURES;

function isMeasure(value: unknown): value is Measure {
  return typeof value === 'string' && value in MEASURES;
}

function score(row: LeaderboardRow, by: Measure): number {
  switch (by) {
    case 'run':
      return row.run_m;
    case 'bike':
      return row.bike_m;
    case 'swim':
      return row.swim_m;
    case 'weeks':
      return row.active_weeks;
    default:
      return row.total_m;
  }
}

function display(row: LeaderboardRow, by: Measure): string {
  if (by === 'weeks') return `${row.active_weeks}/8 wks`;
  const metres = score(row, by);
  return `${(metres / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} km`;
}

const monthLabel = (ymd: string) =>
  new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${ymd}T00:00:00Z`),
  );

/**
 * The club's monthly board. Opt-in only, members only: nobody is ranked who
 * did not ask to be, and visitors never see who trains how much.
 */
export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <>
        <SiteHeader variant="app" />
        <main id="main">
          <SignedOutPanel
            title="Club leaderboard"
            message="Sign in to see this month's board. Members choose whether to appear on it."
          />
        </main>
        <SiteFooter />
      </>
    );
  }

  const requested = (await searchParams).by;
  const by: Measure = isMeasure(requested) ? requested : 'total';
  const board = (await getLeaderboard()) ?? [];

  const ranked = [...board].sort(
    (a, b) =>
      score(b, by) - score(a, by) || b.sessions - a.sessions || a.name.localeCompare(b.name),
  );
  // Standard competition ranking: equal scores share a place.
  const places = ranked.map((row, index) =>
    index > 0 && score(row, by) === score(ranked[index - 1]!, by) ? null : index + 1,
  );
  let lastPlace = 1;
  const rankOf = places.map((place) => (place === null ? lastPlace : (lastPlace = place)));

  return (
    <>
      <SiteHeader variant="app" />

      <main id="main" className="section py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">This month · {monthLabel(istToday())}</p>
            <h1 className="display mt-2 text-[clamp(2.4rem,7vw,4.5rem)]">
              Club <span className="text-gradient">leaderboard</span>
            </h1>
            <p className="mt-3 max-w-xl text-ink-muted">
              Distance resets on the 1st. Consistency counts the weeks, of the last eight, with at
              least one session. Only members who join the board appear on it.
            </p>
          </div>
          {profile.show_on_leaderboard ? (
            <div className="text-right">
              <p className="text-sm font-semibold text-green-deep">You&apos;re on the board</p>
              <LeaderboardOptIn onBoard />
            </div>
          ) : null}
        </div>

        {!profile.show_on_leaderboard ? (
          <div className="card mt-8 flex flex-wrap items-center justify-between gap-4 border-green-primary/25 bg-green-tint/40 p-5">
            <div className="max-w-xl">
              <p className="display text-xl">You&apos;re not on the board</p>
              <p className="mt-1 text-sm text-ink-muted">
                Joining shows members your name, this month&apos;s totals and your consistency. Your
                individual sessions, times and notes stay private, visible only to you and the
                club&apos;s admins.
              </p>
            </div>
            <LeaderboardOptIn onBoard={false} />
          </div>
        ) : null}

        <nav aria-label="Rank by" className="no-scrollbar mt-8 flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(MEASURES) as Measure[]).map((key) => (
            <Link
              key={key}
              href={key === 'total' ? '/leaderboard' : `/leaderboard?by=${key}`}
              aria-current={by === key ? 'page' : undefined}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                by === key
                  ? 'border-green-primary bg-green-tint text-green-deep'
                  : 'border-hairline bg-white text-ink-muted hover:border-green-primary/40 hover:text-ink'
              }`}
            >
              <span aria-hidden="true">{MEASURES[key].emoji}</span> {MEASURES[key].label}
            </Link>
          ))}
        </nav>

        {ranked.length === 0 ? (
          <div className="card mt-6 border-dashed p-10 text-center">
            <p className="display text-2xl">Nobody on the board yet</p>
            <p className="mt-2 text-sm text-ink-muted">
              Be the first: join above, then log a session or sync Strava.
            </p>
          </div>
        ) : (
          <ol className="card mt-6 divide-y divide-hairline p-2 sm:p-3">
            {ranked.map((row, index) => {
              const me = row.user_id === profile.id;
              const rank = rankOf[index]!;
              const medal = score(row, by) > 0 ? (['🥇', '🥈', '🥉'][rank - 1] ?? null) : null;
              return (
                <li
                  key={row.user_id}
                  aria-current={me ? 'true' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 sm:gap-4 ${me ? 'bg-green-tint/60' : ''}`}
                >
                  <span className="display w-9 shrink-0 text-center text-xl tabular-nums text-ink-muted">
                    {medal ?? rank}
                  </span>
                  <Avatar name={row.name} src={row.avatar_url} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {row.name}
                      {me ? <span className="ml-2 text-xs font-semibold text-green-deep">you</span> : null}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {row.sessions} session{row.sessions === 1 ? '' : 's'} · {row.active_days} day
                      {row.active_days === 1 ? '' : 's'} active
                      {by === 'total' && row.total_m > 0
                        ? ` · 🏃 ${(row.run_m / 1000).toFixed(1)} · 🚴 ${(row.bike_m / 1000).toFixed(1)} · 🏊 ${(row.swim_m / 1000).toFixed(1)} km`
                        : ''}
                    </p>
                  </div>
                  <span className={`display shrink-0 text-xl tabular-nums sm:text-2xl ${score(row, by) > 0 ? '' : 'text-ink-muted/60'}`}>
                    {display(row, by)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
