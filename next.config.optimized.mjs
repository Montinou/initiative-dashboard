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
    unoptimized: false,
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 768, 1024, 1280, 1600],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: [],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.googleapis.com',
      }
    ],
  },
  // External packages to run in Node.js runtime
  serverExternalPackages: ['@supabase/supabase-js'],
  // Bundle optimization
  experimental: {
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
    // Enable SWC minification
    swcMinify: true,
  },
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
  // Webpack optimizations
  webpack: (config, { dev, isServer, webpack }) => {
    // Module resolution optimizations  
    config.resolve.alias = {
      ...config.resolve.alias,
      // Performance optimization aliases
      '@/components': require('path').resolve(process.cwd(), 'components'),
      '@/lib': require('path').resolve(process.cwd(), 'lib'),
      '@/hooks': require('path').resolve(process.cwd(), 'hooks'),
    };

    // Production optimizations
    if (!dev) {
      // Bundle splitting optimization
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix',
            priority: 20,
            reuseExistingChunk: true,
          },
          recharts: {
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            name: 'recharts',
            priority: 15,
            reuseExistingChunk: true,
          },
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            priority: 15,
            reuseExistingChunk: true,
          },
        },
      };

      // Terser optimization
      if (config.optimization.minimizer) {
        config.optimization.minimizer.forEach((minimizer) => {
          if (minimizer.constructor.name === 'TerserPlugin') {
            minimizer.options.terserOptions = {
              ...minimizer.options.terserOptions,
              mangle: {
                ...minimizer.options.terserOptions?.mangle,
                reserved: [
                  'V', 'v', 'Vue', 'yn', 'Tt', '$r', 'u', 'U', 'h', 'H', 'n', 'N', 
                  'e', 'E', 't', 'T', 'r', 'R', 'o', 'O', 'i', 'I', 'a', 'A', 's', 'S',
                  'd', 'D', 'f', 'F', 'g', 'G', 'l', 'L', 'c', 'C', 'm', 'M', 'p', 'P',
                  'b', 'B', 'w', 'W', 'y', 'Y', 'x', 'X', 'z', 'Z', 'k', 'K', 'j', 'J',
                  'q', 'Q'
                ],
                properties: false,
                keep_classnames: true,
              },
              compress: {
                ...minimizer.options.terserOptions?.compress,
                unsafe: false,
                unsafe_arrows: false,
                unsafe_comps: false,
                unsafe_math: false,
                unsafe_proto: false,
                unsafe_regexp: false,
                unsafe_undefined: false,
                unsafe_methods: false,
                unsafe_symbols: false,
                keep_fnames: true,
                keep_classnames: true,
                hoist_vars: false,
                hoist_funs: false,
                join_vars: false,
                sequences: false,
                conditionals: false,
                toplevel: false,
                drop_console: true,
                drop_debugger: true,
              }
            };
          }
        });
      }
    }

    // Analyze bundle if requested
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: `${isServer ? 'server' : 'client'}.html`,
        })
      );
    }

    return config;
  },
  // Compression and caching
  compress: true,
  poweredByHeader: false,
  // Generate source maps only in development
  productionBrowserSourceMaps: false,
  // Output configuration
  output: 'standalone',
  // Redirects and rewrites
  async redirects() {
    return [
      {
        source: '/dashboard/home',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
}

export default nextConfig