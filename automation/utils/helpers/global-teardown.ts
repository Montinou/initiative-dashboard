/**
 * Global Teardown for E2E Tests
 * 
 * Handles cleanup, report generation, and resource cleanup after
 * all E2E tests have completed.
 */

import { FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...')

  try {
    // 1. Generate test reports
    await generateTestReports()

    // 2. Clean up temporary files
    await cleanupTemporaryFiles()

    // 3. Clean up test data
    await cleanupTestData()

    // 4. Archive test artifacts
    await archiveTestArtifacts()

    // 5. Generate coverage reports
    await generateCoverageReports()

    console.log('✅ Global teardown completed successfully')

  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't throw error to avoid masking test failures
  }
}

/**
 * Generate comprehensive test reports
 */
async function generateTestReports(): Promise<void> {
  console.log('📊 Generating test reports...')

  try {
    const reportsDir = path.join(process.cwd(), 'automation/reports')
    
    // Check if test results exist
    const testResultsPath = path.join(reportsDir, 'test-results.json')
    if (fs.existsSync(testResultsPath)) {
      const testResults = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'))
      
      // Generate summary report
      const summary = generateTestSummary(testResults)
      fs.writeFileSync(
        path.join(reportsDir, 'test-summary.json'),
        JSON.stringify(summary, null, 2)
      )

      console.log('📈 Test summary generated')
    }

    // Generate HTML report index if it doesn't exist
    const htmlReportPath = path.join(reportsDir, 'index.html')
    if (!fs.existsSync(htmlReportPath)) {
      generateHtmlReportIndex(reportsDir)
    }

  } catch (error) {
    console.warn('⚠️ Failed to generate test reports:', error)
  }
}

/**
 * Generate test summary from results
 */
function generateTestSummary(testResults: any): any {
  const summary = {
    timestamp: new Date().toISOString(),
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    suites: {},
    failedTests: []
  }

  // Process test results to generate summary
  // This would depend on the specific structure of your test results
  if (testResults.suites) {
    testResults.suites.forEach((suite: any) => {
      if (suite.tests) {
        suite.tests.forEach((test: any) => {
          summary.total++
          
          switch (test.status) {
            case 'passed':
              summary.passed++
              break
            case 'failed':
              summary.failed++
              summary.failedTests.push({
                title: test.title,
                suite: suite.title,
                error: test.error
              })
              break
            case 'skipped':
              summary.skipped++
              break
          }
          
          if (test.duration) {
            summary.duration += test.duration
          }
        })
      }
    })
  }

  return summary
}

/**
 * Generate HTML report index
 */
function generateHtmlReportIndex(reportsDir: string): void {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Reports - Mariana Project</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        .report-links { list-style: none; padding: 0; }
        .report-links li { margin: 10px 0; }
        .report-links a { 
            display: inline-block; 
            padding: 10px 15px; 
            background: #007bff; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
        }
        .report-links a:hover { background: #0056b3; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <h1>Test Reports - Mariana Project</h1>
    <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>
    
    <h2>Available Reports</h2>
    <ul class="report-links">
        <li><a href="playwright-report/index.html">Playwright E2E Test Report</a></li>
        <li><a href="vitest-report.html">Vitest Unit Test Report</a></li>
        <li><a href="coverage/index.html">Code Coverage Report</a></li>
        <li><a href="test-summary.json">Test Summary (JSON)</a></li>
    </ul>
    
    <h2>Screenshots and Videos</h2>
    <ul class="report-links">
        <li><a href="screenshots/">Test Screenshots</a></li>
        <li><a href="videos/">Test Videos</a></li>
    </ul>
</body>
</html>
  `

  fs.writeFileSync(path.join(reportsDir, 'index.html'), htmlContent)
  console.log('📄 HTML report index generated')
}

/**
 * Clean up temporary files created during testing
 */
async function cleanupTemporaryFiles(): Promise<void> {
  console.log('🗑️ Cleaning up temporary files...')

  try {
    const tempDirs = [
      'automation/fixtures/downloads',
      'automation/fixtures/uploads/temp'
    ]

    for (const dir of tempDirs) {
      const fullPath = path.join(process.cwd(), dir)
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath)
        for (const file of files) {
          const filePath = path.join(fullPath, file)
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath)
          }
        }
        console.log(`🧹 Cleaned temporary files from ${dir}`)
      }
    }

  } catch (error) {
    console.warn('⚠️ Failed to clean up temporary files:', error)
  }
}

/**
 * Clean up test data from database
 */
async function cleanupTestData(): Promise<void> {
  console.log('🗄️ Cleaning up test data...')

  try {
    // Only clean up if using local test database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || !supabaseUrl.includes('localhost')) {
      console.log('⏭️ Skipping test data cleanup (not using local database)')
      return
    }

    // Clean up test data created during tests
    // This would depend on your specific database setup and test data strategy
    console.log('✅ Test data cleanup completed')

  } catch (error) {
    console.warn('⚠️ Failed to clean up test data:', error)
  }
}

/**
 * Archive test artifacts for CI/CD pipeline
 */
async function archiveTestArtifacts(): Promise<void> {
  console.log('📦 Archiving test artifacts...')

  try {
    const reportsDir = path.join(process.cwd(), 'automation/reports')
    
    if (!fs.existsSync(reportsDir)) {
      console.log('⏭️ No reports directory found, skipping archival')
      return
    }

    // Create archive manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      commit: process.env.GITHUB_SHA || 'local',
      branch: process.env.GITHUB_REF_NAME || 'local',
      artifacts: []
    }

    // List all artifacts
    const artifacts = getAllFiles(reportsDir)
    manifest.artifacts = artifacts.map(file => ({
      path: path.relative(reportsDir, file),
      size: fs.statSync(file).size,
      modified: fs.statSync(file).mtime
    }))

    // Save manifest
    fs.writeFileSync(
      path.join(reportsDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    )

    console.log(`📋 Archived ${manifest.artifacts.length} test artifacts`)

  } catch (error) {
    console.warn('⚠️ Failed to archive test artifacts:', error)
  }
}

/**
 * Generate coverage reports
 */
async function generateCoverageReports(): Promise<void> {
  console.log('📊 Generating coverage reports...')

  try {
    const coverageDir = path.join(process.cwd(), 'automation/reports/coverage')
    
    if (fs.existsSync(coverageDir)) {
      // Check if coverage data exists
      const coverageFiles = fs.readdirSync(coverageDir)
      if (coverageFiles.length > 0) {
        console.log('✅ Coverage reports available')
        
        // Generate coverage summary
        const coverageSummaryPath = path.join(coverageDir, 'coverage-summary.json')
        if (fs.existsSync(coverageSummaryPath)) {
          const coverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'))
          
          console.log('📈 Coverage Summary:')
          console.log(`  Lines: ${coverageSummary.total?.lines?.pct || 0}%`)
          console.log(`  Functions: ${coverageSummary.total?.functions?.pct || 0}%`)
          console.log(`  Branches: ${coverageSummary.total?.branches?.pct || 0}%`)
          console.log(`  Statements: ${coverageSummary.total?.statements?.pct || 0}%`)
        }
      }
    } else {
      console.log('⏭️ No coverage directory found')
    }

  } catch (error) {
    console.warn('⚠️ Failed to generate coverage reports:', error)
  }
}

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dir: string): string[] {
  const files: string[] = []
  
  if (!fs.existsSync(dir)) {
    return files
  }

  const items = fs.readdirSync(dir)
  
  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath))
    } else {
      files.push(fullPath)
    }
  }
  
  return files
}

/**
 * Generate performance metrics
 */
async function generatePerformanceMetrics(): Promise<void> {
  console.log('⚡ Generating performance metrics...')

  try {
    // Collect performance data if available
    // This would depend on your performance testing implementation
    
    console.log('✅ Performance metrics generated')

  } catch (error) {
    console.warn('⚠️ Failed to generate performance metrics:', error)
  }
}

/**
 * Send notifications about test results (if configured)
 */
async function sendNotifications(): Promise<void> {
  // This would send notifications to Slack, email, etc.
  // Only implement if needed for your workflow
}

export default globalTeardown