import { icsHeaders, sessionIcs } from '@/lib/calendar';
import { getSessionChanges, getWeeklySchedule } from '@/lib/data';

/** One weekly session as a recurring calendar event. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getWeeklySchedule()).find((item) => item.id === id);
  if (!session) return new Response('Session not found', { status: 404 });

  const changes = (await getSessionChanges())[session.id];
  return new Response(sessionIcs(session, changes), {
    headers: icsHeaders(`turtle-runners-weekly-${session.title}.ics`),
  });
}
