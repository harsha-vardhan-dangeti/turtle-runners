import { BrandingManager } from '@/components/admin/BrandingManager';
import { getClubBranding, getCurrentProfile } from '@/lib/data';

export default async function AdminBrandingPage() {
  // The layout renders the signed-out and non-admin panels, but layouts and
  // pages render concurrently: without this guard the page would render for
  // anyone before the layout's gate wins.
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') return null;

  const branding = await getClubBranding();
  return <BrandingManager branding={branding} />;
}
