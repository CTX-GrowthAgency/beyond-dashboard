/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['react', 'react-dom', 'lucide-react'],
  },
  
  // Turbopack configuration
  turbopack: {},
  
  // Image optimization
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },

  // Compression
  compress: true,

  // Output configuration
  output: 'standalone',

  // Trailing slash
  trailingSlash: false,

  // Power by header removal
  poweredByHeader: false,
};

module.exports = nextConfig;
