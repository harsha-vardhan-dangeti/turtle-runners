'use client';

import { useState, useTransition } from 'react';
import { ElevationLine } from '@/components/landing/ElevationLine';
import { Drawer } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/Toast';
import {
  createGroundAction,
  deleteGroundAction,
  updateGroundAction,
} from '@/app/actions/grounds';
import { formatPin, parsePin, type Pin } from '@/lib/maps';
import { SESSION_SPORTS, SPORT_EMOJI, SPORT_LABEL, type TrainingGround } from '@/types';

/** Three rows is what the card layout shows; a fourth would overflow the grid. */
const STAT_ROWS = 3;

const DEFAULT_ELEVATION = '0.2, 0.3, 0.25, 0.45, 0.55, 0.5, 0.62, 0.5, 0.4, 0.45, 0.3, 0.22';

function elevationToText(points: number[]): string {
  return points.join(', ');
}

/** Parses leniently for the preview — bad input just yields nothing to draw. */
function parseForPreview(raw: string): number[] {
  return raw
    .split(/[,\s]+/)
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 1);
}

export function GroundsManager({ grounds }: { grounds: TrainingGround[] }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingGround | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [elevationText, setElevationText] = useState(DEFAULT_ELEVATION);
  const [waypoints, setWaypoints] = useState<Pin[]>([]);
  const [pointInput, setPointInput] = useState('');
  const [pointError, setPointError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [profileNote, setProfileNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const preview = parseForPreview(elevationText);

  function resetProfileUi() {
    setPointInput('');
    setPointError(null);
    setProfileNote(null);
  }

  function openNew() {
    setEditing(null);
    setElevationText(DEFAULT_ELEVATION);
    setWaypoints([]);
    resetProfileUi();
    setDrawerOpen(true);
  }

  function openEdit(ground: TrainingGround) {
    setEditing(ground);
    setElevationText(elevationToText(ground.elevation));
    setWaypoints(ground.waypoints ?? []);
    resetProfileUi();
    setDrawerOpen(true);
  }

  /** Accepts a pasted Google Maps link or bare coordinates. */
  function addPoint() {
    const pin = parsePin(pointInput);
    if (!pin) {
      setPointError('Paste a Google Maps link, or coordinates like 17.4239, 78.3898.');
      return;
    }
    setWaypoints((current) => [...current, pin]);
    setPointInput('');
    setPointError(null);
  }

  function removePoint(index: number) {
    setWaypoints((current) => current.filter((_, i) => i !== index));
  }

  /** Sends the route to the elevation proxy and fills the profile field. */
  async function generateProfile() {
    setFetching(true);
    setProfileNote(null);
    try {
      const response = await fetch('/api/elevation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waypoints }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Elevation lookup failed.');

      setElevationText(elevationToText(data.points));
      setProfileNote(
        `Measured ${data.minM}–${data.maxM} m, about ${data.gainM} m of climb.`,
      );
      toast('Elevation profile generated.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Elevation lookup failed.', 'error');
    } finally {
      setFetching(false);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = editing
        ? await updateGroundAction(editing.id, formData)
        : await createGroundAction(formData);
      toast(result.message, result.ok ? 'success' : 'error');
      if (result.ok) setDrawerOpen(false);
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const result = await deleteGroundAction(id);
      toast(result.message, result.ok ? 'success' : 'error');
      setConfirmingId(null);
    });
  }

  return (
    <section aria-labelledby="grounds-admin-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="grounds-admin-title" className="display text-3xl">
            Training grounds
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            The route cards on the club home page, in the order shown here.
          </p>
        </div>
        <button type="button" onClick={openNew} className="btn-primary">
          <span aria-hidden="true">＋</span> Add a ground
        </button>
      </div>

      {grounds.length === 0 ? (
        <p className="card mt-6 p-6 text-sm text-ink-muted">
          Nothing here yet, so the home page is showing the three built-in defaults. Add one and it
          takes over completely.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {grounds.map((ground) => (
            <li key={ground.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="chip-green">
                    <span aria-hidden="true">{SPORT_EMOJI[ground.sport]}</span>
                    {SPORT_LABEL[ground.sport]}
                  </span>
                  <h3 className="display mt-2 truncate text-2xl">{ground.title}</h3>
                  <p className="mt-0.5 truncate text-sm text-ink-muted">{ground.subtitle}</p>
                </div>
                {!ground.active ? <span className="chip shrink-0">Hidden</span> : null}
              </div>

              {ground.status_note ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <span aria-hidden="true">⚠</span> {ground.status_note}
                </p>
              ) : null}

              {ground.elevation.length > 1 ? (
                <div className="mt-4">
                  <ElevationLine points={ground.elevation} id={`admin-${ground.id}`} />
                </div>
              ) : null}

              <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-hairline pt-3">
                {ground.stats.map((stat) => (
                  <div key={stat.label} className="min-w-0">
                    <dt className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      {stat.label}
                    </dt>
                    <dd className="display mt-0.5 truncate text-base">{stat.value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-3 text-xs text-ink-muted">
                Position {ground.position}
                {ground.lat !== null && ground.lng !== null
                  ? ` · ${formatPin(ground)}`
                  : ' · no meeting point set'}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(ground)}
                  className="btn-ghost !px-4 !py-2 text-xs"
                >
                  Edit
                </button>
                {confirmingId === ground.id ? (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onDelete(ground.id)}
                      className="btn !bg-ink !px-4 !py-2 text-xs text-white"
                    >
                      {pending ? 'Removing…' : 'Really remove'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="btn-ghost !px-4 !py-2 text-xs"
                    >
                      Keep it
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(ground.id)}
                    className="btn-ghost !px-4 !py-2 text-xs"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? 'Edit training ground' : 'Add a training ground'}
        description="These are the route cards on the club home page."
      >
        <form onSubmit={onSubmit} className="space-y-5">
          <fieldset>
            <legend className="label">Sport</legend>
            <div className="grid grid-cols-3 gap-2.5">
              {SESSION_SPORTS.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-3 text-sm font-semibold text-ink-muted transition-all duration-300 ease-turtle has-[:checked]:border-green-primary has-[:checked]:bg-green-tint has-[:checked]:text-green-deep has-[:checked]:shadow-turtle"
                >
                  <input
                    type="radio"
                    name="sport"
                    value={option}
                    defaultChecked={(editing?.sport ?? 'run') === option}
                    className="sr-only"
                  />
                  <span aria-hidden="true" className="text-xl leading-none">
                    {SPORT_EMOJI[option]}
                  </span>
                  {SPORT_LABEL[option]}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="title" className="label">
              Name
            </label>
            <input
              id="title"
              name="title"
              required
              maxLength={80}
              defaultValue={editing?.title ?? ''}
              placeholder="Lake loop"
              className="field"
            />
          </div>

          <div>
            <label htmlFor="subtitle" className="label">
              Location line
            </label>
            <input
              id="subtitle"
              name="subtitle"
              required
              maxLength={160}
              defaultValue={editing?.subtitle ?? ''}
              placeholder="Durgam Cheruvu Lake Front Park"
              className="field"
            />
          </div>

          <fieldset>
            <legend className="label">Stats shown on the card</legend>
            <div className="space-y-2.5">
              {Array.from({ length: STAT_ROWS }, (_, i) => (
                <div key={i} className="grid grid-cols-2 gap-2.5">
                  <input
                    name={`stat-label-${i}`}
                    maxLength={40}
                    defaultValue={editing?.stats[i]?.label ?? ''}
                    placeholder={['Distance', 'Elevation', 'Surface'][i]}
                    className="field"
                    aria-label={`Stat ${i + 1} label`}
                  />
                  <input
                    name={`stat-value-${i}`}
                    maxLength={40}
                    defaultValue={editing?.stats[i]?.value ?? ''}
                    placeholder={['5.2 km', '42 m', 'Paved path'][i]}
                    className="field"
                    aria-label={`Stat ${i + 1} value`}
                  />
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-muted">
              Leave a row blank to drop it. Labels differ per sport: a pool has lanes, a bike route
              has surface.
            </p>
          </fieldset>

          <div>
            <input type="hidden" name="waypoints" value={JSON.stringify(waypoints)} />

            <p className="label">Route points</p>
            <p className="mb-2 text-xs text-ink-muted">
              Add a few points along the actual route and the real elevation is measured for you.
              Two points draw a straight line, so a loop needs several.
            </p>

            {waypoints.length > 0 ? (
              <ol className="mb-2.5 space-y-1.5">
                {waypoints.map((point, index) => (
                  <li
                    key={`${point.lat}-${point.lng}-${index}`}
                    className="flex items-center gap-2 rounded-lg border border-hairline bg-white px-3 py-1.5 text-xs"
                  >
                    <span className="font-mono text-[11px] font-bold text-green-deep">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink-muted">
                      {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePoint(index)}
                      className="shrink-0 font-semibold text-ink-muted hover:text-ink"
                      aria-label={`Remove point ${index + 1}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ol>
            ) : null}

            <div className="flex gap-2">
              <input
                value={pointInput}
                onChange={(event) => {
                  setPointInput(event.target.value);
                  setPointError(null);
                }}
                onKeyDown={(event) => {
                  // Enter here must not submit the whole form.
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addPoint();
                  }
                }}
                placeholder="Paste a Maps link or 17.4311, 78.3920"
                className="field"
                aria-label="New route point"
              />
              <button type="button" onClick={addPoint} className="btn-ghost shrink-0">
                Add
              </button>
            </div>
            {pointError ? <p className="mt-1.5 text-xs text-red-700">{pointError}</p> : null}

            <button
              type="button"
              onClick={generateProfile}
              disabled={fetching || waypoints.length < 2}
              className="btn-primary mt-3 w-full"
            >
              {fetching ? 'Measuring…' : 'Measure elevation from these points'}
            </button>
            {waypoints.length === 1 ? (
              <p className="mt-1.5 text-xs text-ink-muted">One more point and this becomes live.</p>
            ) : null}
            {profileNote ? (
              <p className="mt-2 rounded-lg bg-green-tint px-3 py-2 text-xs text-green-deep">
                {profileNote}
              </p>
            ) : null}

            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-semibold text-ink-muted">
                Or set the profile by hand
              </summary>
              <textarea
                id="elevation"
                name="elevation"
                rows={2}
                value={elevationText}
                onChange={(event) => setElevationText(event.target.value)}
                placeholder={DEFAULT_ELEVATION}
                className="field mt-2 font-mono text-xs"
                aria-label="Elevation profile values"
              />
              <p className="mt-1.5 text-xs text-ink-muted">
                Between 2 and 64 numbers from 0 to 1, low to high. Shape only, not real metres.
              </p>
            </details>

            <div className="mt-3 rounded-xl border border-hairline bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Preview · {preview.length} point{preview.length === 1 ? '' : 's'}
              </p>
              <div className="mt-2">
                {preview.length > 1 ? (
                  <ElevationLine points={preview} id={`preview-${preview.length}-${preview[0]}`} />
                ) : (
                  <p className="py-6 text-center text-xs text-ink-muted">
                    Needs at least 2 valid numbers to draw.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="lat" className="label">
                Latitude
              </label>
              <input
                id="lat"
                name="lat"
                inputMode="decimal"
                defaultValue={editing?.lat ?? ''}
                placeholder="17.4311"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="lng" className="label">
                Longitude
              </label>
              <input
                id="lng"
                name="lng"
                inputMode="decimal"
                defaultValue={editing?.lng ?? ''}
                placeholder="78.3920"
                className="field"
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-ink-muted">
            Used for the Directions link. Leave both blank and the card searches by its location
            line instead.
          </p>

          <div>
            <label htmlFor="status_note" className="label">
              Status warning
            </label>
            <input
              id="status_note"
              name="status_note"
              maxLength={300}
              defaultValue={editing?.status_note ?? ''}
              placeholder="Lake path waterlogged — use the road loop"
              className="field"
            />
            <p className="mt-1.5 text-xs text-ink-muted">
              Shown across the top of the card in amber. Clear it once it no longer applies.
            </p>
          </div>

          <div>
            <label htmlFor="meet_at" className="label">
              Where exactly to meet
            </label>
            <input
              id="meet_at"
              name="meet_at"
              maxLength={200}
              defaultValue={editing?.meet_at ?? ''}
              placeholder="By the boathouse gate"
              className="field"
            />
            <p className="mt-1.5 text-xs text-ink-muted">
              Worth more than a map pin to someone turning up for the first time.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="parking" className="label">
                Parking
              </label>
              <input
                id="parking"
                name="parking"
                maxLength={200}
                defaultValue={editing?.parking ?? ''}
                placeholder="Free inside the park"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="facilities" className="label">
                On site
              </label>
              <input
                id="facilities"
                name="facilities"
                maxLength={200}
                defaultValue={editing?.facilities ?? ''}
                placeholder="Toilets, water"
                className="field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="gpx" className="label">
              GPX link
            </label>
            <input
              id="gpx"
              name="gpx"
              defaultValue={editing?.gpx ?? ''}
              placeholder="/routes/lake-loop.gpx"
              className="field"
            />
            <p className="mt-1.5 text-xs text-ink-muted">
              A file already in the site, or any link. Blank hides the GPX button.
            </p>
          </div>

          <div>
            <label htmlFor="strava" className="label">
              Strava link
            </label>
            <input
              id="strava"
              name="strava"
              defaultValue={editing?.strava ?? ''}
              placeholder="https://www.strava.com/routes/…"
              className="field"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="position" className="label">
                Order
              </label>
              <input
                id="position"
                name="position"
                type="number"
                defaultValue={editing?.position ?? grounds.length}
                className="field"
              />
              <p className="mt-1.5 text-xs text-ink-muted">Lowest number shows first.</p>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={editing?.active ?? true}
                  className="h-4 w-4 accent-green-primary"
                />
                Show on the home page
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Add ground'}
            </button>
            <button type="button" onClick={() => setDrawerOpen(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      </Drawer>
    </section>
  );
}
