# Automation Scripts Documentation

## Overview

The documentation sync system includes four core automation scripts that handle file monitoring, dependency analysis, validation, and template generation. This guide provides detailed documentation for each script.

## Script Architecture

```
scripts/
├── docs-watcher.js           # Real-time file monitoring
├── analyze-dependencies.js   # Dependency graph generation
├── validate-docs.js          # Quality assurance validation
└── [future scripts]          # Extensible architecture
```

## 1. Documentation Watcher (`docs-watcher.js`)

### Purpose
Provides real-time monitoring of source code changes with automatic documentation template generation and updates.

### Key Features

#### File Monitoring
```javascript
const watchPaths = [
  'components/**/*.{ts,tsx}',    // React components
  'hooks/**/*.{ts,tsx}',         // Custom hooks  
  'lib/**/*.{ts,tsx}',           // Utility libraries
  'app/api/**/*.ts'              // API routes
];
```

#### Event Handling
- **Change Detection**: Monitors file add, modify, delete events
- **Debouncing**: 2-second delay prevents excessive updates during rapid changes
- **Type Classification**: Automatically determines documentation type needed

#### Template Generation
```javascript
// Auto-generates documentation templates
generateComponentDocumentation(filePath, docPath);
generateHookDocumentation(filePath, docPath); 
generateApiDocumentation(filePath, docPath);
```

### Usage
```bash
# Start continuous monitoring
npm run docs:watch

# Manual execution
node scripts/docs-watcher.js

# Stop with Ctrl+C
```

### Configuration Options

#### Watch Paths
```javascript
this.watchPaths = [
  'components/**/*.{ts,tsx}',
  'hooks/**/*.{ts,tsx}', 
  'lib/**/*.{ts,tsx}',
  'app/api/**/*.ts'
];
```

#### Debounce Settings
```javascript
this.debounceTime = 2000; // 2 seconds (configurable)
```

#### Ignore Patterns
```javascript
ignored: [
  /node_modules/,
  /\.next/,
  /dist/,
  /build/,
  /\.test\./,
  /\.spec\./
]
```

### Output Examples

#### Component Template
```markdown
# ComponentName Component

## Purpose
Auto-generated documentation for ComponentName component.

## Usage
\`\`\`typescript
import { ComponentName } from './path/to/component';
<ComponentName />
\`\`\`

## Props
*Documentation needs to be updated with actual props*

## Dependencies
*Auto-generated dependency analysis*

---
*File: \`/path/to/source.tsx\`*
*Last updated: 2025-01-26T18:00:00.000Z*
*Status: Auto-generated template - needs manual review*
```

### Error Handling
- **File Access Errors**: Graceful handling of permission issues
- **Path Resolution**: Robust path handling across operating systems
- **Memory Management**: Efficient cleanup of file watchers
- **Process Termination**: Proper shutdown on SIGINT/SIGTERM

## 2. Dependency Analyzer (`analyze-dependencies.js`)

### Purpose
Comprehensive analysis of code relationships and @sync dependency mapping across the entire application.

### Analysis Categories

#### Component Analysis
```javascript
// Extracts component relationships
{
  "okr-dashboard.tsx": {
    "imports": 15,
    "dependencies": [
      "hooks/useOKRData.ts",
      "components/ui/card.tsx",
      "lucide-react icons"
    ],
    "usedBy": [
      "app/dashboard/page.tsx",
      "app/admin/okr/page.tsx"
    ]
  }
}
```

#### Hook Usage Patterns
```javascript
// Maps hook consumption across components
{
  "useOKRData": {
    "path": "hooks/useOKRData.ts",
    "usedBy": [
      "components/okr-dashboard.tsx",
      "components/department-view.tsx"
    ],
    "dependencies": [
      "lib/auth-context.tsx",
      "api/okrs/departments"
    ]
  }
}
```

#### API Endpoint Mapping
```javascript
// Documents API relationships
{
  "profile/user": {
    "path": "app/api/profile/user/route.ts",
    "methods": ["GET", "PUT"],
    "dependencies": [
      "lib/supabase.ts",
      "lib/auth-context.tsx"
    ]
  }
}
```

### Usage
```bash
# Generate dependency analysis
npm run docs:analyze

# Manual execution
node scripts/analyze-dependencies.js

# Output: docs/dependency-analysis.json
```

### Generated Reports

#### Summary Statistics
```json
{
  "summary": {
    "totalFiles": 73,
    "components": 45,
    "hooks": 8,
    "apis": 12,
    "timestamp": "2025-01-26T18:00:00.000Z"
  }
}
```

#### Component Dependencies
```json
{
  "componentDependencies": {
    "okr-dashboard.tsx": {
      "imports": 15,
      "dependencies": ["useOKRData", "Card", "Button"],
      "usedBy": ["dashboard-page", "admin-interface"]
    }
  }
}
```

#### Recommendations
```json
{
  "recommendations": [
    {
      "type": "high-usage",
      "file": "components/ui/button.tsx",
      "usageCount": 23,
      "suggestion": "Consider documenting this heavily used component"
    }
  ]
}
```

### Configuration

#### File Patterns
```javascript
const sourceFiles = glob.sync('**/*.{ts,tsx}', {
  ignore: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/*.test.*',
    '**/*.spec.*'
  ]
});
```

#### Analysis Rules
```javascript
// Import parsing regex
const importRegex = /import\s+(?:[\w\s{},*]+)\s+from\s+['"]([^'"]+)['"]/g;

// Export parsing regex  
const exportRegex = /export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+(\w+)/g;
```

## 3. Documentation Validator (`validate-docs.js`)

### Purpose
Comprehensive quality assurance for documentation completeness, accuracy, and adherence to standards.

### Validation Categories

#### Completeness Checking
```javascript
// Checks for missing documentation files
const expectedDocPath = isUIComponent 
  ? `docs/components/ui/${componentName}.md`
  : `docs/components/${componentName}.md`;

if (!fs.existsSync(expectedDocPath)) {
  this.addIssue('missing_doc', `Missing documentation for component: ${componentFile}`);
}
```

#### Content Validation
```javascript
// Required sections checking
const requiredSections = ['## Purpose', '## Usage'];
for (const section of requiredSections) {
  if (!content.includes(section)) {
    this.addIssue('missing_section', `Missing section "${section}" in ${docPath}`);
  }
}
```

#### Quality Checks
```javascript
// Placeholder content detection
if (content.includes('*Documentation needs to be updated*') ||
    content.includes('*Auto-generated template*')) {
  this.addIssue('placeholder_content', `Documentation contains placeholder content: ${docPath}`);
}
```

#### Link Validation
```javascript
// Internal link checking
const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
let match;
while ((match = linkRegex.exec(content)) !== null) {
  const linkUrl = match[2];
  if (linkUrl.startsWith('./') || linkUrl.startsWith('../')) {
    await this.checkInternalLink(linkUrl, docPath);
  }
}
```

### Usage
```bash
# Run full validation
npm run docs:validate

# Manual execution
node scripts/validate-docs.js

# Output: docs/validation-report.json
```

### Validation Report Format

#### Statistics Summary
```json
{
  "stats": {
    "totalFiles": 73,
    "documentedFiles": 5,
    "missingDocs": 68,
    "brokenLinks": 0,
    "validationErrors": 0,
    "coverage": 6.8
  }
}
```

#### Issue Classification
```json
{
  "issues": [
    {
      "type": "missing_doc",
      "message": "Missing documentation for component: components/theme-provider.tsx", 
      "file": "components/theme-provider.tsx",
      "timestamp": "2025-01-26T18:00:00.000Z"
    }
  ]
}
```

#### Recommendations
```json
{
  "recommendations": [
    {
      "type": "high-usage",
      "file": "components/ui/button.tsx",
      "usageCount": 23,
      "suggestion": "Consider documenting this heavily used component"
    }
  ]
}
```

### Configuration Options

#### Required Sections
```javascript
const requiredSections = [
  '## Purpose',
  '## Usage', 
  '## Dependencies'
];
```

#### Forbidden Content
```javascript
const forbiddenPatterns = [
  '*Documentation needs to be updated*',
  '*Auto-generated template*',
  'TODO: Add documentation'
];
```

#### Quality Thresholds
```javascript
const qualityThresholds = {
  minimumCoverage: 90,      // Target documentation coverage
  maximumPlaceholders: 5,   // Max allowed placeholder content
  maxBrokenLinks: 0         // Max allowed broken links
};
```

## 4. Future Automation Scripts

### Planned Enhancements

#### API Schema Generator (`generate-api-schema.js`)
- Extract OpenAPI specifications from API routes
- Generate request/response schemas automatically
- Validate API documentation against implementation

#### Component Props Extractor (`extract-component-props.js`)
- Parse TypeScript interfaces for component props
- Generate prop tables automatically
- Validate prop documentation against implementation

#### Visual Documentation Generator (`generate-visual-docs.js`)
- Create component relationship diagrams
- Generate architecture visualizations
- Produce dependency graphs

#### Performance Analyzer (`analyze-performance.js`)
- Measure documentation build times
- Analyze system resource usage
- Optimize automation performance

## Integration Patterns

### NPM Script Integration
```json
{
  "scripts": {
    "docs:watch": "node scripts/docs-watcher.js",
    "docs:analyze": "node scripts/analyze-dependencies.js", 
    "docs:validate": "node scripts/validate-docs.js",
    "docs:build": "npm run docs:analyze && npm run docs:validate"
  }
}
```

### Git Hook Integration
```bash
#!/usr/bin/env sh
# .husky/pre-commit

echo "🔍 Validating documentation..."
npm run docs:validate

echo "📊 Updating dependency analysis..."  
npm run docs:analyze

git add docs/
echo "✅ Documentation updated and staged"
```

### CI/CD Integration
```yaml
# Example GitHub Actions workflow
name: Documentation Validation
on: [push, pull_request]
jobs:
  validate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Validate documentation
        run: npm run docs:validate
      - name: Upload validation report
        uses: actions/upload-artifact@v2
        with:
          name: validation-report
          path: docs/validation-report.json
```

## Performance Optimization

### File Watching Optimization
```javascript
// Efficient file pattern matching
const watcher = chokidar.watch(this.watchPaths, {
  ignored: /(^|[\/\\])\../, // Ignore dotfiles
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 1000,
    pollInterval: 100
  }
});
```

### Memory Management
```javascript
// Cleanup on process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping documentation watcher...');
  watcher.close();
  process.exit(0);
});
```

### Batch Processing
```javascript
// Process multiple changes in batches
this.debounceTimer = setTimeout(() => {
  this.processBatchedChanges();
}, this.debounceTime);
```

## Error Handling Strategies

### Graceful Degradation
```javascript
try {
  await this.updateDocumentation(filePath, action);
} catch (error) {
  console.error('❌ Error updating documentation:', error.message);
  // Continue processing other files
} finally {
  this.isGenerating = false;
}
```

### Retry Logic
```javascript
// Retry failed operations with exponential backoff
async function retryOperation(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

### Error Reporting
```javascript
// Structured error reporting
this.addIssue('validation_error', `Error validating ${docPath}: ${error.message}`, docPath);
this.stats.validationErrors++;
```

## Extending the System

### Adding New File Types
```javascript
// Add support for new file extensions
determineUpdateType(filePath) {
  if (filePath.includes('/components/')) return 'component';
  if (filePath.includes('/hooks/')) return 'hook';
  if (filePath.includes('/api/')) return 'api';
  if (filePath.includes('/utils/')) return 'utility';  // New type
  return 'unknown';
}
```

### Custom Validation Rules
```javascript
// Add custom validation rules
validateCustomRules(content, docPath) {
  // Example: Check for code examples
  if (!content.includes('```typescript')) {
    this.addIssue('missing_examples', `No TypeScript examples in ${docPath}`);
  }
  
  // Example: Check for @sync dependencies
  if (!content.includes('@sync Dependencies')) {
    this.addIssue('missing_sync', `Missing @sync section in ${docPath}`);
  }
}
```

### Plugin Architecture
```javascript
// Extensible plugin system
class DocumentationPlugin {
  constructor(name, config) {
    this.name = name;
    this.config = config;
  }
  
  async process(filePath, content) {
    // Plugin-specific processing
  }
}

// Register plugins
const plugins = [
  new DocumentationPlugin('component-analyzer', config),
  new DocumentationPlugin('api-extractor', config)
];
```

## Best Practices

### Script Development
1. **Error Handling**: Always include comprehensive error handling
2. **Logging**: Provide clear, actionable log messages
3. **Performance**: Optimize for file I/O and memory usage
4. **Testing**: Include unit tests for critical functions
5. **Documentation**: Document all configuration options

### Maintenance
1. **Regular Updates**: Keep dependencies updated
2. **Performance Monitoring**: Track script execution times
3. **Error Analysis**: Review error logs regularly
4. **Feature Enhancement**: Gather user feedback for improvements

### Security
1. **Input Validation**: Sanitize all file paths and content
2. **Permission Checks**: Validate file access permissions
3. **Path Traversal**: Prevent directory traversal attacks
4. **Resource Limits**: Implement timeouts and memory limits

---

This automation scripts documentation provides complete coverage of the technical implementation details, configuration options, and best practices for maintaining and extending the documentation sync system.

*Last Updated: Auto-generated from script analysis*