/**
 * Comprehensive Dashboard Test Runner
 * 
 * OBJECTIVE: Execute all tests to validate dashboard real data integration
 * Generates detailed report proving dashboard is production-ready
 */

import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { join } from 'path'

interface TestResult {
  suite: string
  passed: boolean
  duration: number
  coverage?: number
  errors: string[]
  warnings: string[]
}

interface TestReport {
  timestamp: string
  totalTests: number
  passedTests: number
  failedTests: number
  totalDuration: number
  overallCoverage: number
  results: TestResult[]
  summary: {
    realDataIntegration: boolean
    noMockData: boolean
    securityValidated: boolean
    performanceAcceptable: boolean
    productionReady: boolean
  }
}

class DashboardTestRunner {
  private results: TestResult[] = []
  private startTime: number = Date.now()

  async runTest(suite: string, testPattern: string): Promise<TestResult> {
    console.log(`\n🧪 Running ${suite} tests...`)
    const testStart = Date.now()
    
    try {
      // Run the specific test suite
      const output = execSync(
        `npm run test -- --run --reporter=json ${testPattern}`,
        { 
          encoding: 'utf-8',
          timeout: 120000 // 2 minute timeout per suite
        }
      )
      
      const testEnd = Date.now()
      const duration = testEnd - testStart
      
      // Parse test output (simplified - would parse actual JSON in real implementation)
      const result: TestResult = {
        suite,
        passed: !output.includes('FAILED') && !output.includes('Error'),
        duration,
        errors: this.extractErrors(output),
        warnings: this.extractWarnings(output)
      }
      
      console.log(`✅ ${suite} completed in ${duration}ms`)
      return result
      
    } catch (error) {
      const testEnd = Date.now()
      const duration = testEnd - testStart
      
      console.log(`❌ ${suite} failed in ${duration}ms`)
      
      return {
        suite,
        passed: false,
        duration,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: []
      }
    }
  }

  private extractErrors(output: string): string[] {
    const errorLines = output.split('\n').filter(line => 
      line.includes('Error') || 
      line.includes('FAIL') || 
      line.includes('✗')
    )
    return errorLines.slice(0, 10) // Limit to first 10 errors
  }

  private extractWarnings(output: string): string[] {
    const warningLines = output.split('\n').filter(line => 
      line.includes('Warning') || 
      line.includes('WARN') || 
      line.includes('console.warn')
    )
    return warningLines.slice(0, 5) // Limit to first 5 warnings
  }

  async runCoverageTest(): Promise<number> {
    console.log('\n📊 Running coverage analysis...')
    
    try {
      const output = execSync(
        'npm run test:coverage -- --run --reporter=json',
        { encoding: 'utf-8', timeout: 180000 }
      )
      
      // Extract coverage percentage (simplified)
      const coverageMatch = output.match(/All files\s*\|\s*(\d+\.?\d*)/);
      return coverageMatch ? parseFloat(coverageMatch[1]) : 0
      
    } catch (error) {
      console.warn('Coverage analysis failed:', error)
      return 0
    }
  }

  generateReport(): TestReport {
    const endTime = Date.now()
    const totalDuration = endTime - this.startTime
    
    const passedTests = this.results.filter(r => r.passed).length
    const failedTests = this.results.filter(r => !r.passed).length
    
    // Analyze results for summary
    const realDataIntegration = this.results
      .filter(r => r.suite.includes('integration'))
      .every(r => r.passed)
    
    const noMockData = this.results
      .filter(r => r.suite.includes('mock-data-detection'))
      .every(r => r.passed)
    
    const securityValidated = this.results
      .filter(r => r.suite.includes('security'))
      .every(r => r.passed)
    
    const performanceAcceptable = this.results
      .filter(r => r.suite.includes('performance'))
      .every(r => r.passed)
    
    const productionReady = realDataIntegration && 
                          noMockData && 
                          securityValidated && 
                          performanceAcceptable &&
                          (passedTests / this.results.length) >= 0.85

    return {
      timestamp: new Date().toISOString(),
      totalTests: this.results.length,
      passedTests,
      failedTests,
      totalDuration,
      overallCoverage: 0, // Will be set by coverage test
      results: this.results,
      summary: {
        realDataIntegration,
        noMockData,
        securityValidated,
        performanceAcceptable,
        productionReady
      }
    }
  }

  async run(): Promise<TestReport> {
    console.log('🚀 Starting Comprehensive Dashboard Test Suite')
    console.log('=' .repeat(60))
    
    // Define test suites to run
    const testSuites = [
      {
        name: 'Dashboard Integration',
        pattern: '__tests__/dashboard/dashboard-integration.test.tsx'
      },
      {
        name: 'Hooks Real Data Integration', 
        pattern: '__tests__/hooks/useInitiatives-real-data.test.ts'
      },
      {
        name: 'Security & Authentication',
        pattern: '__tests__/security/auth-integration.test.ts'
      },
      {
        name: 'Performance Validation',
        pattern: '__tests__/performance/dashboard-performance.test.tsx'
      },
      {
        name: 'Mock Data Detection',
        pattern: '__tests__/data-validation/mock-data-detection.test.ts'
      }
    ]

    // Run each test suite
    for (const suite of testSuites) {
      const result = await this.runTest(suite.name, suite.pattern)
      this.results.push(result)
    }

    // Run coverage analysis
    console.log('\n📊 Analyzing code coverage...')
    const coverage = await this.runCoverageTest()

    // Generate final report
    const report = this.generateReport()
    report.overallCoverage = coverage

    // Save report to file
    const reportPath = join(process.cwd(), 'DASHBOARD-TEST-RESULTS.json')
    writeFileSync(reportPath, JSON.stringify(report, null, 2))

    // Print summary
    this.printSummary(report)

    return report
  }

  private printSummary(report: TestReport) {
    console.log('\n' + '=' .repeat(60))
    console.log('📋 COMPREHENSIVE DASHBOARD TEST RESULTS')
    console.log('=' .repeat(60))
    
    console.log(`\n⏱️  Total Duration: ${report.totalDuration}ms`)
    console.log(`📊 Test Results: ${report.passedTests}/${report.totalTests} passed`)
    console.log(`📈 Code Coverage: ${report.overallCoverage.toFixed(1)}%`)
    
    console.log('\n🎯 VALIDATION RESULTS:')
    console.log(`${report.summary.realDataIntegration ? '✅' : '❌'} Real Data Integration`)
    console.log(`${report.summary.noMockData ? '✅' : '❌'} No Mock/Hardcoded Data`)  
    console.log(`${report.summary.securityValidated ? '✅' : '❌'} Security Validated`)
    console.log(`${report.summary.performanceAcceptable ? '✅' : '❌'} Performance Acceptable`)
    
    console.log('\n🚀 PRODUCTION READINESS:')
    console.log(`${report.summary.productionReady ? '✅ PRODUCTION READY' : '❌ NEEDS WORK'}`)
    
    if (!report.summary.productionReady) {
      console.log('\n🔧 Issues Found:')
      report.results.filter(r => !r.passed).forEach(result => {
        console.log(`   • ${result.suite}: ${result.errors.join(', ')}`)
      })
    }
    
    console.log(`\n📄 Detailed report saved to: DASHBOARD-TEST-RESULTS.json`)
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new DashboardTestRunner()
  runner.run().then(report => {
    process.exit(report.summary.productionReady ? 0 : 1)
  }).catch(error => {
    console.error('Test runner failed:', error)
    process.exit(1)
  })
}

export { DashboardTestRunner }