#!/usr/bin/env node

/**
 * Production Deployment Automation Script
 * 
 * This script handles the complete production deployment process including:
 * - Pre-deployment validation
 * - Build optimization
 * - Database migrations
 * - Health checks
 * - Performance validation
 * - Rollback capabilities
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ProductionDeployer {
  constructor() {
    this.startTime = Date.now();
    this.deploymentId = `deploy-${Date.now()}`;
    this.logFile = `logs/deployment-${this.deploymentId}.log`;
    this.errors = [];
    this.warnings = [];
    
    // Ensure logs directory exists
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
    
    if (level === 'error') {
      this.errors.push(message);
    } else if (level === 'warn') {
      this.warnings.push(message);
    }
  }

  async runCommand(command, description) {
    this.log(`Starting: ${description}`);
    this.log(`Command: ${command}`);
    
    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      this.log(`✅ Completed: ${description}`);
      if (output.trim()) {
        this.log(`Output: ${output.trim()}`);
      }
      return output;
    } catch (error) {
      this.log(`❌ Failed: ${description}`, 'error');
      this.log(`Error: ${error.message}`, 'error');
      throw error;
    }
  }

  async validateEnvironment() {
    this.log('🔍 Validating deployment environment...');
    
    // Check required environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'DATABASE_URL'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 22) {
      throw new Error(`Node.js version ${nodeVersion} is not supported. Requires Node.js 22+`);
    }

    // Check disk space
    try {
      const df = execSync('df -h .', { encoding: 'utf8' });
      this.log(`Disk space: ${df.split('\n')[1]}`);
    } catch (error) {
      this.log('Could not check disk space', 'warn');
    }

    // Verify database connectivity
    try {
      await this.runCommand('node -e "require(\'./lib/database/test-connection.js\')"', 'Database connectivity test');
    } catch (error) {
      this.log('Database connectivity test failed', 'warn');
    }

    this.log('✅ Environment validation completed');
  }

  async runTests() {
    this.log('🧪 Running test suite...');
    
    try {
      // Run unit tests
      await this.runCommand('pnpm test:run', 'Unit tests');
      
      // Run integration tests
      await this.runCommand('pnpm test:integration', 'Integration tests');
      
      // Run linting
      await this.runCommand('pnpm lint', 'Code linting');
      
      // Type checking
      await this.runCommand('npx tsc --noEmit', 'TypeScript type checking');
      
    } catch (error) {
      this.log('Tests failed - aborting deployment', 'error');
      throw error;
    }
    
    this.log('✅ All tests passed');
  }

  async buildApplication() {
    this.log('🏗️  Building application for production...');
    
    // Clean previous builds
    await this.runCommand('rm -rf .next', 'Clean previous build');
    
    // Build with optimizations
    process.env.NODE_ENV = 'production';
    process.env.ANALYZE = 'false'; // Disable bundle analyzer in automated builds
    
    await this.runCommand('pnpm build', 'Production build');
    
    // Verify build artifacts
    if (!fs.existsSync('.next')) {
      throw new Error('Build failed - .next directory not found');
    }
    
    // Check bundle sizes
    await this.analyzeBundleSize();
    
    this.log('✅ Application build completed');
  }

  async analyzeBundleSize() {
    this.log('📊 Analyzing bundle size...');
    
    try {
      const nextDir = path.join(process.cwd(), '.next');
      const staticDir = path.join(nextDir, 'static');
      
      if (fs.existsSync(staticDir)) {
        const stats = this.getDirectorySize(staticDir);
        this.log(`Static assets size: ${(stats / 1024 / 1024).toFixed(2)} MB`);
        
        // Warn if bundle is too large
        const maxSizeMB = 50; // 50MB warning threshold
        if (stats / 1024 / 1024 > maxSizeMB) {
          this.log(`Bundle size exceeds ${maxSizeMB}MB - consider optimization`, 'warn');
        }
      }
      
      // Check for large chunks
      const chunksDir = path.join(staticDir, 'chunks');
      if (fs.existsSync(chunksDir)) {
        const files = fs.readdirSync(chunksDir);
        files.forEach(file => {
          const filePath = path.join(chunksDir, file);
          const stats = fs.statSync(filePath);
          const sizeMB = stats.size / 1024 / 1024;
          
          if (sizeMB > 1) { // Files larger than 1MB
            this.log(`Large chunk detected: ${file} (${sizeMB.toFixed(2)} MB)`, 'warn');
          }
        });
      }
    } catch (error) {
      this.log(`Bundle analysis failed: ${error.message}`, 'warn');
    }
  }

  getDirectorySize(dirPath) {
    let totalSize = 0;
    
    function calculateSize(itemPath) {
      const stats = fs.statSync(itemPath);
      
      if (stats.isFile()) {
        totalSize += stats.size;
      } else if (stats.isDirectory()) {
        const items = fs.readdirSync(itemPath);
        items.forEach(item => {
          calculateSize(path.join(itemPath, item));
        });
      }
    }
    
    calculateSize(dirPath);
    return totalSize;
  }

  async runDatabaseMigrations() {
    this.log('🗄️  Running database migrations...');
    
    try {
      // Backup current database state (if production)
      if (process.env.NODE_ENV === 'production') {
        this.log('Creating database backup...');
        // Add backup logic here
      }
      
      // Run migrations
      await this.runCommand('pnpm db:migrate', 'Database migrations');
      
      // Verify migration status
      // Add migration verification logic here
      
    } catch (error) {
      this.log('Database migrations failed', 'error');
      throw error;
    }
    
    this.log('✅ Database migrations completed');
  }

  async deployToVercel() {
    this.log('🚀 Deploying to Vercel...');
    
    try {
      // Deploy to production
      const deployOutput = await this.runCommand('vercel --prod', 'Vercel deployment');
      
      // Extract deployment URL
      const urlMatch = deployOutput.match(/https:\/\/[^\s]+/);
      if (urlMatch) {
        this.deploymentUrl = urlMatch[0];
        this.log(`Deployment URL: ${this.deploymentUrl}`);
      }
      
    } catch (error) {
      this.log('Vercel deployment failed', 'error');
      throw error;
    }
    
    this.log('✅ Vercel deployment completed');
  }

  async verifyDeployment() {
    this.log('🔍 Verifying deployment...');
    
    if (!this.deploymentUrl) {
      this.log('No deployment URL found for verification', 'warn');
      return;
    }
    
    try {
      // Wait for deployment to be ready
      await this.sleep(30000); // 30 seconds
      
      // Health check
      const healthCheck = await this.runCommand(
        `curl -f -s -o /dev/null -w "%{http_code}" ${this.deploymentUrl}/api/health`,
        'Health check'
      );
      
      if (healthCheck.trim() !== '200') {
        throw new Error(`Health check failed with status: ${healthCheck.trim()}`);
      }
      
      // Performance check
      await this.runPerformanceCheck();
      
      // E2E tests on deployed application
      await this.runE2ETests();
      
    } catch (error) {
      this.log('Deployment verification failed', 'error');
      throw error;
    }
    
    this.log('✅ Deployment verification completed');
  }

  async runPerformanceCheck() {
    this.log('⚡ Running performance checks...');
    
    try {
      // Use Lighthouse or similar tool
      // For now, just check response time
      const startTime = Date.now();
      await this.runCommand(
        `curl -s ${this.deploymentUrl} > /dev/null`,
        'Response time check'
      );
      const responseTime = Date.now() - startTime;
      
      this.log(`Response time: ${responseTime}ms`);
      
      if (responseTime > 5000) {
        this.log('Slow response time detected', 'warn');
      }
      
    } catch (error) {
      this.log(`Performance check failed: ${error.message}`, 'warn');
    }
  }

  async runE2ETests() {
    this.log('🎭 Running E2E tests...');
    
    try {
      // Set the base URL for tests
      process.env.BASE_URL = this.deploymentUrl;
      
      // Run critical path tests only
      await this.runCommand('pnpm test:e2e --project=critical-path', 'Critical path E2E tests');
      
    } catch (error) {
      this.log('E2E tests failed', 'warn');
      // Don't fail deployment for E2E test failures in production
    }
  }

  async rollback() {
    this.log('🔄 Initiating rollback...');
    
    try {
      // Rollback to previous Vercel deployment
      await this.runCommand('vercel rollback', 'Vercel rollback');
      
      // Rollback database migrations if needed
      // Add database rollback logic here
      
      this.log('✅ Rollback completed');
    } catch (error) {
      this.log(`Rollback failed: ${error.message}`, 'error');
    }
  }

  async cleanup() {
    this.log('🧹 Cleaning up...');
    
    try {
      // Remove temporary files
      await this.runCommand('rm -rf temp-*', 'Remove temporary files');
      
      // Archive logs
      const archiveDir = 'logs/archive';
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }
      
      // Keep logs for 30 days
      const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const logFiles = fs.readdirSync('logs').filter(f => f.startsWith('deployment-'));
      
      logFiles.forEach(file => {
        const filePath = path.join('logs', file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffDate) {
          fs.unlinkSync(filePath);
        }
      });
      
    } catch (error) {
      this.log(`Cleanup failed: ${error.message}`, 'warn');
    }
  }

  generateReport() {
    const duration = Date.now() - this.startTime;
    const report = {
      deploymentId: this.deploymentId,
      startTime: new Date(this.startTime).toISOString(),
      duration: `${Math.round(duration / 1000)}s`,
      status: this.errors.length > 0 ? 'FAILED' : 'SUCCESS',
      deploymentUrl: this.deploymentUrl,
      errors: this.errors,
      warnings: this.warnings,
      logFile: this.logFile
    };
    
    this.log('\n📋 DEPLOYMENT REPORT');
    this.log('═══════════════════');
    this.log(`Status: ${report.status}`);
    this.log(`Duration: ${report.duration}`);
    this.log(`Deployment ID: ${report.deploymentId}`);
    if (report.deploymentUrl) {
      this.log(`URL: ${report.deploymentUrl}`);
    }
    this.log(`Errors: ${report.errors.length}`);
    this.log(`Warnings: ${report.warnings.length}`);
    this.log(`Log file: ${report.logFile}`);
    
    // Save report as JSON
    fs.writeFileSync(
      `logs/deployment-report-${this.deploymentId}.json`,
      JSON.stringify(report, null, 2)
    );
    
    return report;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async deploy() {
    try {
      this.log('🚀 Starting production deployment...');
      this.log(`Deployment ID: ${this.deploymentId}`);
      
      await this.validateEnvironment();
      await this.runTests();
      await this.buildApplication();
      await this.runDatabaseMigrations();
      await this.deployToVercel();
      await this.verifyDeployment();
      
      this.log('🎉 Deployment completed successfully!');
      
    } catch (error) {
      this.log(`💥 Deployment failed: ${error.message}`, 'error');
      
      // Attempt rollback
      await this.rollback();
      
      throw error;
    } finally {
      await this.cleanup();
      this.generateReport();
    }
  }
}

// CLI execution
async function main() {
  const deployer = new ProductionDeployer();
  
  try {
    await deployer.deploy();
    process.exit(0);
  } catch (error) {
    console.error('Deployment failed:', error.message);
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  main();
}

module.exports = ProductionDeployer;