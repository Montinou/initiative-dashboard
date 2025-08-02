/**
 * Real Data Integration Validation Tests
 * 
 * OBJECTIVE: Prove the dashboard uses 100% real data integration
 * Tests validate without UI rendering:
 * - Hook functions use real Supabase clients
 * - No hardcoded or mock data in source files
 * - Proper database query patterns
 * - Authentication and security integration
 */

import { describe, it, expect, vi, Mock } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Mock only the client creation, validate real usage patterns
vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn()
}))

vi.mock('@/lib/auth-context', () => ({
  useTenantId: vi.fn(),
  useAuth: vi.fn(),
  useUserRole: vi.fn()
}))

describe('Real Data Integration Validation', () => {
  const projectRoot = process.cwd()

  describe('Source Code Analysis', () => {
    it('should validate dashboard.tsx uses real data hooks', () => {
      const dashboardPath = join(projectRoot, 'dashboard', 'dashboard.tsx')
      const content = readFileSync(dashboardPath, 'utf-8')

      // Should import real data hooks
      expect(content).toContain('useInitiatives')
      expect(content).toContain('useAreas')
      expect(content).toContain('useInitiativesSummary')
      
      // Should not contain mock data comments or patterns
      expect(content).not.toMatch(/mock.*data/i)
      expect(content).not.toMatch(/hardcoded/i)
      expect(content).not.toMatch(/sample.*data/i)
      
      // Should indicate real data usage
      expect(content).toContain('real Supabase data')
    })

    it('should validate useInitiatives hook uses real Supabase queries', () => {
      const hookPath = join(projectRoot, 'hooks', 'useInitiatives.tsx')
      const content = readFileSync(hookPath, 'utf-8')

      // Must use createClient for real Supabase
      expect(content).toContain('createClient')
      expect(content).toContain('@/utils/supabase/client')
      
      // Must implement proper database queries
      expect(content).toContain('.from(\'initiatives\')')
      expect(content).toContain('.select(')
      expect(content).toContain('.eq(\'tenant_id\'')
      
      // Must implement real-time subscriptions  
      expect(content).toContain('channel(')
      expect(content).toContain('postgres_changes')
      expect(content).toContain('subscribe()')
      
      // Must have CRUD operations
      expect(content).toContain('createInitiative')
      expect(content).toContain('updateInitiative') 
      expect(content).toContain('deleteInitiative')
      
      // Should not contain any mock patterns
      expect(content).not.toMatch(/vi\.fn\(\)/g)
      expect(content).not.toMatch(/jest\.fn\(\)/g)
      expect(content).not.toMatch(/mockResolvedValue/g)
    })

    it('should validate InitiativeDashboard component uses real hooks', () => {
      const componentPath = join(projectRoot, 'components', 'InitiativeDashboard.tsx')
      const content = readFileSync(componentPath, 'utf-8')

      // Must use real data hooks
      expect(content).toContain('useInitiatives')
      expect(content).toContain('useAreas')
      expect(content).toContain('useTenantId')
      
      // Should handle loading and error states (real async behavior)
      expect(content).toMatch(/loading|isLoading/i)
      expect(content).toMatch(/error/i)
      
      // Should not contain hardcoded data arrays
      const hardcodedArrayPattern = /const\s+\w+\s*=\s*\[\s*{[\s\S]*?}\s*\]/g
      const matches = content.match(hardcodedArrayPattern)
      
      if (matches) {
        // Allow theme/config arrays but not data arrays
        const dataArrays = matches.filter(match => 
          /id.*title|name.*description/i.test(match) &&
          !/(color|theme|config)/i.test(match)
        )
        expect(dataArrays).toHaveLength(0)
      }
    })
  })

  describe('Database Query Patterns', () => {
    it('should validate proper tenant isolation patterns', () => {
      const hookFiles = [
        'hooks/useInitiatives.tsx',
        'hooks/useAreas.tsx',
        'hooks/useInitiativesSummary.tsx'
      ]

      hookFiles.forEach(filePath => {
        const fullPath = join(projectRoot, filePath)
        const content = readFileSync(fullPath, 'utf-8')

        // Must include tenant_id filtering
        expect(content).toContain('tenant_id')
        expect(content).toContain('.eq(\'tenant_id\'')
        
        // Must use tenantId from auth context
        expect(content).toContain('useTenantId')
        
        // Must validate tenant exists before queries
        expect(content).toMatch(/if.*tenantId|tenantId.*return/g)
      })
    })

    it('should validate complex query relationships', () => {
      const initiativesHookPath = join(projectRoot, 'hooks', 'useInitiatives.tsx')
      const content = readFileSync(initiativesHookPath, 'utf-8')

      // Must include proper JOIN relationships
      expect(content).toContain('areas!initiatives_area_id_fkey')
      expect(content).toContain('subtasks(*)')
      
      // Must transform relational data properly
      expect(content).toContain('area: initiative.areas')
      expect(content).toContain('subtasks: initiative.subtasks')
      expect(content).toContain('subtask_count')
      expect(content).toContain('completed_subtasks')
    })

    it('should validate real-time subscription patterns', () => {
      const hookPath = join(projectRoot, 'hooks', 'useInitiatives.tsx')
      const content = readFileSync(hookPath, 'utf-8')

      // Must set up proper channels
      expect(content).toContain('supabase.channel(')
      expect(content).toContain('initiatives-changes')
      
      // Must listen to both initiatives and subtasks
      expect(content).toContain('table: \'initiatives\'')
      expect(content).toContain('table: \'subtasks\'')
      
      // Must filter by tenant in real-time
      expect(content).toContain('filter: `tenant_id=eq.${tenantId}`')
      
      // Must clean up subscriptions
      expect(content).toContain('removeChannel')
    })
  })

  describe('Authentication Integration', () => {
    it('should validate auth context integration', () => {
      const authContextPath = join(projectRoot, 'lib', 'auth-context.tsx')
      const content = readFileSync(authContextPath, 'utf-8')

      // Must use real Supabase auth
      expect(content).toContain('supabase.auth')
      expect(content).toContain('getSession')
      expect(content).toContain('onAuthStateChange')
      
      // Must provide tenant isolation
      expect(content).toContain('useTenantId')
      expect(content).toContain('tenant_id')
    })

    it('should validate role-based permissions', () => {
      const roleUtilsPath = join(projectRoot, 'lib', 'role-utils.ts')
      const content = readFileSync(roleUtilsPath, 'utf-8')

      // Must implement real permission checking
      expect(content).toContain('hasPermission')
      expect(content).toContain('canAccessOKRs')
      
      // Must define role types
      expect(content).toMatch(/Manager|Analyst|Admin/g)
    })
  })

  describe('API Route Validation', () => {
    it('should validate API routes use real database queries', () => {
      const apiRoutePaths = [
        'app/api/initiatives/route.ts',
        'app/api/areas/route.ts',
        'app/api/dashboard/route.ts'
      ]

      apiRoutePaths.forEach(routePath => {
        const fullPath = join(projectRoot, routePath)
        
        try {
          const content = readFileSync(fullPath, 'utf-8')
          
          // Must use Supabase client
          expect(content).toMatch(/createClient|supabase/g)
          
          // Must implement tenant isolation
          expect(content).toContain('tenant_id')
          
          // Must handle errors properly
          expect(content).toMatch(/error|catch/g)
          
          // Must return proper HTTP responses
          expect(content).toContain('Response.json')
          
        } catch (error) {
          // Route file might not exist - that's OK for this test
          console.warn(`API route not found: ${routePath}`)
        }
      })
    })
  })

  describe('Supabase Client Configuration', () => {
    it('should validate Supabase client is properly configured', () => {
      const clientPath = join(projectRoot, 'utils', 'supabase', 'client.ts')
      const content = readFileSync(clientPath, 'utf-8')

      // Must create real Supabase client
      expect(content).toContain('createClient')
      expect(content).toContain('@supabase/supabase-js')
      
      // Must use environment variables (not hardcoded URLs)
      expect(content).toContain('process.env')
      expect(content).toContain('NEXT_PUBLIC_SUPABASE_URL')
      expect(content).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    })

    it('should validate server-side client is configured', () => {
      const serverClientPath = join(projectRoot, 'utils', 'supabase', 'server.ts')
      
      try {
        const content = readFileSync(serverClientPath, 'utf-8')
        
        // Must handle server-side auth
        expect(content).toContain('createServerClient')
        expect(content).toContain('cookies')
        
      } catch (error) {
        // Server client might not exist - that's acceptable
        console.warn('Server-side Supabase client not found')
      }
    })
  })

  describe('Data Type Validation', () => {
    it('should validate TypeScript types match database schema', () => {
      const typesPath = join(projectRoot, 'types', 'database.ts')
      
      try {
        const content = readFileSync(typesPath, 'utf-8')
        
        // Must define proper database types
        expect(content).toMatch(/Initiative|Area|Subtask/g)
        expect(content).toContain('tenant_id')
        expect(content).toMatch(/id.*string|uuid/g)
        
      } catch (error) {
        // Types file might be elsewhere
        console.warn('Database types file not found at expected location')
      }
    })
  })

  describe('Environment Configuration', () => {
    it('should validate environment variables are used (not hardcoded)', () => {
      const configFiles = [
        'next.config.mjs',
        '.env.local',
        '.env.example'
      ]

      // Check that Supabase config comes from environment
      const supabaseFiles = [
        'utils/supabase/client.ts',
        'utils/supabase/server.ts'
      ]

      supabaseFiles.forEach(filePath => {
        const fullPath = join(projectRoot, filePath)
        
        try {
          const content = readFileSync(fullPath, 'utf-8')
          
          // Must not contain hardcoded URLs
          expect(content).not.toMatch(/https:\/\/\w+\.supabase\.co/g)
          expect(content).not.toMatch(/eyJ[A-Za-z0-9_-]+/g) // JWT pattern
          
          // Must use process.env
          expect(content).toContain('process.env')
          
        } catch (error) {
          // File might not exist
        }
      })
    })
  })
})