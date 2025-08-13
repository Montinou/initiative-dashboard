import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

// Test configuration
const TEST_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 60000; // 60 seconds for file processing

// Test data files
const fixturesDir = path.join(__dirname, '../fixtures');

test.describe('OKR Import Complete Workflow', () => {
  let page: Page;
  let testFiles: Map<string, string>;

  test.beforeAll(async () => {
    // Ensure test files exist
    await fs.mkdir(fixturesDir, { recursive: true });
    
    testFiles = new Map();
    
    // Create test CSV files
    const smallCsv = `entity_type,title,description,priority,status,progress
objective,Q1 Revenue Target,Increase revenue by 20%,high,in_progress,45
objective,Customer Satisfaction,Improve NPS score,medium,planning,0
initiative,Launch New Product,New product line,Q1 Revenue Target,30
initiative,Marketing Campaign,Digital marketing push,Q1 Revenue Target,60
activity,Market Research,Conduct user research,Launch New Product,false
activity,Design Mockups,Create UI designs,Launch New Product,true`;
    
    const largeCsv = Array(100).fill(null)
      .map((_, i) => `objective,Objective ${i},Description ${i},medium,planning,${i}`)
      .join('\n');
    
    const invalidCsv = `entity_type,title,invalid_column
objective,Test,Invalid Data
objective,,Missing Title
initiative,Test,200`; // Invalid progress
    
    await fs.writeFile(path.join(fixturesDir, 'small-import.csv'), smallCsv);
    await fs.writeFile(path.join(fixturesDir, 'large-import.csv'), 
      `entity_type,title,description,priority,status,progress\n${largeCsv}`);
    await fs.writeFile(path.join(fixturesDir, 'invalid-import.csv'), invalidCsv);
    
    testFiles.set('small', path.join(fixturesDir, 'small-import.csv'));
    testFiles.set('large', path.join(fixturesDir, 'large-import.csv'));
    testFiles.set('invalid', path.join(fixturesDir, 'invalid-import.csv'));
  });

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Login as admin user
    await page.goto(`${TEST_URL}/login`);
    await page.fill('[name="email"]', 'admin@test.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should download and view template', async () => {
    // Navigate to import page
    await page.goto(`${TEST_URL}/dashboard/import`);
    
    // Test CSV template download
    const [csvDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Download CSV Template")'),
    ]);
    
    expect(csvDownload.suggestedFilename()).toContain('template.csv');
    
    // Test Excel template download
    const [excelDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Download Excel Template")'),
    ]);
    
    expect(excelDownload.suggestedFilename()).toContain('template.xlsx');
    
    // View template examples
    await page.click('button:has-text("View Examples")');
    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.locator('.modal')).toContainText('Example Data');
    await page.click('.modal button:has-text("Close")');
  });

  test('should upload and process small file synchronously', async () => {
    await page.goto(`${TEST_URL}/dashboard/import`);
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.get('small')!);
    
    // Should show file preview
    await expect(page.locator('.file-preview')).toBeVisible();
    await expect(page.locator('.file-preview')).toContainText('small-import.csv');
    await expect(page.locator('.file-preview')).toContainText('6 rows');
    
    // Click process button
    await page.click('button:has-text("Process File")');
    
    // Should show progress immediately for small file
    await expect(page.locator('.progress-bar')).toBeVisible();
    
    // Wait for completion (should be quick for small file)
    await expect(page.locator('.success-message')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.success-message')).toContainText('Successfully processed');
    
    // Check results summary
    await expect(page.locator('.results-summary')).toContainText('2 Objectives');
    await expect(page.locator('.results-summary')).toContainText('2 Initiatives');
    await expect(page.locator('.results-summary')).toContainText('2 Activities');
  });

  test('should upload and process large file asynchronously', async () => {
    await page.goto(`${TEST_URL}/dashboard/import`);
    
    // Upload large file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.get('large')!);
    
    // Should show file preview with warning
    await expect(page.locator('.file-preview')).toBeVisible();
    await expect(page.locator('.warning')).toContainText('Large file will be processed in background');
    
    // Click process button
    await page.click('button:has-text("Process File")');
    
    // Should show processing message
    await expect(page.locator('.processing-message')).toBeVisible();
    await expect(page.locator('.processing-message')).toContainText('Processing in background');
    
    // Should show real-time progress updates
    await expect(page.locator('.progress-percentage')).toBeVisible();
    
    // Wait for progress to start updating
    await page.waitForFunction(
      () => {
        const progress = document.querySelector('.progress-percentage');
        return progress && parseInt(progress.textContent || '0') > 0;
      },
      { timeout: 10000 }
    );
    
    // Monitor progress updates
    let previousProgress = 0;
    for (let i = 0; i < 10; i++) {
      const progressText = await page.locator('.progress-percentage').textContent();
      const currentProgress = parseInt(progressText?.replace('%', '') || '0');
      
      expect(currentProgress).toBeGreaterThanOrEqual(previousProgress);
      previousProgress = currentProgress;
      
      if (currentProgress === 100) break;
      await page.waitForTimeout(2000);
    }
    
    // Wait for completion
    await expect(page.locator('.success-message')).toBeVisible({ timeout: TEST_TIMEOUT });
    await expect(page.locator('.results-summary')).toContainText('100 Objectives');
  });

  test('should handle file with validation errors', async () => {
    await page.goto(`${TEST_URL}/dashboard/import`);
    
    // Upload invalid file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.get('invalid')!);
    
    // Process file
    await page.click('button:has-text("Process File")');
    
    // Should show errors
    await expect(page.locator('.error-summary')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.error-summary')).toContainText('validation errors');
    
    // Should show specific errors
    await expect(page.locator('.error-list')).toContainText('Missing Title');
    await expect(page.locator('.error-list')).toContainText('Invalid progress');
    
    // Should allow downloading error report
    const [errorReport] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Download Error Report")'),
    ]);
    
    expect(errorReport.suggestedFilename()).toContain('error-report');
  });

  test('should preview file before processing', async () => {
    await page.goto(`${TEST_URL}/dashboard/import`);
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.get('small')!);
    
    // Click preview button
    await page.click('button:has-text("Preview")');
    
    // Should show preview modal
    await expect(page.locator('.preview-modal')).toBeVisible();
    await expect(page.locator('.preview-modal')).toContainText('File Preview');
    
    // Should show data table
    await expect(page.locator('.preview-table')).toBeVisible();
    await expect(page.locator('.preview-table tbody tr')).toHaveCount(6);
    
    // Should show validation status
    await expect(page.locator('.validation-status')).toContainText('All rows valid');
    
    // Close preview and process
    await page.click('.preview-modal button:has-text("Process")');
    
    await expect(page.locator('.success-message')).toBeVisible({ timeout: 10000 });
  });

  test('should track import history', async () => {
    // First, do an import
    await page.goto(`${TEST_URL}/dashboard/import`);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.get('small')!);
    await page.click('button:has-text("Process File")');
    await expect(page.locator('.success-message')).toBeVisible({ timeout: 10000 });
    
    // Navigate to import history
    await page.click('a:has-text("View Import History")');
    await page.waitForURL('**/import/history');
    
    // Should show recent import
    await expect(page.locator('.history-table')).toBeVisible();
    await expect(page.locator('.history-table tbody tr').first()).toContainText('small-import.csv');
    await expect(page.locator('.history-table tbody tr').first()).toContainText('Completed');
    
    // Click on import to view details
    await page.click('.history-table tbody tr:first-child');
    
    // Should show import details
    await expect(page.locator('.import-details')).toBeVisible();
    await expect(page.locator('.import-details')).toContainText('Processing Summary');
    await expect(page.locator('.import-details')).toContainText('Total Rows: 6');
    await expect(page.locator('.import-details')).toContainText('Success: 6');
  });

  test('should handle concurrent imports', async () => {
    // Open two tabs
    const page2 = await page.context().newPage();
    
    // Navigate both to import page
    await page.goto(`${TEST_URL}/dashboard/import`);
    await page2.goto(`${TEST_URL}/dashboard/import`);
    
    // Upload different files simultaneously
    const fileInput1 = page.locator('input[type="file"]');
    const fileInput2 = page2.locator('input[type="file"]');
    
    await fileInput1.setInputFiles(testFiles.get('small')!);
    await fileInput2.setInputFiles(testFiles.get('large')!);
    
    // Process both files
    await Promise.all([
      page.click('button:has-text("Process File")'),
      page2.click('button:has-text("Process File")'),
    ]);
    
    // Both should process successfully
    await expect(page.locator('.processing-message, .success-message')).toBeVisible({ timeout: 10000 });
    await expect(page2.locator('.processing-message')).toBeVisible({ timeout: 10000 });
    
    // Check that both imports appear in history
    await page.goto(`${TEST_URL}/dashboard/import/history`);
    await page.waitForSelector('.history-table');
    
    const rows = await page.locator('.history-table tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(2);
    
    await page2.close();
  });

  test('should support drag and drop upload', async () => {
    await page.goto(`${TEST_URL}/dashboard/import`);
    
    // Create a DataTransfer to simulate drag and drop
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    
    // Read file content
    const fileContent = await fs.readFile(testFiles.get('small')!);
    
    // Add file to DataTransfer
    await page.evaluate(
      ({ dataTransfer, fileName, fileContent }) => {
        const file = new File([new Uint8Array(fileContent)], fileName, { type: 'text/csv' });
        dataTransfer.items.add(file);
      },
      { 
        dataTransfer, 
        fileName: 'small-import.csv',
        fileContent: Array.from(fileContent),
      }
    );
    
    // Simulate drag over
    const dropZone = page.locator('.drop-zone');
    await dropZone.dispatchEvent('dragover', { dataTransfer });
    
    // Should show drop indicator
    await expect(dropZone).toHaveClass(/drag-over/);
    
    // Simulate drop
    await dropZone.dispatchEvent('drop', { dataTransfer });
    
    // Should show file preview
    await expect(page.locator('.file-preview')).toBeVisible();
    await expect(page.locator('.file-preview')).toContainText('small-import.csv');
  });

  test('should validate file type and size', async () => {
    await page.goto(`${TEST_URL}/dashboard/import`);
    
    // Try to upload invalid file type
    const invalidFile = path.join(fixturesDir, 'test.pdf');
    await fs.writeFile(invalidFile, 'PDF content');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidFile);
    
    // Should show error
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Only CSV and Excel files are supported');
    
    // Try to upload file that's too large (mock)
    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input.files![0], 'size', { value: 100 * 1024 * 1024 }); // 100MB
    });
    
    await page.dispatchEvent('input[type="file"]', 'change');
    
    await expect(page.locator('.error-message')).toContainText('File size exceeds maximum');
  });

  test('should handle network interruptions gracefully', async () => {
    await page.goto(`${TEST_URL}/dashboard/import`);
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.get('small')!);
    
    // Simulate network interruption
    await page.context().setOffline(true);
    
    // Try to process
    await page.click('button:has-text("Process File")');
    
    // Should show error
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Network error');
    
    // Restore network
    await page.context().setOffline(false);
    
    // Retry should work
    await page.click('button:has-text("Retry")');
    await expect(page.locator('.success-message')).toBeVisible({ timeout: 10000 });
  });

  test('should export import results', async () => {
    // Do an import first
    await page.goto(`${TEST_URL}/dashboard/import`);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.get('small')!);
    await page.click('button:has-text("Process File")');
    await expect(page.locator('.success-message')).toBeVisible({ timeout: 10000 });
    
    // Export results
    const [resultsDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export Results")'),
    ]);
    
    expect(resultsDownload.suggestedFilename()).toContain('import-results');
    
    // Verify download content
    const downloadPath = await resultsDownload.path();
    if (downloadPath) {
      const content = await fs.readFile(downloadPath, 'utf-8');
      expect(content).toContain('Objectives: 2');
      expect(content).toContain('Initiatives: 2');
      expect(content).toContain('Activities: 2');
    }
  });
});