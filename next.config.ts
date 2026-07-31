import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Self-contained server bundle for Docker deploys (see Dockerfile).
  output: "standalone",
};

export default nextConfig;
