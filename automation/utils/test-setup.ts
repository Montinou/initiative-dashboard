/**
 * Test Setup Configuration
 * 
 * Global setup for all unit and integration tests using Vitest.
 * Configures DOM environment, mocks, and testing utilities.
 */

import { afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Extend expect matchers
import './test-matchers'

// Mock global objects and APIs
beforeAll(() => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // Mock window.ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))

  // Mock scrollTo
  Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
    writable: true,
  })

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  })

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  })

  // Mock URL.createObjectURL and URL.revokeObjectURL for file tests
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn(() => 'mocked-object-url'),
    writable: true,
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: vi.fn(),
    writable: true,
  })

  // Mock fetch globally
  global.fetch = vi.fn()

  // Mock console methods to reduce noise in tests
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks()
  
  // Reset fetch mock
  if (global.fetch) {
    vi.mocked(global.fetch).mockClear()
  }
  
  // Clear localStorage and sessionStorage
  window.localStorage.clear()
  window.sessionStorage.clear()
})

afterEach(() => {
  // Clean up after each test
  cleanup()
  
  // Clear all timers
  vi.clearAllTimers()
  
  // Restore all mocks
  vi.restoreAllMocks()
})

// Global test configuration
export const testConfig = {
  // Test timeouts
  defaultTimeout: 10000,
  longTimeout: 30000,
  
  // Mock URLs
  mockApiUrl: 'http://localhost:3000/api',
  mockSupabaseUrl: 'http://localhost:54321',
  
  // Test user data
  testUser: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User'
  },
  
  // Test tenant data
  testTenant: {
    id: 'test-tenant-id',
    name: 'Test Tenant',
    subdomain: 'test-tenant'
  },
  
  // Mock responses
  mockResponses: {
    success: { success: true, data: {} },
    error: { success: false, error: 'Test error' }
  }
}

// Utility function to wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Utility to create mock file
export const createMockFile = (options: {
  name?: string
  size?: number
  type?: string
  content?: string
} = {}): File => {
  const {
    name = 'test-file.xlsx',
    size = 1024,
    type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    content = 'mock file content'
  } = options

  const blob = new Blob([content], { type })
  const file = new File([blob], name, { type })
  
  // Mock file size
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false
  })
  
  return file
}

// Utility to create mock form data
export const createMockFormData = (data: Record<string, any> = {}): FormData => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value)
    } else {
      formData.append(key, String(value))
    }
  })
  return formData
}

// Utility to mock successful fetch response
export const mockFetchSuccess = (data: any = {}) => {
  vi.mocked(global.fetch).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)]),
    headers: new Headers({ 'content-type': 'application/json' })
  } as Response)
}

// Utility to mock fetch error response
export const mockFetchError = (error: string = 'Test error', status: number = 400) => {
  vi.mocked(global.fetch).mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error }),
    text: async () => JSON.stringify({ error }),
    headers: new Headers({ 'content-type': 'application/json' })
  } as Response)
}

// Utility to mock fetch network error
export const mockFetchNetworkError = (message: string = 'Network error') => {
  vi.mocked(global.fetch).mockRejectedValueOnce(new Error(message))
}

// Enhanced error handling for tests
export const expectToThrowAsync = async (
  asyncFn: () => Promise<any>,
  expectedError?: string | RegExp
): Promise<void> => {
  try {
    await asyncFn()
    throw new Error('Expected function to throw, but it did not')
  } catch (error) {
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect((error as Error).message).toContain(expectedError)
      } else {
        expect((error as Error).message).toMatch(expectedError)
      }
    }
  }
}