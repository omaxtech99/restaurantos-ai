import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@restaurantos/ui', '@restaurantos/shared', '@restaurantos/types'],
  reactStrictMode: true,
};

export default nextConfig;
