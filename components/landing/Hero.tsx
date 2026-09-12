import Link from 'next/link';
import { SignInButton } from '@/components/auth/SignInButton';
import { RouteLine } from '@/components/landing/RouteLine';
import { CLUB } from '@/lib/club';

const LINE_CLASS = 'display block text-[clamp(2.9rem,11.5vw,7.6rem)]';

/** Three stacked lines, one per sport. They rise in on load. */
export function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-14 sm:pb-24 sm:pt-20">
      <RouteLine className="pointer-events-none absolute inset-x-0 -bottom-10 h-[240px] w-full opacity-70 sm:h-[280px]" />

      <div className="section relative">
        <p className="eyebrow animate-rise" style={{ animationDelay: '40ms' }}>
          {CLUB.tagline}
        </p>

        <h1 className="mt-5 max-w-5xl">
          <span className={`${LINE_CLASS} animate-rise`} style={{ animationDelay: '120ms' }}>
            Swim the lake.
          </span>
          <span
            className={`${LINE_CLASS} text-outline animate-rise`}
            style={{ animationDelay: '240ms' }}
          >
            Ride the dawn.
          </span>
          <span
            className={`${LINE_CLASS} text-gradient animate-rise`}
            style={{ animationDelay: '360ms' }}
          >
            Run it home.
          </span>
        </h1>

        <p
          className="mt-7 max-w-2xl text-base leading-relaxed text-ink-muted animate-rise sm:text-lg"
          style={{ animationDelay: '480ms' }}
        >
          Hyderabad&apos;s friendliest triathlon club. One lake, three sports, zero ego. Whether
          you&apos;re chasing a 70.3 or your first open-water swim, you train with the group — and no
          one trains alone.
        </p>

        <div
          className="mt-9 flex flex-wrap items-center gap-3 animate-rise"
          style={{ animationDelay: '600ms' }}
        >
          <SignInButton label="Join the club" />
          <Link href="#next-session" className="btn-ghost">
            Next session
          </Link>
          <span className="chip-green">
            <span aria-hidden="true">📍</span> {CLUB.homeBase}
          </span>
        </div>
      </div>
    </section>
  );
}
