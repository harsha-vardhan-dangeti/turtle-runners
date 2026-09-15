import { icsHeaders, sessionIcs } from '@/lib/calendar';
import { getWeeklySchedule } from '@/lib/data';

/** One weekly session as a recurring calendar event. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getWeeklySchedule()).find((item) => item.id === id);
  if (!session) return new Response('Session not found', { status: 404 });

  return new Response(sessionIcs(session), {
    headers: icsHeaders(`turtle-runners-weekly-${session.title}.ics`),
  });
}
