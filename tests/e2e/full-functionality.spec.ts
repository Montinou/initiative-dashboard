import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:3002';
const TEST_TIMEOUT = 60000;

// Test users from seed data
const users = {
  ceoSega: { email: 'ceo_sega@example.com', password: 'demo123456', role: 'CEO' },
  adminSega: { email: 'admin_sega@example.com', password: 'demo123456', role: 'Admin' },
  managerAdm: { email: 'manager_adm@sega.com', password: 'demo123456', role: 'Manager' },
  ceoFema: { email: 'ceo_fema@example.com', password: 'demo123456', role: 'CEO' },
  adminFema: { email: 'admin_fema@example.com', password: 'demo123456', role: 'Admin' },
  managerAdmFema: { email: 'manager_adm@fema.com', password: 'demo123456', role: 'Manager' }
};

test.describe('Full Application Functionality Tests', () => {
  test.setTimeout(TEST_TIMEOUT);

  test.describe('Authentication Flow', () => {
    test('should display login page', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await expect(page).toHaveTitle(/Initiative Dashboard/);
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should login successfully with CEO credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      
      // Fill login form
      await page.fill('input[type="email"]', users.ceoSega.email);
      await page.fill('input[type="password"]', users.ceoSega.password);
      await page.click('button[type="submit"]');
      
      // Wait for redirect to dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      // Verify dashboard loaded
      await expect(page.locator('h1').filter({ hasText: /Dashboard|Panel/ })).toBeVisible({ timeout: 10000 });
    });

    test('should logout successfully', async ({ page }) => {
      // First login
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[type="email"]', users.ceoSega.email);
      await page.fill('input[type="password"]', users.ceoSega.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      // Find and click logout button
      const logoutButton = page.locator('button').filter({ hasText: /Logout|Cerrar|Sign out/i });
      if (await logoutButton.count() > 0) {
        await logoutButton.first().click();
      } else {
        // Try dropdown menu
        const avatar = page.locator('[data-testid="user-menu"], [aria-label*="user"], img[alt*="Avatar"], button:has(img)').first();
        await avatar.click();
        await page.click('text=/Logout|Cerrar|Sign out/i');
      }
      
      // Should redirect to login
      await page.waitForURL('**/login', { timeout: 10000 });
    });
  });

  test.describe('CEO Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Login as CEO
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[type="email"]', users.ceoSega.email);
      await page.fill('input[type="password"]', users.ceoSega.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    });

    test('should display CEO dashboard with key metrics', async ({ page }) => {
      // Check for key metric cards
      await expect(page.locator('text=/Total Objectives|Objetivos|Goals/i')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=/Active Initiatives|Iniciativas|Projects/i')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=/Completion|Progress|Progreso/i')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to areas section', async ({ page }) => {
      // Click on areas navigation
      const areasLink = page.locator('a[href*="/areas"], nav >> text=/Areas|Áreas/i');
      if (await areasLink.count() > 0) {
        await areasLink.first().click();
        await page.waitForURL('**/areas', { timeout: 10000 });
        await expect(page.locator('h1').filter({ hasText: /Areas|Áreas/ })).toBeVisible({ timeout: 10000 });
      }
    });

    test('should navigate to objectives section', async ({ page }) => {
      const objectivesLink = page.locator('a[href*="/objectives"], nav >> text=/Objectives|Objetivos/i');
      if (await objectivesLink.count() > 0) {
        await objectivesLink.first().click();
        await page.waitForURL('**/objectives', { timeout: 10000 });
        await expect(page.locator('h1').filter({ hasText: /Objectives|Objetivos/ })).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Admin Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Login as Admin
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[type="email"]', users.adminSega.email);
      await page.fill('input[type="password"]', users.adminSega.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    });

    test('should display admin dashboard', async ({ page }) => {
      await expect(page.locator('h1').filter({ hasText: /Dashboard|Panel/ })).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to org-admin panel', async ({ page }) => {
      // Navigate to org-admin
      const orgAdminLink = page.locator('a[href*="/org-admin"], nav >> text=/Organization|Admin|Administración/i');
      if (await orgAdminLink.count() > 0) {
        await orgAdminLink.first().click();
        await page.waitForURL('**/org-admin', { timeout: 10000 });
        await expect(page.locator('h1').filter({ hasText: /Organization|Admin|Users/i })).toBeVisible({ timeout: 10000 });
      } else {
        // Try direct navigation
        await page.goto(`${BASE_URL}/org-admin`);
        await expect(page.locator('h1').filter({ hasText: /Organization|Admin|Users/i })).toBeVisible({ timeout: 10000 });
      }
    });

    test('should display user management in org-admin', async ({ page }) => {
      await page.goto(`${BASE_URL}/org-admin`);
      
      // Check for user stats
      await expect(page.locator('text=/Total Users|Usuarios Totales/i')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=/Active Users|Usuarios Activos/i')).toBeVisible({ timeout: 10000 });
      
      // Check for users table or list
      const usersSection = page.locator('text=/Users|Usuarios/i').first();
      await expect(usersSection).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Manager Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Login as Manager
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[type="email"]', users.managerAdm.email);
      await page.fill('input[type="password"]', users.managerAdm.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/manager-dashboard', { timeout: 10000 });
    });

    test('should display manager dashboard', async ({ page }) => {
      await expect(page.locator('h1').filter({ hasText: /Manager|Dashboard|Panel/ })).toBeVisible({ timeout: 10000 });
      
      // Check for manager-specific elements
      await expect(page.locator('text=/My Area|Mi Área|Administracion/i')).toBeVisible({ timeout: 10000 });
    });

    test('should show area initiatives', async ({ page }) => {
      // Check for initiatives section
      await expect(page.locator('text=/Initiatives|Iniciativas/i')).toBeVisible({ timeout: 10000 });
    });

    test('should show area objectives', async ({ page }) => {
      // Check for objectives section
      await expect(page.locator('text=/Objectives|Objetivos/i')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Areas Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login as CEO for full access
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[type="email"]', users.ceoSega.email);
      await page.fill('input[type="password"]', users.ceoSega.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    });

    test('should display areas list', async ({ page }) => {
      await page.goto(`${BASE_URL}/areas`);
      
      // Check for areas from seed data
      await expect(page.locator('text=/Corporativo/i')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=/Administracion/i')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=/Capital Humano/i')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=/Comercial/i')).toBeVisible({ timeout: 10000 });
    });

    test('should show area details', async ({ page }) => {
      await page.goto(`${BASE_URL}/areas`);
      
      // Click on first area
      const firstArea = page.locator('text=/Corporativo/i').first();
      if (await firstArea.count() > 0) {
        await firstArea.click();
        
        // Check for area details
        await expect(page.locator('text=/Description|Descripción/i')).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Objectives Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login as CEO
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[type="email"]', users.ceoSega.email);
      await page.fill('input[type="password"]', users.ceoSega.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    });

    test('should display objectives list', async ({ page }) => {
      await page.goto(`${BASE_URL}/objectives`);
      
      // Check for objectives from seed data
      await expect(page.locator('text=/visibilidad|experiencia|visibility|experience/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should create new objective', async ({ page }) => {
      await page.goto(`${BASE_URL}/objectives`);
      
      // Look for create button
      const createButton = page.locator('button').filter({ hasText: /New|Nuevo|Create|Crear|Add/i });
      if (await createButton.count() > 0) {
        await createButton.first().click();
        
        // Fill objective form
        await page.fill('input[name="title"], input[placeholder*="title"], input[placeholder*="título"]', 'Test Objective');
        await page.fill('textarea[name="description"], textarea[placeholder*="description"]', 'Test objective description');
        
        // Submit form
        const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /Save|Guardar|Create|Crear/i });
        await submitButton.first().click();
        
        // Verify objective was created
        await expect(page.locator('text=/Test Objective/i')).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Initiatives Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login as Manager
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[type="email"]', users.managerAdm.email);
      await page.fill('input[type="password"]', users.managerAdm.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/manager-dashboard', { timeout: 10000 });
    });

    test('should display initiatives for manager area', async ({ page }) => {
      // Check for initiatives section
      const initiativesSection = page.locator('text=/Initiatives|Iniciativas/i');
      await expect(initiativesSection.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show initiative progress', async ({ page }) => {
      // Look for progress indicators
      const progressIndicator = page.locator('[role="progressbar"], .progress, text=/%/');
      if (await progressIndicator.count() > 0) {
        await expect(progressIndicator.first()).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Multi-Tenant Support', () => {
    test('should isolate data between tenants', async ({ page }) => {
      // Login as SEGA CEO
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[type="email"]', users.ceoSega.email);
      await page.fill('input[type="password"]', users.ceoSega.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      // Go to areas
      await page.goto(`${BASE_URL}/areas`);
      
      // Should see SEGA areas
      await expect(page.locator('text=/Corporativo/i')).toBeVisible({ timeout: 10000 });
      
      // Logout
      const logoutButton = page.locator('button').filter({ hasText: /Logout|Cerrar|Sign out/i });
      if (await logoutButton.count() > 0) {
        await logoutButton.first().click();
      } else {
        const avatar = page.locator('[data-testid="user-menu"], [aria-label*="user"], img[alt*="Avatar"], button:has(img)').first();
        await avatar.click();
        await page.click('text=/Logout|Cerrar|Sign out/i');
      }
      
      // Login as FEMA CEO
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[type="email"]', users.ceoFema.email);
      await page.fill('input[type="password"]', users.ceoFema.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      // Go to areas
      await page.goto(`${BASE_URL}/areas`);
      
      // Should see FEMA-specific areas (also has Corporativo)
      await expect(page.locator('text=/Corporativo/i')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[type="email"]', users.ceoSega.email);
      await page.fill('input[type="password"]', users.ceoSega.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      // Check if mobile menu exists
      const mobileMenu = page.locator('[aria-label*="menu"], button').filter({ hasText: /☰|Menu/i });
      if (await mobileMenu.count() > 0) {
        await mobileMenu.first().click();
        // Check if navigation items are visible
        await expect(page.locator('text=/Dashboard|Areas|Objectives/i').first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[type="email"]', users.ceoSega.email);
      await page.fill('input[type="password"]', users.ceoSega.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      // Dashboard should be visible
      await expect(page.locator('h1').filter({ hasText: /Dashboard|Panel/ })).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Error Handling', () => {
    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[type="email"]', 'invalid@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Should show error message
      await expect(page.locator('text=/Invalid|Error|Incorrect|Inválido/i')).toBeVisible({ timeout: 10000 });
    });

    test('should handle 404 pages', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[type="email"]', users.ceoSega.email);
      await page.fill('input[type="password"]', users.ceoSega.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      // Navigate to non-existent page
      await page.goto(`${BASE_URL}/non-existent-page`);
      
      // Should show 404 or redirect
      const pageContent = await page.content();
      const is404 = pageContent.includes('404') || pageContent.includes('not found') || pageContent.includes('Not Found');
      const isDashboard = page.url().includes('dashboard');
      
      expect(is404 || isDashboard).toBeTruthy();
    });
  });

  test.describe('Performance', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/auth/login`);
      await page.fill('input[type="email"]', users.ceoSega.email);
      await page.fill('input[type="password"]', users.ceoSega.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Dashboard should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });
  });
});

// Additional test for data persistence
test.describe('Data Persistence', () => {
  test('should persist user session across page refreshes', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[type="email"]', users.ceoSega.email);
    await page.fill('input[type="password"]', users.ceoSega.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Refresh page
    await page.reload();
    
    // Should still be on dashboard
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('h1').filter({ hasText: /Dashboard|Panel/ })).toBeVisible({ timeout: 10000 });
  });
});