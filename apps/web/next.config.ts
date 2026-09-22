import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // @rst0070/content ships TypeScript source (no build step)
  transpilePackages: ['@rst0070/content'],
  pageExtensions: ['js', 'jsx', 'ts', 'tsx']
};

export default nextConfig

