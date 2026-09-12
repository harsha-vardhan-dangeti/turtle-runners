'use client';

import { useState, useTransition } from 'react';
import { LocationPicker } from '@/components/admin/LocationPicker';
import { Drawer } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/Toast';
import { createEventAction, deleteEventAction, updateEventAction } from '@/app/actions/events';
import { formatPin } from '@/lib/maps';
import { formatDate, formatTime, isPast } from '@/lib/time';
import { EVENT_TYPES, EVENT_TYPE_EMOJI, EVENT_TYPE_LABEL, type EventWithRsvp } from '@/types';

export function EventsManager({ events }: { events: EventWithRsvp[] }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<EventWithRsvp | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function openNew() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(event: EventWithRsvp) {
    setEditing(event);
    setDrawerOpen(true);
  }

  function onSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const formData = new FormData(formEvent.currentTarget);
    const target = editing;

    startTransition(async () => {
      const result = target
        ? await updateEventAction(target.id, formData)
        : await createEventAction(formData);
      toast(result.message, result.ok ? 'success' : 'error');
      if (result.ok) {
        setDrawerOpen(false);
        setEditing(null);
      }
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const result = await deleteEventAction(id);
      toast(result.message, result.ok ? 'success' : 'error');
      setConfirmingId(null);
    });
  }

  return (
    <section aria-labelledby="events-title" className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="events-title" className="display text-2xl">
            Events
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Published sessions show on the landing page and every member dashboard.
          </p>
        </div>
        <button type="button" onClick={openNew} className="btn-primary">
          <span aria-hidden="true">＋</span> New event
        </button>
      </div>

      {events.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-hairline p-8 text-center text-sm text-ink-muted">
          Nothing published yet. Add the week&apos;s sessions and they appear everywhere at once.
        </p>
      ) : (
        <div className="mt-5 -mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <caption className="sr-only">All club events, newest first</caption>
            <thead>
              <tr className="border-b border-hairline">
                {['Date', 'Title', 'Type', 'Location', 'RSVPs', ''].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {events.map((event) => {
                const past = isPast(event.date, event.time);
                return (
                  <tr key={event.id} className={past ? 'opacity-55' : undefined}>
                    <td className="py-3.5 text-sm tabular-nums text-ink-muted">
                      {formatDate(event.date)}
                      <span className="block text-xs">{formatTime(event.time)}</span>
                    </td>
                    <td className="py-3.5 text-sm font-semibold">
                      {event.title}
                      {past ? <span className="ml-2 text-[10px] uppercase text-ink-muted">done</span> : null}
                    </td>
                    <td className="py-3.5">
                      <span className="chip-green">
                        <span aria-hidden="true">{EVENT_TYPE_EMOJI[event.type]}</span>
                        {EVENT_TYPE_LABEL[event.type]}
                      </span>
                    </td>
                    <td className="py-3.5 text-sm text-ink-muted">
                      {event.location}
                      <span className="mt-0.5 block text-xs">
                        {formatPin(event) ? (
                          <span className="font-medium text-green-deep">
                            <span aria-hidden="true">📍</span> {formatPin(event)}
                          </span>
                        ) : (
                          <span className="italic">no pin</span>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 text-sm font-semibold tabular-nums">{event.rsvp_count}</td>
                    <td className="py-3.5 text-right">
                      {confirmingId === event.id ? (
                        <span className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => onDelete(event.id)}
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
                        </span>
                      ) : (
                        <span className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(event)}
                            className="rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold transition-colors hover:border-green-primary/40 hover:text-green-deep"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(event.id)}
                            className="rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-[#8B1D1D]/40 hover:text-[#8B1D1D]"
                          >
                            Delete
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit event' : 'New event'}
        description={
          editing ? 'Changes go live the moment you save.' : 'It publishes as soon as you save.'
        }
      >
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="event-title" className="label">
              Title
            </label>
            <input
              id="event-title"
              name="title"
              required
              maxLength={120}
              defaultValue={editing?.title ?? ''}
              placeholder="Track intervals"
              className="field"
            />
          </div>

          <div>
            <label htmlFor="event-type" className="label">
              Type
            </label>
            <select
              id="event-type"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="event-date" className="label">
                Date
              </label>
              <input
                id="event-date"
                name="date"
                type="date"
                required
                defaultValue={editing?.date ?? ''}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="event-time" className="label">
                Start time (IST)
              </label>
              <input
                id="event-time"
                name="time"
                type="time"
                required
                defaultValue={editing?.time.slice(0, 5) ?? '05:45'}
                className="field"
              />
            </div>
          </div>

          <LocationPicker
            location={editing?.location}
            lat={editing?.lat}
            lng={editing?.lng}
            defaultLocation="Durgam Cheruvu Lake Front Park"
          />

          <div>
            <label htmlFor="event-note" className="label">
              Note <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id="event-note"
              name="note"
              rows={4}
              maxLength={500}
              defaultValue={editing?.note ?? ''}
              placeholder="What to bring, where exactly to meet, who is leading."
              className="field resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={pending} className="btn-primary flex-1">
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Publish event'}
            </button>
          </div>
        </form>
      </Drawer>
    </section>
  );
}
