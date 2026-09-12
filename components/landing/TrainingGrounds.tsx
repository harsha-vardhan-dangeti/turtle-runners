import { ElevationLine } from '@/components/landing/ElevationLine';
import { Reveal } from '@/components/ui/Reveal';
import { TRAINING_GROUNDS } from '@/lib/club';
import { mapDirectionsUrl } from '@/lib/maps';
import { SPORT_EMOJI, SPORT_LABEL } from '@/types';

/**
 * Three route cards, each with a self-drawing elevation profile.
 *
 * From `md` up the heading pins and holds while the cards scroll past it. On
 * phones it stays a plain stack, because pinning fights a short viewport.
 */
export function TrainingGrounds() {
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
          {TRAINING_GROUNDS.map((ground, index) => (
            <Reveal key={ground.id} index={index}>
              <article className="card card-hover flex h-full flex-col p-6">
                <div className="flex items-center gap-2">
                  <span className="chip-green">
                    <span aria-hidden="true">{SPORT_EMOJI[ground.sport]}</span>
                    {SPORT_LABEL[ground.sport]}
                  </span>
                </div>

                <h3 className="display mt-4 text-3xl">{ground.title}</h3>
                <p className="mt-1 text-sm text-ink-muted">{ground.subtitle}</p>

                <div className="mt-5">
                  <ElevationLine points={ground.elevation} id={ground.id} />
                </div>

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

                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  <a
                    href={ground.gpx}
                    download
                    className="chip transition-colors hover:border-green-primary/40 hover:text-ink"
                  >
                    <span aria-hidden="true">⤓</span> GPX
                  </a>
                  <a
                    href={ground.strava}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="chip transition-colors hover:border-green-primary/40 hover:text-ink"
                  >
                    Strava
                  </a>
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
