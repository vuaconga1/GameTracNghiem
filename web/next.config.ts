import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist"],
  experimental: {
    // Folder image/audio uploads pass through middleware; default 10MB can truncate multipart.
    middlewareClientMaxBodySize: 50 * 1024 * 1024,
    // Prefer fresh dynamic pages so progress/scores after a game stay accurate.
    // Static segments can stay warm briefly for instant back/forward chrome.
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/pdfjs/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
