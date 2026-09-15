import { clubFeedIcs, icsHeaders } from '@/lib/calendar';
import { getUpcomingEvents, getWeeklySchedule } from '@/lib/data';

/**
 * The club calendar as a subscribable feed: every active weekly session as a
 * recurring event, plus upcoming published events. Calendar apps poll it, so
 * changes an admin makes reach members' phones without anyone re-importing.
 */
export async function GET() {
  const [schedule, events] = await Promise.all([getWeeklySchedule(), getUpcomingEvents(50)]);

  return new Response(clubFeedIcs(schedule, events), {
    headers: icsHeaders('turtle-runners.ics'),
  });
}
