import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal self-contained server for the Docker image.
  output: "standalone",
};

export default nextConfig;
