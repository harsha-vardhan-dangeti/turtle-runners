const isDev = process.env.NODE_ENV === 'development';
// Preview deployments load Vercel's comment toolbar from vercel.live.
const isPreview = process.env.VERCEL_ENV === 'preview';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

/**
 * Content Security Policy.
 *
 * Every third-party call (place search, elevation, Strava's API) runs on the
 * server, so the browser only needs our own origin, Supabase for sign-in, and
 * the two embeds: Google Maps and Strava's club widgets.
 *
 * Scripts keep 'unsafe-inline' because the App Router streams its payload in
 * inline scripts; nonces would force every page to render dynamically. The
 * directives that matter most here are frame-ancestors (no clickjacking of the
 * admin pages), object-src, base-uri and form-action.
 */
function contentSecurityPolicy() {
  const supabase = supabaseUrl ? [supabaseUrl, supabaseUrl.replace(/^https:/, 'wss:')] : [];
  const vercelLive = isPreview ? ['https://vercel.live', 'wss://ws-us3.pusher.com'] : [];

  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), ...(isPreview ? ['https://vercel.live'] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    // Avatars come from Google and Strava's CDNs, the logo from Supabase Storage.
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", ...supabase, ...vercelLive, ...(isDev ? ['ws:'] : [])],
    'frame-src': ['https://www.google.com', 'https://maps.google.com', 'https://www.strava.com', ...(isPreview ? ['https://vercel.live'] : [])],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    ...(isDev ? {} : { 'upgrade-insecure-requests': [] }),
  };

  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(' '))
    .join('; ');
}

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
  // Older browsers that ignore frame-ancestors.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Server actions default to a 1 MB body. The admin logo upload allows a
    // 2 MB image, plus room for the multipart envelope.
    serverActions: { bodySizeLimit: '3mb' },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
