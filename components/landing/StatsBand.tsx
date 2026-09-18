import { CountUp } from '@/components/ui/CountUp';
import { Reveal } from '@/components/ui/Reveal';
import { CLUB } from '@/lib/club';
import type { ClubStats } from '@/types';

/** Dark band of numbers that count up as they arrive. */
export function StatsBand({ stats }: { stats: ClubStats }) {
  const items = [
    { label: 'Kilometres run', value: stats.runKm, suffix: ' km' },
    { label: 'Kilometres ridden', value: stats.rideKm, suffix: ' km' },
    { label: 'Kilometres swum', value: stats.swimKm, suffix: ' km' },
    { label: 'Active members', value: stats.members, suffix: '' },
  ];

  return (
    <section aria-labelledby="stats-title" className="dark-section border-y border-white/10 py-16 sm:py-20">
      <div className="section text-white">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-green-bright">
            This week, together
          </p>
          <h2 id="stats-title" className="display mt-3 text-3xl sm:text-4xl">
            What the club covered
          </h2>
        </Reveal>

        <dl className="mt-10 grid grid-cols-2 gap-8 lg:grid-cols-4">
          {items.map((item, index) => (
            <Reveal key={item.label} index={index}>
              <div>
                <dd className="display text-[clamp(2.5rem,7vw,4.5rem)] leading-none text-white">
                  <CountUp value={item.value} suffix={item.suffix} />
                </dd>
                <dt className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                  {item.label}
                </dt>
              </div>
            </Reveal>
          ))}
        </dl>

        <Reveal index={4}>
          <p className="mt-10 flex flex-wrap items-center gap-2 text-sm text-white/50">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-green-bright animate-pulseglow" />
            Added up from every session members logged since Monday. We&apos;re also on{' '}
            <a
              href={CLUB.strava}
              target="_blank"
              rel="noreferrer noopener"
              className="tap-link underline decoration-green-bright/50 underline-offset-4 transition-colors hover:text-white"
            >
              Strava
            </a>
            .
          </p>
        </Reveal>
      </div>
    </section>
  );
}
