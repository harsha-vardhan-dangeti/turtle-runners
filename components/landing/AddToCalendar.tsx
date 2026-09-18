import { eventGoogleUrl, eventIcsPath, sessionGoogleUrl, sessionIcsPath } from '@/lib/calendar';
import type { ClubEvent, WeeklySession } from '@/types';

type AddToCalendarProps = (
  | { event: ClubEvent; session?: never }
  | { session: WeeklySession; event?: never }
) & {
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md';
};

/**
 * "Add to calendar" for one event or weekly session.
 *
 * A native <details> menu, so it works without JavaScript and needs no client
 * component: Google gets a prefilled template link, everything else gets an
 * .ics file, which Apple Calendar and Outlook both open directly.
 */
export function AddToCalendar({ event, session, tone = 'light', size = 'sm' }: AddToCalendarProps) {
  const google = event ? eventGoogleUrl(event) : sessionGoogleUrl(session!);
  const ics = event ? eventIcsPath(event.id) : sessionIcsPath(session!.id);

  const dark = tone === 'dark';
  const trigger = dark
    ? 'border-white/15 bg-white/10 text-white/85 hover:bg-white/15'
    : 'border-hairline bg-white text-ink-muted hover:border-green-primary/40 hover:text-green-deep';
  const pad = size === 'sm' ? 'px-3 py-1 text-xs pointer-coarse:min-h-10 pointer-coarse:px-3.5' : 'px-4 py-2 text-sm pointer-coarse:min-h-11';
  const option = `inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors ${
    dark
      ? 'border-green-bright/40 bg-green-bright/15 text-green-bright hover:bg-green-bright/25'
      : 'border-green-primary/25 bg-green-tint text-green-deep hover:border-green-primary/50'
  } ${pad}`;

  // The choices open inline rather than as a floating menu: these sit inside
  // cards that clip their overflow, and a menu cut in half is worse than one
  // that nudges the content below it down.
  return (
    <details className="group">
      <summary
        className={`inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border font-medium transition-colors [&::-webkit-details-marker]:hidden ${trigger} ${pad}`}
      >
        <span aria-hidden="true">📅</span> Add to calendar
        <span aria-hidden="true" className="text-[10px] transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <a href={google} target="_blank" rel="noreferrer noopener" className={option}>
          Google Calendar
        </a>
        <a href={ics} className={option}>
          Apple / Outlook
        </a>
        {session ? (
          <span className={`text-[11px] ${dark ? 'text-white/50' : 'text-ink-muted'}`}>
            Repeats every week
          </span>
        ) : null}
      </div>
    </details>
  );
}
