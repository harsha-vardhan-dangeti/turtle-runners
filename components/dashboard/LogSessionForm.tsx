'use client';

import { useRef, useState, useTransition } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/Toast';
import { logSessionAction } from '@/app/actions/sessions';
import {
  SESSION_SPORTS,
  SPORT_EMOJI,
  SPORT_LABEL,
  type SessionSport,
  type TrainingGround,
} from '@/types';

/** Swims are measured in metres at the pool; runs and rides in kilometres. */
const DISTANCE_UNIT: Record<SessionSport, string> = { run: 'km', bike: 'km', swim: 'm' };
const DISTANCE_STEP: Record<SessionSport, string> = { run: '0.1', bike: '0.1', swim: '25' };
const DISTANCE_PLACEHOLDER: Record<SessionSport, string> = {
  run: '10.4',
  bike: '42',
  swim: '1500',
};

export function LogSessionForm({
  today,
  grounds = [],
}: {
  today: string;
  grounds?: Pick<TrainingGround, 'id' | 'title' | 'sport' | 'subtitle'>[];
}) {
  const [open, setOpen] = useState(false);
  const [sport, setSport] = useState<SessionSport>('run');
  const [groundId, setGroundId] = useState('');
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement | null>(null);
  const { toast } = useToast();

  // A swim cannot have happened on the ORR loop: only offer grounds that match.
  const groundsForSport = grounds.filter((ground) => ground.sport === sport);

  function pickSport(next: SessionSport) {
    setSport(next);
    if (!grounds.some((ground) => ground.id === groundId && ground.sport === next)) {
      setGroundId('');
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await logSessionAction(formData);
      toast(result.message, result.ok ? 'success' : 'error');
      if (result.ok) {
        formRef.current?.reset();
        setGroundId('');
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        <span aria-hidden="true">＋</span> Log a session
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Log a session"
        description="Only you can add to your log. It feeds your rings, your streak and the club total."
      >
        <form ref={formRef} onSubmit={onSubmit} className="space-y-5">
          <fieldset>
            <legend className="label">Sport</legend>
            <div className="grid grid-cols-3 gap-2.5">
              {SESSION_SPORTS.map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-semibold transition-all duration-300 ease-turtle ${
                    sport === option
                      ? 'border-green-primary bg-green-tint text-green-deep shadow-turtle'
                      : 'border-hairline bg-white text-ink-muted hover:border-green-primary/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="sport"
                    value={option}
                    checked={sport === option}
                    onChange={() => pickSport(option)}
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
            <label htmlFor="session-title" className="label">
              What was it?
            </label>
            <input
              id="session-title"
              name="title"
              required
              maxLength={120}
              placeholder="Sunday long run"
              className="field"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="session-date" className="label">
                Date
              </label>
              <input
                id="session-date"
                name="date"
                type="date"
                required
                max={today}
                defaultValue={today}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="session-distance" className="label">
                Distance ({DISTANCE_UNIT[sport]})
              </label>
              <input
                id="session-distance"
                name="distance"
                type="number"
                inputMode="decimal"
                required
                min="0"
                step={DISTANCE_STEP[sport]}
                placeholder={DISTANCE_PLACEHOLDER[sport]}
                className="field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="session-duration" className="label">
              Time
            </label>
            <input
              id="session-duration"
              name="duration"
              required
              inputMode="numeric"
              placeholder="52:30"
              aria-describedby="duration-help"
              className="field"
            />
            <p id="duration-help" className="mt-1.5 text-xs text-ink-muted">
              Minutes and seconds (52:30), or hours too if it was a long one (1:12:40).
            </p>
          </div>

          {groundsForSport.length > 0 ? (
            <div>
              <label htmlFor="session-ground" className="label">
                Where? <span className="font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <select
                id="session-ground"
                name="ground_id"
                value={groundId}
                onChange={(event) => setGroundId(event.target.value)}
                aria-describedby="ground-help"
                className="field"
              >
                <option value="">Somewhere else</option>
                {groundsForSport.map((ground) => (
                  <option key={ground.id} value={ground.id}>
                    {ground.title} · {ground.subtitle}
                  </option>
                ))}
              </select>
              <p id="ground-help" className="mt-1.5 text-xs text-ink-muted">
                Counts towards that ground&apos;s card on the club page.
              </p>
            </div>
          ) : null}

          <div>
            <label htmlFor="session-note" className="label">
              Note <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id="session-note"
              name="note"
              rows={3}
              maxLength={500}
              placeholder="How it felt, who you ran with, what the lake was doing."
              className="field resize-none"
            />
          </div>

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? 'Saving…' : 'Log it'}
          </button>
        </form>
      </Drawer>
    </>
  );
}
