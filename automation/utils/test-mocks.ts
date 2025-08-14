/**
 * Test Mocks and Mock Factories
 * 
 * Centralized mock implementations for testing.
 */

import { vi } from 'vitest'
import { TEST_USERS, TEST_TENANTS, TEST_AREAS, TEST_INITIATIVES } from './test-globals'

// Mock Supabase client factory
export const createSupabaseMock = (overrides: any = {}) => {
  const mockAuth = {
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
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: TEST_USERS.MANAGER, session: null },
      error: null
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    })),
    updateUser: vi.fn().mockResolvedValue({
      data: { user: TEST_USERS.MANAGER },
      error: null
    })
  }

  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    rangeGt: vi.fn().mockReturnThis(),
    rangeGte: vi.fn().mockReturnThis(),
    rangeLt: vi.fn().mockReturnThis(),
    rangeLte: vi.fn().mockReturnThis(),
    rangeAdjacent: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: TEST_INITIATIVES.MARKETING_CAMPAIGN,
      error: null
    }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: TEST_INITIATIVES.MARKETING_CAMPAIGN,
      error: null
    }),
    csv: vi.fn().mockReturnThis(),
    geojson: vi.fn().mockReturnThis(),
    explain: vi.fn().mockReturnThis(),
    rollback: vi.fn().mockReturnThis(),
    returns: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve({
      data: [TEST_INITIATIVES.MARKETING_CAMPAIGN],
      error: null,
      count: 1,
      status: 200,
      statusText: 'OK'
    }))
  }

  const mockFrom = vi.fn(() => mockQueryBuilder)
  
  const mockRpc = vi.fn().mockResolvedValue({
    data: null,
    error: null
  })

  const mockStorage = {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null
      }),
      download: vi.fn().mockResolvedValue({
        data: new Blob(['test data']),
        error: null
      }),
      remove: vi.fn().mockResolvedValue({
        data: null,
        error: null
      }),
      list: vi.fn().mockResolvedValue({
        data: [],
        error: null
      }),
      getPublicUrl: vi.fn(() => ({
        data: { publicUrl: 'https://test.com/file.xlsx' }
      })),
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://test.com/signed-url' },
        error: null
      })
    }))
  }

  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockResolvedValue('ok'),
    unsubscribe: vi.fn().mockResolvedValue('ok'),
    send: vi.fn().mockResolvedValue('ok')
  }

  const mockClient = {
    auth: mockAuth,
    from: mockFrom,
    rpc: mockRpc,
    storage: mockStorage,
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
    removeAllChannels: vi.fn(),
    realtime: {
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
      removeAllChannels: vi.fn(),
      getChannels: vi.fn(() => [])
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: null,
        error: null
      })
    },
    ...overrides
  }

  return mockClient
}

// Mock Next.js router
export const createNextRouterMock = (overrides: any = {}) => ({
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  pathname: '/dashboard',
  query: {},
  asPath: '/dashboard',
  route: '/dashboard',
  basePath: '',
  locale: 'en',
  locales: ['en', 'es'],
  defaultLocale: 'en',
  isReady: true,
  isLocaleDomain: false,
  ...overrides
})

// Mock useRouter hook
export const mockUseRouter = (overrides: any = {}) => {
  const router = createNextRouterMock(overrides)
  vi.mocked(vi.fn()).mockReturnValue(router)
  return router
}

// Mock fetch
export const createFetchMock = () => {
  const mockFetch = vi.fn()
  global.fetch = mockFetch
  return mockFetch
}

// Common fetch responses
export const fetchResponses = {
  success: (data: any) => Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({ data }),
    text: async () => JSON.stringify({ data })
  } as Response),
  
  error: (error: string, status: number = 400) => Promise.resolve({
    ok: false,
    status,
    json: async () => ({ error }),
    text: async () => JSON.stringify({ error })
  } as Response),
  
  networkError: () => Promise.reject(new Error('Network error'))
}

// Mock console methods
export const mockConsole = () => {
  const originalConsole = { ...console }
  const mocks = {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    debug: vi.spyOn(console, 'debug').mockImplementation(() => {})
  }
  
  return {
    mocks,
    restore: () => {
      Object.assign(console, originalConsole)
    }
  }
}

// Mock localStorage
export const createLocalStorageMock = () => {
  const store: Record<string, string> = {}
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    length: Object.keys(store).length,
    key: vi.fn((index: number) => Object.keys(store)[index] || null)
  }
}

// Mock sessionStorage
export const createSessionStorageMock = () => createLocalStorageMock()

// Mock File and FileReader
export const createFileMock = (options: {
  name?: string
  size?: number
  type?: string
  content?: string
} = {}) => {
  const {
    name = 'test.xlsx',
    size = 1024,
    type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    content = 'test content'
  } = options

  const blob = new Blob([content], { type })
  const file = new File([blob], name, { type })
  
  // Override size property
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false
  })
  
  return file
}

export const mockFileReader = () => {
  const mockReader = {
    readAsText: vi.fn(),
    readAsDataURL: vi.fn(),
    readAsArrayBuffer: vi.fn(),
    readAsBinaryString: vi.fn(),
    abort: vi.fn(),
    onload: null as any,
    onerror: null as any,
    onprogress: null as any,
    onabort: null as any,
    onloadstart: null as any,
    onloadend: null as any,
    result: null,
    error: null,
    readyState: 0,
    EMPTY: 0,
    LOADING: 1,
    DONE: 2
  }
  
  global.FileReader = vi.fn(() => mockReader) as any
  
  return mockReader
}

// Mock DOM APIs
export const mockDOMAPIs = () => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))

  // Mock scroll methods
  Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
    writable: true
  })
  
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    value: vi.fn(),
    writable: true
  })

  // Mock URL methods
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn(() => 'mock-object-url'),
    writable: true
  })
  
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: vi.fn(),
    writable: true
  })
}

// Mock environment variables
export const mockEnvVars = (vars: Record<string, string>) => {
  const originalEnv = process.env
  process.env = { ...originalEnv, ...vars }
  
  return () => {
    process.env = originalEnv
  }
}

// Mock date for consistent testing
export const mockDate = (dateString: string = '2024-01-15T10:00:00.000Z') => {
  const mockDate = new Date(dateString)
  const originalDate = Date
  
  global.Date = vi.fn(() => mockDate) as any
  global.Date.now = vi.fn(() => mockDate.getTime())
  global.Date.UTC = originalDate.UTC
  global.Date.parse = originalDate.parse
  
  return () => {
    global.Date = originalDate
  }
}

// Mock timers
export const mockTimers = () => {
  vi.useFakeTimers()
  
  return {
    advanceBy: (ms: number) => vi.advanceTimersByTime(ms),
    runAll: () => vi.runAllTimers(),
    runOnlyPending: () => vi.runOnlyPendingTimers(),
    restore: () => vi.useRealTimers()
  }
}

// All-in-one setup function
export const setupAllMocks = () => {
  const supabase = createSupabaseMock()
  const router = createNextRouterMock()
  const fetch = createFetchMock()
  const console = mockConsole()
  const localStorage = createLocalStorageMock()
  const sessionStorage = createSessionStorageMock()
  
  // Setup global mocks
  mockDOMAPIs()
  
  // Mock global objects
  Object.defineProperty(window, 'localStorage', {
    value: localStorage
  })
  
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorage
  })
  
  return {
    supabase,
    router,
    fetch,
    console,
    localStorage,
    sessionStorage,
    cleanup: () => {
      console.restore()
      vi.clearAllMocks()
      vi.resetAllMocks()
    }
  }
}

// Export everything
export default {
  createSupabaseMock,
  createNextRouterMock,
  mockUseRouter,
  createFetchMock,
  fetchResponses,
  mockConsole,
  createLocalStorageMock,
  createSessionStorageMock,
  createFileMock,
  mockFileReader,
  mockDOMAPIs,
  mockEnvVars,
  mockDate,
  mockTimers,
  setupAllMocks
}