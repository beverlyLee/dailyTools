/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['echarts', 'echarts-for-react', 'lucide-react']
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  webpack: (config) => {
    config.cache = true;
    return config;
  },
};

module.exports = nextConfig;
