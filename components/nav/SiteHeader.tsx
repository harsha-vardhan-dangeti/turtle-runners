import Link from 'next/link';
import { SignInButton } from '@/components/auth/SignInButton';
import { UserMenu } from '@/components/auth/UserMenu';
import { MobileNav, type NavLink } from '@/components/nav/MobileNav';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { getCurrentProfile } from '@/lib/data';
import { IS_DEMO } from '@/lib/env';

const LANDING_LINKS: NavLink[] = [
  { label: 'Runs', href: '/#schedule' },
  { label: 'Routes', href: '/#grounds' },
  { label: 'Events', href: '/#next-session' },
  { label: 'New here?', href: '/#new-here' },
  { label: 'Voices', href: '/#voices' },
];

const APP_LINKS: NavLink[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Profile', href: '/profile' },
  { label: 'Club home', href: '/' },
];

/** Sticky, blurred, hairline-bottomed. Condenses on scroll. Same header everywhere. */
export async function SiteHeader({ variant = 'landing' }: { variant?: 'landing' | 'app' }) {
  const profile = await getCurrentProfile();
  const links = variant === 'landing' ? LANDING_LINKS : APP_LINKS;
  const navLinks =
    profile?.role === 'admin' ? [...links, { label: 'Admin', href: '/admin' }] : links;

  return (
    <header className="site-header sticky top-0 z-40 border-b border-hairline bg-paper/80 backdrop-blur-xl">
      <div className="section flex h-16 items-center justify-between gap-4 sm:h-[72px]">
        <Link
          href="/"
          className="site-header-mark flex items-center gap-2.5"
          aria-label="Turtle Runners — home"
        >
          <ClubLogo size={32} />
          <span className="display text-xl leading-none sm:text-2xl">
            Turtle<span className="text-gradient"> Runners</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-green-tint hover:text-green-deep"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          {IS_DEMO ? (
            <span className="hidden rounded-full border border-hairline bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted lg:inline">
              Demo mode
            </span>
          ) : null}

          {profile ? (
            <UserMenu profile={profile} />
          ) : (
            <div className="hidden md:block">
              <SignInButton />
            </div>
          )}

          <MobileNav links={navLinks}>
            {profile ? null : <SignInButton className="w-full" />}
          </MobileNav>
        </div>
      </div>
    </header>
  );
}
