import { ScheduleManager } from '@/components/admin/ScheduleManager';
import {
  getCurrentProfile,
  getSessionChanges,
  getSessionRsvps,
  getTrainingGrounds,
  getWeeklySchedule,
} from '@/lib/data';
import { IS_DEMO } from '@/lib/env';
import { upcomingDates } from '@/lib/occurrence';

/** Fixed-length UUIDs only: the built-in fallback schedule cannot be changed. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminSchedulePage() {
  // The layout renders the signed-out and non-admin panels, but layouts and
  // pages render concurrently: without this guard the data call below throws
  // NOT_AUTHENTICATED first and the error page wins the race.
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') return null;

  // Includes paused sessions — admins need to see what they switched off.
  const [schedule, grounds, changes] = await Promise.all([
    getWeeklySchedule(true),
    getTrainingGrounds(true),
    getSessionChanges(),
  ]);
  const sessionRsvps = await getSessionRsvps(schedule);

  // Computed here rather than in the browser, so the dates never disagree
  // with the server's idea of "today in Hyderabad".
  const occurrenceDates = Object.fromEntries(
    schedule
      .filter((session) => session.active && (IS_DEMO || UUID.test(session.id)))
      .map((session) => [session.id, upcomingDates(session, 4, changes[session.id])]),
  );

  return (
    <ScheduleManager
      schedule={schedule}
      grounds={grounds}
      sessionRsvps={sessionRsvps}
      changes={changes}
      occurrenceDates={occurrenceDates}
    />
  );
}
