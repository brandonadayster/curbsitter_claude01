import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permanent redirects from the earlier route slugs to the current ones so
  // existing links and any indexed URLs don't 404.
  async redirects() {
    return [
      { source: "/for-seniors", destination: "/seniors", permanent: true },
      { source: "/for-snowbirds", destination: "/snowbirds", permanent: true },
      { source: "/for-vacation-rentals", destination: "/vacation-rentals", permanent: true },
      { source: "/for-hoas", destination: "/hoa", permanent: true },
      { source: "/one-time-trash-day", destination: "/trash-day-ondemand", permanent: true },
      { source: "/bulk-pickup-coordination", destination: "/bulk-trash-pickup", permanent: true },
      { source: "/service-areas/prescott-az", destination: "/service-areas/prescott", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: [
    'localhost:3000',
    '127.0.0.1:4040',
    '192.168.99.105',
    '192.168.99.105:3000',
    '*.ngrok-free.app',
    '*.ngrok-free.dev',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
};

export default nextConfig;
