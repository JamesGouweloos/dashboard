/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    // Skip blocking deploys on existing lint violations until they're addressed
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
