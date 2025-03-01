/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // In production, you should enable this check and fix all issues
    ignoreDuringBuilds: process.env.NODE_ENV !== "production",
  },
  typescript: {
    // In production, you should enable this check and fix all issues
    ignoreBuildErrors: process.env.NODE_ENV !== "production",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
    ],
    // Enable image optimization for production
    unoptimized: process.env.NODE_ENV !== "production",
  },
  // Add performance optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // Configure caching policies
  headers: async () => {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
