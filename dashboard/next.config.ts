import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark packages as external to prevent bundling test files
  serverExternalPackages: [
    'pino',
    'thread-stream',
    '@walletconnect/universal-provider',
  ],

  // Configure webpack to ignore test files
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'pino': 'commonjs pino',
        'thread-stream': 'commonjs thread-stream',
      });
    }

    // Ignore test files and other non-production files
    config.module.rules.push({
      test: /node_modules\/.*\.(test|spec)\.(js|ts|mjs)$/,
      loader: 'ignore-loader',
    });

    return config;
  },
};

export default nextConfig;
