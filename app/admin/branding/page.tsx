import { BrandingManager } from '@/components/admin/BrandingManager';
import { StravaWidgetsManager } from '@/components/admin/StravaWidgetsManager';
import { getClubBranding, getCurrentProfile, getStravaWidgets } from '@/lib/data';

export default async function AdminBrandingPage() {
  // The layout renders the signed-out and non-admin panels, but layouts and
  // pages render concurrently: without this guard the page would render for
  // anyone before the layout's gate wins.
  const profile = await getCurrentProfile();
  if (profile?.role !== 'admin') return null;

  const [branding, stravaWidgets] = await Promise.all([getClubBranding(), getStravaWidgets()]);
  return (
    <div className="space-y-5">
      <BrandingManager branding={branding} />
      <StravaWidgetsManager widgets={stravaWidgets} />
    </div>
  );
}
