import { test, expect } from '@playwright/test';

test.describe('Areas Functionality', () => {
  test('should navigate to Areas page after login', async ({ page }) => {
    // Go to login page - use base URL from config
    await page.goto('/auth/login');
    
    // Wait for login form to be visible
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Login with CEO credentials
    await page.fill('#email', 'ceo_sega@example.com');
    await page.fill('#password', process.env.TEST_PASSWORD || 'secure-temp-password-please-change');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // Check that dashboard loaded successfully
    await expect(page.locator('h1').first()).toBeVisible();
    
    // Navigate to Areas page
    await page.click('a[href="/dashboard/areas"]');
    
    // Wait for Areas page to load
    await page.waitForURL('**/dashboard/areas', { timeout: 10000 });
    
    // Check that Areas page loaded successfully
    const pageTitle = await page.textContent('h1');
    expect(pageTitle).toBeTruthy();
    
    // Check that content loaded (areas or empty state)
    const hasContent = await page.locator('main').isVisible();
    expect(hasContent).toBeTruthy();
  });
});