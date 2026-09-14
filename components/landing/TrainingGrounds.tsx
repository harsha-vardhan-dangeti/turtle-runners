import { ElevationLine } from '@/components/landing/ElevationLine';
import { MeetingPoint } from '@/components/landing/MeetingPoint';
import { Reveal } from '@/components/ui/Reveal';
import { mapDirectionsUrl } from '@/lib/maps';
import { dayShort } from '@/lib/club';
import { formatTime } from '@/lib/time';
import type { GroundActivity } from '@/lib/data';
import type { TrainingGround } from '@/types';
import { SPORT_EMOJI, SPORT_LABEL } from '@/types';

/**
 * Three route cards, each with a self-drawing elevation profile.
 *
 * From `md` up the heading pins and holds while the cards scroll past it. On
 * phones it stays a plain stack, because pinning fights a short viewport.
 */
export function TrainingGrounds({
  grounds,
  activity = {},
}: {
  grounds: TrainingGround[];
  activity?: Record<string, GroundActivity>;
}) {
  return (
    <section id="grounds" aria-labelledby="grounds-title" className="section py-20 sm:py-28">
      <div className="md:grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:gap-12 lg:gap-16">
        <div className="md:sticky md:top-28 md:self-start">
          <Reveal>
            <p className="eyebrow">Training grounds</p>
            <h2 id="grounds-title" className="display mt-3 text-4xl sm:text-5xl">
              One lake. <span className="text-gradient">Three playgrounds.</span>
            </h2>
            <p className="mt-4 hidden text-sm leading-relaxed text-ink-muted md:block">
              Every route starts and finishes at the same gate. Pick the one that matches
              today&apos;s session.
            </p>
          </Reveal>
        </div>

        <div className="mt-10 grid gap-5 md:mt-0">
          {grounds.map((ground, index) => (
            <Reveal key={ground.id} index={index}>
              <article className="card card-hover flex h-full flex-col p-6">
                {ground.status_note ? (
                  <p className="-mx-6 -mt-6 mb-5 border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm font-medium text-amber-900">
                    <span aria-hidden="true">⚠</span> {ground.status_note}
                  </p>
                ) : null}
                <div className="flex items-center gap-2">
                  <span className="chip-green">
                    <span aria-hidden="true">{SPORT_EMOJI[ground.sport]}</span>
                    {SPORT_LABEL[ground.sport]}
                  </span>
                </div>

                <h3 className="display mt-4 text-3xl">{ground.title}</h3>
                <p className="mt-1 text-sm text-ink-muted">{ground.subtitle}</p>

                {ground.sport !== 'swim' && ground.elevation.length > 1 ? (
                  <div className="mt-5">
                    <ElevationLine points={ground.elevation} id={ground.id} />
                  </div>
                ) : null}

                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline pt-4">
                  {ground.stats.map((stat) => (
                    <div key={stat.label}>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                        {stat.label}
                      </dt>
                      <dd className="display mt-1 text-lg">{stat.value}</dd>
                    </div>
                  ))}
                </dl>

                {ground.meet_at || ground.parking || ground.facilities ? (
                  <dl className="mt-4 space-y-1.5 rounded-xl bg-green-tint/40 px-4 py-3 text-[13px] leading-relaxed">
                    {ground.meet_at ? (
                      <div className="flex gap-2">
                        <dt className="shrink-0 font-semibold text-green-deep">Meet</dt>
                        <dd className="text-ink-muted">{ground.meet_at}</dd>
                      </div>
                    ) : null}
                    {ground.parking ? (
                      <div className="flex gap-2">
                        <dt className="shrink-0 font-semibold text-green-deep">Parking</dt>
                        <dd className="text-ink-muted">{ground.parking}</dd>
                      </div>
                    ) : null}
                    {ground.facilities ? (
                      <div className="flex gap-2">
                        <dt className="shrink-0 font-semibold text-green-deep">On site</dt>
                        <dd className="text-ink-muted">{ground.facilities}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}

                {(activity[ground.id]?.weekly.length ?? 0) > 0 ? (
                  <p className="mt-4 text-sm text-ink-muted">
                    The club trains here{' '}
                    {activity[ground.id]!.weekly.map((session, i, all) => (
                      <span key={session.id} className="font-semibold text-ink">
                        {i > 0 ? (i === all.length - 1 ? ' and ' : ', ') : ''}
                        {dayShort(session.iso_dow)} {formatTime(session.time)}
                      </span>
                    ))}
                    .
                  </p>
                ) : null}

                {(activity[ground.id]?.clubSessions ?? 0) > 0 ? (
                  <p className="mt-2 text-sm text-ink-muted">
                    <span className="font-semibold text-green-deep">
                      {activity[ground.id]!.clubSessions}
                    </span>{' '}
                    club session{activity[ground.id]!.clubSessions === 1 ? '' : 's'} logged here,{' '}
                    <span className="font-semibold text-green-deep">
                      {activity[ground.id]!.clubKm}
                    </span>{' '}
                    km
                    {(activity[ground.id]?.yourSessions ?? 0) > 0 ? (
                      <>
                        {' · '}
                        <span className="font-semibold text-ink">
                          you: {activity[ground.id]!.yourSessions} ({activity[ground.id]!.yourKm} km)
                        </span>
                      </>
                    ) : null}
                  </p>
                ) : null}

                <div className="mt-4">
                  <MeetingPoint
                    place={{ lat: ground.lat, lng: ground.lng, location: ground.subtitle }}
                    label={ground.subtitle}
                  />
                </div>

                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  {ground.gpx ? (
                    <a
                      href={ground.gpx}
                      download
                      className="chip transition-colors hover:border-green-primary/40 hover:text-ink"
                    >
                      <span aria-hidden="true">⤓</span> GPX
                    </a>
                  ) : null}
                  {ground.strava ? (
                    <a
                      href={ground.strava}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="chip transition-colors hover:border-green-primary/40 hover:text-ink"
                    >
                      Strava
                    </a>
                  ) : null}
                  <a
                    href={mapDirectionsUrl(ground)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="chip transition-colors hover:border-green-primary/40 hover:text-ink"
                  >
                    Directions
                  </a>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
