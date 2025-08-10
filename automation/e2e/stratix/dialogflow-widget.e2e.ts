/**
 * Dialogflow CX Widget E2E Smoke Test
 * Verifies the new AI flow renders the Dialogflow Messenger widget
 * on the public test page without relying on the deprecated internal API.
 */

import { test, expect } from '@playwright/test'

const TEST_PAGE = '/test-ai'

// Helper to check if the Dialogflow bootstrap script is present
async function hasDialogflowScript(page: import('@playwright/test').Page) {
  const scripts = page.locator('script[src*="dialogflow-console/fast/messenger-cx/bootstrap.js"]')
  return (await scripts.count()) > 0
}

// Helper to check if the df-messenger web component is attached
async function hasDfMessenger(page: import('@playwright/test').Page) {
  const df = page.locator('df-messenger')
  return await df.isVisible()
}

// Optional: validate agent attributes rendered on the element
async function getDfMessengerAttributes(page: import('@playwright/test').Page) {
  const attrs = await page.evaluate(() => {
    const el = document.querySelector('df-messenger') as HTMLElement | null
    if (!el) return null
    return {
      projectId: el.getAttribute('project-id'),
      agentId: el.getAttribute('agent-id'),
      location: el.getAttribute('location'),
      language: el.getAttribute('language-code')
    }
  })
  return attrs
}

// Smoke suite
test.describe('Dialogflow CX Widget (new AI flow)', () => {
  test('renders on /test-ai and is visible', async ({ page }) => {
    await page.goto(TEST_PAGE)

    // Script should be present
    await expect.poll(async () => await hasDialogflowScript(page), {
      message: 'Dialogflow bootstrap script should be present',
      timeout: 10000
    }).toBeTruthy()

    // Widget element should render
    await expect(page.locator('df-messenger')).toBeVisible()

    // Attributes should match our config
    const attrs = await getDfMessengerAttributes(page)
    expect(attrs).toBeTruthy()
    expect(attrs?.location).toBe('us-central1')
    expect(attrs?.projectId).toBe('insaight-backend')
    expect(attrs?.agentId).toBe('7f297240-ca50-4896-8b71-e82fd707fa88')
  })

  test('does not call deprecated internal API', async ({ page }) => {
    let calledDeprecated = false
    await page.route('**/api/stratix/**', async route => {
      calledDeprecated = true
      await route.abort()
    })

    await page.goto(TEST_PAGE)

    // Give the widget a moment to initialize
    await page.waitForTimeout(2000)

    expect(calledDeprecated).toBe(false)
  })
})
