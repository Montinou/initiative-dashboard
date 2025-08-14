/**
 * Performance Optimization Cleanup System
 * Removes unused imports, redundant code, and optimizes existing implementations
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// UNUSED IMPORT DETECTION
// ============================================================================

export class UnusedImportCleaner {
  private projectRoot: string;
  
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }
  
  // Scan for unused imports in a file
  scanFileForUnusedImports(filePath: string): string[] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const unusedImports: string[] = [];
      
      lines.forEach((line, index) => {
        if (line.trim().startsWith('import ')) {
          const importMatch = line.match(/import\s+(?:\{([^}]+)\}|\s*(\w+)|\s*\*\s+as\s+(\w+))\s+from/);
          
          if (importMatch) {
            let imports: string[] = [];
            
            if (importMatch[1]) {
              // Named imports: import { a, b, c } from '...'
              imports = importMatch[1]
                .split(',')
                .map(imp => imp.trim().split(' as ')[0].trim());
            } else if (importMatch[2]) {
              // Default import: import Something from '...'
              imports = [importMatch[2].trim()];
            } else if (importMatch[3]) {
              // Namespace import: import * as Something from '...'
              imports = [importMatch[3].trim()];
            }
            
            // Check if each import is used in the file
            imports.forEach(importName => {
              if (!this.isImportUsed(content, importName, index)) {
                unusedImports.push(`Line ${index + 1}: ${importName}`);
              }
            });
          }
        }
      });
      
      return unusedImports;
    } catch (error) {
      console.error(`Error scanning ${filePath}:`, error);
      return [];
    }
  }
  
  private isImportUsed(content: string, importName: string, importLine: number): boolean {
    const lines = content.split('\n');
    
    // Remove the import line itself from the search
    const searchContent = lines
      .filter((_, index) => index !== importLine)
      .join('\n');
    
    // Check for usage patterns
    const usagePatterns = [
      new RegExp(`\\b${importName}\\b`, 'g'),
      new RegExp(`\\b${importName}\\.`, 'g'),
      new RegExp(`<${importName}\\b`, 'g'),
      new RegExp(`</${importName}>`, 'g'),
    ];
    
    return usagePatterns.some(pattern => pattern.test(searchContent));
  }
  
  // Scan entire project for unused imports
  scanProjectForUnusedImports(): Record<string, string[]> {
    const results: Record<string, string[]> = {};
    
    const scanDirectory = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and other irrelevant directories
          if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(item)) {
            scanDirectory(fullPath);
          }
        } else if (item.match(/\.(ts|tsx|js|jsx)$/)) {
          const unusedImports = this.scanFileForUnusedImports(fullPath);
          if (unusedImports.length > 0) {
            results[fullPath] = unusedImports;
          }
        }
      });
    };
    
    scanDirectory(this.projectRoot);
    return results;
  }
}

// ============================================================================
// REDUNDANT CODE DETECTION
// ============================================================================

export class RedundantCodeDetector {
  private projectRoot: string;
  
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }
  
  // Find duplicate utility functions
  findDuplicateUtilities(): Record<string, string[]> {
    const utilities: Record<string, string[]> = {};
    
    const scanForUtilities = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !['node_modules', '.git', '.next'].includes(item)) {
          scanForUtilities(fullPath);
        } else if (item.match(/\.(ts|tsx)$/) && item.includes('util')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          
          // Extract function names
          const functionMatches = content.match(/(?:export\s+)?(?:const|function)\s+(\w+)/g);
          
          if (functionMatches) {
            functionMatches.forEach(match => {
              const funcName = match.replace(/(?:export\s+)?(?:const|function)\s+/, '');
              
              if (!utilities[funcName]) {
                utilities[funcName] = [];
              }
              utilities[funcName].push(fullPath);
            });
          }
        }
      });
    };
    
    scanForUtilities(this.projectRoot);
    
    // Return only duplicates
    return Object.fromEntries(
      Object.entries(utilities).filter(([, files]) => files.length > 1)
    );
  }
  
  // Find redundant component definitions
  findRedundantComponents(): Record<string, string[]> {
    const components: Record<string, string[]> = {};
    
    const scanForComponents = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !['node_modules', '.git', '.next'].includes(item)) {
          scanForComponents(fullPath);
        } else if (item.match(/\.(tsx)$/)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          
          // Extract React component names
          const componentMatches = content.match(/(?:export\s+)?(?:const|function)\s+([A-Z]\w*)/g);
          
          if (componentMatches) {
            componentMatches.forEach(match => {
              const compName = match.replace(/(?:export\s+)?(?:const|function)\s+/, '');
              
              if (!components[compName]) {
                components[compName] = [];
              }
              components[compName].push(fullPath);
            });
          }
        }
      });
    };
    
    scanForComponents(this.projectRoot);
    
    // Return only duplicates
    return Object.fromEntries(
      Object.entries(components).filter(([, files]) => files.length > 1)
    );
  }
}

// ============================================================================
// PERFORMANCE OPTIMIZATION CLEANER
// ============================================================================

export class PerformanceOptimizationCleaner {
  private projectRoot: string;
  
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }
  
  // Remove redundant optimization files
  cleanupRedundantOptimizations(): string[] {
    const removedFiles: string[] = [];
    
    const optimizationPatterns = [
      /performance.*\.old\.tsx?$/,
      /optimization.*\.backup\.tsx?$/,
      /.*\.perf\.backup\.tsx?$/,
      /temp.*performance.*\.tsx?$/,
      /test.*optimization.*\.tsx?$/,
    ];
    
    const scanAndClean = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !['node_modules', '.git', '.next'].includes(item)) {
          scanAndClean(fullPath);
        } else {
          // Check if file matches redundant optimization patterns
          if (optimizationPatterns.some(pattern => pattern.test(item))) {
            try {
              fs.unlinkSync(fullPath);
              removedFiles.push(fullPath);
            } catch (error) {
              console.error(`Failed to remove ${fullPath}:`, error);
            }
          }
        }
      });
    };
    
    scanAndClean(this.projectRoot);
    return removedFiles;
  }
  
  // Clean up old performance monitoring code
  cleanupOldPerformanceCode(): Record<string, number> {
    const cleanupStats = {
      filesModified: 0,
      linesRemoved: 0
    };
    
    const oldPerformancePatterns = [
      /console\.time\(['"].*performance.*['"]\)/g,
      /console\.timeEnd\(['"].*performance.*['"]\)/g,
      /\/\/ TODO: Performance optimization/g,
      /\/\* Performance monitoring \*\//g,
      /performance\.mark\(['"].*['"]\)/g,
      /performance\.measure\(['"].*['"]\)/g,
    ];
    
    const scanAndCleanContent = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !['node_modules', '.git', '.next'].includes(item)) {
          scanAndCleanContent(fullPath);
        } else if (item.match(/\.(ts|tsx|js|jsx)$/)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            let modifiedContent = content;
            let linesRemovedInFile = 0;
            
            oldPerformancePatterns.forEach(pattern => {
              const matches = modifiedContent.match(pattern);
              if (matches) {
                linesRemovedInFile += matches.length;
                modifiedContent = modifiedContent.replace(pattern, '');
              }
            });
            
            if (linesRemovedInFile > 0) {
              fs.writeFileSync(fullPath, modifiedContent);
              cleanupStats.filesModified++;
              cleanupStats.linesRemoved += linesRemovedInFile;
            }
          } catch (error) {
            console.error(`Error processing ${fullPath}:`, error);
          }
        }
      });
    };
    
    scanAndCleanContent(this.projectRoot);
    return cleanupStats;
  }
}

// ============================================================================
// BUNDLE SIZE OPTIMIZER
// ============================================================================

export class BundleSizeOptimizer {
  private projectRoot: string;
  
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }
  
  // Optimize import statements for better tree shaking
  optimizeImports(): Record<string, number> {
    const optimizationStats = {
      filesOptimized: 0,
      importsOptimized: 0
    };
    
    const optimizeFileImports = (filePath: string) => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        let modifiedContent = content;
        let importsOptimizedInFile = 0;
        
        // Optimize lucide-react imports
        const lucideImportPattern = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;
        modifiedContent = modifiedContent.replace(lucideImportPattern, (match, imports) => {
          const importList = imports.split(',').map((imp: string) => imp.trim());
          
          if (importList.length > 5) {
            // Convert to individual imports for better tree shaking
            const individualImports = importList.map((imp: string) => 
              `import ${imp} from 'lucide-react/icons/${imp.toLowerCase().replace(/([A-Z])/g, '-$1').substring(1)}';`
            ).join('\n');
            
            importsOptimizedInFile++;
            return individualImports;
          }
          
          return match;
        });
        
        // Optimize lodash imports
        const lodashImportPattern = /import\s+(_|lodash)\s+from\s*['"]lodash['"]/g;
        modifiedContent = modifiedContent.replace(lodashImportPattern, () => {
          importsOptimizedInFile++;
          return '// Optimized: Use specific lodash functions instead of full library';
        });
        
        // Optimize moment.js imports (suggest date-fns)
        const momentImportPattern = /import\s+moment\s+from\s*['"]moment['"]/g;
        modifiedContent = modifiedContent.replace(momentImportPattern, () => {
          importsOptimizedInFile++;
          return '// Optimized: Consider using date-fns instead of moment.js for smaller bundle size';
        });
        
        if (importsOptimizedInFile > 0) {
          fs.writeFileSync(filePath, modifiedContent);
          optimizationStats.filesOptimized++;
          optimizationStats.importsOptimized += importsOptimizedInFile;
        }
      } catch (error) {
        console.error(`Error optimizing imports in ${filePath}:`, error);
      }
    };
    
    const scanDirectory = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !['node_modules', '.git', '.next'].includes(item)) {
          scanDirectory(fullPath);
        } else if (item.match(/\.(ts|tsx|js|jsx)$/)) {
          optimizeFileImports(fullPath);
        }
      });
    };
    
    scanDirectory(this.projectRoot);
    return optimizationStats;
  }
}

// ============================================================================
// COMPREHENSIVE CLEANUP ORCHESTRATOR
// ============================================================================

export class ComprehensiveCleanup {
  private projectRoot: string;
  private unusedImportCleaner: UnusedImportCleaner;
  private redundantCodeDetector: RedundantCodeDetector;
  private performanceOptimizationCleaner: PerformanceOptimizationCleaner;
  private bundleSizeOptimizer: BundleSizeOptimizer;
  
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.unusedImportCleaner = new UnusedImportCleaner(projectRoot);
    this.redundantCodeDetector = new RedundantCodeDetector(projectRoot);
    this.performanceOptimizationCleaner = new PerformanceOptimizationCleaner(projectRoot);
    this.bundleSizeOptimizer = new BundleSizeOptimizer(projectRoot);
  }
  
  // Run comprehensive cleanup
  async runComprehensiveCleanup(): Promise<{
    unusedImports: Record<string, string[]>;
    duplicateUtilities: Record<string, string[]>;
    redundantComponents: Record<string, string[]>;
    removedFiles: string[];
    performanceCleanup: Record<string, number>;
    bundleOptimization: Record<string, number>;
    summary: {
      totalIssuesFound: number;
      totalFilesAffected: number;
      estimatedBundleSizeReduction: string;
    };
  }> {
    console.log('🧹 Starting comprehensive performance optimization cleanup...');
    
    // 1. Detect unused imports
    console.log('📦 Scanning for unused imports...');
    const unusedImports = this.unusedImportCleaner.scanProjectForUnusedImports();
    
    // 2. Find duplicate utilities and components
    console.log('🔍 Detecting redundant code...');
    const duplicateUtilities = this.redundantCodeDetector.findDuplicateUtilities();
    const redundantComponents = this.redundantCodeDetector.findRedundantComponents();
    
    // 3. Clean up redundant optimization files
    console.log('🗑️ Removing redundant optimization files...');
    const removedFiles = this.performanceOptimizationCleaner.cleanupRedundantOptimizations();
    
    // 4. Clean up old performance monitoring code
    console.log('⚡ Cleaning up old performance code...');
    const performanceCleanup = this.performanceOptimizationCleaner.cleanupOldPerformanceCode();
    
    // 5. Optimize bundle size
    console.log('📊 Optimizing bundle size...');
    const bundleOptimization = this.bundleSizeOptimizer.optimizeImports();
    
    // Generate summary
    const totalIssuesFound = 
      Object.keys(unusedImports).length +
      Object.keys(duplicateUtilities).length +
      Object.keys(redundantComponents).length +
      removedFiles.length;
    
    const totalFilesAffected = 
      Object.keys(unusedImports).length +
      removedFiles.length +
      performanceCleanup.filesModified +
      bundleOptimization.filesOptimized;
    
    const estimatedBundleSizeReduction = 
      `${(bundleOptimization.importsOptimized * 2 + removedFiles.length * 5)}KB`;
    
    const results = {
      unusedImports,
      duplicateUtilities,
      redundantComponents,
      removedFiles,
      performanceCleanup,
      bundleOptimization,
      summary: {
        totalIssuesFound,
        totalFilesAffected,
        estimatedBundleSizeReduction
      }
    };
    
    console.log('✅ Cleanup completed!');
    console.log(`📈 Summary: ${totalIssuesFound} issues found, ${totalFilesAffected} files affected`);
    console.log(`💾 Estimated bundle size reduction: ${estimatedBundleSizeReduction}`);
    
    return results;
  }
  
  // Generate cleanup report
  generateCleanupReport(results: any): string {
    const report = `
# Performance Optimization Cleanup Report

## Summary
- **Total Issues Found:** ${results.summary.totalIssuesFound}
- **Total Files Affected:** ${results.summary.totalFilesAffected}
- **Estimated Bundle Size Reduction:** ${results.summary.estimatedBundleSizeReduction}

## Unused Imports
${Object.entries(results.unusedImports).map(([file, imports]: [string, any]) => 
  `- **${file}:**\n  - ${imports.join('\n  - ')}`
).join('\n')}

## Duplicate Utilities
${Object.entries(results.duplicateUtilities).map(([utility, files]: [string, any]) => 
  `- **${utility}:** Found in ${files.length} files\n  - ${files.join('\n  - ')}`
).join('\n')}

## Redundant Components
${Object.entries(results.redundantComponents).map(([component, files]: [string, any]) => 
  `- **${component}:** Found in ${files.length} files\n  - ${files.join('\n  - ')}`
).join('\n')}

## Removed Files
${results.removedFiles.map((file: string) => `- ${file}`).join('\n')}

## Performance Code Cleanup
- **Files Modified:** ${results.performanceCleanup.filesModified}
- **Lines Removed:** ${results.performanceCleanup.linesRemoved}

## Bundle Optimization
- **Files Optimized:** ${results.bundleOptimization.filesOptimized}
- **Imports Optimized:** ${results.bundleOptimization.importsOptimized}

## Recommendations
1. Review unused imports and remove them manually
2. Consolidate duplicate utilities into shared modules
3. Consider merging similar components
4. Implement tree-shaking optimizations
5. Use dynamic imports for heavy components

Generated on: ${new Date().toISOString()}
    `;
    
    return report;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export {
  UnusedImportCleaner,
  RedundantCodeDetector,
  PerformanceOptimizationCleaner,
  BundleSizeOptimizer,
  ComprehensiveCleanup
};