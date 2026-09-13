import { GroundsManager } from '@/components/admin/GroundsManager';
import { getCurrentProfile, getTrainingGrounds } from '@/lib/data';

export default async function AdminGroundsPage() {
  // The layout renders the signed-out and non-admin panels, but layouts and
  // pages render concurrently: without this guard the data call below throws
  // NOT_AUTHENTICATED first and the error page wins the race.
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') return null;

  // Inactive ones are included so an admin can see and unhide them.
  const grounds = await getTrainingGrounds(true);
  return <GroundsManager grounds={grounds} />;
}
