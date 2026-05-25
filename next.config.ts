import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: import.meta.dirname,
  },
};

initOpenNextCloudflareForDev();

export default nextConfig;
