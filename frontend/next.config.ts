import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack for better compatibility with OneDrive
  // Use webpack instead (more stable with synced folders)
  // To re-enable Turbopack, change "next dev" to "next dev --turbo" in package.json
  turbopack: {
    root: __dirname,
  },
  // Performance optimizations
  swcMinify: true,
  reactStrictMode: true,
};

export default nextConfig;
