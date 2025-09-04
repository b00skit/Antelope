import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_GTAW_AUTH_ENABLED: process.env.NEXT_PUBLIC_GTAW_AUTH_ENABLED,
    NEXT_PUBLIC_GTAW_CLIENT_ID: process.env.NEXT_PUBLIC_GTAW_CLIENT_ID,
    NEXT_PUBLIC_GTAW_CALLBACK_URL: process.env.NEXT_PUBLIC_GTAW_CALLBACK_URL,
  },
};

export default nextConfig;
