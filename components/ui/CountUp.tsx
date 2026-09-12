'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  suffix?: string;
}

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

/** Counts from zero to `value` the first time it scrolls into view. */
export function CountUp({
  value,
  decimals = 0,
  duration = 1600,
  className = '',
  suffix = '',
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.disconnect();
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min(1, (now - start) / duration);
            setDisplay(value * easeOutCubic(progress));
            if (progress < 1) frame = requestAnimationFrame(step);
          };
          frame = requestAnimationFrame(step);
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
