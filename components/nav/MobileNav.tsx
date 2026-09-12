'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export interface NavLink {
  label: string;
  href: string;
}

/** Hamburger sheet for the landing nav below the sm breakpoint. */
export function MobileNav({ links, children }: { links: NavLink[]; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
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
          className="absolute inset-x-0 top-full border-b border-hairline bg-white/95 px-5 pb-6 pt-2 shadow-turtle backdrop-blur"
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
