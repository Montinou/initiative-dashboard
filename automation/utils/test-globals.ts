/**
 * Global Test Variables and Utilities
 * 
 * Shared constants, types, and utilities used across all test files.
 */

import { vi } from 'vitest'

// Environment configuration
export const TEST_ENV = {
  NODE_ENV: 'test',
  NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  NEXT_PUBLIC_ENABLE_STRATIX: 'true',
  STRATIX_API_URL: 'http://localhost:3000/api/stratix',
  GOOGLE_AI_API_KEY: 'test-ai-api-key'
}

// Test user personas with different roles
export const TEST_USERS = {
  CEO: {
    id: 'ceo-user-id',
    email: 'ceo@testcompany.com',
    name: 'CEO User',
    role: 'CEO',
    permissions: ['read', 'write', 'admin', 'manage_users', 'manage_areas']
  },
  MANAGER: {
    id: 'manager-user-id',
    email: 'manager@testcompany.com',
    name: 'Manager User',
    role: 'Manager',
    permissions: ['read', 'write', 'manage_area']
  },
  ANALYST: {
    id: 'analyst-user-id',
    email: 'analyst@testcompany.com',
    name: 'Analyst User',
    role: 'Analyst',
    permissions: ['read']
  }
}

// Test tenant configurations
export const TEST_TENANTS = {
  FEMA: {
    id: 'fema-tenant-id',
    name: 'FEMA Corporation',
    subdomain: 'fema',
    industry: 'Technology',
    theme: 'fema-theme'
  },
  SIGA: {
    id: 'siga-tenant-id',
    name: 'SIGA Solutions',
    subdomain: 'siga',
    industry: 'Consulting',
    theme: 'siga-theme'
  },
  STRATIX: {
    id: 'stratix-tenant-id',
    name: 'Stratix Analytics',
    subdomain: 'stratix',
    industry: 'Analytics',
    theme: 'stratix-theme'
  }
}

// Test areas for each tenant
export const TEST_AREAS = {
  MARKETING: {
    id: 'marketing-area-id',
    name: 'Marketing',
    description: 'Marketing department objectives'
  },
  SALES: {
    id: 'sales-area-id',
    name: 'Sales',
    description: 'Sales department objectives'
  },
  OPERATIONS: {
    id: 'operations-area-id',
    name: 'Operations',
    description: 'Operations department objectives'
  },
  HR: {
    id: 'hr-area-id',
    name: 'Human Resources',
    description: 'HR department objectives'
  }
}

// Test initiative data
export const TEST_INITIATIVES = {
  MARKETING_CAMPAIGN: {
    id: 'marketing-campaign-id',
    title: 'Q1 Marketing Campaign',
    description: 'Launch new product marketing campaign',
    status: 'in_progress',
    priority: 'high',
    progress: 65,
    area_id: TEST_AREAS.MARKETING.id
  },
  SALES_OPTIMIZATION: {
    id: 'sales-optimization-id',
    title: 'Sales Process Optimization',
    description: 'Streamline sales pipeline processes',
    status: 'planning',
    priority: 'medium',
    progress: 20,
    area_id: TEST_AREAS.SALES.id
  }
}

// Mock file types for testing
export const MOCK_FILES = {
  VALID_EXCEL: {
    name: 'valid-okr-data.xlsx',
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 5000,
    content: 'mock excel content'
  },
  INVALID_TYPE: {
    name: 'invalid-file.pdf',
    type: 'application/pdf',
    size: 3000,
    content: 'mock pdf content'
  },
  TOO_LARGE: {
    name: 'large-file.xlsx',
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 15 * 1024 * 1024, // 15MB
    content: 'large mock content'
  },
  EMPTY_FILE: {
    name: 'empty-file.xlsx',
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 0,
    content: ''
  }
}

// API response templates
export const API_RESPONSES = {
  FILE_UPLOAD_SUCCESS: {
    success: true,
    data: {
      uploadId: 'test-upload-id',
      fileName: 'test-upload.xlsx',
      fileSize: 5000,
      recordsProcessed: 10,
      sheetsProcessed: 2,
      savedInitiatives: 8,
      errors: [],
      areaName: 'Marketing',
      timestamp: '2024-01-15T10:00:00Z',
      sheetDetails: [
        { sheetName: 'Q1 OKRs', recordCount: 5 },
        { sheetName: 'Q2 OKRs', recordCount: 5 }
      ]
    }
  },
  FILE_UPLOAD_WITH_WARNINGS: {
    success: true,
    data: {
      uploadId: 'test-upload-warnings-id',
      fileName: 'test-with-warnings.xlsx',
      fileSize: 6000,
      recordsProcessed: 8,
      sheetsProcessed: 1,
      savedInitiatives: 6,
      errors: [
        'Row 3: Invalid date format',
        'Row 7: Progress exceeds 100%'
      ],
      areaName: 'Sales',
      timestamp: '2024-01-15T10:00:00Z'
    }
  },
  FILE_UPLOAD_ERROR: {
    success: false,
    error: 'File processing failed: Invalid Excel format'
  },
  STRATIX_CHAT_RESPONSE: {
    success: true,
    data: {
      response: 'Based on your data, here are the key insights...',
      insights: [
        'Marketing initiatives are 65% complete on average',
        'Sales pipeline shows 20% improvement opportunity'
      ],
      recommendations: [
        'Focus on completing Q1 marketing campaign',
        'Accelerate sales process optimization'
      ]
    }
  },
  UNAUTHORIZED_ERROR: {
    success: false,
    error: 'Unauthorized access',
    code: 401
  },
  FORBIDDEN_ERROR: {
    success: false,
    error: 'Insufficient permissions',
    code: 403
  }
}

// Test database fixtures
export const DB_FIXTURES = {
  USER_PROFILE: {
    id: TEST_USERS.MANAGER.id,
    email: TEST_USERS.MANAGER.email,
    full_name: TEST_USERS.MANAGER.name,
    role: TEST_USERS.MANAGER.role,
    tenant_id: TEST_TENANTS.FEMA.id,
    area_id: TEST_AREAS.MARKETING.id,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  INITIATIVE: {
    id: TEST_INITIATIVES.MARKETING_CAMPAIGN.id,
    title: TEST_INITIATIVES.MARKETING_CAMPAIGN.title,
    description: TEST_INITIATIVES.MARKETING_CAMPAIGN.description,
    status: TEST_INITIATIVES.MARKETING_CAMPAIGN.status,
    priority: TEST_INITIATIVES.MARKETING_CAMPAIGN.priority,
    progress: TEST_INITIATIVES.MARKETING_CAMPAIGN.progress,
    tenant_id: TEST_TENANTS.FEMA.id,
    area_id: TEST_AREAS.MARKETING.id,
    created_by: TEST_USERS.MANAGER.id,
    owner_id: TEST_USERS.MANAGER.id,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  }
}

// Common mock implementations
export const COMMON_MOCKS = {
  // Supabase client mock
  supabaseClient: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: TEST_USERS.MANAGER,
            access_token: 'test-token'
          }
        },
        error: null
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: TEST_USERS.MANAGER },
        error: null
      })
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: DB_FIXTURES.USER_PROFILE,
        error: null
      })
    }))
  },
  
  // React Router mock
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn()
  },
  
  // Toast notification mock
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }
}

// Utility functions for test data generation
export const generateMockId = (prefix: string = 'test') => 
  `${prefix}-${Math.random().toString(36).substr(2, 9)}`

export const generateMockEmail = (name: string = 'user') => 
  `${name}-${Math.random().toString(36).substr(2, 5)}@test.com`

export const generateMockUser = (role: string = 'Analyst', tenantId?: string) => ({
  id: generateMockId('user'),
  email: generateMockEmail(role.toLowerCase()),
  name: `Test ${role}`,
  role,
  tenant_id: tenantId || TEST_TENANTS.FEMA.id,
  permissions: role === 'CEO' ? ['read', 'write', 'admin'] : ['read']
})

export const generateMockInitiative = (areaId?: string, tenantId?: string) => ({
  id: generateMockId('initiative'),
  title: `Test Initiative ${Math.floor(Math.random() * 1000)}`,
  description: 'Test initiative description',
  status: 'planning',
  priority: 'medium',
  progress: Math.floor(Math.random() * 100),
  tenant_id: tenantId || TEST_TENANTS.FEMA.id,
  area_id: areaId || TEST_AREAS.MARKETING.id,
  created_by: TEST_USERS.MANAGER.id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
})

// Test timeout constants
export const TIMEOUTS = {
  SHORT: 1000,
  MEDIUM: 5000,
  LONG: 10000,
  VERY_LONG: 30000
}

// Test wait utilities
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
export const waitForElement = () => wait(100)
export const waitForApi = () => wait(500)
export const waitForAnimation = () => wait(300)