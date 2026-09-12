import { MembersTable } from '@/components/admin/MembersTable';
import { getCurrentProfile, getMembers } from '@/lib/data';

export default async function AdminMembersPage() {
  const [members, profile] = await Promise.all([getMembers(), getCurrentProfile()]);
  return <MembersTable members={members} currentUserId={profile?.id ?? ''} />;
}
