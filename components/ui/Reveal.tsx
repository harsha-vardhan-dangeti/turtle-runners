'use client';

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Position in a staggered group. */
  index?: number;
  className?: string;
  as?: ElementType;
}

/** True where the browser can drive animations off scroll position directly. */
function supportsScrollTimeline() {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('animation-timeline: view()')
  );
}

/**
 * Reveals content as it scrolls into view.
 *
 * Where the browser supports view timelines the whole thing is CSS: the reveal
 * is scrubbed against scroll position and this component does no work beyond
 * setting the stagger offset. Everywhere else it falls back to an
 * IntersectionObserver that fires the reveal once. Both paths live in
 * globals.css and are switched off under prefers-reduced-motion.
 */
export function Reveal({ children, index = 0, className = '', as }: RevealProps) {
  const Tag = (as ?? 'div') as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // CSS owns the reveal here, so the observer would only burn main-thread time.
    if (supportsScrollTimeline()) return;

    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{
        // Fallback path staggers in time, scrubbed path staggers in scroll distance.
        ['--reveal-delay' as string]: `${index * 80}ms`,
        ['--reveal-step' as string]: `${index * 6}%`,
      }}
    >
      {children}
    </Tag>
  );
}
