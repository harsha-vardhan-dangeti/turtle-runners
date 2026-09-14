'use client';

import { useState } from 'react';
import { hasPin, mapDirectionsUrl, mapEmbedSrc, type MapPlace } from '@/lib/maps';

interface MeetingPointProps {
  place: MapPlace;
  /** Shown as the location line and in the map's accessible title. */
  label: string;
}

/**
 * Makes a session's location something a member can actually navigate to.
 *
 * The map is mounted only after the member asks for it. A landing page with
 * five weekly sessions would otherwise embed five Google Maps iframes, each
 * one a third-party frame with its own network cost, for a map most visitors
 * never look at. `loading="lazy"` would not help: these sit above the fold on
 * a phone.
 */
export function MeetingPoint({ place, label }: MeetingPointProps) {
  const [showMap, setShowMap] = useState(false);
  const pinned = hasPin(place);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="text-sm text-ink-muted">{label}</p>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={mapDirectionsUrl(place)}
            target="_blank"
            rel="noreferrer noopener"
            className="chip transition-colors hover:border-green-primary/40 hover:text-green-deep"
          >
            <span aria-hidden="true">🧭</span> Directions
          </a>

          <button
            type="button"
            onClick={() => setShowMap((open) => !open)}
            aria-expanded={showMap}
            className="chip transition-colors hover:border-green-primary/40 hover:text-green-deep"
          >
            <span aria-hidden="true">🗺️</span> {showMap ? 'Hide map' : 'Show map'}
          </button>

          {!pinned ? (
            <span
              className="text-[11px] text-ink-muted/80"
              title="No exact pin set, so the map searches for this place by name."
            >
              approximate
            </span>
          ) : null}
        </div>
      </div>

      {showMap ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-hairline">
          <iframe
            title={`Map of ${label}`}
            src={mapEmbedSrc(place)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[220px] w-full border-0"
          />
          {!pinned ? (
            <p className="border-t border-hairline bg-white px-3 py-2 text-[11px] text-ink-muted">
              Searching for &ldquo;{label}&rdquo;. An admin can pin the exact meeting spot.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
