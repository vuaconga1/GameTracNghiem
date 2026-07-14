import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist"],
  experimental: {
    // Folder image/audio uploads pass through middleware; default 10MB can truncate multipart.
    middlewareClientMaxBodySize: 50 * 1024 * 1024,
    // proxyClientMaxBodySize is unrecognized in this Next.js version
    // proxyClientMaxBodySize: 50 * 1024 * 1024,
  },
};

export default nextConfig;
