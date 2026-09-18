import { ImageResponse } from 'next/og';

/**
 * Home-screen icon for iPhone and iPad. iOS ignores the SVG favicon for
 * "Add to Home Screen" and falls back to a blurry page screenshot without a
 * PNG here. Same mark as app/icon.svg, on the shell's dark green so the
 * rounded-square mask iOS applies has nothing white in the corners.
 */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,20 75.98,35 75.98,65 50,80 24.02,65 24.02,35" fill="#12A150"/><polygon points="50,34 63.86,42 63.86,58 50,66 36.14,58 36.14,42" fill="#2ED573"/></svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A3D22',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/svg+xml,${encodeURIComponent(MARK)}`}
          width={184}
          height={184}
          alt=""
        />
      </div>
    ),
    size,
  );
}
