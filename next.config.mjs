/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
};

export default nextConfig;
