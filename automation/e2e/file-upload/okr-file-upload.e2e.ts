/**
 * OKR File Upload E2E Tests
 * 
 * Comprehensive end-to-end testing for OKR Excel file upload functionality
 * including drag-and-drop, validation, progress tracking, and result display.
 */

import { test, expect } from '@playwright/test'
import { FileUploadPage } from '../../utils/page-objects/file-upload.page'

test.describe('OKR File Upload E2E Tests', () => {
  let fileUploadPage: FileUploadPage

  test.beforeEach(async ({ page }) => {
    fileUploadPage = new FileUploadPage(page)
    await fileUploadPage.navigateToUpload()
  })

  test.describe('Upload Interface', () => {
    test('should display upload zone with proper elements', async () => {
      // Verify upload zone is visible
      expect(await fileUploadPage.isUploadZoneVisible()).toBe(true)

      // Check for essential elements
      await expect(page.locator('[data-testid="file-upload-zone"]')).toBeVisible()
      await expect(page.locator('[data-testid="drag-drop-area"]')).toBeVisible()
      await expect(page.locator('[data-testid="download-template"]')).toBeVisible()
      
      // Verify instructions and file format information
      await expect(page.locator('text=Drag and drop')).toBeVisible()
      await expect(page.locator('text=.xlsx')).toBeVisible()
      await expect(page.locator('text=.xls')).toBeVisible()
      await expect(page.locator('text=Maximum file size')).toBeVisible()
    })

    test('should allow clicking to open file dialog', async ({ page }) => {
      // Setup file chooser handler
      const fileChooserPromise = page.waitForEvent('filechooser')
      
      await fileUploadPage.clickUploadZone()
      
      const fileChooser = await fileChooserPromise
      expect(fileChooser.isMultiple()).toBe(false)
      
      // Verify accepted file types
      const acceptedTypes = await page.locator('input[type="file"]').getAttribute('accept')
      expect(acceptedTypes).toContain('.xlsx')
      expect(acceptedTypes).toContain('.xls')
    })

    test('should download template file successfully', async ({ page }) => {
      // Mock successful template download
      await page.route('**/api/upload/okr-file/template', async route => {
        const buffer = Buffer.from('Mock Excel template content')
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="OKR_Template.xlsx"'
          },
          body: buffer
        })
      })

      const downloadPromise = page.waitForEvent('download')
      await page.click('[data-testid="download-template"]')
      
      const download = await downloadPromise
      expect(download.suggestedFilename()).toBe('OKR_Template.xlsx')
    })
  })

  test.describe('File Upload via Input', () => {
    test('should upload valid Excel file successfully', async ({ page }) => {
      // Mock successful upload response
      await page.route('**/api/upload/okr-file', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              uploadId: 'test-upload-123',
              fileName: 'valid-okr-data.xlsx',
              fileSize: 5000,
              recordsProcessed: 10,
              sheetsProcessed: 2,
              savedInitiatives: 8,
              errors: [],
              areaName: 'Marketing',
              timestamp: new Date().toISOString(),
              sheetDetails: [
                { sheetName: 'Q1 OKRs', recordCount: 5 },
                { sheetName: 'Q2 OKRs', recordCount: 5 }
              ]
            }
          })
        })
      })

      // Setup file chooser and upload
      const fileChooserPromise = page.waitForEvent('filechooser')
      await fileUploadPage.clickUploadZone()
      
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles('automation/fixtures/files/valid-okr-data.xlsx')

      // Wait for upload completion
      await fileUploadPage.waitForUploadComplete()

      // Verify successful upload
      expect(await fileUploadPage.isUploadSuccessful()).toBe(true)
      expect(await fileUploadPage.getUploadedFileName()).toContain('valid-okr-data.xlsx')

      // Verify processing details
      const details = await fileUploadPage.getProcessingDetails()
      expect(details.recordsProcessed).toBe(10)
      expect(details.sheetsProcessed).toBe(2)
      expect(details.savedInitiatives).toBe(8)

      // Verify sheet details
      const sheetDetails = await fileUploadPage.getSheetDetails()
      expect(sheetDetails).toHaveLength(2)
      expect(sheetDetails[0].sheetName).toBe('Q1 OKRs')
      expect(sheetDetails[0].recordCount).toBe(5)
    })

    test('should reject invalid file types', async ({ page }) => {
      // Mock validation error response
      await page.route('**/api/upload/okr-file', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'File type ".txt" not supported. Please upload Excel files (.xlsx or .xls) only.'
          })
        })
      })

      const fileChooserPromise = page.waitForEvent('filechooser')
      await fileUploadPage.clickUploadZone()
      
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles('automation/fixtures/files/invalid-format.txt')

      // Wait for error display
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      
      expect(await fileUploadPage.hasUploadError()).toBe(true)
      const errorMessage = await fileUploadPage.getErrorMessage()
      expect(errorMessage).toContain('File type ".txt" not supported')
    })

    test('should reject files exceeding size limit', async ({ page }) => {
      // Mock file size error
      await page.route('**/api/upload/okr-file', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'File too large. Maximum allowed size is 10MB.'
          })
        })
      })

      const fileChooserPromise = page.waitForEvent('filechooser')
      await fileUploadPage.clickUploadZone()
      
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles('automation/fixtures/files/large-file.xlsx')

      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      
      const errorMessage = await fileUploadPage.getErrorMessage()
      expect(errorMessage).toContain('File too large')
    })

    test('should handle upload with warnings', async ({ page }) => {
      // Mock upload with warnings
      await page.route('**/api/upload/okr-file', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              uploadId: 'test-upload-warnings',
              fileName: 'okr-with-warnings.xlsx',
              fileSize: 6000,
              recordsProcessed: 8,
              sheetsProcessed: 1,
              savedInitiatives: 6,
              errors: [
                'Row 3: Invalid date format detected',
                'Row 7: Progress value exceeds 100%',
                'Row 12: Missing objective description'
              ],
              areaName: 'Sales',
              timestamp: new Date().toISOString()
            }
          })
        })
      })

      const fileChooserPromise = page.waitForEvent('filechooser')
      await fileUploadPage.clickUploadZone()
      
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles('automation/fixtures/files/valid-okr-data.xlsx')

      await fileUploadPage.waitForUploadComplete()

      // Should still be successful
      expect(await fileUploadPage.isUploadSuccessful()).toBe(true)

      // But should show warnings
      expect(await fileUploadPage.hasWarnings()).toBe(true)
      const warnings = await fileUploadPage.getWarnings()
      expect(warnings).toHaveLength(3)
      expect(warnings[0]).toContain('Row 3: Invalid date format')
    })
  })

  test.describe('Drag and Drop Upload', () => {
    test('should handle drag enter and show visual feedback', async ({ page }) => {
      const dragArea = page.locator('[data-testid="drag-drop-area"]')
      
      // Simulate drag enter
      await dragArea.dispatchEvent('dragenter', {
        dataTransfer: {
          types: ['Files']
        }
      })

      // Should show active drag state
      await expect(page.locator('[data-drag-active="true"]')).toBeVisible()
    })

    test('should handle drag leave and remove visual feedback', async ({ page }) => {
      const dragArea = page.locator('[data-testid="drag-drop-area"]')
      
      // Simulate drag enter then leave
      await dragArea.dispatchEvent('dragenter')
      await dragArea.dispatchEvent('dragleave')

      // Should not show active drag state
      await expect(page.locator('[data-drag-active="true"]')).not.toBeVisible()
    })

    test('should upload file via drag and drop', async ({ page }) => {
      // Mock successful upload
      await page.route('**/api/upload/okr-file', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              uploadId: 'drag-drop-upload',
              fileName: 'dragged-file.xlsx',
              fileSize: 4000,
              recordsProcessed: 5,
              sheetsProcessed: 1,
              savedInitiatives: 3,
              errors: [],
              areaName: 'Operations',
              timestamp: new Date().toISOString()
            }
          })
        })
      })

      // Simulate file drop
      const dragArea = page.locator('[data-testid="drag-drop-area"]')
      
      // Create a file for dropping
      const fileContent = 'Mock Excel content'
      const dataList = await page.evaluateHandle((content) => {
        const dt = new DataTransfer()
        const file = new File([content], 'dragged-file.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        dt.items.add(file)
        return dt
      }, fileContent)

      await dragArea.dispatchEvent('drop', { dataTransfer: dataList })

      // Wait for upload completion
      await fileUploadPage.waitForUploadComplete()

      // Verify successful upload
      expect(await fileUploadPage.isUploadSuccessful()).toBe(true)
      expect(await fileUploadPage.getUploadedFileName()).toContain('dragged-file.xlsx')
    })
  })

  test.describe('Upload Progress Tracking', () => {
    test('should show progress during upload', async ({ page }) => {
      // Mock delayed upload response
      let resolveUpload: (value: any) => void
      const uploadPromise = new Promise(resolve => {
        resolveUpload = resolve
      })

      await page.route('**/api/upload/okr-file', async route => {
        // Wait for the promise to resolve
        const response = await uploadPromise
        await route.fulfill(response)
      })

      // Start upload
      const fileChooserPromise = page.waitForEvent('filechooser')
      await fileUploadPage.clickUploadZone()
      
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles('automation/fixtures/files/valid-okr-data.xlsx')

      // Should show progress indicators
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible()
      expect(await fileUploadPage.isUploadInProgress()).toBe(true)

      // File input should be disabled during upload
      expect(await fileUploadPage.isFileInputDisabled()).toBe(true)

      // Complete the upload
      resolveUpload!({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            uploadId: 'progress-test',
            fileName: 'test-progress.xlsx',
            fileSize: 5000,
            recordsProcessed: 10,
            sheetsProcessed: 1,
            savedInitiatives: 8,
            errors: [],
            areaName: 'Marketing',
            timestamp: new Date().toISOString()
          }
        })
      })

      await fileUploadPage.waitForUploadComplete()

      // Progress should be hidden
      expect(await fileUploadPage.isUploadInProgress()).toBe(false)
      
      // File input should be enabled again
      expect(await fileUploadPage.isFileInputDisabled()).toBe(false)
    })

    test('should show upload stages during processing', async ({ page }) => {
      // Mock upload with stage updates
      await page.route('**/api/upload/okr-file', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              uploadId: 'stages-test',
              fileName: 'stages-test.xlsx',
              fileSize: 7000,
              recordsProcessed: 15,
              sheetsProcessed: 2,
              savedInitiatives: 12,
              errors: [],
              areaName: 'Finance',
              timestamp: new Date().toISOString()
            }
          })
        })
      })

      const fileChooserPromise = page.waitForEvent('filechooser')
      await fileUploadPage.clickUploadZone()
      
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles('automation/fixtures/files/valid-okr-data.xlsx')

      // Should show different upload stages
      await fileUploadPage.waitForUploadStage('validating')
      await fileUploadPage.waitForUploadStage('processing')
      await fileUploadPage.waitForUploadStage('saving')

      await fileUploadPage.waitForUploadComplete()
      expect(await fileUploadPage.isUploadSuccessful()).toBe(true)
    })
  })

  test.describe('Error Handling and Recovery', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network error
      await page.route('**/api/upload/okr-file', async route => {
        await route.abort('failed')
      })

      const fileChooserPromise = page.waitForEvent('filechooser')
      await fileUploadPage.clickUploadZone()
      
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles('automation/fixtures/files/valid-okr-data.xlsx')

      // Should show error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      
      const errorMessage = await fileUploadPage.getErrorMessage()
      expect(errorMessage).toContain('Upload failed')

      // Should show retry button
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    })

    test('should allow retry after failure', async ({ page }) => {
      let failFirst = true

      await page.route('**/api/upload/okr-file', async route => {
        if (failFirst) {
          failFirst = false
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Server error occurred'
            })
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                uploadId: 'retry-success',
                fileName: 'retry-test.xlsx',
                fileSize: 4000,
                recordsProcessed: 5,
                sheetsProcessed: 1,
                savedInitiatives: 3,
                errors: [],
                areaName: 'Marketing',
                timestamp: new Date().toISOString()
              }
            })
          })
        }
      })

      // Initial upload should fail
      const fileChooserPromise = page.waitForEvent('filechooser')
      await fileUploadPage.clickUploadZone()
      
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles('automation/fixtures/files/valid-okr-data.xlsx')

      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()

      // Click retry
      await fileUploadPage.clickRetry()

      // Should succeed on retry
      await fileUploadPage.waitForUploadComplete()
      expect(await fileUploadPage.isUploadSuccessful()).toBe(true)
    })

    test('should allow clearing upload results', async ({ page }) => {
      // Mock successful upload
      await page.route('**/api/upload/okr-file', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              uploadId: 'clear-test',
              fileName: 'clear-test.xlsx',
              fileSize: 3000,
              recordsProcessed: 3,
              sheetsProcessed: 1,
              savedInitiatives: 2,
              errors: [],
              areaName: 'HR',
              timestamp: new Date().toISOString()
            }
          })
        })
      })

      // Upload file
      const fileChooserPromise = page.waitForEvent('filechooser')
      await fileUploadPage.clickUploadZone()
      
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles('automation/fixtures/files/valid-okr-data.xlsx')

      await fileUploadPage.waitForUploadComplete()
      expect(await fileUploadPage.isUploadSuccessful()).toBe(true)

      // Clear results
      await fileUploadPage.clickClear()

      // Results should be hidden
      await expect(page.locator('[data-testid="upload-result"]')).not.toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should support keyboard navigation', async ({ page }) => {
      // Tab to upload zone
      await page.keyboard.press('Tab')
      
      // Should focus on file input or upload zone
      const focused = await page.evaluate(() => document.activeElement?.tagName)
      expect(['INPUT', 'DIV', 'BUTTON']).toContain(focused)

      // Enter should trigger file dialog
      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.keyboard.press('Enter')
      
      const fileChooser = await fileChooserPromise
      expect(fileChooser).toBeDefined()
    })

    test('should have proper ARIA labels', async ({ page }) => {
      // Check for accessibility attributes
      await expect(page.locator('[data-testid="file-upload-zone"]')).toHaveAttribute('role')
      await expect(page.locator('input[type="file"]')).toHaveAttribute('accept')
      
      // Check for descriptive labels
      await expect(page.locator('label')).toBeVisible()
    })

    test('should provide screen reader compatible content', async ({ page }) => {
      // Check for screen reader text
      await expect(page.locator('[aria-label]')).toHaveCount({ min: 1 })
      await expect(page.locator('[aria-describedby]')).toHaveCount({ min: 0 })
    })
  })

  test.describe('Mobile Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      // Should still show upload interface
      expect(await fileUploadPage.isUploadZoneVisible()).toBe(true)

      // Touch interactions should work
      await page.tap('[data-testid="file-upload-zone"]')
      
      // File dialog should open
      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.tap('[data-testid="file-upload-zone"]')
      
      const fileChooser = await fileChooserPromise
      expect(fileChooser).toBeDefined()
    })
  })
})