import { ScheduleManager } from '@/components/admin/ScheduleManager';
import { getWeeklySchedule } from '@/lib/data';

export default async function AdminSchedulePage() {
  // Includes paused sessions — admins need to see what they switched off.
  const schedule = await getWeeklySchedule(true);
  return <ScheduleManager schedule={schedule} />;
}
