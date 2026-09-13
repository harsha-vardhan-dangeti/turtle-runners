import { EventsManager } from '@/components/admin/EventsManager';
import { getAllEvents, getCurrentProfile } from '@/lib/data';

export default async function AdminEventsPage() {
  // The layout renders the signed-out and non-admin panels, but layouts and
  // pages render concurrently: without this guard the data call below throws
  // NOT_AUTHENTICATED first and the error page wins the race.
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') return null;

  const events = await getAllEvents();
  return <EventsManager events={events} />;
}
