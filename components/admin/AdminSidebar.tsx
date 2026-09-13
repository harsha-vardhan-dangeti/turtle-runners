'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminSidebarProps {
  pendingCount: number;
}

const ITEMS = [
  { href: '/admin', label: 'Overview', icon: '◎' },
  { href: '/admin/events', label: 'Events', icon: '▤' },
  { href: '/admin/schedule', label: 'Schedule', icon: '↻' },
  { href: '/admin/grounds', label: 'Grounds', icon: '⛰' },
  { href: '/admin/members', label: 'Members', icon: '☰' },
  { href: '/admin/testimonials', label: 'Testimonials', icon: '❝' },
] as const;

/** Vertical rail on desktop, horizontally scrolling strip on mobile. */
export function AdminSidebar({ pendingCount }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="lg:sticky lg:top-24 lg:self-start">
      <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ease-turtle lg:w-56 ${
                  active
                    ? 'border-green-primary/30 bg-green-tint text-green-deep shadow-turtle'
                    : 'border-transparent text-ink-muted hover:border-hairline hover:bg-white hover:text-ink'
                }`}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {item.icon}
                </span>
                {item.label}
                {item.href === '/admin/testimonials' && pendingCount > 0 ? (
                  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-green-primary px-1.5 text-[11px] font-bold text-white">
                    {pendingCount}
                    <span className="sr-only"> pending</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
