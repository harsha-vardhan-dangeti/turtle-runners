import { EventsManager } from '@/components/admin/EventsManager';
import { getAllEvents } from '@/lib/data';

export default async function AdminEventsPage() {
  const events = await getAllEvents();
  return <EventsManager events={events} />;
}
