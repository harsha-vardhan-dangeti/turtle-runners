import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BibCard } from '@/components/BibCard';
import { SessionsTable } from '@/components/dashboard/SessionsTable';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { bibNumber } from '@/lib/club';
import { getCurrentProfile, getMemberSnapshot } from '@/lib/data';
import { getStravaConnectionForMember } from '@/lib/strava/sync';
import { formatDate, formatTime, memberSince, relativeDay } from '@/lib/time';
import { EVENT_TYPE_EMOJI, LEVEL_LABEL, SPORT_EMOJI, SPORT_LABEL } from '@/types';

/**
 * One member as an admin sees them: the same picture the member has on their
 * own dashboard, and nothing that acts. There is no "become this member"
 * here on purpose — an action taken as someone else leaves no trace of who
 * really took it.
 */
export default async function AdminMemberPage({ params }: { params: Promise<{ id: string }> }) {
  // The layout renders the signed-out and non-admin panels, but layouts and
  // pages render concurrently: without this guard the data call below throws
  // NOT_AUTHENTICATED first and the error page wins the race.
  const viewer = await getCurrentProfile();
  if (viewer?.role !== 'admin') return null;

  const { id } = await params;
  const snapshot = await getMemberSnapshot(id);
  if (!snapshot) notFound();

  const { profile, dashboard, eventRsvps, sessionRsvps } = snapshot;
  const strava = await getStravaConnectionForMember(id).catch(() => null);
  const weekTotal = dashboard.volume.run + dashboard.volume.bike + dashboard.volume.swim;

  return (
    <div className="space-y-5">
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
        <span aria-hidden="true">👁</span> Admin view of {profile.name}&apos;s dashboard. Read only:
        nothing here changes their data, and nothing is done as them.
      </p>

      <section aria-labelledby="member-title" className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={profile.name} src={profile.avatar_url} size={56} />
            <div>
              <h2 id="member-title" className="display text-2xl">
                {profile.name}
              </h2>
              <p className="mt-0.5 text-sm text-ink-muted">
                <span className="display text-green-primary">#{bibNumber(profile.id)}</span> ·{' '}
                <span aria-hidden="true">{SPORT_EMOJI[profile.sport]}</span>{' '}
                {SPORT_LABEL[profile.sport]} · {LEVEL_LABEL[profile.level]} · joined{' '}
                {memberSince(profile.joined_at)}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.removed_at ? (
                  <span className="chip border-red-200 bg-red-50 text-red-800">Removed</span>
                ) : (
                  <span className={profile.role === 'admin' ? 'chip-green' : 'chip'}>
                    {profile.role === 'admin' ? 'Admin' : 'Member'}
                  </span>
                )}
                <span className="chip">
                  {profile.show_on_leaderboard ? 'On the leaderboard' : 'Not on the leaderboard'}
                </span>
                <span className="chip">
                  {strava ? `Strava: ${strava.athleteName ?? 'connected'}` : 'Strava not connected'}
                </span>
              </div>
            </div>
          </div>
          <Link href="/admin/members" className="btn-ghost px-4 py-2 text-xs">
            ← All members
          </Link>
        </div>

        {strava ? (
          <p className="mt-4 text-xs text-ink-muted">
            Strava connected {formatDate(strava.connectedAt.slice(0, 10))}
            {strava.lastSyncedAt
              ? `, last synced ${formatDate(strava.lastSyncedAt.slice(0, 10))}`
              : ', never synced'}
            .
          </p>
        ) : null}
      </section>

      <section aria-labelledby="member-volume" className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="member-volume" className="display text-2xl">
            This week
          </h2>
          <p className="text-sm text-ink-muted">
            {weekTotal.toFixed(1)} km · 🔥 {dashboard.streak} week streak ·{' '}
            {dashboard.totalSessions} session{dashboard.totalSessions === 1 ? '' : 's'} all time
          </p>
        </div>
        <div className="mt-6 grid grid-cols-1 justify-items-center gap-8 sm:grid-cols-3">
          <ProgressRing label="Run" emoji="🏃" unit="km" value={dashboard.volume.run} target={dashboard.targets.run} />
          <ProgressRing label="Bike" emoji="🚴" unit="km" value={dashboard.volume.bike} target={dashboard.targets.bike} />
          <ProgressRing label="Swim" emoji="🏊" unit="km" value={dashboard.volume.swim} target={dashboard.targets.swim} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <SessionsTable sessions={dashboard.sessions} totalSessions={dashboard.totalSessions} readOnly />

        <div className="space-y-5">
          <section aria-labelledby="member-rsvps" className="card p-6">
            <h2 id="member-rsvps" className="display text-2xl">
              Coming up for them
            </h2>

            <p className="label mt-4">Weekly sessions</p>
            {sessionRsvps.length === 0 ? (
              <p className="text-sm text-ink-muted">No weekly sessions RSVPd.</p>
            ) : (
              <ul className="space-y-1.5">
                {sessionRsvps.map((row) => (
                  <li key={`${row.session.id}-${row.occursOn}`} className="text-sm">
                    <span aria-hidden="true">{EVENT_TYPE_EMOJI[row.session.type]}</span>{' '}
                    <span className="font-semibold">{row.session.title}</span>
                    <span className="text-ink-muted">
                      {' '}
                      · {relativeDay(row.occursOn)} {formatDate(row.occursOn)}{' '}
                      {formatTime(row.session.time)}
                      {row.paceGroup ? ` · ${row.paceGroup}` : ' · no group'}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p className="label mt-5">Events</p>
            {eventRsvps.length === 0 ? (
              <p className="text-sm text-ink-muted">No events RSVPd.</p>
            ) : (
              <ul className="space-y-1.5">
                {eventRsvps.map((event) => (
                  <li key={event.id} className="text-sm">
                    <span aria-hidden="true">{EVENT_TYPE_EMOJI[event.type]}</span>{' '}
                    <span className="font-semibold">{event.title}</span>
                    <span className="text-ink-muted">
                      {' '}
                      · {formatDate(event.date)} {formatTime(event.time)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <BibCard
            id={profile.id}
            name={profile.name}
            sport={profile.sport}
            level={profile.level}
            goal={profile.goal}
            role={profile.role}
          />
        </div>
      </div>
    </div>
  );
}
