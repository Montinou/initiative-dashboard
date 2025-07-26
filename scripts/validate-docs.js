#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class DocumentationValidator {
  constructor() {
    this.issues = [];
    this.stats = {
      totalFiles: 0,
      documentedFiles: 0,
      missingDocs: 0,
      brokenLinks: 0,
      validationErrors: 0
    };
  }

  async validate() {
    console.log('🔍 Starting documentation validation...');

    // Validate component documentation
    await this.validateComponents();

    // Validate hook documentation
    await this.validateHooks();

    // Validate API documentation
    await this.validateApiDocs();

    // Check for broken links
    await this.checkBrokenLinks();

    // Check documentation completeness
    await this.checkCompleteness();

    // Generate report
    this.generateReport();

    return this.issues.length === 0;
  }

  async validateComponents() {
    console.log('📦 Validating component documentation...');

    const componentFiles = glob.sync('components/**/*.{ts,tsx}', {
      ignore: ['**/*.test.*', '**/*.spec.*']
    });

    for (const componentFile of componentFiles) {
      this.stats.totalFiles++;
      
      const componentName = path.basename(componentFile, path.extname(componentFile));
      const isUIComponent = componentFile.includes('/ui/');
      
      const expectedDocPath = isUIComponent 
        ? `docs/components/ui/${componentName}.md`
        : `docs/components/${componentName}.md`;

      if (fs.existsSync(expectedDocPath)) {
        this.stats.documentedFiles++;
        await this.validateDocumentationFile(expectedDocPath, componentFile);
      } else {
        this.stats.missingDocs++;
        this.addIssue('missing_doc', `Missing documentation for component: ${componentFile}`, expectedDocPath);
      }
    }
  }

  async validateHooks() {
    console.log('🎣 Validating hook documentation...');

    const hookFiles = glob.sync('hooks/**/*.{ts,tsx}', {
      ignore: ['**/*.test.*', '**/*.spec.*']
    });

    for (const hookFile of hookFiles) {
      this.stats.totalFiles++;
      
      const hookName = path.basename(hookFile, path.extname(hookFile));
      const expectedDocPath = `docs/hooks/${hookName}.md`;

      if (fs.existsSync(expectedDocPath)) {
        this.stats.documentedFiles++;
        await this.validateDocumentationFile(expectedDocPath, hookFile);
      } else {
        this.stats.missingDocs++;
        this.addIssue('missing_doc', `Missing documentation for hook: ${hookFile}`, expectedDocPath);
      }
    }
  }

  async validateApiDocs() {
    console.log('🔌 Validating API documentation...');

    const apiFiles = glob.sync('app/api/**/route.ts');

    for (const apiFile of apiFiles) {
      this.stats.totalFiles++;
      
      const apiPath = apiFile
        .replace('app/api/', '')
        .replace('/route.ts', '')
        .replace(/\[([^\]]+)\]/g, ':$1');

      const expectedDocPath = `docs/api/${apiPath.replace(/\//g, '-')}.md`;

      if (fs.existsSync(expectedDocPath)) {
        this.stats.documentedFiles++;
        await this.validateDocumentationFile(expectedDocPath, apiFile);
      } else {
        this.stats.missingDocs++;
        this.addIssue('missing_doc', `Missing documentation for API: ${apiFile}`, expectedDocPath);
      }
    }
  }

  async validateDocumentationFile(docPath, sourceFile) {
    try {
      const content = fs.readFileSync(docPath, 'utf8');
      
      // Check for required sections
      const requiredSections = ['## Purpose', '## Usage'];
      for (const section of requiredSections) {
        if (!content.includes(section)) {
          this.addIssue('missing_section', `Missing section "${section}" in ${docPath}`, docPath);
        }
      }

      // Check for placeholder content
      if (content.includes('*Documentation needs to be updated*') ||
          content.includes('*Auto-generated template*')) {
        this.addIssue('placeholder_content', `Documentation contains placeholder content: ${docPath}`, docPath);
      }

      // Check if source file exists
      if (!fs.existsSync(sourceFile)) {
        this.addIssue('orphaned_doc', `Documentation exists but source file missing: ${sourceFile}`, docPath);
      }

      // Check for broken internal links
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      while ((match = linkRegex.exec(content)) !== null) {
        const linkUrl = match[2];
        if (linkUrl.startsWith('./') || linkUrl.startsWith('../') || linkUrl.startsWith('/')) {
          await this.checkInternalLink(linkUrl, docPath);
        }
      }

    } catch (error) {
      this.addIssue('validation_error', `Error validating ${docPath}: ${error.message}`, docPath);
      this.stats.validationErrors++;
    }
  }

  async checkInternalLink(linkUrl, fromFile) {
    let targetPath = linkUrl;
    
    // Convert relative links to absolute paths
    if (linkUrl.startsWith('./') || linkUrl.startsWith('../')) {
      const fromDir = path.dirname(fromFile);
      targetPath = path.resolve(fromDir, linkUrl);
    } else if (linkUrl.startsWith('/')) {
      targetPath = path.join(process.cwd(), linkUrl.substring(1));
    }

    // Remove anchor fragments
    targetPath = targetPath.split('#')[0];

    if (!fs.existsSync(targetPath)) {
      this.addIssue('broken_link', `Broken link in ${fromFile}: ${linkUrl}`, fromFile);
      this.stats.brokenLinks++;
    }
  }

  async checkBrokenLinks() {
    console.log('🔗 Checking for broken links...');
    // This is handled in validateDocumentationFile
  }

  async checkCompleteness() {
    console.log('📋 Checking documentation completeness...');

    // Check if main README exists
    if (!fs.existsSync('docs/README.md')) {
      this.addIssue('missing_main_readme', 'Main documentation README.md is missing', 'docs/README.md');
    }

    // Check if architecture docs exist
    if (!fs.existsSync('docs/architecture/overview.md')) {
      this.addIssue('missing_architecture', 'Architecture overview documentation is missing', 'docs/architecture/overview.md');
    }

    // Check dependency analysis
    if (!fs.existsSync('docs/dependency-analysis.json')) {
      this.addIssue('missing_dependency_analysis', 'Dependency analysis is missing', 'docs/dependency-analysis.json');
    }
  }

  addIssue(type, message, file) {
    this.issues.push({
      type,
      message,
      file,
      timestamp: new Date().toISOString()
    });
  }

  generateReport() {
    console.log('\n📊 Documentation Validation Report');
    console.log('===================================');
    
    console.log(`\n📈 Statistics:`);
    console.log(`  Total source files: ${this.stats.totalFiles}`);
    console.log(`  Documented files: ${this.stats.documentedFiles}`);
    console.log(`  Missing documentation: ${this.stats.missingDocs}`);
    console.log(`  Broken links: ${this.stats.brokenLinks}`);
    console.log(`  Validation errors: ${this.stats.validationErrors}`);
    console.log(`  Coverage: ${((this.stats.documentedFiles / this.stats.totalFiles) * 100).toFixed(1)}%`);

    if (this.issues.length === 0) {
      console.log('\n✅ All documentation validation checks passed!');
      return;
    }

    console.log(`\n❌ Found ${this.issues.length} issues:`);
    
    // Group issues by type
    const issuesByType = {};
    for (const issue of this.issues) {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    }

    for (const [type, issues] of Object.entries(issuesByType)) {
      console.log(`\n🔸 ${type.replace('_', ' ').toUpperCase()} (${issues.length} issues):`);
      for (const issue of issues.slice(0, 10)) { // Show max 10 per type
        console.log(`   - ${issue.message}`);
      }
      if (issues.length > 10) {
        console.log(`   ... and ${issues.length - 10} more`);
      }
    }

    // Save detailed report
    const reportPath = 'docs/validation-report.json';
    const detailedReport = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      issues: this.issues,
      summary: {
        total_issues: this.issues.length,
        coverage_percentage: (this.stats.documentedFiles / this.stats.totalFiles) * 100,
        status: this.issues.length === 0 ? 'PASS' : 'FAIL'
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Exit with error code if issues found
    if (this.issues.length > 0) {
      console.log('\n❌ Documentation validation failed');
      process.exit(1);
    }
  }

  // Generate list of files that need documentation
  generateTodoList() {
    const todoItems = this.issues
      .filter(issue => issue.type === 'missing_doc')
      .map(issue => `- [ ] Create documentation for ${issue.file}`);

    if (todoItems.length > 0) {
      const todoPath = 'docs/documentation-todo.md';
      const todoContent = `# Documentation TODO List

Generated on: ${new Date().toISOString()}

## Missing Documentation Files

${todoItems.join('\n')}

## Instructions

1. Create documentation files for each missing item
2. Use existing documentation as templates
3. Include required sections: Purpose, Usage, Props/Parameters, Dependencies
4. Run \`npm run docs:validate\` to check your progress

## Templates

### Component Template
\`\`\`markdown
# ComponentName

## Purpose
Brief description of what this component does.

## Usage
\`\`\`typescript
import { ComponentName } from './path';
<ComponentName prop="value" />
\`\`\`

## Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|

## Dependencies
List of dependencies and relationships.
\`\`\`

### Hook Template
\`\`\`markdown
# useHookName

## Purpose
Brief description of what this hook does.

## Usage
\`\`\`typescript
const { data, loading } = useHookName();
\`\`\`

## Parameters
Parameters the hook accepts.

## Returns
Values returned by the hook.
\`\`\`

### API Template
\`\`\`markdown
# API Endpoint

## Endpoint
\`/api/endpoint/path\`

## Methods
- GET
- POST

## Authentication
Authentication requirements.

## Request/Response
Schemas and examples.
\`\`\`
`;

      fs.writeFileSync(todoPath, todoContent);
      console.log(`📝 TODO list generated: ${todoPath}`);
    }
  }
}

// Main execution
async function main() {
  const validator = new DocumentationValidator();
  const isValid = await validator.validate();
  
  // Generate TODO list for missing documentation
  validator.generateTodoList();
  
  return isValid;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DocumentationValidator };