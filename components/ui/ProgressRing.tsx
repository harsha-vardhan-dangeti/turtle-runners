'use client';

import { useEffect, useState } from 'react';

interface ProgressRingProps {
  value: number;
  target: number;
  label: string;
  unit: string;
  emoji: string;
  size?: number;
}

/** Animates stroke-dashoffset on mount; static under reduced motion. */
export function ProgressRing({
  value,
  target,
  label,
  unit,
  emoji,
  size = 132,
}: ProgressRingProps) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = target > 0 ? Math.min(1, value / target) : 0;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setProgress(ratio);
      return;
    }
    const frame = requestAnimationFrame(() => setProgress(ratio));
    return () => cancelAnimationFrame(frame);
  }, [ratio]);

  // The arc caps at the target; the spoken label should not — going over is
  // the whole point of a good week.
  const percent = target > 0 ? Math.round((value / target) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${label}: ${value} of ${target} ${unit} this week, ${percent} percent`}
      >
        <svg width={size} height={size} className="-rotate-90" focusable="false" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E2EAE5"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#ring-gradient)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)' }}
          />
          <defs>
            <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2ED573" />
              <stop offset="100%" stopColor="#0B6B36" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span aria-hidden="true" className="text-lg leading-none">
            {emoji}
          </span>
          <span className="display mt-1 text-2xl text-ink">{value}</span>
          <span className="text-[11px] font-medium text-ink-muted">
            of {target} {unit}
          </span>
        </div>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</p>
    </div>
  );
}
