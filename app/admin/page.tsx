import Link from 'next/link';
import { AttendanceChart } from '@/components/admin/AttendanceChart';
import { CountUp } from '@/components/ui/CountUp';
import { Reveal } from '@/components/ui/Reveal';
import { getAdminOverview } from '@/lib/data';
import { formatDate, formatTime } from '@/lib/time';

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();

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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
    </div>
  );
}
