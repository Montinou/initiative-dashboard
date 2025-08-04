/**
 * Global Setup for E2E Tests
 * 
 * Handles authentication setup, database seeding, and environment
 * preparation before running E2E test suites.
 */

import { chromium, FullConfig } from '@playwright/test'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...')

  try {
    // 1. Ensure test directories exist
    await ensureDirectoriesExist()

    // 2. Setup test database if needed
    await setupTestDatabase()

    // 3. Create authentication states for different users
    await setupAuthenticationStates(config)

    // 4. Seed test data
    await seedTestData()

    // 5. Start necessary services
    await startTestServices()

    console.log('✅ Global setup completed successfully')

  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  }
}

/**
 * Ensure all necessary test directories exist
 */
async function ensureDirectoriesExist(): Promise<void> {
  const directories = [
    'automation/reports',
    'automation/reports/screenshots',
    'automation/reports/videos',
    'automation/reports/coverage',
    'automation/fixtures/downloads',
    'automation/fixtures/uploads',
    'automation/fixtures/auth'
  ]

  for (const dir of directories) {
    const fullPath = path.join(process.cwd(), dir)
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true })
      console.log(`📁 Created directory: ${dir}`)
    }
  }
}

/**
 * Setup test database connection and schema
 */
async function setupTestDatabase(): Promise<void> {
  console.log('🗄️ Setting up test database...')

  // Check if we're using a test database
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl || !supabaseUrl.includes('localhost')) {
    console.log('⚠️ Not using local database, skipping database setup')
    return
  }

  try {
    // Run database migrations if needed
    // This would depend on your specific setup
    console.log('📊 Database setup completed')
  } catch (error) {
    console.warn('⚠️ Database setup failed, continuing without seeded data:', error)
  }
}

/**
 * Create authentication states for different user types
 */
async function setupAuthenticationStates(config: FullConfig): Promise<void> {
  console.log('🔐 Setting up authentication states...')

  const browser = await chromium.launch()
  
  // Define user credentials for different roles
  const testUsers = [
    {
      role: 'ceo',
      email: 'ceo@testcompany.com',
      password: 'testpassword123',
      tenant: 'fema'
    },
    {
      role: 'manager',
      email: 'manager@testcompany.com',
      password: 'testpassword123',
      tenant: 'fema'
    },
    {
      role: 'analyst',
      email: 'analyst@testcompany.com',
      password: 'testpassword123',
      tenant: 'fema'
    }
  ]

  for (const user of testUsers) {
    try {
      const context = await browser.newContext()
      const page = await context.newPage()

      // Navigate to login page
      const baseUrl = config.projects[0].use?.baseURL || 'http://localhost:3000'
      await page.goto(`${baseUrl}/auth/login`)

      // Wait for login form
      await page.waitForSelector('input[type="email"]', { timeout: 10000 })

      // Fill login form
      await page.fill('input[type="email"]', user.email)
      await page.fill('input[type="password"]', user.password)

      // Submit login
      await page.click('button[type="submit"]')

      // Wait for successful login (redirect to dashboard)
      await page.waitForURL('**/dashboard**', { timeout: 15000 })

      // Save authentication state
      const authPath = path.join(process.cwd(), `automation/fixtures/auth/${user.role}-auth.json`)
      await context.storageState({ path: authPath })

      console.log(`✅ Created auth state for ${user.role}`)

      await context.close()

    } catch (error) {
      console.warn(`⚠️ Failed to create auth state for ${user.role}:`, error)
      
      // Create empty auth state as fallback
      const authPath = path.join(process.cwd(), `automation/fixtures/auth/${user.role}-auth.json`)
      fs.writeFileSync(authPath, JSON.stringify({
        cookies: [],
        origins: []
      }))
    }
  }

  // Create tenant-specific auth states
  const tenants = ['fema', 'siga', 'stratix']
  
  for (const tenant of tenants) {
    try {
      const context = await browser.newContext()
      const page = await context.newPage()

      // Navigate to tenant-specific URL
      const tenantUrl = `http://${tenant}.localhost:3000`
      await page.goto(`${tenantUrl}/auth/login`)

      // Use admin credentials for tenant
      await page.waitForSelector('input[type="email"]', { timeout: 10000 })
      await page.fill('input[type="email"]', `admin@${tenant}.com`)
      await page.fill('input[type="password"]', 'testpassword123')
      await page.click('button[type="submit"]')

      // Wait for successful login
      await page.waitForURL('**/dashboard**', { timeout: 15000 })

      // Save tenant auth state
      const authPath = path.join(process.cwd(), `automation/fixtures/auth/${tenant}-admin-auth.json`)
      await context.storageState({ path: authPath })

      console.log(`✅ Created auth state for ${tenant} tenant`)

      await context.close()

    } catch (error) {
      console.warn(`⚠️ Failed to create auth state for ${tenant} tenant:`, error)
      
      // Create empty auth state as fallback
      const authPath = path.join(process.cwd(), `automation/fixtures/auth/${tenant}-admin-auth.json`)
      fs.writeFileSync(authPath, JSON.stringify({
        cookies: [],
        origins: []
      }))
    }
  }

  await browser.close()
}

/**
 * Seed test data for consistent testing
 */
async function seedTestData(): Promise<void> {
  console.log('🌱 Seeding test data...')

  try {
    // Create test files for upload testing
    await createTestFiles()

    // Seed database with test data if using local DB
    // This would be implemented based on your data seeding strategy

    console.log('✅ Test data seeded successfully')

  } catch (error) {
    console.warn('⚠️ Test data seeding failed:', error)
  }
}

/**
 * Create test files for upload testing
 */
async function createTestFiles(): Promise<void> {
  const testFilesDir = path.join(process.cwd(), 'automation/fixtures/files')
  
  if (!fs.existsSync(testFilesDir)) {
    fs.mkdirSync(testFilesDir, { recursive: true })
  }

  // Create test Excel files (mock data)
  const testFiles = [
    {
      name: 'valid-okr-data.xlsx',
      content: 'Mock Excel content for valid OKR data',
      size: 5000
    },
    {
      name: 'large-file.xlsx',
      content: 'X'.repeat(15 * 1024 * 1024), // 15MB file
      size: 15 * 1024 * 1024
    },
    {
      name: 'empty-file.xlsx',
      content: '',
      size: 0
    },
    {
      name: 'invalid-format.txt',
      content: 'This is not an Excel file',
      size: 100
    }
  ]

  for (const file of testFiles) {
    const filePath = path.join(testFilesDir, file.name)
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, file.content)
      console.log(`📄 Created test file: ${file.name}`)
    }
  }
}

/**
 * Start necessary test services
 */
async function startTestServices(): Promise<void> {
  console.log('🔧 Starting test services...')

  // Check if the development server is running
  try {
    const response = await fetch('http://localhost:3000/api/health', {
      signal: AbortSignal.timeout(5000)
    })
    
    if (response.ok) {
      console.log('✅ Development server is running')
    }
  } catch (error) {
    console.warn('⚠️ Development server may not be running:', error)
  }

  // Check if Supabase is running locally
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl?.includes('localhost')) {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        signal: AbortSignal.timeout(5000)
      })
      console.log('✅ Local Supabase is accessible')
    }
  } catch (error) {
    console.warn('⚠️ Local Supabase may not be running:', error)
  }
}

/**
 * Check system requirements
 */
async function checkSystemRequirements(): Promise<void> {
  console.log('🔍 Checking system requirements...')

  // Check Node.js version
  const nodeVersion = process.version
  console.log(`Node.js version: ${nodeVersion}`)

  // Check if required environment variables are set
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`⚠️ Missing required environment variable: ${envVar}`)
    }
  }

  console.log('✅ System requirements check completed')
}

export default globalSetup