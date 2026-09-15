import { eventIcs, icsHeaders } from '@/lib/calendar';
import { getEventById } from '@/lib/data';

/** A single event as a calendar file: "Add to calendar" for Apple and Outlook. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) return new Response('Event not found', { status: 404 });

  return new Response(eventIcs(event), {
    headers: icsHeaders(`turtle-runners-${event.date}-${event.title}.ics`),
  });
}
