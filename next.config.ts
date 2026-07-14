import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal self-contained server for the Docker image.
  output: "standalone",
  // Allow Cloudflare quick-tunnel links to reach the dev server.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
