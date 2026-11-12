import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A second local build (tests) can use its own folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
