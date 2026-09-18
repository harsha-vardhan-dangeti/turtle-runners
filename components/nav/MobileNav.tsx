'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export interface NavLink {
  label: string;
  href: string;
}

/**
 * Hamburger sheet for the nav below the lg breakpoint: phones, and iPads in
 * portrait, where the full link row does not fit beside the logo.
 */
export function MobileNav({ links, children }: { links: NavLink[]; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    // A tap anywhere outside the sheet closes it, the way a phone menu should.
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-white"
      >
        <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        <span aria-hidden="true" className="relative block h-3 w-4">
          <span
            className={`absolute left-0 top-0 h-0.5 w-4 bg-ink transition-transform duration-300 ${open ? 'translate-y-[6px] rotate-45' : ''}`}
          />
          <span
            className={`absolute left-0 top-[6px] h-0.5 w-4 bg-ink transition-opacity duration-300 ${open ? 'opacity-0' : ''}`}
          />
          <span
            className={`absolute left-0 top-3 h-0.5 w-4 bg-ink transition-transform duration-300 ${open ? '-translate-y-[6px] -rotate-45' : ''}`}
          />
        </span>
      </button>

      {open ? (
        <div
          id="mobile-nav"
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain border-b border-hairline bg-white/95 px-5 pb-6 pt-2 shadow-turtle backdrop-blur"
        >
          <ul className="divide-y divide-hairline">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-base font-semibold"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
