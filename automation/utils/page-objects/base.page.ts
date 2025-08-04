/**
 * Base Page Object
 * 
 * Common functionality shared across all page objects for consistent
 * interaction patterns and utility methods.
 */

import { Page, Locator, expect } from '@playwright/test'

export abstract class BasePage {
  protected readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Navigate to a specific URL
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url)
  }

  /**
   * Wait for page to be loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout: number = 10000): Promise<Locator> {
    const element = this.page.locator(selector)
    await element.waitFor({ state: 'visible', timeout })
    return element
  }

  /**
   * Wait for element to be hidden
   */
  async waitForElementHidden(selector: string, timeout: number = 10000): Promise<void> {
    const element = this.page.locator(selector)
    await element.waitFor({ state: 'hidden', timeout })
  }

  /**
   * Click element with retry logic
   */
  async clickElement(selector: string, timeout: number = 10000): Promise<void> {
    const element = await this.waitForElement(selector, timeout)
    await element.click()
  }

  /**
   * Fill input field with value
   */
  async fillInput(selector: string, value: string): Promise<void> {
    const input = await this.waitForElement(selector)
    await input.fill(value)
  }

  /**
   * Select option from dropdown
   */
  async selectOption(selector: string, value: string): Promise<void> {
    const select = await this.waitForElement(selector)
    await select.selectOption(value)
  }

  /**
   * Upload file to input
   */
  async uploadFile(selector: string, filePath: string): Promise<void> {
    const fileInput = await this.waitForElement(selector)
    await fileInput.setInputFiles(filePath)
  }

  /**
   * Get element text content
   */
  async getElementText(selector: string): Promise<string> {
    const element = await this.waitForElement(selector)
    return await element.textContent() || ''
  }

  /**
   * Get element attribute value
   */
  async getElementAttribute(selector: string, attribute: string): Promise<string | null> {
    const element = await this.waitForElement(selector)
    return await element.getAttribute(attribute)
  }

  /**
   * Check if element is visible
   */
  async isElementVisible(selector: string): Promise<boolean> {
    try {
      const element = this.page.locator(selector)
      await element.waitFor({ state: 'visible', timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if element is enabled
   */
  async isElementEnabled(selector: string): Promise<boolean> {
    const element = await this.waitForElement(selector)
    return await element.isEnabled()
  }

  /**
   * Scroll element into view
   */
  async scrollToElement(selector: string): Promise<void> {
    const element = await this.waitForElement(selector)
    await element.scrollIntoViewIfNeeded()
  }

  /**
   * Take screenshot of element
   */
  async screenshotElement(selector: string, name: string): Promise<Buffer> {
    const element = await this.waitForElement(selector)
    return await element.screenshot({ path: `automation/reports/screenshots/${name}.png` })
  }

  /**
   * Wait for API response
   */
  async waitForApiResponse(urlPattern: string | RegExp, timeout: number = 30000): Promise<any> {
    const response = await this.page.waitForResponse(
      response => {
        const url = response.url()
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern)
        }
        return urlPattern.test(url)
      },
      { timeout }
    )
    return await response.json()
  }

  /**
   * Mock API response
   */
  async mockApiResponse(urlPattern: string | RegExp, response: any): Promise<void> {
    await this.page.route(urlPattern, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      })
    })
  }

  /**
   * Mock API error response
   */
  async mockApiError(urlPattern: string | RegExp, status: number, error: string): Promise<void> {
    await this.page.route(urlPattern, async route => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error })
      })
    })
  }

  /**
   * Wait for toast notification
   */
  async waitForToast(message?: string, timeout: number = 10000): Promise<Locator> {
    const toastSelector = '[data-testid="toast"], .toast, [role="alert"]'
    const toast = await this.waitForElement(toastSelector, timeout)
    
    if (message) {
      await expect(toast).toContainText(message)
    }
    
    return toast
  }

  /**
   * Wait for loading to finish
   */
  async waitForLoadingComplete(): Promise<void> {
    // Wait for common loading indicators to disappear
    const loadingSelectors = [
      '[data-testid="loading"]',
      '.loading',
      '.spinner',
      '[aria-label="Loading"]'
    ]

    for (const selector of loadingSelectors) {
      try {
        await this.page.locator(selector).waitFor({ state: 'hidden', timeout: 1000 })
      } catch {
        // Ignore if loading indicator doesn't exist
      }
    }
  }

  /**
   * Handle dialog/alert
   */
  async handleDialog(accept: boolean = true, text?: string): Promise<void> {
    this.page.on('dialog', async dialog => {
      if (text) {
        expect(dialog.message()).toContain(text)
      }
      if (accept) {
        await dialog.accept()
      } else {
        await dialog.dismiss()
      }
    })
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url()
  }

  /**
   * Go back in browser history
   */
  async goBack(): Promise<void> {
    await this.page.goBack()
  }

  /**
   * Reload the page
   */
  async reload(): Promise<void> {
    await this.page.reload()
  }

  /**
   * Set viewport size
   */
  async setViewportSize(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height })
  }

  /**
   * Hover over element
   */
  async hoverElement(selector: string): Promise<void> {
    const element = await this.waitForElement(selector)
    await element.hover()
  }

  /**
   * Double click element
   */
  async doubleClickElement(selector: string): Promise<void> {
    const element = await this.waitForElement(selector)
    await element.dblclick()
  }

  /**
   * Right click element
   */
  async rightClickElement(selector: string): Promise<void> {
    const element = await this.waitForElement(selector)
    await element.click({ button: 'right' })
  }

  /**
   * Press key
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key)
  }

  /**
   * Type text
   */
  async typeText(text: string): Promise<void> {
    await this.page.keyboard.type(text)
  }

  /**
   * Clear and type in input
   */
  async clearAndType(selector: string, text: string): Promise<void> {
    const input = await this.waitForElement(selector)
    await input.click()
    await this.page.keyboard.press('Control+A')
    await this.page.keyboard.type(text)
  }

  /**
   * Drag and drop
   */
  async dragAndDrop(sourceSelector: string, targetSelector: string): Promise<void> {
    const source = await this.waitForElement(sourceSelector)
    const target = await this.waitForElement(targetSelector)
    await source.dragTo(target)
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Get page title
   */
  async getPageTitle(): Promise<string> {
    return await this.page.title()
  }

  /**
   * Check if page has error
   */
  async hasPageError(): Promise<boolean> {
    const errorSelectors = [
      '[data-testid="error"]',
      '.error',
      '[role="alert"][aria-live="assertive"]'
    ]

    for (const selector of errorSelectors) {
      if (await this.isElementVisible(selector)) {
        return true
      }
    }
    return false
  }

  /**
   * Get console errors
   */
  getConsoleErrors(): string[] {
    const errors: string[] = []
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    return errors
  }
}