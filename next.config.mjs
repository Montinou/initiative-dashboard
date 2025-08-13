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
      // Prevent aggressive variable minification that can cause TDZ errors
      config.optimization.minimize = true;
      if (config.optimization.minimizer) {
        config.optimization.minimizer.forEach((minimizer) => {
          if (minimizer.constructor.name === 'TerserPlugin') {
            minimizer.options.terserOptions = {
              ...minimizer.options.terserOptions,
              mangle: {
                ...minimizer.options.terserOptions?.mangle,
                // Preserve variable names that could cause TDZ issues
                reserved: ['V', 'v', 'Vue', 'yn', 'Tt', '$r'],
                // Use safer property mangling
                properties: {
                  ...minimizer.options.terserOptions?.mangle?.properties,
                  builtins: false,
                  debug: false,
                }
              },
              compress: {
                ...minimizer.options.terserOptions?.compress,
                // Prevent unsafe transformations
                unsafe: false,
                unsafe_arrows: false,
                unsafe_comps: false,
                unsafe_math: false,
                unsafe_proto: false,
                unsafe_regexp: false,
                // Keep function names to avoid hoisting issues
                keep_fnames: true,
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
}

export default nextConfig
