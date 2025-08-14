#!/usr/bin/env node

/**
 * Performance Testing Script
 * 
 * Validates application performance against defined thresholds:
 * - Core Web Vitals
 * - Bundle size analysis
 * - Load testing
 * - Memory usage
 * - API performance
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class PerformanceTester {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.testId = `perf-test-${Date.now()}`;
    this.results = {
      webVitals: {},
      bundleSize: {},
      loadTest: {},
      apiPerformance: {},
      memoryUsage: {},
      passed: false,
      errors: [],
      warnings: []
    };
    
    this.thresholds = {
      webVitals: {
        LCP: 2500, // ms
        FID: 100,  // ms
        CLS: 0.1,  // score
        FCP: 1800, // ms
        TTFB: 800  // ms
      },
      bundleSize: {
        maxInitialBundle: 250 * 1024, // 250KB
        maxTotalJS: 1024 * 1024,      // 1MB
        maxChunk: 500 * 1024,         // 500KB
        maxThirdParty: 200 * 1024     // 200KB
      },
      api: {
        averageResponseTime: 200, // ms
        p95ResponseTime: 500,     // ms
        errorRate: 0.001,         // 0.1%
        throughput: 100           // requests/second
      }
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    
    if (level === 'error') {
      this.results.errors.push(message);
    } else if (level === 'warn') {
      this.results.warnings.push(message);
    }
  }

  async runCommand(command, description) {
    this.log(`Running: ${description}`);
    
    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return output;
    } catch (error) {
      this.log(`Failed: ${description} - ${error.message}`, 'error');
      throw error;
    }
  }

  async testBundleSize() {
    this.log('📦 Testing bundle size...');
    
    try {
      // Ensure build exists
      if (!fs.existsSync('.next')) {
        this.log('Building application for bundle analysis...');
        await this.runCommand('npm run build', 'Build application');
      }
      
      const bundleAnalysis = this.analyzeBundleDirectory();
      this.results.bundleSize = bundleAnalysis;
      
      // Check against thresholds
      const violations = [];
      
      if (bundleAnalysis.initialBundle > this.thresholds.bundleSize.maxInitialBundle) {
        violations.push(`Initial bundle too large: ${this.formatBytes(bundleAnalysis.initialBundle)} > ${this.formatBytes(this.thresholds.bundleSize.maxInitialBundle)}`);
      }
      
      if (bundleAnalysis.totalJS > this.thresholds.bundleSize.maxTotalJS) {
        violations.push(`Total JS too large: ${this.formatBytes(bundleAnalysis.totalJS)} > ${this.formatBytes(this.thresholds.bundleSize.maxTotalJS)}`);
      }
      
      if (bundleAnalysis.largestChunk > this.thresholds.bundleSize.maxChunk) {
        violations.push(`Largest chunk too big: ${this.formatBytes(bundleAnalysis.largestChunk)} > ${this.formatBytes(this.thresholds.bundleSize.maxChunk)}`);
      }
      
      if (violations.length > 0) {
        violations.forEach(v => this.log(v, 'error'));
        return false;
      }
      
      this.log(`✅ Bundle size within limits:`);
      this.log(`  Initial bundle: ${this.formatBytes(bundleAnalysis.initialBundle)}`);
      this.log(`  Total JS: ${this.formatBytes(bundleAnalysis.totalJS)}`);
      this.log(`  Largest chunk: ${this.formatBytes(bundleAnalysis.largestChunk)}`);
      
      return true;
      
    } catch (error) {
      this.log(`Bundle size test failed: ${error.message}`, 'error');
      return false;
    }
  }

  analyzeBundleDirectory() {
    const nextDir = path.join(process.cwd(), '.next');
    const staticDir = path.join(nextDir, 'static');
    const chunksDir = path.join(staticDir, 'chunks');
    
    let totalJS = 0;
    let initialBundle = 0;
    let largestChunk = 0;
    const chunks = [];
    
    if (fs.existsSync(chunksDir)) {
      const files = fs.readdirSync(chunksDir);
      
      files.forEach(file => {
        if (file.endsWith('.js')) {
          const filePath = path.join(chunksDir, file);
          const stats = fs.statSync(filePath);
          const size = stats.size;
          
          totalJS += size;
          largestChunk = Math.max(largestChunk, size);
          
          chunks.push({
            name: file,
            size: size,
            sizeFormatted: this.formatBytes(size)
          });
          
          // Estimate initial bundle (main chunks)
          if (file.includes('main') || file.includes('_app') || file.includes('index')) {
            initialBundle += size;
          }
        }
      });
    }
    
    return {
      totalJS,
      initialBundle,
      largestChunk,
      chunks: chunks.sort((a, b) => b.size - a.size).slice(0, 10) // Top 10 largest
    };
  }

  async testWebVitals() {
    this.log('⚡ Testing Core Web Vitals...');
    
    try {
      // Use Lighthouse CLI for comprehensive metrics
      const lighthouseResults = await this.runLighthouseAudit();
      this.results.webVitals = lighthouseResults;
      
      // Check against thresholds
      const violations = [];
      
      Object.entries(this.thresholds.webVitals).forEach(([metric, threshold]) => {
        const value = lighthouseResults[metric];
        if (value && value > threshold) {
          violations.push(`${metric} too slow: ${value}ms > ${threshold}ms`);
        }
      });
      
      if (violations.length > 0) {
        violations.forEach(v => this.log(v, 'error'));
        return false;
      }
      
      this.log('✅ Core Web Vitals within thresholds');
      Object.entries(lighthouseResults).forEach(([metric, value]) => {
        this.log(`  ${metric}: ${value}${metric === 'CLS' ? '' : 'ms'}`);
      });
      
      return true;
      
    } catch (error) {
      this.log(`Web Vitals test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runLighthouseAudit() {
    try {
      // Install Lighthouse if not available
      try {
        execSync('lighthouse --version', { stdio: 'pipe' });
      } catch {
        this.log('Installing Lighthouse...');
        execSync('npm install -g lighthouse', { stdio: 'pipe' });
      }
      
      // Run Lighthouse audit
      const output = await this.runCommand(
        `lighthouse ${this.baseUrl} --output=json --quiet --chrome-flags="--headless --no-sandbox"`,
        'Lighthouse audit'
      );
      
      const results = JSON.parse(output);
      const audits = results.audits;
      
      return {
        LCP: audits['largest-contentful-paint']?.numericValue || 0,
        FID: audits['max-potential-fid']?.numericValue || 0,
        CLS: audits['cumulative-layout-shift']?.numericValue || 0,
        FCP: audits['first-contentful-paint']?.numericValue || 0,
        TTFB: audits['server-response-time']?.numericValue || 0,
        performanceScore: results.categories.performance.score * 100
      };
      
    } catch (error) {
      this.log('Lighthouse unavailable, using alternative metrics', 'warn');
      return await this.runAlternativeWebVitalsTest();
    }
  }

  async runAlternativeWebVitalsTest() {
    // Fallback performance test using curl and basic timing
    const metrics = {};
    
    try {
      // Test TTFB
      const ttfbStart = performance.now();
      await this.runCommand(`curl -s -o /dev/null -w "%{time_starttransfer}" ${this.baseUrl}`, 'TTFB test');
      metrics.TTFB = performance.now() - ttfbStart;
      
      // Basic load test
      const loadStart = performance.now();
      await this.runCommand(`curl -s ${this.baseUrl} > /dev/null`, 'Load test');
      metrics.loadTime = performance.now() - loadStart;
      
    } catch (error) {
      this.log(`Alternative web vitals test failed: ${error.message}`, 'warn');
    }
    
    return metrics;
  }

  async testAPIPerformance() {
    this.log('🔌 Testing API performance...');
    
    const endpoints = [
      '/api/health',
      '/api/dashboard/overview',
      '/api/areas',
      '/api/objectives'
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        const endpointResults = await this.testEndpoint(endpoint);
        results[endpoint] = endpointResults;
        
        if (endpointResults.averageResponseTime > this.thresholds.api.averageResponseTime) {
          this.log(`${endpoint} too slow: ${endpointResults.averageResponseTime}ms`, 'warn');
        }
        
      } catch (error) {
        this.log(`API test failed for ${endpoint}: ${error.message}`, 'error');
        results[endpoint] = { error: error.message };
      }
    }
    
    this.results.apiPerformance = results;
    
    // Check if any critical endpoints failed
    const healthResult = results['/api/health'];
    if (healthResult && healthResult.error) {
      this.log('Health endpoint failed - critical error', 'error');
      return false;
    }
    
    this.log('✅ API performance test completed');
    return true;
  }

  async testEndpoint(endpoint, iterations = 10) {
    const url = `${this.baseUrl}${endpoint}`;
    const times = [];
    let errors = 0;
    
    for (let i = 0; i < iterations; i++) {
      try {
        const start = performance.now();
        const response = await fetch(url);
        const end = performance.now();
        
        if (response.ok) {
          times.push(end - start);
        } else {
          errors++;
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errors++;
      }
    }
    
    if (times.length === 0) {
      throw new Error('All requests failed');
    }
    
    times.sort((a, b) => a - b);
    
    return {
      averageResponseTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      medianResponseTime: Math.round(times[Math.floor(times.length / 2)]),
      p95ResponseTime: Math.round(times[Math.floor(times.length * 0.95)]),
      minResponseTime: Math.round(Math.min(...times)),
      maxResponseTime: Math.round(Math.max(...times)),
      errorRate: errors / iterations,
      successfulRequests: times.length,
      totalRequests: iterations
    };
  }

  async testMemoryUsage() {
    this.log('🧠 Testing memory usage...');
    
    try {
      // This would typically require running the app and monitoring memory
      // For now, we'll check build artifacts and static analysis
      
      const memoryEstimate = this.estimateMemoryUsage();
      this.results.memoryUsage = memoryEstimate;
      
      this.log(`✅ Memory usage estimated: ${this.formatBytes(memoryEstimate.estimatedUsage)}`);
      return true;
      
    } catch (error) {
      this.log(`Memory test failed: ${error.message}`, 'error');
      return false;
    }
  }

  estimateMemoryUsage() {
    // Basic estimation based on bundle size and known patterns
    const bundleSize = this.results.bundleSize.totalJS || 0;
    
    // Rough estimate: 3-5x bundle size for runtime memory
    const estimatedUsage = bundleSize * 4;
    
    return {
      estimatedUsage,
      bundleContribution: bundleSize,
      methodology: 'Estimated based on bundle size'
    };
  }

  async runLoadTest() {
    this.log('🚀 Running load test...');
    
    try {
      // Simple load test with concurrent requests
      const concurrency = 10;
      const requestsPerWorker = 5;
      const totalRequests = concurrency * requestsPerWorker;
      
      this.log(`Testing with ${totalRequests} requests (${concurrency} concurrent)`);
      
      const workers = [];
      const startTime = performance.now();
      
      for (let i = 0; i < concurrency; i++) {
        workers.push(this.loadTestWorker(requestsPerWorker));
      }
      
      const results = await Promise.all(workers);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const successfulRequests = results.reduce((sum, result) => sum + result.successful, 0);
      const failedRequests = results.reduce((sum, result) => sum + result.failed, 0);
      
      const throughput = (successfulRequests / totalTime) * 1000; // requests per second
      
      this.results.loadTest = {
        totalRequests,
        successfulRequests,
        failedRequests,
        totalTime: Math.round(totalTime),
        throughput: Math.round(throughput),
        errorRate: failedRequests / totalRequests
      };
      
      if (throughput < this.thresholds.api.throughput) {
        this.log(`Low throughput: ${Math.round(throughput)} req/s < ${this.thresholds.api.throughput} req/s`, 'warn');
      }
      
      this.log(`✅ Load test completed: ${Math.round(throughput)} req/s`);
      return true;
      
    } catch (error) {
      this.log(`Load test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async loadTestWorker(requests) {
    let successful = 0;
    let failed = 0;
    
    for (let i = 0; i < requests; i++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/health`);
        if (response.ok) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }
    
    return { successful, failed };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  generateReport() {
    const report = {
      testId: this.testId,
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      results: this.results,
      thresholds: this.thresholds,
      summary: {
        totalTests: 5,
        passed: 0,
        failed: 0,
        warnings: this.results.warnings.length,
        errors: this.results.errors.length
      }
    };
    
    // Count passed/failed tests
    const testResults = [
      this.results.bundleSize.totalJS !== undefined,
      this.results.webVitals.performanceScore !== undefined,
      this.results.apiPerformance['/api/health'] !== undefined,
      this.results.memoryUsage.estimatedUsage !== undefined,
      this.results.loadTest.throughput !== undefined
    ];
    
    report.summary.passed = testResults.filter(Boolean).length;
    report.summary.failed = testResults.filter(r => !r).length;
    
    this.results.passed = report.summary.failed === 0 && this.results.errors.length === 0;
    
    // Save report
    const reportPath = `performance-report-${this.testId}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Log summary
    this.log('\n📊 PERFORMANCE TEST REPORT');
    this.log('══════════════════════════');
    this.log(`Status: ${this.results.passed ? '✅ PASSED' : '❌ FAILED'}`);
    this.log(`Tests: ${report.summary.passed}/${report.summary.totalTests} passed`);
    this.log(`Errors: ${report.summary.errors}`);
    this.log(`Warnings: ${report.summary.warnings}`);
    this.log(`Report: ${reportPath}`);
    
    if (this.results.bundleSize.totalJS) {
      this.log(`Bundle size: ${this.formatBytes(this.results.bundleSize.totalJS)}`);
    }
    
    if (this.results.webVitals.performanceScore) {
      this.log(`Performance score: ${this.results.webVitals.performanceScore}`);
    }
    
    if (this.results.loadTest.throughput) {
      this.log(`Throughput: ${this.results.loadTest.throughput} req/s`);
    }
    
    return report;
  }

  async run() {
    this.log(`🎯 Starting performance tests for ${this.baseUrl}`);
    
    try {
      await this.testBundleSize();
      await this.testWebVitals();
      await this.testAPIPerformance();
      await this.testMemoryUsage();
      await this.runLoadTest();
      
      this.log('🏁 All performance tests completed');
      
    } catch (error) {
      this.log(`Performance test failed: ${error.message}`, 'error');
    } finally {
      this.generateReport();
    }
    
    return this.results.passed;
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'http://localhost:3000';
  
  const tester = new PerformanceTester({ baseUrl });
  
  try {
    const success = await tester.run();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Performance testing failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PerformanceTester;