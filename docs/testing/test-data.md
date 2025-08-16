# Test Data Management Guide

## Overview

Effective test data management is crucial for reliable, maintainable tests. This guide covers strategies for creating, organizing, and managing test data across unit, integration, and E2E tests in the Initiative Dashboard.

## Test Data Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Data Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Factories    │  Fixtures    │  Mocks    │  Seeds          │
│  (Dynamic)    │  (Static)    │  (API)    │  (Database)     │
├─────────────────────────────────────────────────────────────┤
│                  Test Data Utilities                         │
│  Builders  │  Generators  │  Validators  │  Transformers    │
└─────────────────────────────────────────────────────────────┘
```

## Data Generation Strategies

### 1. Factory Pattern

```typescript
// automation/fixtures/factories/initiative.factory.ts
import { faker } from '@faker-js/faker'
import { Initiative, InitiativeStatus } from '@/types'

export class InitiativeFactory {
  private static sequence = 0

  static create(overrides: Partial<Initiative> = {}): Initiative {
    this.sequence++
    
    return {
      id: faker.string.uuid(),
      title: faker.company.catchPhrase(),
      description: faker.lorem.paragraph(),
      progress: faker.number.int({ min: 0, max: 100 }),
      status: faker.helpers.arrayElement<InitiativeStatus>([
        'planning', 'in_progress', 'completed', 'on_hold'
      ]),
      area_id: faker.string.uuid(),
      tenant_id: faker.string.uuid(),
      created_by: faker.string.uuid(),
      start_date: faker.date.recent().toISOString(),
      due_date: faker.date.future().toISOString(),
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString(),
      ...overrides
    }
  }

  static createMany(count: number, overrides: Partial<Initiative> = {}): Initiative[] {
    return Array.from({ length: count }, () => this.create(overrides))
  }

  static createWithActivities(activityCount: number = 3): Initiative & { activities: Activity[] } {
    const initiative = this.create()
    const activities = ActivityFactory.createMany(activityCount, {
      initiative_id: initiative.id
    })
    
    return { ...initiative, activities }
  }

  static createCompleted(): Initiative {
    return this.create({
      progress: 100,
      status: 'completed',
      completion_date: faker.date.recent().toISOString()
    })
  }

  static createOverdue(): Initiative {
    return this.create({
      due_date: faker.date.past().toISOString(),
      status: 'in_progress',
      progress: faker.number.int({ min: 0, max: 90 })
    })
  }
}
```

### 2. Builder Pattern

```typescript
// automation/fixtures/builders/user.builder.ts
export class UserBuilder {
  private user: Partial<UserProfile> = {}

  constructor() {
    this.reset()
  }

  reset(): this {
    this.user = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      full_name: faker.person.fullName(),
      created_at: new Date().toISOString()
    }
    return this
  }

  withRole(role: UserRole): this {
    this.user.role = role
    return this
  }

  withTenant(tenantId: string): this {
    this.user.tenant_id = tenantId
    return this
  }

  withArea(areaId: string): this {
    this.user.area_id = areaId
    this.user.role = 'manager' // Managers have areas
    return this
  }

  asCEO(): this {
    return this.withRole('ceo')
  }

  asAdmin(): this {
    return this.withRole('admin')
  }

  asManager(areaId: string): this {
    return this.withRole('manager').withArea(areaId)
  }

  withCustomData(data: Partial<UserProfile>): this {
    this.user = { ...this.user, ...data }
    return this
  }

  build(): UserProfile {
    if (!this.user.tenant_id) {
      this.user.tenant_id = faker.string.uuid()
    }
    if (!this.user.role) {
      this.user.role = 'user'
    }
    return this.user as UserProfile
  }

  buildMany(count: number): UserProfile[] {
    return Array.from({ length: count }, () => {
      const user = this.build()
      this.reset()
      return user
    })
  }
}

// Usage
const ceo = new UserBuilder()
  .asCEO()
  .withTenant('tenant-123')
  .build()

const managers = new UserBuilder()
  .asManager('area-456')
  .withTenant('tenant-123')
  .buildMany(5)
```

### 3. Fixture Files

```typescript
// automation/fixtures/static/tenants.fixture.ts
export const TENANT_FIXTURES = {
  FEMA: {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    organization_id: 'org-fema',
    subdomain: 'fema',
    name: 'FEMA',
    created_at: '2025-01-01T00:00:00Z',
    settings: {
      theme: 'blue',
      logo: '/logos/fema.png',
      timezone: 'America/New_York'
    }
  },
  SIGA: {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    organization_id: 'org-siga',
    subdomain: 'siga',
    name: 'SIGA',
    created_at: '2025-01-01T00:00:00Z',
    settings: {
      theme: 'orange',
      logo: '/logos/siga.png',
      timezone: 'America/Mexico_City'
    }
  },
  STRATIX: {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    organization_id: 'org-stratix',
    subdomain: 'stratix',
    name: 'Stratix',
    created_at: '2025-01-01T00:00:00Z',
    settings: {
      theme: 'purple',
      logo: '/logos/stratix.png',
      timezone: 'America/Los_Angeles',
      features: {
        ai_assistant: true
      }
    }
  }
}

// automation/fixtures/static/areas.fixture.ts
export const AREA_FIXTURES = {
  SALES: {
    id: 'area-sales',
    name: 'Sales',
    description: 'Sales and Business Development',
    manager_id: 'user-sales-manager'
  },
  MARKETING: {
    id: 'area-marketing',
    name: 'Marketing',
    description: 'Marketing and Communications',
    manager_id: 'user-marketing-manager'
  },
  ENGINEERING: {
    id: 'area-engineering',
    name: 'Engineering',
    description: 'Product Development',
    manager_id: 'user-engineering-manager'
  },
  HR: {
    id: 'area-hr',
    name: 'Human Resources',
    description: 'People and Culture',
    manager_id: 'user-hr-manager'
  }
}
```

## Test Data for Different Test Types

### Unit Test Data

```typescript
// Simple, isolated data for unit tests
describe('calculateProgress', () => {
  const testCases = [
    { completed: 0, total: 10, expected: 0 },
    { completed: 5, total: 10, expected: 50 },
    { completed: 10, total: 10, expected: 100 },
    { completed: 0, total: 0, expected: 0 }, // Edge case
  ]

  testCases.forEach(({ completed, total, expected }) => {
    it(`should return ${expected}% for ${completed}/${total}`, () => {
      expect(calculateProgress(completed, total)).toBe(expected)
    })
  })
})
```

### Integration Test Data

```typescript
// automation/fixtures/integration/database-seeds.ts
export async function seedTestDatabase(supabase: SupabaseClient, tenantId: string) {
  // Create test organization
  const { data: org } = await supabase
    .from('organizations')
    .insert({
      id: `org-${tenantId}`,
      name: 'Test Organization'
    })
    .select()
    .single()

  // Create test areas
  const areas = await supabase
    .from('areas')
    .insert([
      {
        tenant_id: tenantId,
        name: 'Test Area 1',
        manager_id: null
      },
      {
        tenant_id: tenantId,
        name: 'Test Area 2',
        manager_id: null
      }
    ])
    .select()

  // Create test objectives
  const objectives = await supabase
    .from('objectives')
    .insert([
      {
        tenant_id: tenantId,
        title: 'Q1 Revenue Target',
        description: 'Achieve Q1 revenue goals',
        area_id: areas.data[0].id,
        created_by: 'system'
      }
    ])
    .select()

  // Create test initiatives with activities
  for (const area of areas.data) {
    const initiatives = await supabase
      .from('initiatives')
      .insert(
        InitiativeFactory.createMany(3, {
          tenant_id: tenantId,
          area_id: area.id
        })
      )
      .select()

    // Add activities to each initiative
    for (const initiative of initiatives.data) {
      await supabase
        .from('activities')
        .insert(
          ActivityFactory.createMany(5, {
            initiative_id: initiative.id
          })
        )
    }
  }

  return { org, areas: areas.data, objectives: objectives.data }
}

// Cleanup function
export async function cleanupTestDatabase(supabase: SupabaseClient, tenantId: string) {
  // Delete in reverse order of dependencies
  const tables = [
    'activities',
    'initiatives',
    'objectives',
    'areas',
    'user_profiles',
    'tenants',
    'organizations'
  ]

  for (const table of tables) {
    await supabase
      .from(table)
      .delete()
      .or(`tenant_id.eq.${tenantId},id.eq.org-${tenantId}`)
  }
}
```

### E2E Test Data

```typescript
// automation/fixtures/e2e/test-accounts.ts
export const TEST_ACCOUNTS = {
  CEO: {
    email: 'ceo.test@example.com',
    password: 'Test123456!',
    tenant: 'fema',
    role: 'ceo',
    profile: {
      full_name: 'Test CEO User',
      avatar_url: '/avatars/ceo.jpg'
    }
  },
  ADMIN: {
    email: 'admin.test@example.com',
    password: 'Test123456!',
    tenant: 'fema',
    role: 'admin',
    profile: {
      full_name: 'Test Admin User',
      avatar_url: '/avatars/admin.jpg'
    }
  },
  MANAGER_SALES: {
    email: 'manager.sales.test@example.com',
    password: 'Test123456!',
    tenant: 'fema',
    role: 'manager',
    area: 'sales',
    profile: {
      full_name: 'Test Sales Manager',
      avatar_url: '/avatars/manager.jpg'
    }
  },
  CROSS_TENANT: {
    email: 'cross.tenant.test@example.com',
    password: 'Test123456!',
    tenant: 'siga',
    role: 'admin',
    profile: {
      full_name: 'Cross Tenant Test User',
      avatar_url: '/avatars/cross.jpg'
    }
  }
}

// Helper to create authenticated page
export async function authenticateAs(page: Page, accountType: keyof typeof TEST_ACCOUNTS) {
  const account = TEST_ACCOUNTS[accountType]
  
  await page.goto(`http://${account.tenant}.localhost:3000/login`)
  await page.fill('[data-testid="email-input"]', account.email)
  await page.fill('[data-testid="password-input"]', account.password)
  await page.click('[data-testid="login-button"]')
  await page.waitForURL('**/dashboard')
  
  return account
}
```

## Mock Data for API Testing

### MSW Handlers

```typescript
// automation/mocks/handlers/initiatives.handler.ts
import { rest } from 'msw'
import { InitiativeFactory } from '@/fixtures/factories'

export const initiativeHandlers = [
  // GET /api/initiatives
  rest.get('/api/initiatives', (req, res, ctx) => {
    const tenantId = req.headers.get('X-Tenant-Id')
    const limit = Number(req.url.searchParams.get('limit')) || 10
    const page = Number(req.url.searchParams.get('page')) || 1
    
    const initiatives = InitiativeFactory.createMany(limit, {
      tenant_id: tenantId || undefined
    })
    
    return res(
      ctx.status(200),
      ctx.json({
        initiatives,
        pagination: {
          page,
          limit,
          total: 100,
          totalPages: Math.ceil(100 / limit)
        }
      })
    )
  }),

  // POST /api/initiatives
  rest.post('/api/initiatives', async (req, res, ctx) => {
    const body = await req.json()
    
    // Validate request
    if (!body.title) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Title is required' })
      )
    }
    
    const newInitiative = InitiativeFactory.create({
      ...body,
      id: faker.string.uuid(),
      created_at: new Date().toISOString()
    })
    
    return res(
      ctx.status(201),
      ctx.json(newInitiative)
    )
  }),

  // Error scenarios
  rest.get('/api/initiatives/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ error: 'Internal server error' })
    )
  }),

  rest.get('/api/initiatives/timeout', (req, res, ctx) => {
    return res(ctx.delay(10000), ctx.status(408))
  })
]
```

## File Upload Test Data

### Excel Test Files

```typescript
// automation/fixtures/files/excel-generator.ts
import ExcelJS from 'exceljs'
import path from 'path'

export async function generateTestExcel(options: {
  filename: string
  objectives?: number
  initiatives?: number
  activities?: number
  invalid?: boolean
}) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('OKR Data')
  
  // Add headers
  worksheet.columns = [
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Area', key: 'area', width: 20 },
    { header: 'Progress', key: 'progress', width: 10 },
    { header: 'Due Date', key: 'due_date', width: 15 }
  ]
  
  // Generate objectives
  for (let i = 1; i <= (options.objectives || 5); i++) {
    worksheet.addRow({
      type: 'Objective',
      title: options.invalid && i === 3 ? '' : `Objective ${i}`, // Invalid: empty title
      description: `Description for objective ${i}`,
      area: faker.helpers.arrayElement(['Sales', 'Marketing', 'Engineering']),
      progress: 0,
      due_date: faker.date.future().toLocaleDateString()
    })
  }
  
  // Generate initiatives
  for (let i = 1; i <= (options.initiatives || 10); i++) {
    worksheet.addRow({
      type: 'Initiative',
      title: `Initiative ${i}`,
      description: `Description for initiative ${i}`,
      area: faker.helpers.arrayElement(['Sales', 'Marketing', 'Engineering']),
      progress: options.invalid && i === 5 ? 150 : faker.number.int({ min: 0, max: 100 }), // Invalid: progress > 100
      due_date: faker.date.future().toLocaleDateString()
    })
  }
  
  // Generate activities
  for (let i = 1; i <= (options.activities || 20); i++) {
    worksheet.addRow({
      type: 'Activity',
      title: `Activity ${i}`,
      description: `Description for activity ${i}`,
      area: '',
      progress: faker.number.int({ min: 0, max: 100 }),
      due_date: options.invalid && i === 10 ? 'invalid-date' : faker.date.future().toLocaleDateString()
    })
  }
  
  const filepath = path.join(__dirname, options.filename)
  await workbook.xlsx.writeFile(filepath)
  
  return filepath
}

// Generate various test files
export async function generateAllTestFiles() {
  await generateTestExcel({
    filename: 'valid-small.xlsx',
    objectives: 3,
    initiatives: 5,
    activities: 10
  })
  
  await generateTestExcel({
    filename: 'valid-large.xlsx',
    objectives: 20,
    initiatives: 50,
    activities: 200
  })
  
  await generateTestExcel({
    filename: 'invalid-data.xlsx',
    objectives: 5,
    initiatives: 10,
    activities: 20,
    invalid: true
  })
}
```

## Performance Test Data

### Load Testing Data

```typescript
// automation/fixtures/performance/load-data.ts
export class LoadTestDataGenerator {
  static generateBulkInitiatives(count: number): Initiative[] {
    console.time('Generate bulk initiatives')
    const initiatives = []
    
    for (let i = 0; i < count; i++) {
      initiatives.push({
        id: `init-${i}`,
        title: `Initiative ${i}`,
        description: `Description ${i}`,
        progress: Math.floor(Math.random() * 100),
        status: ['planning', 'in_progress', 'completed'][i % 3],
        area_id: `area-${i % 10}`, // Distribute across 10 areas
        tenant_id: `tenant-${i % 3}`, // Distribute across 3 tenants
        created_by: `user-${i % 20}`, // 20 different users
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      })
    }
    
    console.timeEnd('Generate bulk initiatives')
    return initiatives
  }
  
  static generateConcurrentRequests(count: number): Request[] {
    return Array.from({ length: count }, (_, i) => ({
      url: `/api/initiatives?page=${i + 1}`,
      method: 'GET',
      headers: {
        'X-Request-Id': `req-${i}`,
        'X-Tenant-Id': `tenant-${i % 3}`
      }
    }))
  }
  
  static generateSearchQueries(count: number): string[] {
    const terms = ['revenue', 'growth', 'customer', 'product', 'sales', 'marketing']
    return Array.from({ length: count }, () => 
      faker.helpers.arrayElements(terms, 2).join(' ')
    )
  }
}
```

## Test Data Validation

### Schema Validators

```typescript
// automation/fixtures/validators/schema.validator.ts
import { z } from 'zod'

export const InitiativeSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  progress: z.number().min(0).max(100),
  status: z.enum(['planning', 'in_progress', 'completed', 'on_hold']),
  area_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  created_by: z.string().uuid(),
  start_date: z.string().datetime().optional(),
  due_date: z.string().datetime().optional(),
  completion_date: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export const validateInitiative = (data: unknown): Initiative => {
  return InitiativeSchema.parse(data)
}

export const validateInitiatives = (data: unknown[]): Initiative[] => {
  return z.array(InitiativeSchema).parse(data)
}

// Use in tests
describe('Initiative API', () => {
  it('should return valid initiative data', async () => {
    const response = await fetch('/api/initiatives')
    const data = await response.json()
    
    // Validate response schema
    expect(() => validateInitiatives(data.initiatives)).not.toThrow()
  })
})
```

## Test Data Cleanup

### Cleanup Strategies

```typescript
// automation/utils/cleanup.ts
export class TestDataCleanup {
  private static cleanupTasks: Array<() => Promise<void>> = []
  
  static register(cleanup: () => Promise<void>) {
    this.cleanupTasks.push(cleanup)
  }
  
  static async cleanAll() {
    console.log(`Cleaning up ${this.cleanupTasks.length} test data items...`)
    
    const results = await Promise.allSettled(
      this.cleanupTasks.map(task => task())
    )
    
    const failed = results.filter(r => r.status === 'rejected')
    if (failed.length > 0) {
      console.error(`${failed.length} cleanup tasks failed`)
    }
    
    this.cleanupTasks = []
  }
}

// Usage in tests
afterEach(async () => {
  await TestDataCleanup.cleanAll()
})

// Register cleanup when creating data
const initiative = await createTestInitiative()
TestDataCleanup.register(async () => {
  await deleteInitiative(initiative.id)
})
```

## Best Practices

### Do's
- ✅ Use factories for dynamic data generation
- ✅ Keep test data close to tests
- ✅ Clean up test data after each test
- ✅ Use realistic data that matches production
- ✅ Version control test fixtures
- ✅ Validate test data against schemas
- ✅ Use deterministic data for snapshots

### Don'ts
- ❌ Share mutable test data between tests
- ❌ Use production data in tests
- ❌ Hard-code IDs that might conflict
- ❌ Create more data than necessary
- ❌ Forget to clean up test data
- ❌ Use random data for visual tests

## Test Data Utilities

### Data Transformation Helpers

```typescript
// automation/utils/data-transformers.ts
export const TestDataTransformers = {
  toAPI(initiative: Initiative): APIInitiative {
    return {
      ...initiative,
      startDate: initiative.start_date,
      dueDate: initiative.due_date,
      createdAt: initiative.created_at,
      updatedAt: initiative.updated_at
    }
  },
  
  fromAPI(data: APIInitiative): Initiative {
    return {
      ...data,
      start_date: data.startDate,
      due_date: data.dueDate,
      created_at: data.createdAt,
      updated_at: data.updatedAt
    }
  },
  
  toCSV(initiatives: Initiative[]): string {
    const headers = ['Title', 'Description', 'Progress', 'Status', 'Area', 'Due Date']
    const rows = initiatives.map(i => [
      i.title,
      i.description,
      i.progress.toString(),
      i.status,
      i.area_id,
      i.due_date || ''
    ])
    
    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n')
  },
  
  anonymize(data: UserProfile): UserProfile {
    return {
      ...data,
      email: faker.internet.email(),
      full_name: faker.person.fullName(),
      phone: faker.phone.number(),
      avatar_url: faker.image.avatar()
    }
  }
}
```

## Resources

- [Faker.js Documentation](https://fakerjs.dev/)
- [Factory Pattern in Testing](https://thoughtbot.com/blog/why-factories)
- [Test Data Management Best Practices](https://martinfowler.com/articles/nonDeterminism.html)
- [MSW (Mock Service Worker)](https://mswjs.io/)

---

**Last Updated**: 2025-08-16  
**Maintained By**: Test Coverage Specialist