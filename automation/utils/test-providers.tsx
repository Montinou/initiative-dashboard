/**
 * Test Providers and Wrappers
 * 
 * Comprehensive provider wrappers for testing React components with all necessary context.
 */

import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'
import { AuthProvider } from '@/lib/auth-context'
import { NextIntlClientProvider } from 'next-intl'
import { TEST_USERS, TEST_TENANTS, TEST_AREAS } from './test-globals'

// Mock NextIntl messages
const mockMessages = {
  common: {
    loading: 'Loading...',
    error: 'Error',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    create: 'Create',
    update: 'Update',
    search: 'Search',
    filter: 'Filter',
    actions: 'Actions',
    status: 'Status',
    progress: 'Progress',
    title: 'Title',
    description: 'Description',
    name: 'Name',
    email: 'Email',
    role: 'Role',
    area: 'Area',
    tenant: 'Tenant',
    dashboard: 'Dashboard',
    initiatives: 'Initiatives',
    objectives: 'Objectives',
    activities: 'Activities',
    reports: 'Reports'
  },
  dashboard: {
    title: 'Dashboard',
    overview: 'Overview',
    kpis: 'Key Performance Indicators',
    initiatives: 'Initiatives',
    progress: 'Progress',
    recentActivity: 'Recent Activity',
    upcomingDeadlines: 'Upcoming Deadlines'
  },
  initiatives: {
    title: 'Initiatives',
    create: 'Create Initiative',
    edit: 'Edit Initiative',
    delete: 'Delete Initiative',
    status: {
      planning: 'Planning',
      in_progress: 'In Progress',
      completed: 'Completed',
      on_hold: 'On Hold'
    },
    priority: {
      high: 'High',
      medium: 'Medium',
      low: 'Low'
    }
  },
  auth: {
    signIn: 'Sign In',
    signOut: 'Sign Out',
    email: 'Email',
    password: 'Password',
    login: 'Login',
    logout: 'Logout',
    welcome: 'Welcome',
    invalidCredentials: 'Invalid credentials',
    sessionExpired: 'Session expired'
  },
  errors: {
    generic: 'An error occurred',
    network: 'Network error',
    unauthorized: 'Unauthorized',
    forbidden: 'Forbidden',
    notFound: 'Not found',
    validation: 'Validation error'
  }
}

// Mock Supabase client
export const createMockSupabaseClient = (overrides: any = {}) => {
  const mockClient = {
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
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: TEST_USERS.MANAGER,
        error: null
      }),
      maybeSingle: vi.fn().mockResolvedValue({
        data: TEST_USERS.MANAGER,
        error: null
      })
    })),
    rpc: vi.fn().mockResolvedValue({
      data: null,
      error: null
    }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn()
    })),
    removeChannel: vi.fn(),
    ...overrides
  }
  
  return mockClient
}

// Mock user profiles for different scenarios
export const createMockUserProfile = (role: string = 'Manager', tenantId?: string) => ({
  id: `${role.toLowerCase()}-profile-id`,
  user_id: `${role.toLowerCase()}-user-id`,
  tenant_id: tenantId || TEST_TENANTS.FEMA.id,
  email: `${role.toLowerCase()}@test.com`,
  full_name: `Test ${role}`,
  role: role as any,
  area_id: TEST_AREAS.MARKETING.id,
  area: {
    id: TEST_AREAS.MARKETING.id,
    name: TEST_AREAS.MARKETING.name,
    description: TEST_AREAS.MARKETING.description
  },
  avatar_url: null,
  phone: null,
  is_active: true,
  is_system_admin: false,
  last_login: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
})

// Test wrapper component that provides all necessary context
interface TestWrapperProps {
  children: React.ReactNode
  authUser?: any
  userProfile?: any
  locale?: string
  supabaseOverrides?: any
}

export function TestWrapper({ 
  children, 
  authUser = TEST_USERS.MANAGER,
  userProfile = createMockUserProfile('Manager'),
  locale = 'en',
  supabaseOverrides = {}
}: TestWrapperProps) {
  // Mock initial session for auth provider
  const initialSession = {
    user: authUser,
    access_token: 'test-token',
    refresh_token: 'test-refresh-token',
    expires_at: Date.now() + 3600000,
    token_type: 'bearer'
  }

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={mockMessages}
      timeZone="UTC"
    >
      <AuthProvider
        initialSession={initialSession}
        initialProfile={userProfile}
      >
        {children}
      </AuthProvider>
    </NextIntlClientProvider>
  )
}

// Enhanced render function with default providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authUser?: any
  userProfile?: any
  locale?: string
  supabaseOverrides?: any
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    authUser,
    userProfile,
    locale,
    supabaseOverrides,
    ...renderOptions
  } = options

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper
      authUser={authUser}
      userProfile={userProfile}
      locale={locale}
      supabaseOverrides={supabaseOverrides}
    >
      {children}
    </TestWrapper>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Hook testing wrapper
export function createHookWrapper(
  authUser = TEST_USERS.MANAGER,
  userProfile = createMockUserProfile('Manager')
) {
  return ({ children }: { children: React.ReactNode }) => (
    <TestWrapper
      authUser={authUser}
      userProfile={userProfile}
    >
      {children}
    </TestWrapper>
  )
}

// Mock different user scenarios
export const mockUserScenarios = {
  ceo: {
    user: TEST_USERS.CEO,
    profile: createMockUserProfile('CEO')
  },
  manager: {
    user: TEST_USERS.MANAGER,
    profile: createMockUserProfile('Manager')
  },
  analyst: {
    user: TEST_USERS.ANALYST,
    profile: createMockUserProfile('Analyst')
  },
  noAuth: {
    user: null,
    profile: null
  }
}

// Utility to wait for async operations in tests
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Utility to wait for multiple async operations
export const waitForMultipleAsync = (count: number = 3) => 
  Promise.all(Array(count).fill(0).map(() => waitForAsync()))

// Mock fetch responses for API testing
export const mockApiResponse = (data: any, success: boolean = true) => ({
  ok: success,
  status: success ? 200 : 400,
  json: async () => success ? { data } : { error: data },
  text: async () => JSON.stringify(success ? { data } : { error: data })
})

// Mock network errors
export const mockNetworkError = () => {
  throw new Error('Network error')
}

// Utility to simulate user interactions
export const simulateUserInteraction = {
  click: (element: HTMLElement) => {
    element.click()
    return waitForAsync()
  },
  
  type: (element: HTMLInputElement, value: string) => {
    element.focus()
    element.value = value
    element.dispatchEvent(new Event('input', { bubbles: true }))
    return waitForAsync()
  },
  
  submit: (form: HTMLFormElement) => {
    form.dispatchEvent(new Event('submit', { bubbles: true }))
    return waitForAsync()
  }
}

// Export everything for easy testing
export {
  mockMessages,
  TEST_USERS,
  TEST_TENANTS,
  TEST_AREAS
}

// Default export
export default {
  TestWrapper,
  renderWithProviders,
  createHookWrapper,
  createMockSupabaseClient,
  createMockUserProfile,
  mockUserScenarios,
  mockMessages,
  waitForAsync,
  waitForMultipleAsync,
  mockApiResponse,
  mockNetworkError,
  simulateUserInteraction
}