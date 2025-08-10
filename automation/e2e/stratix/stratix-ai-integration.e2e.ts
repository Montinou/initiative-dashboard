/**
 * Stratix AI Integration E2E Tests
 * 
 * Comprehensive end-to-end testing for Stratix AI assistant functionality
 * including chat interface, AI responses, streaming, and business intelligence features.
 */

import { test, expect } from '@playwright/test'
import { StratixAssistantPage } from '../../utils/page-objects/stratix-assistant.page'

test.describe('Stratix AI Integration (Dialogflow migration)', () => {
  let stratixPage: StratixAssistantPage

  test.beforeEach(async ({ page }) => {
    stratixPage = new StratixAssistantPage(page)
    await stratixPage.navigateToStratix()
  })

  test('should render Dialogflow widget on assistant page', async ({ page }) => {
    test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')
    await expect(page.locator('df-messenger')).toBeVisible()
  })

  test('should not call deprecated internal API', async ({ page }) => {
    const calls: string[] = []
    page.on('request', req => {
      if (req.url().includes('/api/stratix')) calls.push(req.url())
    })

    await stratixPage.navigateToStratix()
    expect(calls.length).toBe(0)
  })
})