# Integration Testing Guide

## Introduction

Integration tests verify that different parts of the Initiative Dashboard work together correctly. These tests focus on the interactions between components, APIs, databases, and external services while maintaining reasonable isolation and speed.

## Scope of Integration Testing

### What We Test
- API endpoint contracts and responses
- Database operations with real schemas
- Authentication and authorization flows
- Multi-component workflows
- Service integrations (Supabase, Redis, GCS)
- Data flow between layers
- Transaction handling

### What We Mock
- External third-party APIs (Gemini, Dialogflow)
- Email services (Brevo)
- File storage (GCS) - sometimes
- Time-dependent operations
- Network failures for error testing

## Test Environment Setup

### Database Configuration

```typescript
// automation/utils/test-database.ts
import { createClient } from '@supabase/supabase-js'

export const setupTestDatabase = async () => {
  const supabase = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_SERVICE_KEY!
  )
  
  // Create test tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .insert({ 
      subdomain: 'test-tenant',
      organization_id: 'test-org-id' 
    })
    .select()
    .single()
  
  return { supabase, tenant }
}

export const cleanupTestDatabase = async (supabase: any, tenantId: string) => {
  // Clean up in reverse order of dependencies
  await supabase.from('activities').delete().eq('tenant_id', tenantId)
  await supabase.from('initiatives').delete().eq('tenant_id', tenantId)
  await supabase.from('objectives').delete().eq('tenant_id', tenantId)
  await supabase.from('areas').delete().eq('tenant_id', tenantId)
  await supabase.from('user_profiles').delete().eq('tenant_id', tenantId)
  await supabase.from('tenants').delete().eq('id', tenantId)
}
```

### Test Utilities

```typescript
// automation/utils/integration-helpers.ts
import { NextRequest } from 'next/server'

export const createAuthenticatedRequest = (
  url: string,
  options: RequestInit = {},
  user = { id: 'test-user-id', email: 'test@example.com' }
) => {
  const token = createTestJWT(user)
  
  return new NextRequest(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
}

export const createTestJWT = (user: any) => {
  // Create a valid JWT for testing
  // In real tests, use a proper JWT library
  return 'test-jwt-token'
}
```

## API Integration Tests

### Testing API Endpoints

```typescript
// automation/integration/api/initiatives.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GET, POST, PATCH, DELETE } from '@/app/api/initiatives/route'
import { setupTestDatabase, cleanupTestDatabase } from '@/test-utils/test-database'
import { createAuthenticatedRequest } from '@/test-utils/integration-helpers'

describe('Initiatives API Integration', () => {
  let supabase: any
  let tenant: any
  let testUser: any

  beforeEach(async () => {
    const setup = await setupTestDatabase()
    supabase = setup.supabase
    tenant = setup.tenant
    
    // Create test user
    const { data: user } = await supabase
      .from('user_profiles')
      .insert({
        tenant_id: tenant.id,
        email: 'test@example.com',
        role: 'admin',
        user_id: 'test-user-id'
      })
      .select()
      .single()
    
    testUser = user
  })

  afterEach(async () => {
    await cleanupTestDatabase(supabase, tenant.id)
  })

  describe('GET /api/initiatives', () => {
    it('should return initiatives for authenticated user tenant', async () => {
      // Create test initiatives
      await supabase
        .from('initiatives')
        .insert([
          {
            tenant_id: tenant.id,
            title: 'Test Initiative 1',
            area_id: 'area-1',
            created_by: testUser.id,
            progress: 50
          },
          {
            tenant_id: tenant.id,
            title: 'Test Initiative 2',
            area_id: 'area-2',
            created_by: testUser.id,
            progress: 75
          }
        ])

      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/initiatives',
        { method: 'GET' },
        testUser
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.initiatives).toHaveLength(2)
      expect(data.initiatives[0].title).toBe('Test Initiative 1')
      expect(data.initiatives[1].progress).toBe(75)
    })

    it('should filter initiatives by area', async () => {
      // Create initiatives in different areas
      await supabase
        .from('initiatives')
        .insert([
          {
            tenant_id: tenant.id,
            title: 'Sales Initiative',
            area_id: 'sales-area',
            created_by: testUser.id
          },
          {
            tenant_id: tenant.id,
            title: 'Marketing Initiative',
            area_id: 'marketing-area',
            created_by: testUser.id
          }
        ])

      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/initiatives?area_id=sales-area',
        { method: 'GET' },
        testUser
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.initiatives).toHaveLength(1)
      expect(data.initiatives[0].title).toBe('Sales Initiative')
    })

    it('should return 401 for unauthenticated requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/initiatives')
      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({ error: 'Unauthorized' })
    })
  })

  describe('POST /api/initiatives', () => {
    it('should create new initiative with activities', async () => {
      const requestBody = {
        title: 'New Q4 Initiative',
        description: 'Test description',
        area_id: 'test-area',
        start_date: '2025-01-01',
        due_date: '2025-03-31',
        activities: [
          {
            title: 'Activity 1',
            description: 'First activity'
          },
          {
            title: 'Activity 2',
            description: 'Second activity'
          }
        ]
      }

      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/initiatives',
        {
          method: 'POST',
          body: JSON.stringify(requestBody)
        },
        testUser
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBeDefined()
      expect(data.title).toBe('New Q4 Initiative')
      expect(data.activities).toHaveLength(2)

      // Verify in database
      const { data: dbInitiative } = await supabase
        .from('initiatives')
        .select('*, activities(*)')
        .eq('id', data.id)
        .single()

      expect(dbInitiative).toBeDefined()
      expect(dbInitiative.activities).toHaveLength(2)
    })

    it('should validate required fields', async () => {
      const invalidBody = {
        description: 'Missing title'
      }

      const request = createAuthenticatedRequest(
        'http://localhost:3000/api/initiatives',
        {
          method: 'POST',
          body: JSON.stringify(invalidBody)
        },
        testUser
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Title is required')
    })
  })

  describe('PATCH /api/initiatives/[id]', () => {
    it('should update initiative progress', async () => {
      // Create initiative
      const { data: initiative } = await supabase
        .from('initiatives')
        .insert({
          tenant_id: tenant.id,
          title: 'Test Initiative',
          area_id: 'test-area',
          created_by: testUser.id,
          progress: 50
        })
        .select()
        .single()

      const updateBody = {
        progress: 75,
        status: 'in_progress'
      }

      const request = createAuthenticatedRequest(
        `http://localhost:3000/api/initiatives/${initiative.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updateBody)
        },
        testUser
      )

      const response = await PATCH(request, { params: { id: initiative.id } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.progress).toBe(75)
      expect(data.status).toBe('in_progress')

      // Verify in database
      const { data: updated } = await supabase
        .from('initiatives')
        .select()
        .eq('id', initiative.id)
        .single()

      expect(updated.progress).toBe(75)
    })

    it('should prevent cross-tenant updates', async () => {
      // Create another tenant
      const { data: otherTenant } = await supabase
        .from('tenants')
        .insert({ subdomain: 'other-tenant' })
        .select()
        .single()

      // Create initiative in other tenant
      const { data: initiative } = await supabase
        .from('initiatives')
        .insert({
          tenant_id: otherTenant.id,
          title: 'Other Tenant Initiative',
          area_id: 'test-area',
          created_by: 'other-user'
        })
        .select()
        .single()

      const request = createAuthenticatedRequest(
        `http://localhost:3000/api/initiatives/${initiative.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ progress: 100 })
        },
        testUser
      )

      const response = await PATCH(request, { params: { id: initiative.id } })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/initiatives/[id]', () => {
    it('should delete initiative and cascade to activities', async () => {
      // Create initiative with activities
      const { data: initiative } = await supabase
        .from('initiatives')
        .insert({
          tenant_id: tenant.id,
          title: 'To Delete',
          area_id: 'test-area',
          created_by: testUser.id
        })
        .select()
        .single()

      await supabase
        .from('activities')
        .insert([
          { initiative_id: initiative.id, title: 'Activity 1' },
          { initiative_id: initiative.id, title: 'Activity 2' }
        ])

      const request = createAuthenticatedRequest(
        `http://localhost:3000/api/initiatives/${initiative.id}`,
        { method: 'DELETE' },
        testUser
      )

      const response = await DELETE(request, { params: { id: initiative.id } })

      expect(response.status).toBe(204)

      // Verify deletion
      const { data: deleted } = await supabase
        .from('initiatives')
        .select()
        .eq('id', initiative.id)
        .single()

      expect(deleted).toBeNull()

      // Verify activities also deleted
      const { data: activities } = await supabase
        .from('activities')
        .select()
        .eq('initiative_id', initiative.id)

      expect(activities).toHaveLength(0)
    })
  })
})
```

## Database Integration Tests

### Testing RLS Policies

```typescript
// automation/integration/database/rls-policies.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('Row Level Security Policies', () => {
  let adminClient: any
  let userClient: any
  let tenant1: any
  let tenant2: any

  beforeEach(async () => {
    // Admin client bypasses RLS
    adminClient = createClient(
      process.env.TEST_SUPABASE_URL!,
      process.env.TEST_SUPABASE_SERVICE_KEY!
    )

    // Create two tenants
    const { data: t1 } = await adminClient
      .from('tenants')
      .insert({ subdomain: 'tenant1' })
      .select()
      .single()
    tenant1 = t1

    const { data: t2 } = await adminClient
      .from('tenants')
      .insert({ subdomain: 'tenant2' })
      .select()
      .single()
    tenant2 = t2

    // Create users in different tenants
    const { data: { user: user1 } } = await adminClient.auth.admin.createUser({
      email: 'user1@tenant1.com',
      password: 'password123'
    })

    await adminClient
      .from('user_profiles')
      .insert({
        user_id: user1.id,
        tenant_id: tenant1.id,
        email: 'user1@tenant1.com',
        role: 'manager'
      })

    // Create authenticated client for user1
    const { data: { session } } = await adminClient.auth.signInWithPassword({
      email: 'user1@tenant1.com',
      password: 'password123'
    })

    userClient = createClient(
      process.env.TEST_SUPABASE_URL!,
      process.env.TEST_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      }
    )
  })

  afterEach(async () => {
    // Cleanup
    await adminClient.from('user_profiles').delete().eq('tenant_id', tenant1.id)
    await adminClient.from('user_profiles').delete().eq('tenant_id', tenant2.id)
    await adminClient.from('tenants').delete().eq('id', tenant1.id)
    await adminClient.from('tenants').delete().eq('id', tenant2.id)
  })

  it('should only allow users to see data from their tenant', async () => {
    // Create initiatives in both tenants
    await adminClient
      .from('initiatives')
      .insert([
        {
          tenant_id: tenant1.id,
          title: 'Tenant 1 Initiative',
          area_id: 'area1',
          created_by: 'user1'
        },
        {
          tenant_id: tenant2.id,
          title: 'Tenant 2 Initiative',
          area_id: 'area2',
          created_by: 'user2'
        }
      ])

    // User can only see their tenant's data
    const { data, error } = await userClient
      .from('initiatives')
      .select()

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data[0].title).toBe('Tenant 1 Initiative')
  })

  it('should prevent users from inserting data into other tenants', async () => {
    const { error } = await userClient
      .from('initiatives')
      .insert({
        tenant_id: tenant2.id, // Wrong tenant
        title: 'Malicious Initiative',
        area_id: 'area1',
        created_by: 'user1'
      })

    expect(error).toBeDefined()
    expect(error.message).toContain('new row violates row-level security policy')
  })

  it('should enforce role-based access for managers', async () => {
    // Create areas
    const { data: area1 } = await adminClient
      .from('areas')
      .insert({
        tenant_id: tenant1.id,
        name: 'Area 1',
        manager_id: 'user1'
      })
      .select()
      .single()

    const { data: area2 } = await adminClient
      .from('areas')
      .insert({
        tenant_id: tenant1.id,
        name: 'Area 2',
        manager_id: 'other-user'
      })
      .select()
      .single()

    // Create initiatives in both areas
    await adminClient
      .from('initiatives')
      .insert([
        {
          tenant_id: tenant1.id,
          title: 'My Area Initiative',
          area_id: area1.id,
          created_by: 'user1'
        },
        {
          tenant_id: tenant1.id,
          title: 'Other Area Initiative',
          area_id: area2.id,
          created_by: 'other-user'
        }
      ])

    // Manager can update their area's initiatives
    const { error: updateError } = await userClient
      .from('initiatives')
      .update({ progress: 50 })
      .eq('area_id', area1.id)

    expect(updateError).toBeNull()

    // Manager cannot update other area's initiatives
    const { error: otherAreaError } = await userClient
      .from('initiatives')
      .update({ progress: 50 })
      .eq('area_id', area2.id)

    expect(otherAreaError).toBeDefined()
  })
})
```

## Authentication Flow Tests

### Testing Login and Session Management

```typescript
// automation/integration/auth/authentication.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

describe('Authentication Flow Integration', () => {
  let supabase: any

  beforeEach(() => {
    supabase = createClient(
      process.env.TEST_SUPABASE_URL!,
      process.env.TEST_SUPABASE_ANON_KEY!
    )
  })

  describe('User Registration and Login', () => {
    it('should complete full registration flow', async () => {
      const testEmail = `test-${Date.now()}@example.com`
      
      // 1. Register new user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'SecurePassword123!',
        options: {
          data: {
            full_name: 'Test User',
            tenant_id: 'test-tenant'
          }
        }
      })

      expect(signUpError).toBeNull()
      expect(signUpData.user).toBeDefined()
      expect(signUpData.user.email).toBe(testEmail)

      // 2. Verify user profile created
      const { data: profile } = await supabase
        .from('user_profiles')
        .select()
        .eq('user_id', signUpData.user.id)
        .single()

      expect(profile).toBeDefined()
      expect(profile.email).toBe(testEmail)

      // 3. Sign out
      await supabase.auth.signOut()

      // 4. Sign in again
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: 'SecurePassword123!'
      })

      expect(signInError).toBeNull()
      expect(signInData.session).toBeDefined()
      expect(signInData.session.access_token).toBeDefined()

      // 5. Verify session is valid
      const { data: { user } } = await supabase.auth.getUser()
      expect(user).toBeDefined()
      expect(user.email).toBe(testEmail)
    })

    it('should handle invalid credentials', async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'WrongPassword'
      })

      expect(error).toBeDefined()
      expect(error.message).toContain('Invalid login credentials')
    })

    it('should handle password reset flow', async () => {
      const testEmail = 'reset@example.com'

      // Request password reset
      const { error } = await supabase.auth.resetPasswordForEmail(testEmail, {
        redirectTo: 'http://localhost:3000/auth/reset-password'
      })

      expect(error).toBeNull()
      // In a real test, we'd verify the email was sent
    })
  })

  describe('Session Management', () => {
    it('should refresh expired tokens', async () => {
      // Sign in to get initial session
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(session).toBeDefined()
      const initialToken = session.access_token

      // Force token refresh
      const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()

      expect(refreshedSession).toBeDefined()
      expect(refreshedSession.access_token).not.toBe(initialToken)
    })

    it('should maintain session across requests', async () => {
      // Sign in
      const { data: { session } } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      })

      // Create new client with session
      const authenticatedClient = createClient(
        process.env.TEST_SUPABASE_URL!,
        process.env.TEST_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          }
        }
      )

      // Verify session is valid
      const { data: { user } } = await authenticatedClient.auth.getUser()
      expect(user).toBeDefined()
      expect(user.email).toBe('test@example.com')
    })
  })
})
```

## Service Integration Tests

### Testing File Upload with GCS

```typescript
// automation/integration/services/file-upload.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Storage } from '@google-cloud/storage'
import { POST } from '@/app/api/upload/okr-file/route'
import { createAuthenticatedRequest } from '@/test-utils/integration-helpers'

// Mock GCS for integration tests
vi.mock('@google-cloud/storage', () => ({
  Storage: vi.fn().mockImplementation(() => ({
    bucket: vi.fn().mockReturnValue({
      file: vi.fn().mockReturnValue({
        save: vi.fn(),
        exists: vi.fn().mockResolvedValue([false]),
        getSignedUrl: vi.fn().mockResolvedValue(['https://mock-url.com'])
      })
    })
  }))
}))

describe('File Upload Integration', () => {
  let mockStorage: any

  beforeEach(() => {
    mockStorage = new Storage()
  })

  it('should upload and process OKR file', async () => {
    // Create mock file
    const fileContent = Buffer.from('mock excel content')
    const file = new File([fileContent], 'okr-data.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    // Create form data
    const formData = new FormData()
    formData.append('file', file)
    formData.append('area_id', 'test-area')

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/upload/okr-file',
      {
        method: 'POST',
        body: formData
      }
    )

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.job_id).toBeDefined()
    expect(data.status).toBe('processing')

    // Verify GCS upload was called
    const bucket = mockStorage.bucket()
    const gcsFile = bucket.file()
    expect(gcsFile.save).toHaveBeenCalled()
  })

  it('should validate file size limits', async () => {
    // Create oversized file (>10MB)
    const largeContent = Buffer.alloc(11 * 1024 * 1024) // 11MB
    const file = new File([largeContent], 'large.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    const formData = new FormData()
    formData.append('file', file)

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/upload/okr-file',
      {
        method: 'POST',
        body: formData
      }
    )

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('File too large')
  })

  it('should reject invalid file types', async () => {
    const file = new File(['content'], 'document.pdf', {
      type: 'application/pdf'
    })

    const formData = new FormData()
    formData.append('file', file)

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/upload/okr-file',
      {
        method: 'POST',
        body: formData
      }
    )

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('File type ".pdf" not supported')
  })
})
```

### Testing Redis Cache Integration

```typescript
// automation/integration/services/cache.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Redis } from '@upstash/redis'
import { GET } from '@/app/api/dashboard/kpi-data/route'
import { createAuthenticatedRequest } from '@/test-utils/integration-helpers'

describe('Redis Cache Integration', () => {
  let redis: Redis
  let cacheKey: string

  beforeEach(() => {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    })
    cacheKey = 'test:kpi:data'
  })

  afterEach(async () => {
    // Clean up test cache entries
    await redis.del(cacheKey)
  })

  it('should cache KPI data on first request', async () => {
    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/dashboard/kpi-data'
    )

    // First request - should miss cache
    const response1 = await GET(request)
    const data1 = await response1.json()
    
    expect(response1.headers.get('X-Cache')).toBe('MISS')
    expect(data1.metrics).toBeDefined()

    // Verify data was cached
    const cachedData = await redis.get(cacheKey)
    expect(cachedData).toBeDefined()

    // Second request - should hit cache
    const response2 = await GET(request)
    const data2 = await response2.json()
    
    expect(response2.headers.get('X-Cache')).toBe('HIT')
    expect(data2).toEqual(data1) // Same data
  })

  it('should invalidate cache on data update', async () => {
    // Cache some data
    await redis.set(cacheKey, { metrics: { old: 'data' } }, { ex: 3600 })

    // Update initiative (triggers cache invalidation)
    const updateRequest = createAuthenticatedRequest(
      'http://localhost:3000/api/initiatives/123',
      {
        method: 'PATCH',
        body: JSON.stringify({ progress: 100 })
      }
    )

    await PATCH(updateRequest, { params: { id: '123' } })

    // Verify cache was invalidated
    const cachedData = await redis.get(cacheKey)
    expect(cachedData).toBeNull()
  })

  it('should handle cache errors gracefully', async () => {
    // Simulate Redis being unavailable
    const originalGet = redis.get
    redis.get = vi.fn().mockRejectedValue(new Error('Redis connection failed'))

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/dashboard/kpi-data'
    )

    const response = await GET(request)
    const data = await response.json()

    // Should still return data despite cache error
    expect(response.status).toBe(200)
    expect(data.metrics).toBeDefined()
    expect(response.headers.get('X-Cache')).toBe('ERROR')

    redis.get = originalGet
  })
})
```

## Multi-Component Integration Tests

### Testing Complete User Workflows

```typescript
// automation/integration/workflows/initiative-creation.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InitiativeDashboard } from '@/components/InitiativeDashboard'
import { createWrapper } from '@/test-utils/test-providers'
import { setupMockServer } from '@/test-utils/msw-setup'

describe('Initiative Creation Workflow', () => {
  const server = setupMockServer()

  beforeEach(() => {
    server.listen()
  })

  afterEach(() => {
    server.close()
  })

  it('should complete full initiative creation flow', async () => {
    // Render dashboard
    const { getByRole, getByLabelText } = render(
      <InitiativeDashboard />,
      { wrapper: createWrapper() }
    )

    // 1. Click create button
    fireEvent.click(getByRole('button', { name: /create initiative/i }))

    // 2. Fill out form in modal
    await waitFor(() => {
      expect(screen.getByText('Create New Initiative')).toBeInTheDocument()
    })

    fireEvent.change(getByLabelText(/title/i), {
      target: { value: 'Q4 Sales Target' }
    })

    fireEvent.change(getByLabelText(/description/i), {
      target: { value: 'Achieve Q4 sales goals' }
    })

    fireEvent.change(getByLabelText(/area/i), {
      target: { value: 'sales' }
    })

    // 3. Add activities
    fireEvent.click(getByRole('button', { name: /add activity/i }))
    
    fireEvent.change(getByLabelText(/activity title/i), {
      target: { value: 'Contact key accounts' }
    })

    // 4. Submit form
    fireEvent.click(getByRole('button', { name: /save/i }))

    // 5. Verify initiative appears in list
    await waitFor(() => {
      expect(screen.getByText('Q4 Sales Target')).toBeInTheDocument()
      expect(screen.getByText('1 activity')).toBeInTheDocument()
    })

    // 6. Verify API was called correctly
    const apiCalls = server.events.post('/api/initiatives')
    expect(apiCalls).toHaveLength(1)
    expect(apiCalls[0].body).toMatchObject({
      title: 'Q4 Sales Target',
      description: 'Achieve Q4 sales goals',
      area_id: 'sales',
      activities: [
        { title: 'Contact key accounts' }
      ]
    })
  })
})
```

## Performance Integration Tests

### Testing API Performance

```typescript
// automation/integration/performance/api-performance.test.ts
import { describe, it, expect } from 'vitest'
import { performance } from 'perf_hooks'
import { GET } from '@/app/api/dashboard/overview/route'
import { createAuthenticatedRequest } from '@/test-utils/integration-helpers'

describe('API Performance Integration', () => {
  it('should respond within acceptable time limits', async () => {
    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/dashboard/overview'
    )

    const startTime = performance.now()
    const response = await GET(request)
    const endTime = performance.now()
    
    const responseTime = endTime - startTime

    expect(response.status).toBe(200)
    expect(responseTime).toBeLessThan(500) // 500ms threshold
  })

  it('should handle concurrent requests efficiently', async () => {
    const requests = Array(10).fill(null).map(() =>
      createAuthenticatedRequest('http://localhost:3000/api/initiatives')
    )

    const startTime = performance.now()
    
    const responses = await Promise.all(
      requests.map(req => GET(req))
    )
    
    const endTime = performance.now()
    const totalTime = endTime - startTime

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200)
    })

    // Should handle 10 concurrent requests in reasonable time
    expect(totalTime).toBeLessThan(2000) // 2 seconds for 10 requests
  })

  it('should efficiently paginate large datasets', async () => {
    // Test with different page sizes
    const pageSizes = [10, 50, 100]
    
    for (const limit of pageSizes) {
      const request = createAuthenticatedRequest(
        `http://localhost:3000/api/initiatives?limit=${limit}`
      )

      const startTime = performance.now()
      const response = await GET(request)
      const endTime = performance.now()
      
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      
      // Response time should scale reasonably with page size
      const expectedMaxTime = 200 + (limit * 2) // Base + 2ms per item
      expect(responseTime).toBeLessThan(expectedMaxTime)
    }
  })
})
```

## Error Handling Integration Tests

### Testing Error Scenarios

```typescript
// automation/integration/errors/error-handling.test.ts
import { describe, it, expect } from 'vitest'
import { GET, POST } from '@/app/api/initiatives/route'
import { createAuthenticatedRequest } from '@/test-utils/integration-helpers'

describe('Error Handling Integration', () => {
  it('should handle database connection errors', async () => {
    // Mock database error
    const originalEnv = process.env.DATABASE_URL
    process.env.DATABASE_URL = 'invalid-connection-string'

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/initiatives'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
    expect(data.details).toBeUndefined() // Don't expose internal errors

    process.env.DATABASE_URL = originalEnv
  })

  it('should handle validation errors with details', async () => {
    const invalidData = {
      title: '', // Empty title
      area_id: 'invalid-uuid', // Invalid UUID
      progress: 150 // Out of range
    }

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/initiatives',
      {
        method: 'POST',
        body: JSON.stringify(invalidData)
      }
    )

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toContainEqual({
      field: 'title',
      message: 'Title is required'
    })
    expect(data.details).toContainEqual({
      field: 'progress',
      message: 'Progress must be between 0 and 100'
    })
  })

  it('should handle rate limiting', async () => {
    // Make many requests quickly
    const requests = Array(50).fill(null).map(() =>
      createAuthenticatedRequest('http://localhost:3000/api/initiatives')
    )

    const responses = await Promise.all(
      requests.map(req => GET(req))
    )

    // Some requests should be rate limited
    const rateLimited = responses.filter(r => r.status === 429)
    expect(rateLimited.length).toBeGreaterThan(0)

    const limitedResponse = rateLimited[0]
    const data = await limitedResponse.json()
    
    expect(data.error).toBe('Too many requests')
    expect(limitedResponse.headers.get('Retry-After')).toBeDefined()
  })
})
```

## Best Practices

### Integration Test Guidelines

1. **Test Boundaries**: Focus on integration points between components
2. **Realistic Data**: Use realistic test data, not minimal examples
3. **Error Scenarios**: Test both success and failure paths
4. **Performance**: Include basic performance assertions
5. **Cleanup**: Always clean up test data after tests
6. **Idempotency**: Tests should be runnable multiple times

### Common Patterns

```typescript
// Transactional tests
describe('Transactional Operations', () => {
  it('should rollback on failure', async () => {
    await expect(async () => {
      await db.transaction(async (tx) => {
        await tx.insert(/* ... */)
        throw new Error('Rollback')
      })
    }).rejects.toThrow()
    
    // Verify no data was committed
  })
})

// Testing with retries
describe('Resilient Operations', () => {
  it('should retry on transient failures', async () => {
    let attempts = 0
    const operation = async () => {
      attempts++
      if (attempts < 3) throw new Error('Transient')
      return 'success'
    }
    
    const result = await withRetry(operation, { maxAttempts: 3 })
    expect(result).toBe('success')
    expect(attempts).toBe(3)
  })
})
```

## Resources

- [Integration Testing Best Practices](https://martinfowler.com/bliki/IntegrationTest.html)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
- [MSW Documentation](https://mswjs.io/)

---

**Last Updated**: 2025-08-16  
**Next**: [E2E Testing Guide](./e2e-testing.md)