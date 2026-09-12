import { bibNumber } from '@/lib/club';
import { LEVEL_LABEL, SPORT_EMOJI, SPORT_LABEL, type Level, type Role, type Sport } from '@/types';

interface BibCardProps {
  id: string;
  name: string;
  sport: Sport;
  level: Level;
  goal: string | null;
  role: Role;
  className?: string;
}

/** The race bib: striped tape, Anton number, and the three facts that matter. */
export function BibCard({ id, name, sport, level, goal, role, className = '' }: BibCardProps) {
  return (
    <article
      className={`relative overflow-hidden rounded-2xl border border-white/10 dark-section text-white shadow-turtle-lg ${className}`}
    >
      <div className="h-3 w-full bg-tape-stripe" aria-hidden="true" />

      <div className="px-6 pb-6 pt-5 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-green-bright/70">
            Turtle Runners · Hyderabad
          </p>
          {role === 'admin' ? (
            <span className="rounded-full border border-green-bright/40 bg-green-bright/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-green-bright">
              Admin
            </span>
          ) : null}
        </div>

        <p className="display mt-2 text-[4.5rem] leading-none text-green-bright sm:text-[5.5rem]">
          {bibNumber(id)}
        </p>

        <p className="display mt-1 text-2xl text-white sm:text-3xl">{name}</p>

        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-left">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Sport
            </dt>
            <dd className="mt-1 text-sm font-semibold text-white">
              <span aria-hidden="true">{SPORT_EMOJI[sport]}</span> {SPORT_LABEL[sport]}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Level
            </dt>
            <dd className="mt-1 text-sm font-semibold text-white">{LEVEL_LABEL[level]}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Goal race
            </dt>
            <dd className="mt-1 text-sm font-semibold text-white">{goal || '—'}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
