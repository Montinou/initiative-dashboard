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
  // Security headers including CSP for Dialogflow
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://*.dialogflow.com; style-src 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.dialogflow.com https://www.googleapis.com; frame-src 'self' https://*.dialogflow.com;"
          }
        ]
      }
    ]
  },
  // Bundle optimization for PERF-001
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
  },
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Module resolution optimizations  
    config.resolve.alias = {
      ...config.resolve.alias,
      // '@' alias is handled by Next.js automatically
    };

    // Fix for Temporal Dead Zone errors in production builds
    if (!dev) {
      // More aggressive TDZ error prevention
      config.optimization.minimize = true;
      if (config.optimization.minimizer) {
        config.optimization.minimizer.forEach((minimizer) => {
          if (minimizer.constructor.name === 'TerserPlugin') {
            minimizer.options.terserOptions = {
              ...minimizer.options.terserOptions,
              mangle: {
                ...minimizer.options.terserOptions?.mangle,
                // Expanded list of reserved variable names that could cause TDZ issues
                reserved: [
                  'V', 'v', 'Vue', 'yn', 'Tt', '$r', 'u', 'U', 'h', 'H', 'n', 'N', 
                  'e', 'E', 't', 'T', 'r', 'R', 'o', 'O', 'i', 'I', 'a', 'A', 's', 'S',
                  'd', 'D', 'f', 'F', 'g', 'G', 'l', 'L', 'c', 'C', 'm', 'M', 'p', 'P',
                  'b', 'B', 'w', 'W', 'y', 'Y', 'x', 'X', 'z', 'Z', 'k', 'K', 'j', 'J',
                  'q', 'Q'
                ],
                // Disable property mangling to prevent TDZ issues
                properties: false,
                // Keep class names to prevent constructor issues
                keep_classnames: true,
              },
              compress: {
                ...minimizer.options.terserOptions?.compress,
                // Prevent all unsafe transformations that could cause TDZ
                unsafe: false,
                unsafe_arrows: false,
                unsafe_comps: false,
                unsafe_math: false,
                unsafe_proto: false,
                unsafe_regexp: false,
                unsafe_undefined: false,
                unsafe_methods: false,
                unsafe_symbols: false,
                // Keep function names and class names to avoid hoisting issues
                keep_fnames: true,
                keep_classnames: true,
                // Disable variable hoisting optimizations
                hoist_vars: false,
                hoist_funs: false,
                // Disable join_vars to prevent variable declaration merging
                join_vars: false,
                // Reduce sequences to prevent variable reordering
                sequences: false,
                // Be more conservative with conditionals
                conditionals: false,
                // Disable toplevel optimizations
                toplevel: false,
              }
            };
          }
        });
      }
    }

    return config;
  },
  // Compression and caching
  compress: true,
  poweredByHeader: false,
  // Generate source maps only in development
  productionBrowserSourceMaps: false,
  // Add onDemandEntries configuration for better chunk handling
  onDemandEntries: {
    // Period (in ms) where the page check if it's needed to reload
    maxInactiveAge: 60 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  },
}

export default nextConfig
