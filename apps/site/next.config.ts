import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",

  // Monorepo settings from BASE
  transpilePackages: ["@vendhub/shared"],
  outputFileTracingRoot: path.join(__dirname, "../.."),

  // Turbopack needs explicit root in monorepo Docker builds
  turbopack: {
    root: path.join(__dirname, "../.."),
  },

  // reactCompiler requires babel-plugin-react-compiler package
  // reactCompiler: true,

  images: {
    remotePatterns: [],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // unsafe-inline required by Next.js for hydration inline scripts
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com unpkg.com",
              "font-src 'self' fonts.gstatic.com",
              "img-src 'self' data: blob: *.tile.openstreetmap.org unpkg.com",
              "connect-src 'self' *.tile.openstreetmap.org",
              "frame-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
