import Link from 'next/link';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { CLUB } from '@/lib/club';
import { mapDirectionsUrl } from '@/lib/maps';

const COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: 'Train',
    links: [
      { label: 'Weekly schedule', href: '/#schedule' },
      { label: 'Training grounds', href: '/#grounds' },
      { label: 'Next session', href: '/#next-session' },
      { label: 'Get directions', href: mapDirectionsUrl({}), external: true },
    ],
  },
  {
    title: 'Club',
    links: [
      { label: 'New here?', href: '/#new-here' },
      { label: 'Turtle voices', href: '/#voices' },
      { label: 'Member dashboard', href: '/dashboard' },
      { label: 'Your profile', href: '/profile' },
    ],
  },
  {
    title: 'Elsewhere',
    links: [
      { label: 'Strava club', href: CLUB.strava, external: true },
      { label: 'Instagram', href: CLUB.instagram, external: true },
      { label: 'WhatsApp group', href: CLUB.whatsapp, external: true },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="dark-section border-t border-white/10 text-white">
      <div className="section py-16 sm:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
          <div>
            <div className="flex items-center gap-3">
              <ClubLogo size={40} />
              <span className="display text-2xl">Turtle Runners</span>
            </div>
            <h2 className="display mt-6 text-[clamp(2.4rem,6vw,4rem)] leading-[0.95]">
              Train with <span className="text-gradient-bright">the turtles</span>
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
              {CLUB.homeBase}, {CLUB.city}. Four sessions a week, all levels, chai after — always.
            </p>
            <a
              href={CLUB.whatsapp}
              className="btn mt-6 bg-green-bright text-ink hover:-translate-y-0.5 hover:shadow-turtle-lg"
            >
              <span aria-hidden="true">💬</span> Join the WhatsApp group
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-bright">
                  {column.title}
                </p>
                <ul className="mt-4 space-y-2.5 pointer-coarse:mt-2 pointer-coarse:space-y-0">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        // Same tab, deliberately. The club's links get opened inside
                        // WhatsApp's and Instagram's in-app browsers, which often
                        // swallow a new-tab link so the tap does nothing; a plain
                        // link also lets a phone hand off to the Strava or WhatsApp app.
                        <a
                          href={link.href}
                          className="text-sm text-white/65 transition-colors hover:text-white pointer-coarse:inline-block pointer-coarse:py-2.5"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-white/65 transition-colors hover:text-white pointer-coarse:inline-block pointer-coarse:py-2.5"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Turtle Runners · Hyderabad</p>
          <p>Swim · Bike · Run · Chai</p>
        </div>
      </div>
    </footer>
  );
}
