import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy and secure headers (SECURITY_PRIVACY.md).
 *
 * Browser-side network calls are limited to Supabase (auth, storage signed
 * URLs, realtime). Mapbox geocoding and Resend email are server-side only, so
 * they are deliberately absent from connect-src. `script-src` still allows
 * 'unsafe-inline' because Next.js injects inline bootstrap scripts without a
 * nonce; moving to a nonce-based CSP is a future hardening.
 */
function buildCsp(): string {
  const supabaseHttp = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseWs = supabaseHttp.replace(/^http/, "ws");
  const connect = ["'self'", supabaseHttp, supabaseWs].filter(Boolean).join(" ");
  // Signed proof-photo URLs are served from Supabase Storage (same origin).
  const img = ["'self'", "data:", "blob:", supabaseHttp].filter(Boolean).join(" ");

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `img-src ${img}`,
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    // 'unsafe-eval' is only needed for React Refresh in development.
    `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
    `connect-src ${connect}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: buildCsp() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), geolocation=(self), microphone=(), payment=(), browsing-topics=()",
  },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Permanent redirects from the earlier route slugs to the current ones so
  // existing links and any indexed URLs don't 404.
  async redirects() {
    return [
      { source: "/for-seniors", destination: "/seniors", permanent: true },
      { source: "/for-snowbirds", destination: "/snowbirds", permanent: true },
      { source: "/for-vacation-rentals", destination: "/vacation-rentals", permanent: true },
      { source: "/for-hoas", destination: "/hoa", permanent: true },
      { source: "/one-time-trash-day", destination: "/trash-day-ondemand", permanent: true },
      // Bulk Pickup Coordination was retired (D-007 retired 2026-07-27); send old links to pricing.
      { source: "/bulk-pickup-coordination", destination: "/pricing", permanent: true },
      { source: "/bulk-trash-pickup", destination: "/pricing", permanent: true },
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
