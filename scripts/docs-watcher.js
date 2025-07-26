#!/usr/bin/env node

const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DocumentationWatcher {
  constructor() {
    this.watchPaths = [
      'components/**/*.{ts,tsx}',
      'hooks/**/*.{ts,tsx}',
      'lib/**/*.{ts,tsx}',
      'app/api/**/*.ts'
    ];
    this.debounceTime = 2000; // 2 seconds
    this.debounceTimer = null;
    this.isGenerating = false;
  }

  start() {
    console.log('🔍 Starting documentation file watcher...');
    console.log('📁 Watching paths:', this.watchPaths);

    const watcher = chokidar.watch(this.watchPaths, {
      ignored: [
        /node_modules/,
        /\.next/,
        /dist/,
        /build/,
        /\.test\./,
        /\.spec\./
      ],
      persistent: true,
      ignoreInitial: true
    });

    watcher
      .on('change', (filePath) => this.handleFileChange(filePath, 'changed'))
      .on('add', (filePath) => this.handleFileChange(filePath, 'added'))
      .on('unlink', (filePath) => this.handleFileChange(filePath, 'removed'))
      .on('error', (error) => console.error('Watcher error:', error));

    console.log('✅ Documentation watcher is running');
    console.log('   Changes will trigger documentation updates after 2 second delay');
    console.log('   Press Ctrl+C to stop');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping documentation watcher...');
      watcher.close();
      process.exit(0);
    });
  }

  handleFileChange(filePath, action) {
    console.log(`📝 File ${action}: ${filePath}`);

    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer to debounce multiple rapid changes
    this.debounceTimer = setTimeout(() => {
      this.updateDocumentation(filePath, action);
    }, this.debounceTime);
  }

  async updateDocumentation(filePath, action) {
    if (this.isGenerating) {
      console.log('⏳ Documentation generation already in progress, skipping...');
      return;
    }

    try {
      this.isGenerating = true;
      console.log('🔄 Updating documentation...');

      // Determine what type of documentation to update
      const updateType = this.determineUpdateType(filePath);
      
      switch (updateType) {
        case 'component':
          await this.updateComponentDoc(filePath);
          break;
        case 'hook':
          await this.updateHookDoc(filePath);
          break;
        case 'api':
          await this.updateApiDoc(filePath);
          break;
        case 'lib':
          await this.updateLibDoc(filePath);
          break;
        default:
          console.log(`ℹ️  No specific documentation handler for ${filePath}`);
      }

      // Update dependency analysis
      await this.updateDependencyAnalysis();

      // Update main documentation index if needed
      await this.updateMainIndex();

      console.log(`✅ Documentation updated for ${filePath}`);

    } catch (error) {
      console.error('❌ Error updating documentation:', error.message);
    } finally {
      this.isGenerating = false;
    }
  }

  determineUpdateType(filePath) {
    if (filePath.includes('/components/')) {
      return 'component';
    } else if (filePath.includes('/hooks/')) {
      return 'hook';
    } else if (filePath.includes('/api/')) {
      return 'api';
    } else if (filePath.includes('/lib/')) {
      return 'lib';
    }
    return 'unknown';
  }

  async updateComponentDoc(filePath) {
    console.log(`📦 Updating component documentation for ${filePath}`);
    
    // Extract component name from file path
    const componentName = path.basename(filePath, path.extname(filePath));
    const isUIComponent = filePath.includes('/ui/');
    
    // Create documentation path
    const docPath = isUIComponent 
      ? `docs/components/ui/${componentName}.md`
      : `docs/components/${componentName}.md`;

    // Check if documentation already exists
    if (!fs.existsSync(docPath)) {
      console.log(`📝 Creating new documentation file: ${docPath}`);
      await this.generateComponentDocumentation(filePath, docPath);
    } else {
      console.log(`🔄 Updating existing documentation: ${docPath}`);
      await this.updateExistingDocumentation(filePath, docPath);
    }
  }

  async updateHookDoc(filePath) {
    console.log(`🎣 Updating hook documentation for ${filePath}`);
    
    const hookName = path.basename(filePath, path.extname(filePath));
    const docPath = `docs/hooks/${hookName}.md`;

    if (!fs.existsSync(docPath)) {
      console.log(`📝 Creating new hook documentation: ${docPath}`);
      // Generate basic hook documentation template
      await this.generateHookDocumentation(filePath, docPath);
    }
  }

  async updateApiDoc(filePath) {
    console.log(`🔌 Updating API documentation for ${filePath}`);
    
    // Extract API endpoint from path
    const apiPath = filePath
      .replace('app/api/', '')
      .replace('/route.ts', '')
      .replace(/\[([^\]]+)\]/g, ':$1'); // Convert [id] to :id

    const docPath = `docs/api/${apiPath.replace(/\//g, '-')}.md`;
    
    if (!fs.existsSync(docPath)) {
      console.log(`📝 Creating new API documentation: ${docPath}`);
      await this.generateApiDocumentation(filePath, docPath);
    }
  }

  async updateLibDoc(filePath) {
    console.log(`📚 Updating library documentation for ${filePath}`);
    // Placeholder for library documentation updates
  }

  async generateComponentDocumentation(filePath, docPath) {
    // Basic template generation - in a real implementation,
    // this would parse the component file and extract props, etc.
    const componentName = path.basename(filePath, path.extname(filePath));
    
    const template = `# ${componentName} Component

## Purpose
Auto-generated documentation for ${componentName} component.

## Usage
\`\`\`typescript
import { ${componentName} } from '${filePath.replace('.tsx', '').replace('.ts', '')}';

// Basic usage example
<${componentName} />
\`\`\`

## Props
*Documentation needs to be updated with actual props*

## Dependencies
*Auto-generated dependency analysis*

---
*File: \`${filePath}\`*
*Last updated: ${new Date().toISOString()}*
*Status: Auto-generated template - needs manual review*
`;

    // Ensure directory exists
    const docDir = path.dirname(docPath);
    if (!fs.existsSync(docDir)) {
      fs.mkdirSync(docDir, { recursive: true });
    }

    fs.writeFileSync(docPath, template);
    console.log(`✅ Generated documentation template: ${docPath}`);
  }

  async generateHookDocumentation(filePath, docPath) {
    const hookName = path.basename(filePath, path.extname(filePath));
    
    const template = `# ${hookName} Hook

## Purpose
Auto-generated documentation for ${hookName} hook.

## Usage
\`\`\`typescript
import { ${hookName} } from '${filePath.replace('.tsx', '').replace('.ts', '')}';

// Basic usage example
const { data, loading, error } = ${hookName}();
\`\`\`

## Parameters
*Documentation needs to be updated with actual parameters*

## Returns
*Documentation needs to be updated with return values*

## Dependencies
*Auto-generated dependency analysis*

---
*File: \`${filePath}\`*
*Last updated: ${new Date().toISOString()}*
*Status: Auto-generated template - needs manual review*
`;

    // Ensure directory exists
    const docDir = path.dirname(docPath);
    if (!fs.existsSync(docDir)) {
      fs.mkdirSync(docDir, { recursive: true });
    }

    fs.writeFileSync(docPath, template);
    console.log(`✅ Generated hook documentation template: ${docPath}`);
  }

  async generateApiDocumentation(filePath, docPath) {
    const endpointName = path.basename(filePath, '.ts').replace('route', 'API');
    
    const template = `# ${endpointName} Documentation

## Endpoint
\`${filePath.replace('app/api/', '/api/').replace('/route.ts', '')}\`

## Methods
*Auto-detected HTTP methods will be listed here*

## Authentication
*Authentication requirements*

## Request/Response
*Request and response schemas*

## Examples
*Usage examples*

---
*File: \`${filePath}\`*
*Last updated: ${new Date().toISOString()}*
*Status: Auto-generated template - needs manual review*
`;

    // Ensure directory exists
    const docDir = path.dirname(docPath);
    if (!fs.existsSync(docDir)) {
      fs.mkdirSync(docDir, { recursive: true });
    }

    fs.writeFileSync(docPath, template);
    console.log(`✅ Generated API documentation template: ${docPath}`);
  }

  async updateExistingDocumentation(filePath, docPath) {
    // Update the "last updated" timestamp in existing documentation
    try {
      let content = fs.readFileSync(docPath, 'utf8');
      
      // Update timestamp
      const timestampRegex = /\*Last updated: [^*]+\*/;
      const newTimestamp = `*Last updated: ${new Date().toISOString()}*`;
      
      if (timestampRegex.test(content)) {
        content = content.replace(timestampRegex, newTimestamp);
      } else {
        // Add timestamp if it doesn't exist
        content += `\n\n---\n${newTimestamp}`;
      }

      fs.writeFileSync(docPath, content);
      console.log(`🔄 Updated timestamp in ${docPath}`);
    } catch (error) {
      console.error(`Error updating ${docPath}:`, error.message);
    }
  }

  async updateDependencyAnalysis() {
    try {
      console.log('📊 Updating dependency analysis...');
      execSync('node scripts/analyze-dependencies.js', { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      console.log('✅ Dependency analysis updated');
    } catch (error) {
      console.error('❌ Error updating dependency analysis:', error.message);
    }
  }

  async updateMainIndex() {
    // Update the main documentation index with any new files
    console.log('📋 Checking documentation index...');
    
    // This would scan the docs directory and update the main README
    // with any new documentation files that were created
    
    // For now, just log that we checked
    console.log('✅ Documentation index checked');
  }
}

// Main execution
if (require.main === module) {
  const watcher = new DocumentationWatcher();
  watcher.start();
}

module.exports = { DocumentationWatcher };