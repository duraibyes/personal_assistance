/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/database", "@repo/shared", "@repo/validation"],
};

module.exports = nextConfig;
