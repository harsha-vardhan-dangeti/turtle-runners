'use client';

import { useState, useTransition } from 'react';
import { useToast } from '@/components/ui/Toast';
import { removeStravaWidgetsAction, saveStravaWidgetsAction } from '@/app/actions/strava-widgets';
import { STRAVA_WIDGET_SIZES, stravaWidgetSrc } from '@/lib/strava/widgets';
import type { StravaWidgets } from '@/types';

/**
 * Where an admin pastes Strava's club widget embed code. Strava only shows
 * that code to signed-in club members, so it cannot be fetched for them.
 */
export function StravaWidgetsManager({ widgets }: { widgets: StravaWidgets | null }) {
  const [code, setCode] = useState('');
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveStravaWidgetsAction(formData);
      toast(result.message, result.ok ? 'success' : 'error');
      if (result.ok) setCode('');
    });
  }

  function onRemove() {
    startTransition(async () => {
      const result = await removeStravaWidgetsAction();
      toast(result.message, result.ok ? 'success' : 'error');
    });
  }

  return (
    <section aria-labelledby="strava-widgets-title" className="card p-6">
      <h2 id="strava-widgets-title" className="display text-2xl">
        Strava club widgets
      </h2>
      <p className="mt-1 max-w-xl text-sm text-ink-muted">
        Show your Strava club&apos;s summary and latest activities on the club page.{' '}
        {widgets ? (
          <>
            Showing club <span className="font-semibold text-ink">{widgets.clubId}</span>.
          </>
        ) : (
          'Nothing is shown until you add the code.'
        )}
      </p>

      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-ink-muted">
        <li>
          Open your club on Strava, signed in (
          <a
            href="https://www.strava.com/clubs/2337097"
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold text-green-deep underline underline-offset-4"
          >
            strava.com/clubs/2337097
          </a>
          ).
        </li>
        <li>Choose <span className="font-semibold text-ink">Share</span>, then the widget embed code.</li>
        <li>Copy either code (summary or latest activities) and paste it below. One is enough.</li>
      </ol>

      <form onSubmit={onSave} className="mt-4 space-y-3">
        <label htmlFor="strava-widget-code" className="label">
          Widget embed code
        </label>
        <textarea
          id="strava-widget-code"
          name="code"
          rows={3}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="<iframe … src='https://www.strava.com/clubs/2337097/latest-rides/…?show_rides=true' …></iframe>"
          className="field font-mono text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending || !code.trim()} className="btn-primary">
            {pending ? 'Saving…' : widgets ? 'Replace widgets' : 'Save widgets'}
          </button>
          {widgets ? (
            <button type="button" onClick={onRemove} disabled={pending} className="btn-ghost">
              Remove from club page
            </button>
          ) : null}
        </div>
      </form>

      {widgets ? (
        <div className="mt-6">
          <p className="label">Preview</p>
          <div className="flex flex-wrap items-start gap-4">
            <iframe
              title="Strava club summary"
              src={stravaWidgetSrc(widgets, 'summary')}
              width={STRAVA_WIDGET_SIZES.summary.width}
              height={STRAVA_WIDGET_SIZES.summary.height}
              loading="lazy"
              scrolling="no"
              className="max-w-full rounded-xl border border-hairline"
            />
            <iframe
              title="Strava club latest activities"
              src={stravaWidgetSrc(widgets, 'activities')}
              width={STRAVA_WIDGET_SIZES.activities.width}
              height={STRAVA_WIDGET_SIZES.activities.height}
              loading="lazy"
              scrolling="no"
              className="max-w-full rounded-xl border border-hairline"
            />
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            If these show a Strava error, the code was mistyped or Strava reset it: paste a fresh one.
          </p>
        </div>
      ) : null}
    </section>
  );
}
