'use client';

import { useEffect, useRef, useState } from 'react';

interface ElevationLineProps {
  /** Normalised 0–1 samples. */
  points: number[];
  id: string;
}

/** Self-drawing elevation profile — the line traces itself when scrolled to. */
export function ElevationLine({ points, id }: ElevationLineProps) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      setDrawn(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setDrawn(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const width = 100;
  const height = 40;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((point, index) => {
    const x = Number((index * step).toFixed(2));
    const y = Number((height - point * (height - 6) - 3).toFixed(2));
    return `${x},${y}`;
  });

  const line = `M${coords.join(' L')}`;
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-20 w-full"
      role="img"
      aria-label="Elevation profile"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#12A150" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#12A150" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={area}
        fill={`url(#${id}-fill)`}
        style={{ opacity: drawn ? 1 : 0, transition: 'opacity 1.2s ease 0.4s' }}
      />
      <path
        d={line}
        fill="none"
        stroke="#12A150"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={drawn ? 0 : 1}
        style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1)' }}
      />
    </svg>
  );
}
