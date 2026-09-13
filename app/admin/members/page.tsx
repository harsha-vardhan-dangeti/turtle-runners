import { MembersTable } from '@/components/admin/MembersTable';
import { getCurrentProfile, getMembers } from '@/lib/data';

export default async function AdminMembersPage() {
  // The layout renders the signed-out and non-admin panels, but layouts and
  // pages render concurrently: without this guard the data call below throws
  // NOT_AUTHENTICATED first and the error page wins the race.
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') return null;

  const members = await getMembers();
  return <MembersTable members={members} currentUserId={profile.id} />;
}
