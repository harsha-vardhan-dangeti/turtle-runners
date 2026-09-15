'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { signOutAction } from '@/app/actions/auth';
import { bibNumber, firstName } from '@/lib/club';
import type { Profile } from '@/types';

/** Avatar button with the member's bib number and the account menu. */
export function UserMenu({ profile, tone = 'light' }: { profile: Profile; tone?: 'light' | 'dark' }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const triggerClass =
    tone === 'dark'
      ? 'flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1 pl-1 pr-3 text-sm font-semibold text-white transition-colors hover:bg-white/20'
      : 'flex items-center gap-2 rounded-full border border-hairline bg-white py-1 pl-1 pr-3 text-sm font-semibold text-ink transition-colors hover:border-green-primary/40';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={triggerClass}
      >
        <Avatar name={profile.name} src={profile.avatar_url} size={30} />
        <span className="hidden sm:inline">{firstName(profile.name)}</span>
        <span className="display text-xs text-green-primary">#{bibNumber(profile.id)}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-hairline bg-white p-1.5 shadow-turtle-lg"
        >
          <p className="px-3 py-2 text-xs text-ink-muted">
            Signed in as <span className="font-semibold text-ink">{profile.name}</span>
          </p>
          <Link
            role="menuitem"
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-green-tint"
          >
            Dashboard
          </Link>
          <Link
            role="menuitem"
            href="/profile"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-green-tint"
          >
            Profile
          </Link>
          <Link
            role="menuitem"
            href="/leaderboard"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-green-tint"
          >
            Leaderboard
          </Link>
          {profile.role === 'admin' ? (
            <Link
              role="menuitem"
              href="/admin"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-green-tint"
            >
              Admin
            </Link>
          ) : null}
          <form action={signOutAction}>
            <button
              role="menuitem"
              type="submit"
              className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-ink-muted transition-colors hover:bg-green-tint hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
