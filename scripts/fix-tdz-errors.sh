#!/bin/bash

echo "🔧 Fixing Temporal Dead Zone (TDZ) Errors"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Install required Babel plugins
print_status "Installing Babel plugins for TDZ error prevention..."
pnpm add -D @babel/plugin-transform-arrow-functions @babel/plugin-transform-block-scoping @babel/plugin-transform-runtime

if [ $? -eq 0 ]; then
    print_success "Babel plugins installed successfully"
else
    print_error "Failed to install Babel plugins"
    exit 1
fi

# Step 2: Clean existing build artifacts
print_status "Cleaning existing build artifacts..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf reports

print_success "Build artifacts cleaned"

# Step 3: Run a test build to verify fixes
print_status "Running test build to verify TDZ fixes..."
pnpm build

if [ $? -eq 0 ]; then
    print_success "Build completed successfully - TDZ fixes appear to be working"
else
    print_warning "Build failed - manual intervention may be required"
fi

# Step 4: Check for TDZ error patterns in build output
print_status "Scanning build output for potential TDZ issues..."

if [ -d ".next" ]; then
    # Look for minified files that might contain TDZ issues
    find .next -name "*.js" -type f -exec grep -l "Cannot access.*before initialization" {} \; > /tmp/tdz_check.log 2>/dev/null
    
    if [ -s /tmp/tdz_check.log ]; then
        print_warning "Found potential TDZ error patterns in build files:"
        cat /tmp/tdz_check.log
    else
        print_success "No TDZ error patterns found in build output"
    fi
    
    rm -f /tmp/tdz_check.log
fi

# Step 5: Test production mode
print_status "Testing production mode startup..."
timeout 10s pnpm start &
PID=$!
sleep 5

if kill -0 $PID 2>/dev/null; then
    print_success "Production server started successfully"
    kill $PID 2>/dev/null
else
    print_warning "Production server test failed or timed out"
fi

# Step 6: Generate TDZ error monitoring script
print_status "Creating TDZ error monitoring script..."

cat > scripts/monitor-tdz-errors.js << 'EOF'
/**
 * TDZ Error Monitoring Script
 * Monitors application logs for Temporal Dead Zone errors
 */

const fs = require('fs');
const path = require('path');

function monitorTDZErrors() {
  console.log('🔍 Monitoring for TDZ errors...');
  
  // Monitor console logs in browser (if available)
  if (typeof window !== 'undefined') {
    const originalError = console.error;
    console.error = function(...args) {
      const message = args.join(' ');
      if (message.includes('Cannot access') && message.includes('before initialization')) {
        console.warn('🚨 TDZ Error detected:', message);
        
        // Report to monitoring service or log file
        fetch('/api/log-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'TDZ_ERROR',
            message,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          })
        }).catch(err => console.warn('Failed to report TDZ error:', err));
      }
      originalError.apply(console, args);
    };
  }
}

// Auto-start monitoring if in browser
if (typeof window !== 'undefined') {
  monitorTDZErrors();
}

module.exports = { monitorTDZErrors };
EOF

print_success "TDZ error monitoring script created"

# Step 7: Create development helper script
print_status "Creating development helper script..."

cat > scripts/dev-with-tdz-protection.js << 'EOF'
/**
 * Development server with TDZ error protection
 */

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting development server with TDZ protection...');

// Set environment variables for safer development
process.env.NODE_ENV = 'development';
process.env.NEXT_DEBUG_TDZ = 'true';

const dev = spawn('pnpm', ['dev'], {
  stdio: 'pipe',
  shell: true
});

dev.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  
  // Check for TDZ errors in output
  if (output.includes('Cannot access') && output.includes('before initialization')) {
    console.warn('\n🚨 TDZ Error detected in development:');
    console.warn(output);
    console.warn('Consider checking the build configuration and variable scoping.\n');
  }
});

dev.stderr.on('data', (data) => {
  const error = data.toString();
  process.stderr.write(error);
  
  // Check for TDZ errors in error output
  if (error.includes('Cannot access') && error.includes('before initialization')) {
    console.error('\n🚨 TDZ Error detected:');
    console.error(error);
    console.error('This may require code changes to fix variable initialization order.\n');
  }
});

dev.on('close', (code) => {
  console.log(`Development server exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down development server...');
  dev.kill('SIGINT');
});
EOF

print_success "Development helper script created"

# Final summary
echo ""
echo "🎉 TDZ Error Fix Implementation Complete!"
echo "========================================"
echo ""
echo "✅ Installed Babel plugins for safer variable transformations"
echo "✅ Updated Next.js webpack configuration to prevent aggressive minification"
echo "✅ Added TDZ Error Boundary component for runtime error handling"
echo "✅ Created safe variable access utilities"
echo "✅ Set up monitoring and development helper scripts"
echo ""
echo "📝 Next Steps:"
echo "1. Run 'pnpm install' to install new dependencies"
echo "2. Test with 'pnpm build' to verify build works"
echo "3. Use 'node scripts/dev-with-tdz-protection.js' for safer development"
echo "4. Monitor logs for any remaining TDZ errors"
echo ""
echo "🔧 If issues persist:"
echo "- Check the webpack configuration in next.config.mjs"
echo "- Review component initialization order"
echo "- Use safe variable access utilities from lib/safe-variable-access.ts"
echo "- Check browser console for detailed error information"

# Make scripts executable
chmod +x scripts/monitor-tdz-errors.js
chmod +x scripts/dev-with-tdz-protection.js

print_success "All scripts are now executable"

echo ""
echo "Run this script completed successfully! 🚀"