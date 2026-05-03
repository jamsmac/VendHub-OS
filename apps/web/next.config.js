const path = require("path");
const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const apiHost = (() => {
  try {
    return new URL(apiUrl).origin;
  } catch {
    return apiUrl;
  }
})();
const wsHost = apiHost.replace(/^http/, "ws");

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@vendhub/shared"],

  // Standalone output for Railway RAILPACK deployment
  output: "standalone",

  // Monorepo root for standalone output file tracing
  outputFileTracingRoot: path.join(__dirname, "../.."),

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      ...(apiHost !== "http://localhost:4000"
        ? [
            {
              protocol: new URL(apiHost).protocol.replace(":", ""),
              hostname: new URL(apiHost).hostname,
            },
          ]
        : []),
    ],
    unoptimized: process.env.NODE_ENV === "development",
  },

  async redirects() {
    return [
      {
        source: "/dashboard/achievements",
        destination: "/dashboard/loyalty/achievements",
        permanent: true,
      },
      {
        source: "/dashboard/counterparty",
        destination: "/dashboard/counterparties",
        permanent: true,
      },
      {
        source: "/dashboard/promo-codes",
        destination: "/dashboard/loyalty/promo-codes",
        permanent: true,
      },
      {
        source: "/dashboard/quests",
        destination: "/dashboard/loyalty/quests",
        permanent: true,
      },
      {
        source: "/dashboard/promotions",
        destination: "/dashboard/loyalty/promo-codes",
        permanent: true,
      },
      {
        source: "/dashboard/dashboard",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/dashboard/dashboard/:path*",
        destination: "/dashboard/:path*",
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/:path*`,
      },
    ];
  },

  // Headers for security
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
          {
            key: "Permissions-Policy",
            value:
              "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'",
              // OSM tiles for /dashboard/map (Leaflet) — served from a/b/c.tile.openstreetmap.org subdomains
              `img-src 'self' data: blob: ${apiHost} https://*.tile.openstreetmap.org`,
              "font-src 'self' https://fonts.gstatic.com",
              `connect-src 'self' ${apiHost} ${wsHost}`,
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
