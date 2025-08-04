/** @type {import('next').NextConfig} */
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
    // Bundle analyzer for development
    if (dev && !isServer) {
      // Bundle analyzer would be imported dynamically if needed
      // const { BundleAnalyzerPlugin } = await import('webpack-bundle-analyzer');
      // For now, skip in development to avoid ES module issues
    }

    // Production optimizations
    if (!dev) {
      // Tree shaking optimizations
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        // Module concatenation for better minification
        concatenateModules: true,
        // Split chunks optimization
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Vendor chunks
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              enforce: true,
            },
            // UI components chunk
            ui: {
              test: /[\\/]components[\\/]ui[\\/]/,
              name: 'ui-components',
              chunks: 'all',
              priority: 10,
            },
            // Radix UI components
            radix: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: 'radix-ui',
              chunks: 'all',
              priority: 15,
            },
            // Charts and visualization
            charts: {
              test: /[\\/]node_modules[\\/](recharts|d3)[\\/]/,
              name: 'charts',
              chunks: 'all',
              priority: 12,
            },
            // Utilities and helpers
            utils: {
              test: /[\\/](lib|utils)[\\/]/,
              name: 'utils',
              chunks: 'all',
              minSize: 10000,
              priority: 5,
            },
          },
        },
      };

      // Minimize and compress
      config.optimization.minimize = true;
      
      // Remove console logs in production
      // TerserPlugin is automatically included in Next.js production builds
      // Custom configuration can be added via next.config.mjs experimental options
      config.optimization.minimizer = config.optimization.minimizer || [];
    }

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
