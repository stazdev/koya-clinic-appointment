import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  async rewrites() {
    return [
      { source: "/reset", destination: "/api/reset" },
      { source: "/slots", destination: "/api/slots" },
      { source: "/bookings", destination: "/api/bookings" },
      { source: "/bookings/:id", destination: "/api/bookings/:id" },
    ];
  },
};

export default nextConfig;
