import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN dev access (e.g. opening the dev server from a phone over Wi-Fi).
  // Without this, Next.js 16 blocks cross-origin requests to /_next/* dev
  // resources from non-localhost origins and logs a warning.
  allowedDevOrigins: ["172.20.10.2", "172.16.2.69"],
};

export default nextConfig;
