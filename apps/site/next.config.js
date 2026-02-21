const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@vendhub/shared"],

  // Turbopack needs explicit root in monorepo Docker builds
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

module.exports = nextConfig;
