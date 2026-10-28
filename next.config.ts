import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep `next dev`'s hot-reload artifacts separate from `next build` output.
  // This prevents one command from replacing chunks the other server is using.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
