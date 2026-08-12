import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@restaurantos/ui'],
  reactStrictMode: true,
};

export default nextConfig;
