import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Security headers are set in one place: src/middleware.ts
  async rewrites() {
    return [
      // Clean SEO URLs per Spec 87: /febe/modules/elc511s → /modules/elc511s (faculty slug ignored, canonical module)
      { source: "/febe/modules/:code", destination: "/modules/:code" },
      { source: "/fci/modules/:code", destination: "/modules/:code" },
      { source: "/febe/modules/:code/:year/:type", destination: "/modules/:code" },
      { source: "/fci/modules/:code/:year/:type", destination: "/modules/:code" },
      // Faculty shortcuts per Spec 87
      { source: "/febe", destination: "/browse/febe" },
      { source: "/fci", destination: "/browse/fci" },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)\\.(js|css|woff|woff2|ttf|ico|svg|png|jpg|jpeg|webp|avif)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  // Ensure DB is not required at build for pages that query DB — they are force-dynamic
  experimental: {
    // Keep build tolerant of DB not available
  },
};

export default nextConfig;
