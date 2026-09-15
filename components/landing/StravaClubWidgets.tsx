import { Reveal } from '@/components/ui/Reveal';
import { STRAVA_WIDGET_SIZES, stravaClubUrl, stravaWidgetSrc } from '@/lib/strava/widgets';
import type { StravaWidgets } from '@/types';

/**
 * The club as Strava sees it: Strava's own summary and latest-activities
 * widgets. Renders nothing until an admin adds the widget code.
 *
 * The frames are lazy: they sit well below the fold, and each one is a full
 * third-party page load.
 */
export function StravaClubWidgets({ widgets }: { widgets: StravaWidgets | null }) {
  if (!widgets) return null;

  return (
    <section id="strava" aria-labelledby="strava-title" className="section py-20 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-16">
        <Reveal>
          <p className="eyebrow">On Strava</p>
          <h2 id="strava-title" className="display mt-3 text-4xl sm:text-5xl">
            The club, <span className="text-gradient">live on Strava.</span>
          </h2>
          <p className="mt-4 max-w-md text-ink-muted">
            Every run, ride and swim members share with the club lands here. Join the club on Strava
            and yours will too.
          </p>
          <a
            href={stravaClubUrl(widgets.clubId)}
            target="_blank"
            rel="noreferrer noopener"
            className="btn mt-6 bg-[#FC4C02] text-white hover:-translate-y-0.5 hover:shadow-turtle-lg"
          >
            Join us on Strava
          </a>
        </Reveal>

        <Reveal index={1}>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start lg:flex-col xl:flex-row">
            <iframe
              title="Turtle Runners on Strava: club summary"
              src={stravaWidgetSrc(widgets, 'summary')}
              width={STRAVA_WIDGET_SIZES.summary.width}
              height={STRAVA_WIDGET_SIZES.summary.height}
              loading="lazy"
              scrolling="no"
              className="max-w-full shrink-0 rounded-2xl border border-hairline bg-white shadow-turtle"
            />
            <iframe
              title="Turtle Runners on Strava: latest activities"
              src={stravaWidgetSrc(widgets, 'activities')}
              width={STRAVA_WIDGET_SIZES.activities.width}
              height={STRAVA_WIDGET_SIZES.activities.height}
              loading="lazy"
              scrolling="no"
              className="max-w-full shrink-0 rounded-2xl border border-hairline bg-white shadow-turtle"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
