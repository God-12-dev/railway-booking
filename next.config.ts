import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next-build",
  experimental: { cpus: 1, webpackBuildWorker: false },
};

export default nextConfig;
