/**
 * File Upload Page Object
 * 
 * Page object for file upload functionality including OKR Excel upload,
 * drag-and-drop interactions, progress tracking, and result validation.
 */

import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base.page'
import path from 'path'

export class FileUploadPage extends BasePage {
  // Selectors
  private readonly uploadZone = '[data-testid="file-upload-zone"]'
  private readonly fileInput = 'input[type="file"][accept*=".xlsx"]'
  private readonly dragDropArea = '[data-testid="drag-drop-area"]'
  private readonly uploadButton = '[data-testid="upload-button"]'
  private readonly downloadTemplateButton = '[data-testid="download-template"]'
  private readonly progressBar = '[data-testid="upload-progress"]'
  private readonly progressPercentage = '[data-testid="progress-percentage"]'
  private readonly uploadStatus = '[data-testid="upload-status"]'
  private readonly uploadResult = '[data-testid="upload-result"]'
  private readonly errorMessage = '[data-testid="error-message"]'
  private readonly successMessage = '[data-testid="success-message"]'
  private readonly filePreview = '[data-testid="file-preview"]'
  private readonly fileName = '[data-testid="file-name"]'
  private readonly fileSize = '[data-testid="file-size"]'
  private readonly retryButton = '[data-testid="retry-button"]'
  private readonly clearButton = '[data-testid="clear-button"]'
  private readonly processingDetails = '[data-testid="processing-details"]'
  private readonly sheetDetails = '[data-testid="sheet-details"]'
  private readonly warningsList = '[data-testid="warnings-list"]'

  constructor(page: Page) {
    super(page)
  }

  /**
   * Navigate to file upload page
   */
  async navigateToUpload(): Promise<void> {
    await this.goto('/upload')
    await this.waitForPageLoad()
  }

  /**
   * Navigate to manager file upload page
   */
  async navigateToManagerUpload(): Promise<void> {
    await this.goto('/manager-dashboard/files')
    await this.waitForPageLoad()
  }

  /**
   * Check if upload zone is visible
   */
  async isUploadZoneVisible(): Promise<boolean> {
    return await this.isElementVisible(this.uploadZone)
  }

  /**
   * Click upload zone to open file dialog
   */
  async clickUploadZone(): Promise<void> {
    await this.clickElement(this.uploadZone)
  }

  /**
   * Upload file using file input
   */
  async uploadFileViaInput(fileName: string): Promise<void> {
    const filePath = path.join(process.cwd(), 'automation/fixtures/files', fileName)
    await this.uploadFile(this.fileInput, filePath)
  }

  /**
   * Upload file using drag and drop
   */
  async uploadFileViaDragDrop(fileName: string): Promise<void> {
    const filePath = path.join(process.cwd(), 'automation/fixtures/files', fileName)
    
    // Create file input element for testing
    await this.page.evaluate(() => {
      const input = document.createElement('input')
      input.type = 'file'
      input.style.display = 'none'
      document.body.appendChild(input)
    })

    await this.uploadFile('input[type="file"]', filePath)

    // Simulate drag and drop event
    const dragDropArea = await this.waitForElement(this.dragDropArea)
    
    await this.page.evaluate((selector) => {
      const dropArea = document.querySelector(selector)
      if (dropArea) {
        const event = new Event('drop')
        dropArea.dispatchEvent(event)
      }
    }, this.dragDropArea)
  }

  /**
   * Check if file is being uploaded (progress visible)
   */
  async isUploadInProgress(): Promise<boolean> {
    return await this.isElementVisible(this.progressBar)
  }

  /**
   * Get upload progress percentage
   */
  async getUploadProgress(): Promise<number> {
    const progressText = await this.getElementText(this.progressPercentage)
    return parseInt(progressText.replace('%', ''))
  }

  /**
   * Wait for upload to complete
   */
  async waitForUploadComplete(timeout: number = 60000): Promise<void> {
    await this.waitForElement(this.uploadResult, timeout)
    await this.waitForElementHidden(this.progressBar, timeout)
  }

  /**
   * Check if upload was successful
   */
  async isUploadSuccessful(): Promise<boolean> {
    return await this.isElementVisible(this.successMessage)
  }

  /**
   * Check if upload failed
   */
  async hasUploadError(): Promise<boolean> {
    return await this.isElementVisible(this.errorMessage)
  }

  /**
   * Get upload error message
   */
  async getErrorMessage(): Promise<string> {
    return await this.getElementText(this.errorMessage)
  }

  /**
   * Get success message
   */
  async getSuccessMessage(): Promise<string> {
    return await this.getElementText(this.successMessage)
  }

  /**
   * Get uploaded file name
   */
  async getUploadedFileName(): Promise<string> {
    return await this.getElementText(this.fileName)
  }

  /**
   * Get uploaded file size
   */
  async getUploadedFileSize(): Promise<string> {
    return await this.getElementText(this.fileSize)
  }

  /**
   * Get processing details
   */
  async getProcessingDetails(): Promise<{
    recordsProcessed: number
    sheetsProcessed: number
    savedInitiatives: number
  }> {
    const detailsElement = await this.waitForElement(this.processingDetails)
    const detailsText = await detailsElement.textContent()
    
    // Parse details from text (assuming format: "X records, Y sheets, Z initiatives")
    const recordsMatch = detailsText?.match(/(\d+)\s+records?/)
    const sheetsMatch = detailsText?.match(/(\d+)\s+sheets?/)
    const initiativesMatch = detailsText?.match(/(\d+)\s+initiatives?/)

    return {
      recordsProcessed: recordsMatch ? parseInt(recordsMatch[1]) : 0,
      sheetsProcessed: sheetsMatch ? parseInt(sheetsMatch[1]) : 0,
      savedInitiatives: initiativesMatch ? parseInt(initiativesMatch[1]) : 0
    }
  }

  /**
   * Get sheet processing details
   */
  async getSheetDetails(): Promise<Array<{ sheetName: string; recordCount: number }>> {
    const sheetDetailsElements = await this.page.locator(`${this.sheetDetails} [data-testid="sheet-item"]`).all()
    const details = []

    for (const element of sheetDetailsElements) {
      const sheetName = await element.locator('[data-testid="sheet-name"]').textContent()
      const recordCountText = await element.locator('[data-testid="record-count"]').textContent()
      const recordCount = parseInt(recordCountText?.match(/(\d+)/)?.[1] || '0')

      details.push({
        sheetName: sheetName || '',
        recordCount
      })
    }

    return details
  }

  /**
   * Get warnings list
   */
  async getWarnings(): Promise<string[]> {
    const warningElements = await this.page.locator(`${this.warningsList} [data-testid="warning-item"]`).all()
    const warnings = []

    for (const element of warningElements) {
      const warningText = await element.textContent()
      if (warningText) {
        warnings.push(warningText)
      }
    }

    return warnings
  }

  /**
   * Check if warnings are present
   */
  async hasWarnings(): Promise<boolean> {
    return await this.isElementVisible(this.warningsList)
  }

  /**
   * Click retry button
   */
  async clickRetry(): Promise<void> {
    await this.clickElement(this.retryButton)
  }

  /**
   * Click clear/reset button
   */
  async clickClear(): Promise<void> {
    await this.clickElement(this.clearButton)
  }

  /**
   * Download template file
   */
  async downloadTemplate(): Promise<void> {
    // Setup download handler
    const downloadPromise = this.page.waitForEvent('download')
    
    await this.clickElement(this.downloadTemplateButton)
    
    const download = await downloadPromise
    await download.saveAs(path.join(process.cwd(), 'automation/fixtures/downloads', 'template.xlsx'))
  }

  /**
   * Validate file type error
   */
  async validateFileTypeError(expectedMessage: string): Promise<void> {
    await expect(this.page.locator(this.errorMessage)).toContainText(expectedMessage)
  }

  /**
   * Validate file size error
   */
  async validateFileSizeError(expectedMessage: string): Promise<void> {
    await expect(this.page.locator(this.errorMessage)).toContainText(expectedMessage)
  }

  /**
   * Validate successful upload
   */
  async validateSuccessfulUpload(expectedFileName: string): Promise<void> {
    await expect(this.page.locator(this.successMessage)).toBeVisible()
    await expect(this.page.locator(this.fileName)).toContainText(expectedFileName)
  }

  /**
   * Wait for drag state to activate
   */
  async waitForDragActive(): Promise<void> {
    await this.page.locator('[data-drag-active="true"]').waitFor({ state: 'visible' })
  }

  /**
   * Wait for drag state to deactivate
   */
  async waitForDragInactive(): Promise<void> {
    await this.page.locator('[data-drag-active="true"]').waitFor({ state: 'hidden' })
  }

  /**
   * Simulate drag enter event
   */
  async simulateDragEnter(): Promise<void> {
    const dragArea = await this.waitForElement(this.dragDropArea)
    await dragArea.evaluate((element) => {
      const event = new DragEvent('dragenter', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      })
      element.dispatchEvent(event)
    })
  }

  /**
   * Simulate drag leave event
   */
  async simulateDragLeave(): Promise<void> {
    const dragArea = await this.waitForElement(this.dragDropArea)
    await dragArea.evaluate((element) => {
      const event = new DragEvent('dragleave', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      })
      element.dispatchEvent(event)
    })
  }

  /**
   * Check if file input is disabled during upload
   */
  async isFileInputDisabled(): Promise<boolean> {
    const input = await this.waitForElement(this.fileInput)
    return !(await input.isEnabled())
  }

  /**
   * Get current upload status message
   */
  async getUploadStatus(): Promise<string> {
    return await this.getElementText(this.uploadStatus)
  }

  /**
   * Wait for specific upload stage
   */
  async waitForUploadStage(stageName: string, timeout: number = 30000): Promise<void> {
    await this.page.locator(`[data-testid="upload-stage"][data-stage="${stageName}"]`)
      .waitFor({ state: 'visible', timeout })
  }

  /**
   * Verify upload result matches expected data
   */
  async verifyUploadResult(expectedResult: {
    fileName: string
    recordsProcessed: number
    sheetsProcessed: number
    savedInitiatives: number
    hasWarnings?: boolean
  }): Promise<void> {
    await this.waitForUploadComplete()
    
    expect(await this.isUploadSuccessful()).toBe(true)
    expect(await this.getUploadedFileName()).toContain(expectedResult.fileName)
    
    const details = await this.getProcessingDetails()
    expect(details.recordsProcessed).toBe(expectedResult.recordsProcessed)
    expect(details.sheetsProcessed).toBe(expectedResult.sheetsProcessed)
    expect(details.savedInitiatives).toBe(expectedResult.savedInitiatives)
    
    if (expectedResult.hasWarnings !== undefined) {
      expect(await this.hasWarnings()).toBe(expectedResult.hasWarnings)
    }
  }
}