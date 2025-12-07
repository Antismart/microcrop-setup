import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark packages as external to prevent bundling test files
  serverExternalPackages: [
    'pino',
    'thread-stream',
    '@walletconnect/universal-provider',
  ],

  // Enable Turbopack (Next.js 16 default)
  turbopack: {},
};

export default nextConfig;
