#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Dependency analysis script for Mariana application
class DependencyAnalyzer {
  constructor() {
    this.dependencies = new Map();
    this.components = new Map();
    this.hooks = new Map();
    this.apis = new Map();
    this.rootDir = process.cwd();
  }

  // Parse imports from a file
  parseImports(filePath, content) {
    const imports = [];
    const importRegex = /import\s+(?:[\w\s{},*]+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('@/') || importPath.startsWith('./') || importPath.startsWith('../')) {
        imports.push({
          from: filePath,
          to: importPath,
          raw: match[0]
        });
      }
    }

    return imports;
  }

  // Analyze a single file
  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.rootDir, filePath);
      
      const imports = this.parseImports(relativePath, content);
      
      // Categorize the file
      let category = 'unknown';
      if (relativePath.includes('/components/')) {
        category = 'component';
        this.components.set(relativePath, { imports, content: content.slice(0, 500) });
      } else if (relativePath.includes('/hooks/')) {
        category = 'hook';
        this.hooks.set(relativePath, { imports, content: content.slice(0, 500) });
      } else if (relativePath.includes('/api/')) {
        category = 'api';
        this.apis.set(relativePath, { imports, content: content.slice(0, 500) });
      }

      this.dependencies.set(relativePath, {
        category,
        imports,
        exports: this.parseExports(content),
        lines: content.split('\n').length
      });

      return { relativePath, category, imports };
    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error.message);
      return null;
    }
  }

  // Parse exports from content
  parseExports(content) {
    const exports = [];
    const exportRegex = /export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+(\w+)/g;
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return exports;
  }

  // Find all TypeScript/React files
  findSourceFiles(dir = this.rootDir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!entry.name.includes('node_modules') && 
            !entry.name.includes('.next') && 
            !entry.name.includes('dist')) {
          files.push(...this.findSourceFiles(fullPath));
        }
      } else if (entry.isFile() && 
                 (entry.name.endsWith('.tsx') || 
                  entry.name.endsWith('.ts')) &&
                 !entry.name.includes('.test.') &&
                 !entry.name.includes('.spec.')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  // Generate dependency graph
  generateDependencyGraph() {
    console.log('🔍 Analyzing dependencies...');
    
    const sourceFiles = this.findSourceFiles();
    console.log(`Found ${sourceFiles.length} source files`);

    // Analyze each file
    for (const file of sourceFiles) {
      this.analyzeFile(file);
    }

    return this.generateReport();
  }

  // Generate analysis report
  generateReport() {
    const report = {
      summary: {
        totalFiles: this.dependencies.size,
        components: this.components.size,
        hooks: this.hooks.size,
        apis: this.apis.size,
        timestamp: new Date().toISOString()
      },
      componentDependencies: this.getComponentDependencies(),
      hookUsage: this.getHookUsage(),
      apiEndpoints: this.getApiEndpoints(),
      circularDependencies: this.findCircularDependencies(),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  // Get component dependencies
  getComponentDependencies() {
    const deps = {};
    
    for (const [path, data] of this.components) {
      deps[path] = {
        imports: data.imports.length,
        dependencies: data.imports.map(imp => imp.to),
        usedBy: this.findUsages(path)
      };
    }

    return deps;
  }

  // Get hook usage patterns
  getHookUsage() {
    const usage = {};
    
    for (const [path, data] of this.hooks) {
      const hookName = path.split('/').pop().replace('.ts', '').replace('.tsx', '');
      usage[hookName] = {
        path,
        usedBy: this.findUsages(path),
        dependencies: data.imports.map(imp => imp.to)
      };
    }

    return usage;
  }

  // Get API endpoints
  getApiEndpoints() {
    const endpoints = {};
    
    for (const [path, data] of this.apis) {
      const endpoint = path.replace('app/api/', '').replace('/route.ts', '');
      endpoints[endpoint] = {
        path,
        methods: this.extractHttpMethods(data.content),
        dependencies: data.imports.map(imp => imp.to)
      };
    }

    return endpoints;
  }

  // Extract HTTP methods from API route content
  extractHttpMethods(content) {
    const methods = [];
    const methodRegex = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/g;
    let match;

    while ((match = methodRegex.exec(content)) !== null) {
      methods.push(match[1]);
    }

    return methods;
  }

  // Find where a file is used
  findUsages(targetPath) {
    const usages = [];
    const normalizedTarget = targetPath.replace(/\.(ts|tsx)$/, '');
    
    for (const [filePath, data] of this.dependencies) {
      for (const imp of data.imports) {
        if (imp.to.includes(normalizedTarget) || 
            imp.to.replace('@/', '').includes(normalizedTarget)) {
          usages.push(filePath);
        }
      }
    }

    return usages;
  }

  // Find circular dependencies (simplified)
  findCircularDependencies() {
    const circular = [];
    // This is a simplified version - a full implementation would use graph algorithms
    return circular;
  }

  // Generate recommendations
  generateRecommendations() {
    const recommendations = [];
    
    // Find heavily used components
    const usage = {};
    for (const [path] of this.dependencies) {
      const usedBy = this.findUsages(path);
      if (usedBy.length > 5) {
        recommendations.push({
          type: 'high-usage',
          file: path,
          usageCount: usedBy.length,
          suggestion: 'Consider documenting this heavily used component'
        });
      }
    }

    return recommendations;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting dependency analysis...');
  
  const analyzer = new DependencyAnalyzer();
  const report = analyzer.generateDependencyGraph();
  
  // Write report to docs
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  const reportPath = path.join(docsDir, 'dependency-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📊 Analysis complete! Report saved to: ${reportPath}`);
  console.log(`📈 Found ${report.summary.totalFiles} files, ${report.summary.components} components, ${report.summary.hooks} hooks`);
  
  return report;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DependencyAnalyzer };