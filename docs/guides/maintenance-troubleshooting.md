# Documentation System Maintenance & Troubleshooting Guide

## Overview

This comprehensive guide covers maintenance procedures, troubleshooting steps, and best practices for the automated documentation synchronization system.

## Table of Contents

1. [Maintenance Schedule](#maintenance-schedule)
2. [System Health Monitoring](#system-health-monitoring)
3. [Common Issues & Solutions](#common-issues--solutions)
4. [Performance Optimization](#performance-optimization)
5. [Backup & Recovery](#backup--recovery)
6. [System Updates](#system-updates)
7. [Debugging Procedures](#debugging-procedures)
8. [Emergency Procedures](#emergency-procedures)

## Maintenance Schedule

### Daily (Automated)
```bash
# These run automatically - no manual intervention needed
✅ File watcher monitors source code changes
✅ Git hooks validate documentation on commits  
✅ Dependency analysis updates on file changes
✅ Template generation for new files
```

### Weekly (Manual Review - 15 minutes)
```bash
# Review system health
npm run docs:validate
cat docs/validation-report.json

# Check coverage metrics
echo "Current coverage: $(jq '.stats.coverage' docs/validation-report.json)%"

# Review TODO list for priority items  
cat docs/documentation-todo.md | head -20
```

### Monthly (System Review - 1 hour)
```bash
# Full system validation
npm run docs:build

# Clean up old reports
find docs/ -name "*.json" -mtime +30 -delete

# Update dependencies
npm audit
npm update

# Review and optimize automation scripts
```

### Quarterly (Major Review - 2 hours)
```bash
# Architecture review
npm run docs:analyze
# Review dependency complexity and circular dependencies

# Performance analysis
# Measure script execution times and optimize

# Template and standard updates
# Review documentation quality and update templates

# System expansion planning
# Plan documentation coverage expansion
```

## System Health Monitoring

### Key Health Indicators

#### Documentation Coverage
```bash
# Check current coverage
npm run docs:validate | grep "Coverage:"

# Target: 90% coverage
# Current: 6.8% coverage (5/73 files)
# Status: 🟡 Foundation established, expansion needed
```

#### File Watcher Status
```bash
# Check if file watcher is running
ps aux | grep docs-watcher
# Should show: node scripts/docs-watcher.js

# Check memory usage
top -p $(pgrep -f docs-watcher)
# Should be: < 100MB memory usage
```

#### Git Hook Integration
```bash
# Verify pre-commit hook is active
ls -la .husky/pre-commit
# Should be: executable (-rwxr-xr-x)

# Test hook manually
.husky/pre-commit
# Should run: validation and analysis without errors
```

#### Dependency Analysis Health
```bash
# Check last analysis timestamp
jq '.summary.timestamp' docs/dependency-analysis.json

# Verify analysis completeness
jq '.summary.totalFiles' docs/dependency-analysis.json
# Should match: actual source file count
```

### Health Check Script
```bash
#!/bin/bash
# docs-health-check.sh

echo "🔍 Documentation System Health Check"
echo "===================================="

# Check file watcher
if pgrep -f docs-watcher > /dev/null; then
    echo "✅ File watcher: Running"
else
    echo "❌ File watcher: Not running"
fi

# Check git hooks
if [ -x .husky/pre-commit ]; then
    echo "✅ Git hooks: Active"
else
    echo "❌ Git hooks: Not executable"
fi

# Check coverage
COVERAGE=$(npm run docs:validate 2>/dev/null | grep -o "Coverage: [0-9.]*%" | cut -d' ' -f2)
echo "📊 Documentation coverage: $COVERAGE"

# Check validation errors
ERRORS=$(jq '.issues | length' docs/validation-report.json 2>/dev/null || echo "N/A")
echo "🐛 Validation issues: $ERRORS"

echo "===================================="
```

## Common Issues & Solutions

### Issue: File Watcher Not Starting

#### Symptoms
```bash
npm run docs:watch
# Output: Error: Cannot find module 'chokidar'
```

#### Diagnosis
```bash
# Check if chokidar is installed
npm list chokidar-cli
# Check for dependency conflicts
npm ls --depth=0 | grep UNMET
```

#### Solutions
```bash
# Solution 1: Reinstall dependencies
npm install --save-dev chokidar-cli

# Solution 2: Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Solution 3: Use alternative file watcher
npm install --save-dev nodemon
# Update package.json script:
# "docs:watch": "nodemon --watch . --ext ts,tsx --exec 'npm run docs:analyze'"
```

### Issue: Validation Failing with Permission Errors

#### Symptoms
```bash
npm run docs:validate
# Output: Error: EACCES: permission denied, open 'docs/validation-report.json'
```

#### Diagnosis
```bash
# Check file permissions
ls -la docs/validation-report.json
# Check directory permissions  
ls -la docs/
```

#### Solutions
```bash
# Solution 1: Fix file permissions
chmod 644 docs/validation-report.json
chmod 755 docs/

# Solution 2: Change ownership
sudo chown $USER:$USER docs/validation-report.json

# Solution 3: Run with proper permissions
sudo npm run docs:validate
# Then fix ownership afterwards
sudo chown -R $USER:$USER docs/
```

### Issue: Git Hooks Not Executing

#### Symptoms
```bash
git commit -m "test commit"
# Hook doesn't run, no validation output
```

#### Diagnosis
```bash
# Check if husky is installed
npm list husky

# Check hook file exists and is executable
ls -la .husky/pre-commit

# Check Git hook configuration
git config core.hooksPath
```

#### Solutions
```bash
# Solution 1: Reinstall husky
npm run prepare

# Solution 2: Make hook executable
chmod +x .husky/pre-commit

# Solution 3: Manual hook setup
mkdir -p .husky
echo '#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npm run docs:validate' > .husky/pre-commit
chmod +x .husky/pre-commit

# Solution 4: Check Git version compatibility
git --version
# Husky requires Git 2.13 or newer
```

### Issue: High Memory Usage During Analysis

#### Symptoms
```bash
npm run docs:analyze
# System becomes slow, high memory usage
```

#### Diagnosis
```bash
# Monitor memory during analysis
top -p $(pgrep -f analyze-dependencies)

# Check file count being analyzed
find . -name "*.ts" -o -name "*.tsx" | wc -l
```

#### Solutions
```bash
# Solution 1: Exclude large directories
# Edit scripts/analyze-dependencies.js
const sourceFiles = glob.sync('**/*.{ts,tsx}', {
  ignore: [
    '**/node_modules/**',
    '**/.next/**', 
    '**/dist/**',
    '**/coverage/**',    // Add this
    '**/build/**'        // Add this
  ]
});

# Solution 2: Process files in batches
# Modify analyzer to process files in smaller chunks

# Solution 3: Increase Node.js memory limit
node --max-old-space-size=4096 scripts/analyze-dependencies.js

# Solution 4: Use streaming analysis
# Implement streaming file processing instead of loading all at once
```

### Issue: Documentation Templates Not Generated

#### Symptoms
```bash
# Create new component file
touch components/new-component.tsx
# No documentation template appears in docs/components/
```

#### Diagnosis
```bash
# Check if file watcher detected the change
# Look at file watcher output for any errors

# Check file naming conventions
ls components/new-component.tsx
# Verify file has correct extension

# Check if file watcher is monitoring correct paths
grep -A 5 "watchPaths" scripts/docs-watcher.js
```

#### Solutions
```bash
# Solution 1: Restart file watcher
# Stop with Ctrl+C and restart
npm run docs:watch

# Solution 2: Manual template generation
# Trigger analysis manually
npm run docs:analyze

# Solution 3: Check file watcher configuration
# Verify component is in watched directory
echo "components/new-component.tsx" | grep -E "^components/"

# Solution 4: Generate template manually
# Create documentation file manually using existing template
cp docs/components/okr-dashboard.md docs/components/new-component.md
# Edit template to match new component
```

### Issue: Broken Links in Documentation

#### Symptoms
```bash
npm run docs:validate
# Output: Broken link in docs/components/button.md: ./non-existent.md
```

#### Diagnosis
```bash
# Find all broken links
npm run docs:validate | grep "Broken link"

# Check link targets manually
ls docs/components/non-existent.md
```

#### Solutions
```bash
# Solution 1: Fix broken links
# Edit the documentation file and correct the link path

# Solution 2: Create missing documentation
# If the link target should exist, create the missing file

# Solution 3: Remove invalid links
# Remove or update links that are no longer valid

# Solution 4: Use relative links correctly
# Ensure relative links use correct path syntax
# ✅ Good: [Button](./button.md)
# ❌ Bad: [Button](button.md)
```

## Performance Optimization

### File Watcher Optimization

#### Reduce Watch Scope
```javascript
// Edit scripts/docs-watcher.js
this.watchPaths = [
  'components/**/*.{ts,tsx}',   // Keep
  'hooks/**/*.{ts,tsx}',        // Keep
  'lib/**/*.{ts,tsx}',          // Keep
  'app/api/**/*.ts'             // Keep
  // Remove unnecessary paths
];
```

#### Optimize Ignore Patterns
```javascript
ignored: [
  /node_modules/,
  /\.next/,
  /dist/,
  /build/,
  /coverage/,                   // Add
  /\.git/,                      // Add
  /\.vscode/,                   // Add
  /\.test\./,
  /\.spec\./,
  /\.stories\./                 // Add if using Storybook
]
```

#### Adjust Debounce Timing
```javascript
// For faster responses (less efficient)
this.debounceTime = 1000; // 1 second

// For better performance (slower responses)  
this.debounceTime = 5000; // 5 seconds
```

### Validation Optimization

#### Parallel Validation
```javascript
// Process file validation in parallel
const validationPromises = files.map(file => 
  this.validateDocumentationFile(file)
);
await Promise.all(validationPromises);
```

#### Selective Validation
```bash
# Only validate changed files
npm run docs:validate --changed-only

# Skip expensive checks during development
npm run docs:validate --quick
```

### Analysis Optimization

#### Cache Analysis Results
```javascript
// Cache dependency analysis results
const cacheFile = 'docs/.analysis-cache.json';
if (fs.existsSync(cacheFile)) {
  const cache = JSON.parse(fs.readFileSync(cacheFile));
  // Use cached results if files haven't changed
}
```

#### Incremental Analysis
```javascript
// Only analyze changed files
const lastAnalysis = this.getLastAnalysisTime();
const changedFiles = this.getFilesChangedSince(lastAnalysis);
// Process only changed files
```

## Backup & Recovery

### Documentation Backup

#### Automated Backup Script
```bash
#!/bin/bash
# backup-docs.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/docs_$DATE"

mkdir -p "$BACKUP_DIR"

# Backup documentation
cp -r docs/ "$BACKUP_DIR/"

# Backup scripts
cp -r scripts/ "$BACKUP_DIR/"

# Backup configuration
cp typedoc.json "$BACKUP_DIR/"
cp package.json "$BACKUP_DIR/"

# Create archive
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"

echo "✅ Backup created: $BACKUP_DIR.tar.gz"

# Keep only last 10 backups
ls -t backups/docs_*.tar.gz | tail -n +11 | xargs rm -f
```

#### Schedule Backups
```bash
# Add to crontab for daily backups
crontab -e
# Add line: 0 2 * * * /path/to/project/backup-docs.sh
```

### Recovery Procedures

#### Restore from Backup
```bash
# List available backups
ls -la backups/docs_*.tar.gz

# Restore from specific backup
BACKUP_FILE="backups/docs_20250126_020000.tar.gz"
tar -xzf "$BACKUP_FILE"

# Replace current documentation
rm -rf docs/
mv docs_20250126_020000/docs/ ./
mv docs_20250126_020000/scripts/ ./

# Verify restoration
npm run docs:validate
```

#### Emergency Recovery
```bash
# If all documentation is lost
# 1. Restore from Git history
git checkout HEAD~1 -- docs/

# 2. Regenerate from source code
rm -rf docs/
npm run docs:watch
# Let it regenerate templates for all files

# 3. Restore from backup
# Use backup restoration procedure above
```

### Git Integration Recovery

#### Fix Corrupted Git Hooks
```bash
# Remove corrupted hooks
rm -rf .husky/

# Reinstall husky
npm install husky --save-dev
npm run prepare

# Recreate pre-commit hook
echo '#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npm run docs:validate && npm run docs:analyze
git add docs/' > .husky/pre-commit

chmod +x .husky/pre-commit
```

#### Reset Git Hook Configuration
```bash
# Reset Git hooks path
git config core.hooksPath .husky

# Verify configuration
git config --list | grep hooks
```

## System Updates

### Dependency Updates

#### Regular Updates (Monthly)
```bash
# Check for outdated packages
npm outdated

# Update non-breaking changes
npm update

# Check for security vulnerabilities
npm audit
npm audit fix
```

#### Major Version Updates (Quarterly)
```bash
# Update to latest versions (carefully)
npm install chokidar-cli@latest
npm install typedoc@latest
npm install madge@latest

# Test after each major update
npm run docs:build
```

### Script Updates

#### Version Control
```bash
# Before making changes, create backup
cp scripts/docs-watcher.js scripts/docs-watcher.js.backup

# After changes, test thoroughly
npm run docs:watch
# Verify no errors and expected behavior
```

#### Testing Updates
```bash
# Test individual scripts
node scripts/docs-watcher.js --dry-run
node scripts/validate-docs.js --test-mode
node scripts/analyze-dependencies.js --verbose
```

### Configuration Updates

#### TypeDoc Configuration
```bash
# After updating typedoc.json
npx typedoc --options typedoc.json --dry-run

# Verify output structure
ls docs/generated/
```

#### Package.json Scripts
```bash
# After updating npm scripts
npm run docs:validate --dry-run
npm run docs:build --verbose
```

## Debugging Procedures

### Enable Debug Mode

#### File Watcher Debug
```bash
# Enable verbose logging
DEBUG=docs-watcher npm run docs:watch

# Enable file system debug
DEBUG=chokidar npm run docs:watch
```

#### Validation Debug
```bash
# Enable detailed validation logging
NODE_ENV=debug npm run docs:validate

# Verbose validation output
npm run docs:validate -- --verbose
```

#### Analysis Debug
```bash
# Debug dependency analysis
DEBUG=analyze-dependencies npm run docs:analyze

# Verbose analysis output  
npm run docs:analyze -- --verbose --debug
```

### Log Analysis

#### System Logs
```bash
# Check system logs for errors
tail -f /var/log/system.log | grep docs-watcher

# Check npm logs
ls ~/.npm/_logs/
tail -f ~/.npm/_logs/*debug*.log
```

#### Application Logs
```bash
# Enable application logging
mkdir -p logs/
touch logs/docs-watcher.log

# Modify scripts to log to file
console.log(`[${new Date().toISOString()}] ${message}`);
```

### Common Debug Scenarios

#### Debug Template Generation
```bash
# Test template generation manually
node -e "
const { DocumentationWatcher } = require('./scripts/docs-watcher.js');
const watcher = new DocumentationWatcher();
watcher.generateComponentDocumentation('components/test.tsx', 'docs/components/test.md');
"
```

#### Debug Dependency Analysis
```bash
# Test dependency parsing manually
node -e "
const { DependencyAnalyzer } = require('./scripts/analyze-dependencies.js');
const analyzer = new DependencyAnalyzer();
const result = analyzer.analyzeFile('components/okr-dashboard.tsx');
console.log(JSON.stringify(result, null, 2));
"
```

#### Debug Validation Rules
```bash
# Test validation on specific file
node -e "
const { DocumentationValidator } = require('./scripts/validate-docs.js');
const validator = new DocumentationValidator();
validator.validateDocumentationFile('docs/components/button.md', 'components/ui/button.tsx');
console.log(validator.issues);
"
```

## Emergency Procedures

### System Down Scenarios

#### Complete System Failure
```bash
# 1. Stop all running processes
pkill -f docs-watcher

# 2. Backup current state
cp -r docs/ docs-emergency-backup/
cp -r scripts/ scripts-emergency-backup/

# 3. Reset to last known good state
git checkout HEAD~1 -- docs/ scripts/

# 4. Reinstall dependencies
rm -rf node_modules/
npm install

# 5. Test basic functionality
npm run docs:validate
npm run docs:analyze

# 6. Restart file watcher
npm run docs:watch
```

#### Corrupted Documentation
```bash
# 1. Identify corrupted files
npm run docs:validate | grep -i error

# 2. Remove corrupted files
rm docs/corrupted-file.md

# 3. Regenerate from source
npm run docs:watch
# File watcher will recreate templates

# 4. Restore content from backup or Git
git show HEAD~1:docs/corrupted-file.md > docs/corrupted-file.md
```

#### Git Integration Failure
```bash
# 1. Disable git hooks temporarily
mv .husky/pre-commit .husky/pre-commit.disabled

# 2. Fix underlying issues
npm run docs:validate
npm run docs:analyze

# 3. Re-enable git hooks
mv .husky/pre-commit.disabled .husky/pre-commit

# 4. Test git integration
git add docs/
git commit -m "test commit"
```

### Recovery Verification

#### Post-Recovery Checklist
```bash
# ✅ File watcher running
ps aux | grep docs-watcher

# ✅ Git hooks active
ls -la .husky/pre-commit

# ✅ Validation passing
npm run docs:validate

# ✅ Analysis working
npm run docs:analyze

# ✅ Documentation accessible
npm run docs:serve
```

#### Health Verification Script
```bash
#!/bin/bash
# verify-recovery.sh

echo "🔍 Verifying documentation system recovery..."

# Test each component
npm run docs:validate && echo "✅ Validation: OK" || echo "❌ Validation: FAILED"
npm run docs:analyze && echo "✅ Analysis: OK" || echo "❌ Analysis: FAILED"

# Test file watcher (non-blocking)
timeout 5 npm run docs:watch && echo "✅ File watcher: OK" || echo "❌ File watcher: FAILED"

# Test git hooks
.husky/pre-commit && echo "✅ Git hooks: OK" || echo "❌ Git hooks: FAILED"

echo "🎯 Recovery verification complete"
```

---

This maintenance and troubleshooting guide provides comprehensive coverage for keeping the documentation synchronization system healthy and resolving issues quickly when they arise. Regular maintenance following this guide will ensure optimal system performance and reliability.

*Last Updated: Created as part of documentation sync implementation*
*Next Review: Monthly*