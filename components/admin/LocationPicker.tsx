'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { formatPin, mapEmbedSrc, parsePin, type Pin } from '@/lib/maps';
import type { PlaceResult } from '@/lib/places';

interface LocationPickerProps {
  /** Existing values when editing. */
  location?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** Used when creating a new session. */
  defaultLocation?: string;
}

/**
 * Search-and-pick meeting point, the way a booking site does it: type a place
 * name, choose from suggestions, done. Coordinates are never typed by hand —
 * though pasting them still works, because sometimes the place has no name.
 *
 * Emits two form fields: `location` (what members read) and `pin` ("lat,lng").
 */
export function LocationPicker({
  location,
  lat,
  lng,
  defaultLocation = '',
}: LocationPickerProps) {
  const listboxId = useId();
  const inputId = useId();

  const [displayName, setDisplayName] = useState(location ?? defaultLocation);
  const [pin, setPin] = useState<Pin | null>(
    typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null,
  );
  const [pinLabel, setPinLabel] = useState<string | null>(location ?? null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Typed coordinates are offered as a result of their own.
  //
  // Memoised on `query`: this object is a dependency of the search effect
  // below, and recreating it on every render made the effect re-run its own
  // setState in a loop the moment a coordinate pair parsed.
  const typedPin: Pin | null = useMemo(() => {
    try {
      return query.trim() ? parsePin(query) : null;
    } catch {
      return null;
    }
  }, [query]);

  useEffect(() => {
    const term = query.trim();
    if (typedPin || term.length < 3) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/places?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as { results?: PlaceResult[]; error?: string };

        if (!response.ok) {
          setError(body.error ?? 'Place search failed.');
          setResults([]);
        } else {
          setResults(body.results ?? []);
          setError(null);
        }
        setActiveIndex(-1);
        setOpen(true);
      } catch (fetchError) {
        if ((fetchError as Error).name !== 'AbortError') {
          setError('Place search failed. Check your connection, or paste coordinates.');
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, typedPin]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const options: PlaceResult[] = typedPin
    ? [
        {
          id: 'typed',
          name: `Use ${typedPin.lat}, ${typedPin.lng}`,
          description: 'Exact coordinates',
          lat: typedPin.lat,
          lng: typedPin.lng,
        },
      ]
    : results;

  function choose(result: PlaceResult) {
    setPin({ lat: result.lat, lng: result.lng });
    setPinLabel(result.id === 'typed' ? null : `${result.name}, ${result.description}`);
    if (result.id !== 'typed') setDisplayName(result.name);
    setQuery('');
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
    setError(null);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (options.length === 0) return;
      setOpen(true);
      setActiveIndex((current) => {
        const next = event.key === 'ArrowDown' ? current + 1 : current - 1;
        if (next < 0) return options.length - 1;
        if (next >= options.length) return 0;
        return next;
      });
      return;
    }

    if (event.key === 'Enter') {
      // Never let the dropdown's Enter submit the surrounding form.
      if (open && options.length > 0) {
        event.preventDefault();
        choose(options[activeIndex >= 0 ? activeIndex : 0] as PlaceResult);
      } else if (query.trim()) {
        event.preventDefault();
      }
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const previewPlace = pin ?? { location: displayName };
  const showPreview = Boolean(pin) || Boolean(displayName.trim());

  return (
    <div ref={containerRef}>
      <label htmlFor={inputId} className="label">
        Meeting point
      </label>

      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={open && options.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => options.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search a place — “Gachibowli Stadium”, “Durgam Cheruvu”…"
          className="field pr-24"
        />

        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted">
          {loading ? 'Searching…' : null}
        </span>

        {open && options.length > 0 ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Place suggestions"
            className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-hairline bg-white p-1.5 shadow-turtle-lg"
          >
            {options.map((result, index) => (
              <li
                key={result.id}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
              >
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(result)}
                  className={`flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors ${
                    index === activeIndex ? 'bg-green-tint' : 'hover:bg-green-tint/60'
                  }`}
                >
                  <span className="text-sm font-semibold text-ink">{result.name}</span>
                  {result.description ? (
                    <span className="text-xs text-ink-muted">{result.description}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <p className="sr-only" role="status">
        {loading
          ? 'Searching for places'
          : options.length > 0
            ? `${options.length} suggestions available`
            : ''}
      </p>

      {error ? (
        <p className="mt-1.5 text-xs font-semibold text-[#8B1D1D]">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
          Start typing and pick from the list. You can also paste coordinates like
          17.4239, 78.3898.
        </p>
      )}

      {/* What members actually read — editable after picking. */}
      <div className="mt-4">
        <label htmlFor={`${inputId}-name`} className="label">
          Shown to members
        </label>
        <input
          id={`${inputId}-name`}
          name="location"
          required
          maxLength={160}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Durgam Cheruvu Lake Front Park"
          className="field"
        />
      </div>

      <input type="hidden" name="pin" value={pin ? `${pin.lat},${pin.lng}` : ''} />

      <div className="mt-3 rounded-xl border border-hairline p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-xs text-ink-muted">
            {pin ? (
              <>
                <span aria-hidden="true">📍</span> Pinned at{' '}
                <span className="font-semibold text-green-deep">{formatPin(pin)}</span>
                {pinLabel ? <span className="block text-ink-muted">{pinLabel}</span> : null}
              </>
            ) : (
              <>No pin — the map will search for the name above.</>
            )}
          </p>
          {pin ? (
            <button
              type="button"
              onClick={() => {
                setPin(null);
                setPinLabel(null);
              }}
              className="rounded-full border border-hairline px-2.5 py-1 text-[11px] font-semibold text-ink-muted transition-colors hover:border-green-primary/40 hover:text-ink"
            >
              Remove pin
            </button>
          ) : null}
        </div>

        {showPreview ? (
          <div className="mt-3 overflow-hidden rounded-lg border border-hairline">
            <iframe
              title="Meeting point preview"
              src={mapEmbedSrc(previewPlace)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-40 w-full border-0"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
