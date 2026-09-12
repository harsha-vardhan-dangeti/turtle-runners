import { Reveal } from '@/components/ui/Reveal';
import { dayShort } from '@/lib/club';
import { formatTime } from '@/lib/time';
import { EVENT_TYPE_EMOJI, EVENT_TYPE_LABEL, type WeeklySession } from '@/types';

/** The club's recurring sessions. Day labels in gradient Anton, sport chips right. */
export function WeeklySchedule({ schedule }: { schedule: WeeklySession[] }) {
  return (
    <section id="schedule" aria-labelledby="schedule-title" className="section py-20 sm:py-28">
      <Reveal>
        <p className="eyebrow">Every single week</p>
        <h2 id="schedule-title" className="display mt-3 max-w-2xl text-4xl sm:text-6xl">
          {schedule.length} session{schedule.length === 1 ? '' : 's'}.{' '}
          <span className="text-gradient">Same time, same lake.</span>
        </h2>
        <p className="mt-4 max-w-xl text-ink-muted">
          Nothing here moves. Turn up at the time on this list and there will be turtles waiting.
        </p>
      </Reveal>

      {schedule.length === 0 ? (
        <Reveal index={1}>
          <div className="card mt-10 border-dashed p-10 text-center">
            <p className="display text-2xl">No weekly sessions yet</p>
            <p className="mt-2 text-sm text-ink-muted">
              An admin sets the club&apos;s rhythm from the admin area.
            </p>
          </div>
        </Reveal>
      ) : (
        <ul className="mt-10 border-t border-hairline">
          {schedule.map((session, index) => (
            <Reveal as="li" key={session.id} index={index} className="border-b border-hairline">
              <div className="group flex flex-col gap-3 py-6 transition-colors sm:flex-row sm:items-center sm:gap-8">
                <p className="display w-28 shrink-0 text-3xl text-gradient sm:text-4xl">
                  {dayShort(session.iso_dow)}
                </p>

                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold sm:text-xl">{session.title}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{session.location}</p>
                </div>

                <div className="flex items-center gap-3 sm:w-64 sm:justify-end">
                  <span className="chip">
                    <span aria-hidden="true">{EVENT_TYPE_EMOJI[session.type]}</span>
                    {EVENT_TYPE_LABEL[session.type]}
                  </span>
                  <p className="display text-xl sm:text-2xl">{formatTime(session.time)}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}
