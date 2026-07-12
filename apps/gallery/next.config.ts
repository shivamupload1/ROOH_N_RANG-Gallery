import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  turbopack: { root: path.join(__dirname, "../..") },
  transpilePackages: ["@rooh/database"],
  images: { remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }] }
};

export default nextConfig;
