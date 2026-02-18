/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@vendhub/shared"],
};

module.exports = nextConfig;
