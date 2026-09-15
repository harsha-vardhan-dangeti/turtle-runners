import { ScheduleManager } from '@/components/admin/ScheduleManager';
import { getCurrentProfile, getSessionRsvps, getTrainingGrounds, getWeeklySchedule } from '@/lib/data';

export default async function AdminSchedulePage() {
  // The layout renders the signed-out and non-admin panels, but layouts and
  // pages render concurrently: without this guard the data call below throws
  // NOT_AUTHENTICATED first and the error page wins the race.
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') return null;

  // Includes paused sessions — admins need to see what they switched off.
  const [schedule, grounds] = await Promise.all([getWeeklySchedule(true), getTrainingGrounds(true)]);
  const sessionRsvps = await getSessionRsvps(schedule);
  return <ScheduleManager schedule={schedule} grounds={grounds} sessionRsvps={sessionRsvps} />;
}
