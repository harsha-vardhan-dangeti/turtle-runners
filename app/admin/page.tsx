import Link from 'next/link';
import { AdminActivity } from '@/components/admin/AdminActivity';
import { AttendanceChart } from '@/components/admin/AttendanceChart';
import { CountUp } from '@/components/ui/CountUp';
import { Reveal } from '@/components/ui/Reveal';
import { getAdminActivity, getAdminOverview, getCurrentProfile } from '@/lib/data';
import { formatDate, formatTime } from '@/lib/time';

export default async function AdminOverviewPage() {
  // The layout renders the signed-out and non-admin panels, but layouts and
  // pages render concurrently: without this guard the data call below throws
  // NOT_AUTHENTICATED first and the error page wins the race.
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') return null;

  const [overview, activity] = await Promise.all([getAdminOverview(), getAdminActivity()]);

  const kpis = [
    {
      label: 'Members',
      value: overview.members,
      hint: `${overview.admins} admin${overview.admins === 1 ? '' : 's'}`,
      href: '/admin/members',
    },
    {
      label: 'RSVPs, next event',
      value: overview.nextEventRsvps,
      hint: overview.nextEvent
        ? `${overview.nextEvent.title} · ${formatDate(overview.nextEvent.date)} ${formatTime(overview.nextEvent.time)}`
        : 'Nothing published yet',
      href: '/admin/events',
    },
    {
      label: 'Club km this week',
      value: overview.weeklyKm,
      hint: 'Run + ride + swim',
      href: '/admin',
    },
    {
      label: 'Pending testimonials',
      value: overview.pendingTestimonials,
      hint: overview.pendingTestimonials > 0 ? 'Waiting on you' : 'Queue is clear',
      href: '/admin/testimonials',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, index) => (
          <Reveal key={kpi.label} index={index}>
            <Link href={kpi.href} className="card card-hover block h-full p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {kpi.label}
              </p>
              <p className="display mt-3 text-5xl leading-none">
                <CountUp value={kpi.value} />
              </p>
              <p className="mt-3 line-clamp-2 text-xs text-ink-muted">{kpi.hint}</p>
            </Link>
          </Reveal>
        ))}
      </div>

      <Reveal index={1}>
        <AttendanceChart data={overview.attendance} />
      </Reveal>

      <Reveal index={2}>
        <AdminActivity entries={activity} />
      </Reveal>
    </div>
  );
}
