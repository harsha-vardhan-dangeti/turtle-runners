import { TurtleLogo } from '@/components/brand/TurtleLogo';
import type { ClubBranding } from '@/types';

interface LogoMarkProps {
  branding: ClubBranding;
  size?: number;
  className?: string;
}

/**
 * The club's uploaded logo when it is switched on, the drawn mark otherwise.
 *
 * Takes branding as a prop so the admin page can preview either state. Pages
 * use ClubLogo, which looks the setting up itself.
 */
export function LogoMark({ branding, size = 36, className = '' }: LogoMarkProps) {
  if (!branding.useCustomLogo || !branding.logoUrl) {
    return <TurtleLogo size={size} className={className} />;
  }

  return (
    // A plain img: the source is Supabase Storage or, in demo mode, a data URL,
    // neither of which next/image is configured for. object-contain keeps a
    // wide or tall logo whole inside the square it is given.
    <img
      src={branding.logoUrl}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      decoding="async"
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
