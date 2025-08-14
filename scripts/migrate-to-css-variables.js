#!/usr/bin/env node

/**
 * Migration Script: Hardcoded Colors to CSS Variables
 * 
 * This script identifies hardcoded Tailwind color classes and provides
 * suggestions for migrating to CSS variable-based classes.
 */

const fs = require('fs')
const path = require('path')
const glob = require('glob')

// Color mappings from hardcoded to CSS variables
const colorMappings = {
  // Background colors
  'bg-blue-500': 'bg-primary',
  'bg-blue-600': 'bg-primary',
  'bg-green-500': 'bg-success',
  'bg-green-600': 'bg-success',
  'bg-red-500': 'bg-destructive',
  'bg-red-600': 'bg-destructive',
  'bg-yellow-500': 'bg-warning',
  'bg-orange-500': 'bg-warning',
  'bg-gray-100': 'bg-muted',
  'bg-gray-50': 'bg-muted',
  'bg-slate-100': 'bg-muted',
  'bg-slate-50': 'bg-muted',
  'bg-white': 'bg-card',
  'bg-gray-900': 'bg-card', // for dark mode
  'bg-slate-900': 'bg-card', // for dark mode
  
  // Text colors
  'text-blue-500': 'text-primary',
  'text-blue-600': 'text-primary',
  'text-green-500': 'text-success',
  'text-green-600': 'text-success',
  'text-red-500': 'text-destructive',
  'text-red-600': 'text-destructive',
  'text-yellow-500': 'text-warning',
  'text-orange-500': 'text-warning',
  'text-gray-600': 'text-muted-foreground',
  'text-gray-500': 'text-muted-foreground',
  'text-slate-600': 'text-muted-foreground',
  'text-slate-500': 'text-muted-foreground',
  'text-gray-900': 'text-foreground',
  'text-black': 'text-foreground',
  'text-white': 'text-primary-foreground',
  
  // Border colors
  'border-blue-500': 'border-primary',
  'border-green-500': 'border-success',
  'border-red-500': 'border-destructive',
  'border-yellow-500': 'border-warning',
  'border-gray-200': 'border-border',
  'border-gray-300': 'border-border',
  'border-slate-200': 'border-border',
  'border-slate-300': 'border-border',
  
  // Ring colors (focus states)
  'ring-blue-500': 'ring-ring',
  'ring-blue-600': 'ring-ring',
  'focus:ring-blue-500': 'focus:ring-ring',
  'focus:ring-blue-600': 'focus:ring-ring'
}

// Patterns to detect hardcoded colors
const colorPatterns = [
  // Standard Tailwind color patterns
  /\b(bg|text|border|ring|from|to|via)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(\d+|50)\b/g,
  
  // Hover states
  /\bhover:(bg|text|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(\d+|50)\b/g,
  
  // Focus states
  /\bfocus:(bg|text|border|ring)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(\d+|50)\b/g
]

function findTSXFiles(directory) {
  const pattern = path.join(directory, '**/*.{tsx,jsx,ts,js}')
  return glob.sync(pattern, {
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/scripts/**'
    ]
  })
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const issues = []
  
  // Find all hardcoded color classes
  colorPatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const hardcodedClass = match[0]
      const suggestion = colorMappings[hardcodedClass] || getSuggestion(hardcodedClass)
      
      issues.push({
        class: hardcodedClass,
        suggestion,
        line: getLineNumber(content, match.index),
        context: getContext(content, match.index)
      })
    }
  })
  
  return issues
}

function getSuggestion(hardcodedClass) {
  // Extract type and color info
  const [, prefix, color, shade] = hardcodedClass.match(/^(\w+:)?(bg|text|border|ring)-([\w-]+)-(\d+|50)$/) || []
  
  if (!prefix && !color) return 'Consider using CSS variables'
  
  // Map common patterns
  const type = prefix ? prefix.replace(':', '') : ''
  const property = hardcodedClass.includes('bg-') ? 'bg' : 
                  hardcodedClass.includes('text-') ? 'text' :
                  hardcodedClass.includes('border-') ? 'border' : 'ring'
  
  // Suggest based on color meaning
  if (color.includes('blue') || color.includes('indigo')) {
    return `${type ? type + ':' : ''}${property}-primary`
  } else if (color.includes('green') || color.includes('emerald')) {
    return `${type ? type + ':' : ''}${property}-success`
  } else if (color.includes('red') || color.includes('rose')) {
    return `${type ? type + ':' : ''}${property}-destructive`
  } else if (color.includes('yellow') || color.includes('orange') || color.includes('amber')) {
    return `${type ? type + ':' : ''}${property}-warning`
  } else if (color.includes('gray') || color.includes('slate')) {
    if (parseInt(shade) <= 200) {
      return `${type ? type + ':' : ''}${property}-muted`
    } else {
      return `${type ? type + ':' : ''}${property}-muted-foreground`
    }
  }
  
  return 'Consider using semantic CSS variables'
}

function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length
}

function getContext(content, index) {
  const lines = content.split('\n')
  const lineNum = getLineNumber(content, index) - 1
  const line = lines[lineNum]
  const start = Math.max(0, line.indexOf('<'))
  const end = Math.min(line.length, line.indexOf('>') + 1)
  return line.substring(start, end) || line.trim()
}

function generateReport(results) {
  console.log('\n🎨 CSS Variable Migration Report\n')
  console.log('=' .repeat(60))
  
  let totalIssues = 0
  const summary = {}
  
  results.forEach(({ file, issues }) => {
    if (issues.length > 0) {
      console.log(`\n📁 ${path.relative(process.cwd(), file)}`)
      console.log('-'.repeat(40))
      
      issues.forEach(issue => {
        console.log(`  Line ${issue.line}: ${issue.class}`)
        console.log(`    → Suggested: ${issue.suggestion}`)
        console.log(`    Context: ${issue.context.substring(0, 80)}${issue.context.length > 80 ? '...' : ''}`)
        console.log()
        
        // Track for summary
        summary[issue.class] = (summary[issue.class] || 0) + 1
        totalIssues++
      })
    }
  })
  
  // Summary
  console.log('\n📊 Summary')
  console.log('=' .repeat(60))
  console.log(`Total files analyzed: ${results.length}`)
  console.log(`Files with issues: ${results.filter(r => r.issues.length > 0).length}`)
  console.log(`Total hardcoded colors found: ${totalIssues}`)
  
  if (Object.keys(summary).length > 0) {
    console.log('\n🔍 Most common hardcoded colors:')
    Object.entries(summary)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([className, count]) => {
        console.log(`  ${className}: ${count} occurrences`)
      })
  }
  
  // Recommendations
  console.log('\n💡 Migration Recommendations:')
  console.log('1. Replace hardcoded colors with semantic CSS variables')
  console.log('2. Use bg-primary, text-primary, etc. for brand colors')
  console.log('3. Use bg-success, text-success, etc. for semantic colors')
  console.log('4. Use bg-muted, text-muted-foreground, etc. for neutral colors')
  console.log('5. Test with all tenant themes after migration')
  console.log('\n📖 See docs/color-palette-documentation.md for complete reference')
}

function main() {
  console.log('🔍 Scanning for hardcoded Tailwind colors...')
  
  const projectRoot = process.cwd()
  const files = findTSXFiles(projectRoot)
  
  console.log(`Found ${files.length} files to analyze`)
  
  const results = files.map(file => ({
    file,
    issues: analyzeFile(file)
  }))
  
  generateReport(results)
  
  // Write detailed report to file
  const reportPath = path.join(projectRoot, 'color-migration-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
  console.log(`\n💾 Detailed report saved to: ${reportPath}`)
}

if (require.main === module) {
  main()
}

module.exports = {
  findTSXFiles,
  analyzeFile,
  colorMappings
}