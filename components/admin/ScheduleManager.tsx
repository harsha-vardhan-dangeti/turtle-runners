'use client';

import { useState, useTransition } from 'react';
import { LocationPicker } from '@/components/admin/LocationPicker';
import { Drawer } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/Toast';
import {
  createWeeklySessionAction,
  deleteWeeklySessionAction,
  updateWeeklySessionAction,
} from '@/app/actions/schedule';
import { dayName } from '@/lib/club';
import { formatPin } from '@/lib/maps';
import { formatTime } from '@/lib/time';
import {
  EVENT_TYPES,
  EVENT_TYPE_EMOJI,
  EVENT_TYPE_LABEL,
  type WeeklySession,
} from '@/types';

const DAYS = [1, 2, 3, 4, 5, 6, 7];

export function ScheduleManager({
  schedule,
  grounds = [],
}: {
  schedule: WeeklySession[];
  grounds?: { id: string; title: string; sport: string }[];
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<WeeklySession | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const target = editing;

    startTransition(async () => {
      const result = target
        ? await updateWeeklySessionAction(target.id, formData)
        : await createWeeklySessionAction(formData);
      toast(result.message, result.ok ? 'success' : 'error');
      if (result.ok) {
        setDrawerOpen(false);
        setEditing(null);
      }
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const result = await deleteWeeklySessionAction(id);
      toast(result.message, result.ok ? 'success' : 'error');
      setConfirmingId(null);
    });
  }

  return (
    <section aria-labelledby="schedule-title" className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="schedule-title" className="display text-2xl">
            Weekly schedule
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            The club&apos;s recurring rhythm. This drives the schedule on the landing page, the
            ticker, the pace groups on the next-session card, and the countdown whenever no event
            is published.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setDrawerOpen(true);
          }}
          className="btn-primary"
        >
          <span aria-hidden="true">＋</span> New weekly session
        </button>
      </div>

      {schedule.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-hairline p-8 text-center text-sm text-ink-muted">
          No recurring sessions. The landing page falls back to the built-in defaults until you add
          one.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-hairline">
          {schedule.map((session) => (
            <li key={session.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="display text-lg text-gradient">{dayName(session.iso_dow)}</span>
                  <span className="display text-lg">{formatTime(session.time)}</span>
                  <span className="chip-green">
                    <span aria-hidden="true">{EVENT_TYPE_EMOJI[session.type]}</span>
                    {EVENT_TYPE_LABEL[session.type]}
                  </span>
                  {!session.active ? <span className="chip">Paused</span> : null}
                </div>

                <h3 className="mt-2 text-base font-semibold">{session.title}</h3>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {session.location}
                  {' · '}
                  {formatPin(session) ? (
                    <span className="font-medium text-green-deep">
                      <span aria-hidden="true">📍</span> {formatPin(session)}
                    </span>
                  ) : (
                    <span className="italic">no pin — map searches the name</span>
                  )}
                </p>

                {session.pace_groups.length > 0 ? (
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {session.pace_groups.map((group) => (
                      <li key={group} className="chip text-[11px]">
                        {group}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="flex shrink-0 gap-2">
                {confirmingId === session.id ? (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onDelete(session.id)}
                      className="rounded-full bg-[#8B1D1D] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-ink-muted"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(session);
                        setDrawerOpen(true);
                      }}
                      className="rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold transition-colors hover:border-green-primary/40 hover:text-green-deep"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(session.id)}
                      className="rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-[#8B1D1D]/40 hover:text-[#8B1D1D]"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit weekly session' : 'New weekly session'}
        description="Recurring every week. Members still RSVP to the individual events you publish."
      >
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="weekly-title" className="label">
              Title
            </label>
            <input
              id="weekly-title"
              name="title"
              required
              maxLength={120}
              defaultValue={editing?.title ?? ''}
              placeholder="Track intervals"
              className="field"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="weekly-day" className="label">
                Day
              </label>
              <select
                id="weekly-day"
                name="iso_dow"
                required
                defaultValue={editing?.iso_dow ?? 2}
                className="field"
              >
                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {dayName(day)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="weekly-time" className="label">
                Start time (IST)
              </label>
              <input
                id="weekly-time"
                name="time"
                type="time"
                required
                defaultValue={editing?.time.slice(0, 5) ?? '05:45'}
                className="field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="weekly-type" className="label">
              Type
            </label>
            <select
              id="weekly-type"
              name="type"
              required
              defaultValue={editing?.type ?? 'run'}
              className="field"
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EVENT_TYPE_LABEL[type]}
                </option>
              ))}
            </select>
          </div>

          <LocationPicker
            location={editing?.location}
            lat={editing?.lat}
            lng={editing?.lng}
            defaultLocation="Durgam Cheruvu Lake Front Park"
          />

          <div>
            <label htmlFor="ground_id" className="label">
              Training ground
            </label>
            <select
              id="ground_id"
              name="ground_id"
              defaultValue={editing?.ground_id ?? ''}
              className="field"
            >
              <option value="">Not linked to a ground</option>
              {grounds.map((ground) => (
                <option key={ground.id} value={ground.id}>
                  {ground.title}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-ink-muted">
              Links this session to a route card, so each shows the other. The location and pin
              above stay authoritative for directions.
            </p>
          </div>

          <div>
            <label htmlFor="weekly-pace" className="label">
              Pace groups
            </label>
            <input
              id="weekly-pace"
              name="pace_groups"
              defaultValue={editing?.pace_groups.join(', ') ?? ''}
              placeholder="Walk–run, 7:00+ /km, 6:00–7:00 /km"
              aria-describedby="weekly-pace-help"
              className="field"
            />
            <p id="weekly-pace-help" className="mt-1.5 text-xs text-ink-muted">
              Comma separated, slowest first. Leave blank for a social.
            </p>
          </div>

          <div>
            <label htmlFor="weekly-note" className="label">
              Note <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id="weekly-note"
              name="note"
              rows={4}
              maxLength={500}
              defaultValue={editing?.note ?? ''}
              placeholder="What to bring, where exactly to meet, who is leading."
              className="field resize-none"
            />
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-hairline px-4 py-3 text-sm font-semibold">
            <input
              type="checkbox"
              name="active"
              defaultChecked={editing?.active ?? true}
              className="h-4 w-4 accent-[#12A150]"
            />
            Running right now
            <span className="ml-auto text-xs font-normal text-ink-muted">
              Uncheck to pause off-season
            </span>
          </label>

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? 'Saving…' : editing ? 'Save changes' : 'Add to schedule'}
          </button>
        </form>
      </Drawer>
    </section>
  );
}
