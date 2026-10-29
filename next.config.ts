import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev server is proxied through a sandbox host in preview environments.
  allowedDevOrigins: [
    "*.e2b.app",
    "*.arena.ai",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
  images: {
    // Bookart renders procedurally generated SVG covers, so no remote loader is needed.
    unoptimized: true,
  },
  experimental: {
    agentUpgrade: "security",
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
