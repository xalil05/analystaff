/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  // Next.js 16.2.12 — PPR CanaryOnlyError si 'experimental.ppr' est défini → ne pas le mettre
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://100.70.168.107/api/:path*',
      },
    ];
  },
};

export default nextConfig;
