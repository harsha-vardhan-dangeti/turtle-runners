import { MeetingPoint } from '@/components/landing/MeetingPoint';
import { Reveal } from '@/components/ui/Reveal';
import { dayShort } from '@/lib/club';
import { formatTime } from '@/lib/time';
import {
  EVENT_TYPE_EMOJI,
  EVENT_TYPE_LABEL,
  type TrainingGround,
  type WeeklySession,
} from '@/types';

/** The club's recurring sessions. Day labels in gradient Anton, sport chips right. */
export function WeeklySchedule({
  schedule,
  grounds = [],
}: {
  schedule: WeeklySession[];
  grounds?: TrainingGround[];
}) {
  const groundById = new Map(grounds.map((ground) => [ground.id, ground]));
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
          {schedule.map((session, index) => {
            const ground = session.ground_id ? groundById.get(session.ground_id) : undefined;
            return (
            <Reveal as="li" key={session.id} index={index} className="border-b border-hairline">
              <div className="group flex flex-col gap-3 py-6 transition-colors sm:flex-row sm:items-center sm:gap-8">
                <p className="display w-28 shrink-0 text-3xl text-gradient sm:text-4xl">
                  {dayShort(session.iso_dow)}
                </p>

                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold sm:text-xl">{session.title}</h3>
                  {ground ? (
                    <p className="mt-1 text-sm text-ink-muted">
                      <span className="font-semibold text-green-deep">{ground.title}</span>
                      {ground.stats.length > 0
                        ? ` · ${ground.stats.map((stat) => stat.value).join(' · ')}`
                        : ''}
                    </p>
                  ) : null}

                  {ground?.status_note ? (
                    <p className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
                      <span aria-hidden="true">⚠</span> {ground.status_note}
                    </p>
                  ) : null}

                  <div className="mt-1.5">
                    <MeetingPoint
                      place={{ lat: session.lat, lng: session.lng, location: session.location }}
                      label={ground?.meet_at ?? session.location}
                    />
                  </div>
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
            );
          })}
        </ul>
      )}
    </section>
  );
}
