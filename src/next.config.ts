import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_GTAW_AUTH_ENABLED: process.env.GTAW_AUTH_ENABLED,
    NEXT_PUBLIC_GTAW_CLIENT_ID: process.env.GTAW_CLIENT_ID,
    NEXT_PUBLIC_GTAW_CALLBACK_URL: process.env.GTAW_CALLBACK_URL,
  },
};

export default nextConfig;
