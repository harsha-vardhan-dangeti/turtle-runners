import { StravaMark } from '@/components/dashboard/StravaMark';
import type { StravaOverview } from '@/lib/strava/types';

const SPORTS = [
  { key: 'run', label: 'Run', emoji: '🏃' },
  { key: 'bike', label: 'Bike', emoji: '🚴' },
  { key: 'swim', label: 'Swim', emoji: '🏊' },
] as const;

/** Year-to-date totals, Strava records and gear mileage. */
export function StravaStats({ overview }: { overview: StravaOverview }) {
  const { ytd, records, gear } = overview;

  return (
    <section aria-labelledby="strava-stats-title" className="card p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="label">This year on Strava</p>
          <h2 id="strava-stats-title" className="display text-2xl">
            Year to date
          </h2>
        </div>
        <span className="text-ink-muted" style={{ color: '#FC4C02' }}>
          <StravaMark size={20} />
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3">
        {SPORTS.map((sport) => (
          <div key={sport.key} className="rounded-xl bg-green-tint/50 px-3 py-4 text-center">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-green-deep">
              <span aria-hidden="true">{sport.emoji}</span> {sport.label}
            </dt>
            <dd className="display mt-1.5 text-2xl text-green-deep">
              {ytd[sport.key].km.toFixed(0)}
              <span className="text-sm"> km</span>
            </dd>
            <dd className="mt-0.5 text-[11px] text-ink-muted">
              {ytd[sport.key].count} session{ytd[sport.key].count === 1 ? '' : 's'}
            </dd>
          </div>
        ))}
      </dl>

      {records.biggestRideKm || records.biggestClimbM ? (
        <div className="mt-5 border-t border-hairline pt-4">
          <p className="label">Strava records</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {records.biggestRideKm ? (
              <span className="chip-green">Longest ride · {records.biggestRideKm} km</span>
            ) : null}
            {records.biggestClimbM ? (
              <span className="chip-green">Biggest climb · {records.biggestClimbM} m</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {gear.length > 0 ? (
        <div className="mt-5 border-t border-hairline pt-4">
          <p className="label">Gear</p>
          <ul className="mt-2 space-y-2">
            {gear.slice(0, 5).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden="true">{item.kind === 'bike' ? '🚲' : '👟'}</span>
                  <span className="truncate text-ink">{item.name}</span>
                  {item.primary ? <span className="chip shrink-0 !py-0.5">Primary</span> : null}
                </span>
                <span className="display shrink-0 text-base">{item.km.toFixed(0)} km</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
