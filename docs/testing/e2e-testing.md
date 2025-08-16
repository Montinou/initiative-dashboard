# End-to-End Testing Guide with Playwright

## Introduction

End-to-end (E2E) tests validate complete user workflows across the Initiative Dashboard, ensuring that all components work together seamlessly from the user's perspective. Using Playwright, we test across multiple browsers, devices, and tenant configurations.

## Playwright Setup

### Configuration Overview

```typescript
// automation/config/playwright.config.ts
export default defineConfig({
  testDir: '../e2e',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  projects: [
    { name: 'chromium-desktop', use: devices['Desktop Chrome'] },
    { name: 'firefox-desktop', use: devices['Desktop Firefox'] },
    { name: 'webkit-desktop', use: devices['Desktop Safari'] },
    { name: 'mobile-chrome', use: devices['Pixel 5'] },
    { name: 'mobile-safari', use: devices['iPhone 12'] },
  ]
})
```

### Installation and Setup

```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install

# Install system dependencies (if needed)
npx playwright install-deps

# Open Playwright UI
npx playwright test --ui

# Generate tests with codegen
npx playwright codegen localhost:3000
```

## Page Object Model

### Base Page Object

```typescript
// automation/utils/page-objects/base.page.ts
import { Page, Locator } from '@playwright/test'

export class BasePage {
  constructor(protected page: Page) {}

  async navigate(path: string = '/') {
    await this.page.goto(path)
    await this.waitForPageLoad()
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle')
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `automation/reports/screenshots/${name}.png`,
      fullPage: true 
    })
  }

  async waitForElement(selector: string, timeout: number = 30000) {
    await this.page.waitForSelector(selector, { timeout })
  }

  async clickAndWait(selector: string, waitFor?: string) {
    await this.page.click(selector)
    if (waitFor) {
      await this.page.waitForSelector(waitFor)
    }
  }

  async fillForm(fields: Record<string, string>) {
    for (const [selector, value] of Object.entries(fields)) {
      await this.page.fill(selector, value)
    }
  }

  async selectOption(selector: string, value: string) {
    await this.page.selectOption(selector, value)
  }

  async uploadFile(selector: string, filePath: string) {
    await this.page.setInputFiles(selector, filePath)
  }

  async getErrorMessage(): Promise<string | null> {
    const error = await this.page.locator('[data-testid="error-message"]')
    return error.isVisible() ? error.textContent() : null
  }
}
```

### Login Page Object

```typescript
// automation/utils/page-objects/login.page.ts
import { Page } from '@playwright/test'
import { BasePage } from './base.page'

export class LoginPage extends BasePage {
  private emailInput = '[data-testid="email-input"]'
  private passwordInput = '[data-testid="password-input"]'
  private submitButton = '[data-testid="login-button"]'
  private errorMessage = '[data-testid="login-error"]'
  private forgotPasswordLink = '[data-testid="forgot-password"]'

  async login(email: string, password: string) {
    await this.page.fill(this.emailInput, email)
    await this.page.fill(this.passwordInput, password)
    await this.page.click(this.submitButton)
    
    // Wait for either dashboard or error
    await this.page.waitForURL(/(dashboard|login)/, { timeout: 10000 })
  }

  async loginAsRole(role: 'ceo' | 'admin' | 'manager') {
    const credentials = {
      ceo: { email: 'ceo@example.com', password: 'demo123456' },
      admin: { email: 'admin@example.com', password: 'demo123456' },
      manager: { email: 'manager@example.com', password: 'demo123456' }
    }
    
    const { email, password } = credentials[role]
    await this.login(email, password)
  }

  async getError(): Promise<string | null> {
    const error = await this.page.locator(this.errorMessage)
    return error.isVisible() ? error.textContent() : null
  }

  async clickForgotPassword() {
    await this.page.click(this.forgotPasswordLink)
    await this.page.waitForURL('**/reset-password')
  }
}
```

### Dashboard Page Object

```typescript
// automation/utils/page-objects/dashboard.page.ts
import { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page'

export class DashboardPage extends BasePage {
  private metricsGrid = '[data-testid="metrics-grid"]'
  private initiativesList = '[data-testid="initiatives-list"]'
  private createButton = '[data-testid="create-initiative-btn"]'
  private filterBar = '[data-testid="filter-bar"]'
  private searchInput = '[data-testid="search-input"]'

  async waitForDashboard() {
    await this.page.waitForSelector(this.metricsGrid, { timeout: 10000 })
    await this.page.waitForLoadState('networkidle')
  }

  async getMetrics(): Promise<Record<string, string>> {
    const metrics: Record<string, string> = {}
    
    const cards = await this.page.locator('[data-testid^="metric-"]').all()
    for (const card of cards) {
      const label = await card.locator('.metric-label').textContent()
      const value = await card.locator('.metric-value').textContent()
      if (label && value) {
        metrics[label] = value
      }
    }
    
    return metrics
  }

  async getInitiatives(): Promise<Array<{
    title: string
    progress: string
    status: string
  }>> {
    const initiatives = []
    const cards = await this.page.locator('[data-testid="initiative-card"]').all()
    
    for (const card of cards) {
      initiatives.push({
        title: await card.locator('.initiative-title').textContent() || '',
        progress: await card.locator('.progress-value').textContent() || '',
        status: await card.locator('.status-badge').textContent() || ''
      })
    }
    
    return initiatives
  }

  async createInitiative(data: {
    title: string
    description: string
    area: string
    dueDate: string
  }) {
    await this.page.click(this.createButton)
    await this.page.waitForSelector('[data-testid="initiative-form"]')
    
    await this.fillForm({
      '[data-testid="title-input"]': data.title,
      '[data-testid="description-input"]': data.description,
      '[data-testid="due-date-input"]': data.dueDate
    })
    
    await this.selectOption('[data-testid="area-select"]', data.area)
    await this.page.click('[data-testid="save-button"]')
    
    // Wait for success
    await this.page.waitForSelector('[data-testid="success-toast"]')
  }

  async filterByArea(area: string) {
    await this.page.click(`${this.filterBar} [data-testid="area-filter"]`)
    await this.page.click(`[data-value="${area}"]`)
    await this.page.waitForLoadState('networkidle')
  }

  async searchInitiatives(query: string) {
    await this.page.fill(this.searchInput, query)
    await this.page.press(this.searchInput, 'Enter')
    await this.page.waitForLoadState('networkidle')
  }

  async navigateToSection(section: 'initiatives' | 'objectives' | 'areas' | 'analytics') {
    await this.page.click(`[data-testid="nav-${section}"]`)
    await this.page.waitForURL(`**/${section}`)
  }
}
```

## Core E2E Test Suites

### Authentication Flow Tests

```typescript
// automation/e2e/auth/authentication.e2e.ts
import { test, expect } from '@playwright/test'
import { LoginPage } from '@/page-objects/login.page'
import { DashboardPage } from '@/page-objects/dashboard.page'

test.describe('Authentication Flow', () => {
  let loginPage: LoginPage
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    dashboardPage = new DashboardPage(page)
    await loginPage.navigate('/login')
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await loginPage.login('ceo@example.com', 'demo123456')
    
    await expect(page).toHaveURL(/.*dashboard/)
    await dashboardPage.waitForDashboard()
    
    const metrics = await dashboardPage.getMetrics()
    expect(metrics).toHaveProperty('Total Initiatives')
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await loginPage.login('invalid@example.com', 'wrongpassword')
    
    await expect(page).toHaveURL(/.*login/)
    const error = await loginPage.getError()
    expect(error).toContain('Invalid login credentials')
  })

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*login/)
    
    const message = await page.locator('[data-testid="redirect-message"]').textContent()
    expect(message).toContain('Please login to continue')
  })

  test('should handle password reset flow', async ({ page }) => {
    await loginPage.clickForgotPassword()
    await expect(page).toHaveURL(/.*reset-password/)
    
    await page.fill('[data-testid="reset-email"]', 'user@example.com')
    await page.click('[data-testid="reset-submit"]')
    
    const success = await page.locator('[data-testid="reset-success"]')
    await expect(success).toContainText('Check your email')
  })

  test('should logout successfully', async ({ page }) => {
    // Login first
    await loginPage.login('ceo@example.com', 'demo123456')
    await dashboardPage.waitForDashboard()
    
    // Logout
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')
    
    await expect(page).toHaveURL(/.*login/)
    
    // Verify can't access protected routes
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*login/)
  })
})
```

### Multi-Tenant Isolation Tests

```typescript
// automation/e2e/multi-tenant/tenant-isolation.e2e.ts
import { test, expect } from '@playwright/test'
import { LoginPage } from '@/page-objects/login.page'
import { DashboardPage } from '@/page-objects/dashboard.page'

test.describe('Multi-Tenant Isolation', () => {
  test('FEMA tenant data should be isolated from SIGA tenant', async ({ browser }) => {
    // Create two browser contexts for different tenants
    const femaContext = await browser.newContext({
      baseURL: 'http://fema.localhost:3000'
    })
    const sigaContext = await browser.newContext({
      baseURL: 'http://siga.localhost:3000'
    })

    const femaPage = await femaContext.newPage()
    const sigaPage = await sigaContext.newPage()

    // Login to FEMA tenant
    const femaLogin = new LoginPage(femaPage)
    await femaLogin.navigate('/login')
    await femaLogin.login('fema.admin@example.com', 'demo123456')
    
    const femaDashboard = new DashboardPage(femaPage)
    await femaDashboard.waitForDashboard()
    const femaInitiatives = await femaDashboard.getInitiatives()

    // Login to SIGA tenant
    const sigaLogin = new LoginPage(sigaPage)
    await sigaLogin.navigate('/login')
    await sigaLogin.login('siga.admin@example.com', 'demo123456')
    
    const sigaDashboard = new DashboardPage(sigaPage)
    await sigaDashboard.waitForDashboard()
    const sigaInitiatives = await sigaDashboard.getInitiatives()

    // Verify data isolation
    expect(femaInitiatives).not.toEqual(sigaInitiatives)
    
    // Verify tenant-specific branding
    const femaLogo = await femaPage.locator('[data-testid="tenant-logo"]').getAttribute('src')
    const sigaLogo = await sigaPage.locator('[data-testid="tenant-logo"]').getAttribute('src')
    expect(femaLogo).not.toEqual(sigaLogo)

    await femaContext.close()
    await sigaContext.close()
  })

  test('should prevent cross-tenant data access via URL manipulation', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.navigate('/login')
    await loginPage.login('fema.user@example.com', 'demo123456')

    // Try to access SIGA tenant initiative directly
    await page.goto('/api/initiatives/siga-initiative-id')
    
    const response = await page.waitForResponse('**/api/initiatives/**')
    expect(response.status()).toBe(404)
  })

  test('should apply tenant-specific themes', async ({ page }) => {
    // Test SIGA theme
    await page.goto('http://siga.localhost:3000')
    const sigaTheme = await page.locator('body').getAttribute('data-theme')
    expect(sigaTheme).toBe('siga')
    
    const primaryColor = await page.evaluate(() => 
      getComputedStyle(document.documentElement).getPropertyValue('--primary-color')
    )
    expect(primaryColor).toContain('#FF6B35') // SIGA orange

    // Test FEMA theme
    await page.goto('http://fema.localhost:3000')
    const femaTheme = await page.locator('body').getAttribute('data-theme')
    expect(femaTheme).toBe('fema')
  })
})
```

### File Upload E2E Tests

```typescript
// automation/e2e/file-upload/okr-file-upload.e2e.ts
import { test, expect } from '@playwright/test'
import { LoginPage } from '@/page-objects/login.page'
import { FileUploadPage } from '@/page-objects/file-upload.page'
import path from 'path'

test.describe('OKR File Upload', () => {
  let loginPage: LoginPage
  let uploadPage: FileUploadPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    uploadPage = new FileUploadPage(page)
    
    await loginPage.navigate('/login')
    await loginPage.loginAsRole('manager')
    await page.goto('/upload')
  })

  test('should upload valid Excel file successfully', async ({ page }) => {
    const filePath = path.join(__dirname, '../../fixtures/files/valid-okr-data.xlsx')
    
    // Upload file
    await uploadPage.uploadFile(filePath)
    
    // Wait for processing
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible()
    
    // Wait for completion
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({
      timeout: 30000
    })
    
    // Verify preview
    const preview = await uploadPage.getPreviewData()
    expect(preview.objectives).toBeGreaterThan(0)
    expect(preview.initiatives).toBeGreaterThan(0)
    expect(preview.activities).toBeGreaterThan(0)
    
    // Confirm import
    await uploadPage.confirmImport()
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/)
    
    // Verify data imported
    const initiatives = await page.locator('[data-testid="initiative-card"]').count()
    expect(initiatives).toBeGreaterThan(0)
  })

  test('should reject invalid file types', async ({ page }) => {
    const filePath = path.join(__dirname, '../../fixtures/files/invalid-format.txt')
    
    await uploadPage.uploadFile(filePath)
    
    const error = await uploadPage.getError()
    expect(error).toContain('File type ".txt" not supported')
    
    // Upload area should still be visible
    await expect(page.locator('[data-testid="upload-dropzone"]')).toBeVisible()
  })

  test('should handle large file upload with progress', async ({ page }) => {
    const filePath = path.join(__dirname, '../../fixtures/files/large-file.xlsx')
    
    await uploadPage.uploadFile(filePath)
    
    // Progress bar should show
    const progressBar = page.locator('[data-testid="upload-progress-bar"]')
    await expect(progressBar).toBeVisible()
    
    // Progress should update
    let previousProgress = 0
    for (let i = 0; i < 5; i++) {
      const progress = await progressBar.getAttribute('aria-valuenow')
      const currentProgress = parseInt(progress || '0')
      expect(currentProgress).toBeGreaterThanOrEqual(previousProgress)
      previousProgress = currentProgress
      
      if (currentProgress === 100) break
      await page.waitForTimeout(1000)
    }
  })

  test('should validate Excel data before import', async ({ page }) => {
    const filePath = path.join(__dirname, '../../fixtures/files/invalid-data.xlsx')
    
    await uploadPage.uploadFile(filePath)
    
    // Wait for validation
    await expect(page.locator('[data-testid="validation-results"]')).toBeVisible()
    
    const errors = await uploadPage.getValidationErrors()
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('Row 3: Missing objective title')
    
    // Should show fix and retry option
    await expect(page.locator('[data-testid="download-template"]')).toBeVisible()
  })

  test('should support drag and drop upload', async ({ page }) => {
    const filePath = path.join(__dirname, '../../fixtures/files/valid-okr-data.xlsx')
    
    // Create a data transfer object
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer())
    
    // Read file and add to data transfer
    const file = await page.evaluateHandle(
      async (path) => {
        const response = await fetch(path)
        const data = await response.blob()
        return new File([data], 'okr-data.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
      },
      filePath
    )
    
    await page.evaluate(
      ([dt, f]) => { dt.items.add(f) },
      [dataTransfer, file]
    )
    
    // Simulate drag and drop
    const dropzone = page.locator('[data-testid="upload-dropzone"]')
    await dropzone.dispatchEvent('drop', { dataTransfer })
    
    // Verify file uploaded
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({
      timeout: 30000
    })
  })
})
```

### Role-Based Access Control Tests

```typescript
// automation/e2e/auth/role-based-access-control.e2e.ts
import { test, expect } from '@playwright/test'
import { LoginPage } from '@/page-objects/login.page'
import { DashboardPage } from '@/page-objects/dashboard.page'

test.describe('Role-Based Access Control', () => {
  let loginPage: LoginPage
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    dashboardPage = new DashboardPage(page)
  })

  test('CEO should have full access to all areas', async ({ page }) => {
    await loginPage.navigate('/login')
    await loginPage.loginAsRole('ceo')
    await dashboardPage.waitForDashboard()
    
    // Check CEO-specific features
    await expect(page.locator('[data-testid="strategic-overview"]')).toBeVisible()
    await expect(page.locator('[data-testid="all-areas-selector"]')).toBeVisible()
    
    // Can access all sections
    const sections = ['initiatives', 'objectives', 'areas', 'analytics', 'org-admin']
    for (const section of sections) {
      await page.goto(`/dashboard/${section}`)
      await expect(page).toHaveURL(new RegExp(section))
      await page.waitForLoadState('networkidle')
    }
    
    // Can see all areas in filter
    await page.goto('/dashboard')
    await page.click('[data-testid="area-filter"]')
    const areas = await page.locator('[data-testid="area-option"]').count()
    expect(areas).toBeGreaterThan(1)
  })

  test('Manager should only see their assigned area', async ({ page }) => {
    await loginPage.navigate('/login')
    await loginPage.loginAsRole('manager')
    await dashboardPage.waitForDashboard()
    
    // Should not see CEO features
    await expect(page.locator('[data-testid="strategic-overview"]')).not.toBeVisible()
    
    // Area filter should be disabled or show only one area
    const areaFilter = page.locator('[data-testid="area-filter"]')
    const isDisabled = await areaFilter.isDisabled()
    
    if (!isDisabled) {
      await areaFilter.click()
      const areas = await page.locator('[data-testid="area-option"]').count()
      expect(areas).toBe(1)
    }
    
    // Cannot access org-admin
    await page.goto('/org-admin')
    await expect(page).toHaveURL(/.*unauthorized|dashboard/)
  })

  test('Admin should have tenant-wide access', async ({ page }) => {
    await loginPage.navigate('/login')
    await loginPage.loginAsRole('admin')
    await dashboardPage.waitForDashboard()
    
    // Can access admin panel
    await page.goto('/org-admin')
    await expect(page).toHaveURL(/.*org-admin/)
    
    // Can manage users
    await expect(page.locator('[data-testid="users-management"]')).toBeVisible()
    
    // Can invite new users
    await page.click('[data-testid="invite-user-btn"]')
    await expect(page.locator('[data-testid="invite-form"]')).toBeVisible()
    
    // Can manage all areas
    await page.goto('/dashboard/areas')
    await page.click('[data-testid="create-area-btn"]')
    await expect(page.locator('[data-testid="area-form"]')).toBeVisible()
  })

  test('should enforce permission boundaries', async ({ page, context }) => {
    // Login as manager
    await loginPage.navigate('/login')
    await loginPage.loginAsRole('manager')
    
    // Try to access another manager's initiative via API
    const response = await context.request.get('/api/initiatives/other-manager-initiative-id')
    expect(response.status()).toBe(404)
    
    // Try to update another area's data
    const updateResponse = await context.request.patch('/api/areas/other-area-id', {
      data: { name: 'Hacked Area' }
    })
    expect(updateResponse.status()).toBe(403)
  })
})
```

### Visual Regression Tests

```typescript
// automation/e2e/visual/visual-regression.e2e.ts
import { test, expect } from '@playwright/test'
import { LoginPage } from '@/page-objects/login.page'

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.navigate('/login')
    await loginPage.loginAsRole('ceo')
  })

  test('dashboard should match visual snapshot', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Hide dynamic content
    await page.evaluate(() => {
      document.querySelectorAll('[data-testid*="timestamp"]').forEach(el => {
        el.textContent = '2025-01-01 00:00:00'
      })
    })
    
    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [page.locator('[data-testid="user-avatar"]')]
    })
  })

  test('initiative card should match snapshot', async ({ page }) => {
    await page.goto('/dashboard/initiatives')
    await page.waitForSelector('[data-testid="initiative-card"]')
    
    const card = page.locator('[data-testid="initiative-card"]').first()
    await expect(card).toHaveScreenshot('initiative-card.png')
  })

  test('mobile view should match snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true
    })
  })

  test('dark mode should match snapshot', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Toggle dark mode
    await page.click('[data-testid="theme-toggle"]')
    await page.waitForTimeout(500) // Wait for transition
    
    await expect(page).toHaveScreenshot('dashboard-dark.png', {
      fullPage: true
    })
  })
})
```

### Performance Tests

```typescript
// automation/e2e/performance/performance.e2e.ts
import { test, expect } from '@playwright/test'

test.describe('Performance Tests', () => {
  test('dashboard should load within performance budget', async ({ page }) => {
    // Start performance measurement
    await page.goto('/dashboard', { waitUntil: 'commit' })
    
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      }
    })
    
    // Assert performance metrics
    expect(metrics.firstContentfulPaint).toBeLessThan(2000) // FCP < 2s
    expect(metrics.domContentLoaded).toBeLessThan(3000) // DOM < 3s
    expect(metrics.loadComplete).toBeLessThan(5000) // Full load < 5s
  })

  test('should handle large dataset efficiently', async ({ page }) => {
    await page.goto('/dashboard/initiatives?limit=100')
    
    const startTime = Date.now()
    await page.waitForSelector('[data-testid="initiative-card"]')
    const loadTime = Date.now() - startTime
    
    expect(loadTime).toBeLessThan(3000)
    
    // Check if virtualization is working
    const visibleCards = await page.locator('[data-testid="initiative-card"]:visible').count()
    expect(visibleCards).toBeLessThan(20) // Should use virtualization
  })

  test('search should be responsive', async ({ page }) => {
    await page.goto('/dashboard')
    
    const searchInput = page.locator('[data-testid="search-input"]')
    
    // Measure search response time
    const startTime = Date.now()
    await searchInput.fill('test query')
    await page.waitForResponse('**/api/initiatives?*search=test*')
    const responseTime = Date.now() - startTime
    
    expect(responseTime).toBeLessThan(500)
  })
})
```

## Mobile Testing

### Mobile-Specific Tests

```typescript
// automation/e2e/mobile/mobile-experience.e2e.ts
import { test, expect, devices } from '@playwright/test'

test.use(devices['iPhone 12'])

test.describe('Mobile Experience', () => {
  test('should show mobile navigation menu', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Desktop nav should be hidden
    await expect(page.locator('[data-testid="desktop-nav"]')).not.toBeVisible()
    
    // Mobile menu button should be visible
    const menuButton = page.locator('[data-testid="mobile-menu-btn"]')
    await expect(menuButton).toBeVisible()
    
    // Open mobile menu
    await menuButton.click()
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
  })

  test('should handle touch gestures', async ({ page }) => {
    await page.goto('/dashboard/initiatives')
    
    const card = page.locator('[data-testid="initiative-card"]').first()
    
    // Swipe to reveal actions
    await card.dragTo(card, {
      sourcePosition: { x: 200, y: 50 },
      targetPosition: { x: 50, y: 50 }
    })
    
    await expect(page.locator('[data-testid="swipe-actions"]')).toBeVisible()
  })

  test('should adapt forms for mobile', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="create-initiative-btn"]')
    
    // Form should be full-screen on mobile
    const form = page.locator('[data-testid="initiative-form"]')
    const viewport = page.viewportSize()
    const formBox = await form.boundingBox()
    
    expect(formBox?.width).toBeCloseTo(viewport!.width, 10)
    
    // Date picker should use native input
    const dateInput = page.locator('[data-testid="due-date-input"]')
    const inputType = await dateInput.getAttribute('type')
    expect(inputType).toBe('date')
  })
})
```

## Accessibility Testing

### A11y Tests

```typescript
// automation/e2e/accessibility/a11y.e2e.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Tests', () => {
  test('dashboard should have no accessibility violations', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    
    expect(results.violations).toHaveLength(0)
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Tab through interactive elements
    await page.keyboard.press('Tab')
    const firstFocused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
    expect(firstFocused).toBeDefined()
    
    // Navigate with arrow keys
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    
    // Check focus is properly managed
    const currentFocus = await page.evaluate(() => document.activeElement?.tagName)
    expect(currentFocus).not.toBe('BODY')
  })

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check main navigation
    const nav = page.locator('nav[aria-label="Main navigation"]')
    await expect(nav).toBeVisible()
    
    // Check form inputs
    await page.click('[data-testid="create-initiative-btn"]')
    const titleInput = page.locator('input[aria-label="Initiative title"]')
    await expect(titleInput).toBeVisible()
    
    // Check buttons
    const saveButton = page.locator('button[aria-label="Save initiative"]')
    await expect(saveButton).toBeVisible()
  })

  test('should support screen readers', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check for skip navigation link
    const skipLink = page.locator('a[href="#main-content"]')
    await expect(skipLink).toHaveText('Skip to main content')
    
    // Check for proper heading hierarchy
    const h1 = await page.locator('h1').count()
    expect(h1).toBe(1)
    
    // Check for live regions
    const liveRegion = page.locator('[aria-live="polite"]')
    await expect(liveRegion).toHaveCount(1)
  })
})
```

## CI/CD Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: supabase/postgres
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 22
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright
        run: npx playwright install --with-deps
        
      - name: Setup test database
        run: npm run db:test:setup
        
      - name: Build application
        run: npm run build
        
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: automation/reports/playwright-report
          
      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: screenshots
          path: automation/reports/screenshots
```

## Best Practices

### E2E Testing Guidelines

1. **Use Page Objects**: Encapsulate page interactions
2. **Data-TestId Attributes**: Use stable selectors
3. **Wait Strategies**: Use proper wait conditions
4. **Test Isolation**: Each test should be independent
5. **Parallel Execution**: Tests should run in parallel
6. **Screenshots on Failure**: Capture state for debugging
7. **Retry Flaky Tests**: But fix the root cause

### Common Patterns

```typescript
// Waiting for API responses
await page.waitForResponse(
  response => response.url().includes('/api/initiatives') && response.status() === 200
)

// Custom wait conditions
await page.waitForFunction(
  () => document.querySelectorAll('[data-testid="initiative-card"]').length > 0
)

// Network interception
await page.route('**/api/initiatives', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ initiatives: mockData })
  })
})

// Console log monitoring
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.error('Page error:', msg.text())
  }
})
```

## Debugging E2E Tests

### Interactive Debugging

```bash
# Debug mode with inspector
npx playwright test --debug

# Headed mode to see browser
npx playwright test --headed

# Slow down execution
npx playwright test --slow-mo=1000

# Use Playwright Inspector
PWDEBUG=1 npx playwright test

# Generate test code
npx playwright codegen localhost:3000
```

### Trace Viewer

```bash
# Run with trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Examples](https://github.com/microsoft/playwright/tree/main/examples)
- [Debugging Guide](https://playwright.dev/docs/debug)

---

**Last Updated**: 2025-08-16  
**Next**: [Coverage Report](./coverage-report.md)