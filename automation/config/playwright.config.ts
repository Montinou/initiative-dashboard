import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Testing Configuration
 * 
 * Comprehensive configuration for testing file upload, Stratix AI integration,
 * multi-tenant isolation, and role-based access control across different browsers
 * and devices.
 */

export default defineConfig({
  // Test directory structure
  testDir: '../e2e',
  
  // Timeout configurations
  timeout: 60000, // 60 seconds for complex AI operations
  expect: {
    timeout: 10000 // 10 seconds for element expectations
  },
  
  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: '../reports/playwright-report' }],
    ['junit', { outputFile: '../reports/junit-results.xml' }],
    ['json', { outputFile: '../reports/test-results.json' }],
    ['line']
  ],
  
  // Output directories
  outputDir: '../reports/test-results',
  
  use: {
    // Base URL for all tests
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Browser context options
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Network and timing
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Ignore HTTPS errors for local development
    ignoreHTTPSErrors: true,
    
    // Viewport for consistent testing
    viewport: { width: 1280, height: 720 },
    
    // Extra HTTP headers for authentication
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9'
    }
  },

  // Test projects for different scenarios
  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
      testMatch: ['**/*.e2e.ts', '**/*.spec.ts']
    },
    
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox']
      },
      testMatch: ['**/*.e2e.ts', '**/*.spec.ts']
    },
    
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari']
      },
      testMatch: ['**/*.e2e.ts', '**/*.spec.ts']
    },

    // Mobile devices
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5']
      },
      testMatch: ['**/mobile*.e2e.ts']
    },
    
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12']
      },
      testMatch: ['**/mobile*.e2e.ts']
    },

    // Multi-tenant testing projects
    {
      name: 'fema-tenant',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.FEMA_TENANT_URL || 'http://fema.localhost:3000',
        storageState: '../fixtures/auth/fema-admin-auth.json'
      },
      testMatch: ['**/multi-tenant/*.e2e.ts']
    },
    
    {
      name: 'siga-tenant',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.SIGA_TENANT_URL || 'http://siga.localhost:3000',
        storageState: '../fixtures/auth/siga-admin-auth.json'
      },
      testMatch: ['**/multi-tenant/*.e2e.ts']
    },
    
    {
      name: 'stratix-tenant',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.STRATIX_TENANT_URL || 'http://stratix.localhost:3000',
        storageState: '../fixtures/auth/stratix-admin-auth.json'
      },
      testMatch: ['**/stratix/*.e2e.ts']
    },

    // Role-based testing projects
    {
      name: 'ceo-role',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '../fixtures/auth/ceo-auth.json'
      },
      testMatch: ['**/auth/ceo-*.e2e.ts']
    },
    
    {
      name: 'manager-role',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '../fixtures/auth/manager-auth.json'
      },
      testMatch: ['**/auth/manager-*.e2e.ts']
    },
    
    {
      name: 'analyst-role',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '../fixtures/auth/analyst-auth.json'
      },
      testMatch: ['**/auth/analyst-*.e2e.ts']
    },

    // Visual regression testing
    {
      name: 'visual-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      testMatch: ['**/visual/*.e2e.ts']
    },

    // Performance testing
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
      testMatch: ['**/performance/*.e2e.ts']
    },

    // API testing
    {
      name: 'api-tests',
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api'
      },
      testMatch: ['**/api/*.e2e.ts']
    }
  ],

  // Global setup and teardown
  globalSetup: require.resolve('../utils/helpers/global-setup.ts'),
  globalTeardown: require.resolve('../utils/helpers/global-teardown.ts'),

  // Web server configuration for local development
  // webServer: process.env.CI ? undefined : {
  //   command: 'cd .. && npm run dev',
  //   port: 3000,
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000 // 2 minutes to start the server
  // }
})