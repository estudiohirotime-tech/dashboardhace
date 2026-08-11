import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Type errors fail the build; we run tsc in CI.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
