import { StravaMark } from '@/components/dashboard/StravaMark';
import { formatDistance, formatDuration, formatEffort } from '@/lib/stats';
import { relativeDay } from '@/lib/time';
import { SPORT_EMOJI } from '@/types';
import type { TrainingSession } from '@/types';

/** The member's most recent Strava imports, linking back to Strava. */
export function StravaActivities({ sessions }: { sessions: TrainingSession[] }) {
  if (sessions.length === 0) return null;

  return (
    <section aria-labelledby="strava-activities-title" className="card p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="strava-activities-title" className="display text-2xl">
          Recent from Strava
        </h2>
        <span style={{ color: '#FC4C02' }}>
          <StravaMark size={20} />
        </span>
      </div>

      <ul className="mt-4 divide-y divide-hairline">
        {sessions.map((session) => (
          <li key={session.id} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                <span aria-hidden="true">{SPORT_EMOJI[session.sport]}</span> {session.title}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {relativeDay(session.date)} · {formatDuration(session.duration_s)} ·{' '}
                {formatEffort(session)}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="display text-lg">
                {formatDistance(session)}
              </p>
              {session.strava_activity_id ? (
                <a
                  href={`https://www.strava.com/activities/${session.strava_activity_id}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[11px] font-semibold underline underline-offset-2"
                  style={{ color: '#FC4C02' }}
                >
                  View
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
