'use client';

import { useEffect, useState } from 'react';
import { countdownTo, pad2 } from '@/lib/time';

interface RaceClockProps {
  /** ISO instant of the next session. */
  targetIso: string;
  className?: string;
}

const SEGMENTS = ['Days', 'Hrs', 'Min', 'Sec'] as const;

/** LED stopwatch: bright green digits on near-black, glowing. */
export function RaceClock({ targetIso, className = '' }: RaceClockProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const target = new Date(targetIso);
  const countdown = now ? countdownTo(target, now) : null;

  const values = countdown
    ? [pad2(countdown.days), pad2(countdown.hours), pad2(countdown.minutes), pad2(countdown.seconds)]
    : ['--', '--', '--', '--'];

  const srLabel = countdown
    ? countdown.done
      ? 'The session is under way.'
      : `${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes and ${countdown.seconds} seconds until the next session.`
    : 'Loading countdown';

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#050706] p-4 sm:p-5 ${className}`}
      aria-live="off"
    >
      <p className="sr-only">{srLabel}</p>
      {countdown?.done ? (
        <p className="display clock-digits animate-pulseglow text-center text-3xl sm:text-4xl">
          Session live
        </p>
      ) : (
        <div aria-hidden="true" className="flex items-end justify-between gap-2 sm:gap-4">
          {values.map((value, index) => (
            <div key={SEGMENTS[index]} className="flex flex-1 items-end gap-2 sm:gap-4">
              <div className="flex-1 text-center">
                <span className="display clock-digits block text-[2.6rem] leading-none sm:text-6xl">
                  {value}
                </span>
                <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.24em] text-green-bright/50">
                  {SEGMENTS[index]}
                </span>
              </div>
              {index < SEGMENTS.length - 1 ? (
                <span className="display clock-digits pb-6 text-2xl opacity-60 sm:text-4xl">:</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
