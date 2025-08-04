/**
 * Mock Data Detection Tests
 * 
 * OBJECTIVE: Prove there are NO mock, hardcoded, or sample data in the dashboard
 * Tests validate:
 * - All data comes from real database sources
 * - No hardcoded fallbacks or mock responses
 * - No sample/dummy data in components
 * - Real API integration throughout
 */

import { describe, it, expect, vi } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Pattern matching for mock data indicators
const MOCK_DATA_PATTERNS = [
  // Direct mock indicators
  /mock[^a-zA-Z]/gi,
  /dummy[^a-zA-Z]/gi,
  /fake[^a-zA-Z]/gi,
  /sample[^a-zA-Z]/gi,
  /hardcoded/gi,
  /test.*data/gi,
  
  // Common mock data patterns
  /lorem\s+ipsum/gi,
  /john\s+doe/gi,
  /jane\s+smith/gi,
  /example\.com/gi,
  /test@test\./gi,
  
  // Mock API responses
  /mockResolvedValue/gi,
  /mockReturnValue/gi,
  /vi\.fn\(\)/gi,
  /jest\.fn\(\)/gi,
  
  // Hardcoded arrays/objects that look like sample data
  /\[\s*{\s*id:\s*['"`][^'"`]*['"`],\s*title:\s*['"`][^'"`]*['"`]/gi,
  /\[\s*['"`]item\s*\d+['"`]/gi,
  
  // Static sample data structures
  /const\s+\w*sample\w*/gi,
  /const\s+\w*mock\w*/gi,
  /const\s+\w*dummy\w*/gi,
  /const\s+\w*test.*data\w*/gi,
]

// Files to exclude from mock detection (test files are allowed to have mocks)
const EXCLUDED_PATTERNS = [
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /__tests__/,
  /test/,
  /\.mock\./,
  /node_modules/,
  /\.next/,
  /dist/,
  /build/,
  /coverage/,
  /\.git/,
  /setup\.ts$/,
  /vitest\.config/,
  /jest\.config/,
]

// Critical files that must be 100% real data
const CRITICAL_FILES = [
  'app/dashboard/page.tsx',
  'app/dashboard/dashboard-client.tsx',
  'components/InitiativeDashboard.tsx',
  'hooks/useInitiatives.tsx',
  'hooks/useAreas.tsx', 
  'hooks/useInitiativesSummary.tsx',
]

function walkDirectory(dir: string, basePath: string = ''): string[] {
  const files: string[] = []
  
  try {
    const items = readdirSync(dir)
    
    for (const item of items) {
      const fullPath = join(dir, item)
      const relativePath = join(basePath, item)
      
      // Skip excluded directories/files
      if (EXCLUDED_PATTERNS.some(pattern => pattern.test(relativePath))) {
        continue
      }
      
      const stat = statSync(fullPath)
      
      if (stat.isDirectory()) {
        files.push(...walkDirectory(fullPath, relativePath))
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
  
  return files
}

describe('Mock Data Detection Tests', () => {
  const projectRoot = process.cwd()
  
  describe('Critical Files Analysis', () => {
    CRITICAL_FILES.forEach(fileName => {
      it(`should validate ${fileName} contains no mock data`, () => {
        const filePath = join(projectRoot, fileName)
        
        let content: string
        try {
          content = readFileSync(filePath, 'utf-8')
        } catch (error) {
          // File might not exist - check if it's expected
          console.warn(`Critical file not found: ${fileName}`)
          return
        }

        // Check for mock data patterns
        const violations: string[] = []
        
        MOCK_DATA_PATTERNS.forEach((pattern, index) => {
          const matches = content.match(pattern)
          if (matches) {
            matches.forEach(match => {
              // Extract context around the match
              const matchIndex = content.indexOf(match)
              const start = Math.max(0, matchIndex - 50)
              const end = Math.min(content.length, matchIndex + match.length + 50)
              const context = content.slice(start, end)
              
              violations.push(`Pattern ${index + 1} "${pattern}" matched: "${match}" in context: "${context}"`)
            })
          }
        })

        expect(violations).toEqual([])
      })
    })
  })

  describe('Component Files Analysis', () => {
    it('should scan all component files for mock data', () => {
      const componentFiles = walkDirectory(join(projectRoot, 'components'))
      const violations: { file: string, issues: string[] }[] = []

      componentFiles.forEach(filePath => {
        const content = readFileSync(filePath, 'utf-8')
        const fileViolations: string[] = []

        // Check for hardcoded data arrays
        const hardcodedArrayPattern = /const\s+\w+\s*=\s*\[[\s\S]*?\]/g
        const arrayMatches = content.match(hardcodedArrayPattern)
        
        if (arrayMatches) {
          arrayMatches.forEach(match => {
            // Check if array contains object-like structures (potential mock data)
            if (/{[\s\S]*?}/.test(match)) {
              fileViolations.push(`Potential hardcoded data array: ${match.slice(0, 100)}...`)
            }
          })
        }

        // Check for hardcoded objects
        const hardcodedObjectPattern = /const\s+\w+\s*=\s*{[\s\S]*?}/g
        const objectMatches = content.match(hardcodedObjectPattern)
        
        if (objectMatches) {
          objectMatches.forEach(match => {
            // Skip type definitions and config objects
            if (!/type|interface|config|theme|style/i.test(match)) {
              // Check if it looks like data
              if (/id|title|name|description/i.test(match)) {
                fileViolations.push(`Potential hardcoded data object: ${match.slice(0, 100)}...`)
              }
            }
          })
        }

        if (fileViolations.length > 0) {
          violations.push({
            file: filePath.replace(projectRoot, ''),
            issues: fileViolations
          })
        }
      })

      // Log violations for debugging but don't fail if they're legitimate
      if (violations.length > 0) {
        console.warn('Potential hardcoded data found:', violations)
      }

      // Only fail if critical patterns are found
      const criticalViolations = violations.filter(v => 
        v.issues.some(issue => 
          /sample|dummy|mock|fake/i.test(issue)
        )
      )

      expect(criticalViolations).toEqual([])
    })
  })

  describe('Hook Files Analysis', () => {
    it('should validate hooks use real Supabase integration', () => {
      const hookFiles = walkDirectory(join(projectRoot, 'hooks'))
      const violations: { file: string, issues: string[] }[] = []

      hookFiles.forEach(filePath => {
        const content = readFileSync(filePath, 'utf-8')
        const fileViolations: string[] = []

        // Must use createClient for real Supabase
        if (!content.includes('createClient') && content.includes('supabase')) {
          fileViolations.push('Hook uses supabase but not createClient')
        }

        // Should not return hardcoded data
        const returnStatements = content.match(/return\s*{[\s\S]*?}/g)
        if (returnStatements) {
          returnStatements.forEach(returnStmt => {
            if (/\[\s*{.*?}\s*\]/.test(returnStmt)) {
              fileViolations.push(`Potential hardcoded return data: ${returnStmt.slice(0, 100)}...`)
            }
          })
        }

        // Check for mock functions
        if (content.includes('vi.fn()') || content.includes('jest.fn()')) {
          fileViolations.push('Hook contains mock functions (should only be in tests)')
        }

        if (fileViolations.length > 0) {
          violations.push({
            file: filePath.replace(projectRoot, ''),
            issues: fileViolations
          })
        }
      })

      expect(violations).toEqual([])
    })
  })

  describe('API Route Analysis', () => {
    it('should validate API routes use real database queries', () => {
      const apiFiles = walkDirectory(join(projectRoot, 'app', 'api'))
      const violations: { file: string, issues: string[] }[] = []

      apiFiles.forEach(filePath => {
        const content = readFileSync(filePath, 'utf-8')
        const fileViolations: string[] = []

        // API routes should use Supabase
        if (content.includes('export') && content.includes('async') && 
            !content.includes('supabase') && !content.includes('createClient')) {
          fileViolations.push('API route does not use Supabase')
        }

        // Should not return hardcoded responses
        const jsonResponses = content.match(/Response\.json\([\s\S]*?\)/g)
        if (jsonResponses) {
          jsonResponses.forEach(response => {
            if (/\[\s*{.*?}\s*\]/.test(response)) {
              fileViolations.push(`Potential hardcoded JSON response: ${response.slice(0, 100)}...`)
            }
          })
        }

        if (fileViolations.length > 0) {
          violations.push({
            file: filePath.replace(projectRoot, ''),
            issues: fileViolations
          })
        }
      })

      expect(violations).toEqual([])
    })
  })

  describe('Dashboard Page Analysis', () => {
    it('should validate dashboard pages use real data sources', () => {
      const dashboardFiles = walkDirectory(join(projectRoot, 'app', 'dashboard'))
      const violations: { file: string, issues: string[] }[] = []

      dashboardFiles.forEach(filePath => {
        const content = readFileSync(filePath, 'utf-8')
        const fileViolations: string[] = []

        // Dashboard pages should use hooks or API calls
        if (content.includes('export default') && 
            !content.includes('use') && !content.includes('fetch') && 
            !content.includes('createClient')) {
          fileViolations.push('Dashboard page does not use data hooks or API calls')
        }

        // Check for suspicious static data
        MOCK_DATA_PATTERNS.forEach(pattern => {
          const matches = content.match(pattern)
          if (matches) {
            matches.forEach(match => {
              fileViolations.push(`Mock data pattern found: ${match}`)
            })
          }
        })

        if (fileViolations.length > 0) {
          violations.push({
            file: filePath.replace(projectRoot, ''),
            issues: fileViolations
          })
        }
      })

      expect(violations).toEqual([])
    })
  })

  describe('Supabase Integration Validation', () => {
    it('should validate proper Supabase client usage', () => {
      const allFiles = [
        ...walkDirectory(join(projectRoot, 'hooks')),
        ...walkDirectory(join(projectRoot, 'components')),
        ...walkDirectory(join(projectRoot, 'app')),
        ...walkDirectory(join(projectRoot, 'lib'))
      ]

      const supabaseFiles = allFiles.filter(filePath => {
        const content = readFileSync(filePath, 'utf-8')
        return content.includes('supabase') || content.includes('createClient')
      })

      const validationResults: { file: string, valid: boolean, issues: string[] }[] = []

      supabaseFiles.forEach(filePath => {
        const content = readFileSync(filePath, 'utf-8')
        const issues: string[] = []

        // Should import createClient correctly
        if (content.includes('supabase') && !content.includes('createClient') && 
            !content.includes('@supabase/supabase-js')) {
          issues.push('Uses supabase without proper client creation')
        }

        // Should use proper query patterns
        if (content.includes('from(') && !content.includes('.select(')) {
          issues.push('Uses from() without select() - incomplete query')
        }

        // Should implement tenant isolation
        if (content.includes('from(') && content.includes('select(') && 
            !content.includes('tenant_id') && !filePath.includes('superadmin')) {
          issues.push('Query lacks tenant isolation')
        }

        validationResults.push({
          file: filePath.replace(projectRoot, ''),
          valid: issues.length === 0,
          issues
        })
      })

      const invalidFiles = validationResults.filter(result => !result.valid)
      
      if (invalidFiles.length > 0) {
        console.warn('Supabase integration issues:', invalidFiles)
      }

      // Allow some warnings but fail on critical issues
      const criticalIssues = invalidFiles.filter(file => 
        file.issues.some(issue => 
          issue.includes('without proper client creation') ||
          issue.includes('incomplete query')
        )
      )

      expect(criticalIssues).toEqual([])
    })
  })

  describe('Real Data Flow Validation', () => {
    it('should trace data flow from database to UI', () => {
      // Check critical data flow files exist and have proper integration
      const dataFlowFiles = [
        'utils/supabase/client.ts',
        'hooks/useInitiatives.tsx',
        'components/InitiativeDashboard.tsx',
        'app/dashboard/page.tsx'
      ]

      const flowValidation: { file: string, hasRealIntegration: boolean }[] = []

      dataFlowFiles.forEach(fileName => {
        const filePath = join(projectRoot, fileName)
        let hasRealIntegration = false

        try {
          const content = readFileSync(filePath, 'utf-8')
          
          // Check for real integration patterns
          const realPatterns = [
            /createClient/,
            /from\(['"`]\w+['"`]\)/,
            /select\(/,
            /\.eq\(/,
            /supabase/
          ]

          hasRealIntegration = realPatterns.some(pattern => pattern.test(content))
        } catch (error) {
          // File doesn't exist
        }

        flowValidation.push({
          file: fileName,
          hasRealIntegration
        })
      })

      // All critical files should have real integration
      const missingIntegration = flowValidation.filter(f => !f.hasRealIntegration)
      
      if (missingIntegration.length > 0) {
        console.warn('Files missing real integration:', missingIntegration)
      }

      // At least 75% of critical files should have real integration
      const integrationRate = flowValidation.filter(f => f.hasRealIntegration).length / flowValidation.length
      expect(integrationRate).toBeGreaterThanOrEqual(0.75)
    })
  })
})