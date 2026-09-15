import { LogoMark } from '@/components/brand/LogoMark';
import { getClubBranding } from '@/lib/data';

/**
 * The logo as the admin has set it. Server component: drop it wherever
 * TurtleLogo was. Client components cannot read the setting, so app/error.tsx
 * keeps the drawn mark.
 */
export async function ClubLogo({ size, className }: { size?: number; className?: string }) {
  const branding = await getClubBranding();
  return <LogoMark branding={branding} size={size} className={className} />;
}
