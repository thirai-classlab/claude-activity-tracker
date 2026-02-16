import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Custom server pattern: Express + Next.js in same process
  // Do NOT use output: 'standalone' with custom server

  // Ignore Express server files during Next.js compilation
  webpack: (config) => {
    config.externals = config.externals || [];
    return config;
  },
};

export default nextConfig;
