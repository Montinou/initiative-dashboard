/** @type {import('next').NextConfig} */

// Fix for 'self is not defined' error in server environment
if (typeof self === 'undefined') {
  global.self = globalThis;
}

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // External packages to run in Node.js runtime
  serverExternalPackages: ['@supabase/supabase-js'],
  // Bundle optimization for PERF-001
  experimental: {
    optimizeCss: false, // Disable until critters dependency is resolved
    optimizePackageImports: [
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-button',
      '@radix-ui/react-card',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-form',
      '@radix-ui/react-input',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-sheet',
      '@radix-ui/react-skeleton',
      '@radix-ui/react-slider',
      '@radix-ui/react-switch',
      '@radix-ui/react-table',
      '@radix-ui/react-tabs',
      '@radix-ui/react-textarea',
      '@radix-ui/react-toast',
      '@radix-ui/react-toggle',
      '@radix-ui/react-tooltip',
      'lucide-react',
      'recharts',
      'date-fns',
    ],
  },
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Module resolution optimizations  
    config.resolve.alias = {
      ...config.resolve.alias,
      // '@' alias is handled by Next.js automatically
    };

    return config;
  },
  // Compression and caching
  compress: true,
  poweredByHeader: false,
  // Generate source maps only in development
  productionBrowserSourceMaps: false,
}

export default nextConfig
