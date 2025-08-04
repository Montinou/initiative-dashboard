import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

/**
 * Vitest Configuration for Automation Framework
 * 
 * Enhanced configuration for unit and integration testing with comprehensive
 * coverage reporting, multi-environment support, and proper TypeScript handling.
 */

export default defineConfig({
  plugins: [react()],
  
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Setup files
    setupFiles: [
      './utils/test-setup.ts',
      './utils/test-globals.ts'
    ],
    
    // Global test configuration
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Test patterns
    include: [
      'unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      'e2e/**',
      'reports/**',
      'fixtures/**'
    ],
    
    // Timeout configurations
    testTimeout: 30000,
    hookTimeout: 10000,
    
    // Watch mode settings
    watch: process.env.CI ? false : undefined,
    
    // Reporter configuration
    reporter: process.env.CI 
      ? ['verbose', 'junit', 'json', 'html']
      : ['verbose', 'html'],
    
    outputFile: {
      junit: 'reports/vitest-junit.xml',
      json: 'reports/vitest-results.json',
      html: 'reports/vitest-report.html'
    },
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: [
        'text',
        'text-summary', 
        'json',
        'json-summary',
        'html',
        'lcov',
        'clover'
      ],
      
      // Output directories
      reportsDirectory: 'reports/coverage',
      
      // Include patterns
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'utils/**/*.{ts,tsx}'
      ],
      
      // Exclude patterns
      exclude: [
        '**/*.d.ts',
        '**/*.config.*',
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/coverage/**',
        '**/automation/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/types/**',
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/middleware.ts',
        '**/globals.css',
        '**/*.stories.*',
        'app/layout.tsx',
        'app/page.tsx'
      ],
      
      // Coverage thresholds
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        },
        // Critical components require higher coverage
        'components/OKRFileUpload.tsx': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        'components/stratix/*.tsx': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        'hooks/useStratixAssistant.ts': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        'lib/stratix/**/*.ts': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        'lib/auth-*.ts': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      },
      
      // Coverage collection
      all: true,
      skipFull: false,
      clean: true,
      cleanOnRerun: true
    },
    
    // Test execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: process.env.CI ? 2 : undefined,
        minThreads: 1
      }
    },
    
    // Snapshot handling
    resolveSnapshotPath: (testPath: string, snapExtension: string) => {
      return testPath.replace('/tests/', '/__snapshots__/') + snapExtension
    }
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../'),
      '@/components': resolve(__dirname, '../../components'),
      '@/lib': resolve(__dirname, '../../lib'),
      '@/hooks': resolve(__dirname, '../../hooks'),
      '@/utils': resolve(__dirname, '../../utils'),
      '@/app': resolve(__dirname, '../../app'),
      '@/automation': resolve(__dirname, '../'),
      '@/fixtures': resolve(__dirname, '../fixtures'),
      '@/test-utils': resolve(__dirname, '../utils')
    }
  },
  
  // Define environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'test'),
    'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'),
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'),
    'process.env.NEXT_PUBLIC_ENABLE_STRATIX': JSON.stringify('true')
  }
})