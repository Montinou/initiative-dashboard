# Unit Testing Guide

## Introduction

Unit tests form the foundation of our testing pyramid, providing fast, reliable feedback on individual components, functions, and hooks. This guide covers best practices, patterns, and examples for writing effective unit tests in the Initiative Dashboard project.

## Core Concepts

### What to Unit Test

#### Components
- Rendering with different props
- User interactions (clicks, inputs)
- Conditional rendering logic
- Error states and loading states
- Accessibility attributes

#### Functions
- Pure functions with business logic
- Data transformations
- Validation functions
- Utility functions
- Calculation methods

#### Hooks
- State management
- Side effects
- Custom hook logic
- Error handling
- Loading states

## Testing Setup

### Configuration
Our unit tests use Vitest with the following configuration:

```typescript
// automation/config/vitest.config.ts
{
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['../utils/test-setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        global: { branches: 70, functions: 70, lines: 70 }
      }
    }
  }
}
```

### File Structure
```
automation/unit/
├── components/           # React component tests
│   ├── forms/
│   ├── dashboard/
│   └── common/
├── hooks/               # Custom hook tests
│   ├── data/
│   ├── auth/
│   └── utils/
├── utils/               # Utility function tests
│   ├── validation/
│   ├── formatting/
│   └── calculations/
└── lib/                 # Library function tests
    ├── api/
    ├── auth/
    └── database/
```

## Writing Unit Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('ComponentName', () => {
  // Setup and teardown
  beforeEach(() => {
    // Reset mocks, setup test data
  })

  afterEach(() => {
    // Cleanup
  })

  // Group related tests
  describe('rendering', () => {
    it('should render with default props', () => {
      // Arrange
      const props = { title: 'Test' }
      
      // Act
      const result = render(<Component {...props} />)
      
      // Assert
      expect(result.getByText('Test')).toBeInTheDocument()
    })
  })

  describe('user interactions', () => {
    it('should handle click events', async () => {
      // Test implementation
    })
  })
})
```

## Component Testing

### Basic Component Test

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { InitiativeCard } from '@/components/InitiativeCard'

describe('InitiativeCard', () => {
  const mockInitiative = {
    id: '123',
    title: 'Q4 Sales Goals',
    progress: 75,
    status: 'in_progress',
    area: 'Sales',
    dueDate: '2025-12-31'
  }

  it('should render initiative details', () => {
    render(<InitiativeCard initiative={mockInitiative} />)
    
    expect(screen.getByText('Q4 Sales Goals')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('Sales')).toBeInTheDocument()
  })

  it('should handle edit action', async () => {
    const onEdit = vi.fn()
    render(<InitiativeCard initiative={mockInitiative} onEdit={onEdit} />)
    
    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)
    
    expect(onEdit).toHaveBeenCalledWith(mockInitiative.id)
  })

  it('should show completed badge when progress is 100', () => {
    const completedInitiative = { ...mockInitiative, progress: 100 }
    render(<InitiativeCard initiative={completedInitiative} />)
    
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })
})
```

### Form Component Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InitiativeForm } from '@/components/forms/InitiativeForm'

describe('InitiativeForm', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('should validate required fields', async () => {
    render(<InitiativeForm onSubmit={mockOnSubmit} />)
    
    const submitButton = screen.getByRole('button', { name: /submit/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument()
      expect(screen.getByText('Area is required')).toBeInTheDocument()
    })
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('should submit valid form data', async () => {
    const user = userEvent.setup()
    render(<InitiativeForm onSubmit={mockOnSubmit} />)
    
    // Fill in form fields
    await user.type(screen.getByLabelText(/title/i), 'New Initiative')
    await user.selectOptions(screen.getByLabelText(/area/i), 'Sales')
    await user.type(screen.getByLabelText(/description/i), 'Test description')
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /submit/i }))
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'New Initiative',
        area: 'Sales',
        description: 'Test description'
      })
    })
  })
})
```

## Hook Testing

### Custom Hook Test

```typescript
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useInitiatives } from '@/hooks/useInitiatives'
import { createWrapper } from '@/test-utils/test-providers'

// Mock Supabase client
vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: mockInitiatives,
          error: null
        }))
      }))
    }))
  }))
}))

describe('useInitiatives', () => {
  const mockInitiatives = [
    { id: '1', title: 'Initiative 1', progress: 50 },
    { id: '2', title: 'Initiative 2', progress: 75 }
  ]

  it('should fetch initiatives on mount', async () => {
    const { result } = renderHook(() => useInitiatives(), {
      wrapper: createWrapper()
    })

    // Initial loading state
    expect(result.current.loading).toBe(true)
    expect(result.current.initiatives).toEqual([])

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.initiatives).toEqual(mockInitiatives)
    expect(result.current.error).toBeNull()
  })

  it('should handle errors gracefully', async () => {
    // Mock error response
    const mockError = new Error('Failed to fetch')
    vi.mocked(createClient).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: null,
            error: mockError
          }))
        }))
      }))
    }))

    const { result } = renderHook(() => useInitiatives(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(mockError.message)
    expect(result.current.initiatives).toEqual([])
  })

  it('should update initiative progress', async () => {
    const { result } = renderHook(() => useInitiatives(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Update progress
    await act(async () => {
      await result.current.updateProgress('1', 80)
    })

    expect(result.current.initiatives[0].progress).toBe(80)
  })
})
```

### Data Fetching Hook Test

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useAreas } from '@/hooks/useAreas'
import { server } from '@/test-utils/msw-server'
import { rest } from 'msw'

describe('useAreas', () => {
  it('should fetch and cache areas data', async () => {
    const mockAreas = [
      { id: '1', name: 'Sales', manager: 'John Doe' },
      { id: '2', name: 'Marketing', manager: 'Jane Smith' }
    ]

    server.use(
      rest.get('/api/areas', (req, res, ctx) => {
        return res(ctx.json({ areas: mockAreas }))
      })
    )

    const { result } = renderHook(() => useAreas())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockAreas)
    expect(result.current.error).toBeUndefined()
  })

  it('should handle network errors', async () => {
    server.use(
      rest.get('/api/areas', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }))
      })
    )

    const { result } = renderHook(() => useAreas())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toBeDefined()
  })
})
```

## Utility Function Testing

### Validation Function Tests

```typescript
import { describe, it, expect } from 'vitest'
import { 
  validateEmail, 
  validateFileSize, 
  validateOKRData 
} from '@/lib/validation'

describe('Validation Functions', () => {
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'john.doe@company.org',
        'test+tag@domain.co.uk'
      ]

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true)
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user@.com',
        'user@domain'
      ]

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false)
      })
    })
  })

  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      const file = new File(['content'], 'test.xlsx', { type: 'application/xlsx' })
      Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }) // 5MB
      
      expect(validateFileSize(file, 10 * 1024 * 1024)).toBe(true)
    })

    it('should reject files exceeding size limit', () => {
      const file = new File(['content'], 'test.xlsx', { type: 'application/xlsx' })
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }) // 15MB
      
      expect(validateFileSize(file, 10 * 1024 * 1024)).toBe(false)
    })
  })

  describe('validateOKRData', () => {
    it('should validate correct OKR structure', () => {
      const validData = {
        objectives: [
          {
            title: 'Increase Revenue',
            description: 'Q4 revenue goals',
            keyResults: [
              { title: 'Hit $1M ARR', target: 1000000, current: 750000 }
            ]
          }
        ]
      }

      const result = validateOKRData(validData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should catch missing required fields', () => {
      const invalidData = {
        objectives: [
          {
            description: 'Missing title',
            keyResults: []
          }
        ]
      }

      const result = validateOKRData(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Objective title is required')
    })
  })
})
```

### Data Transformation Tests

```typescript
import { describe, it, expect } from 'vitest'
import { 
  formatCurrency, 
  calculateProgress, 
  groupByArea 
} from '@/lib/utils'

describe('Data Transformation Utils', () => {
  describe('formatCurrency', () => {
    it('should format numbers as currency', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00')
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should handle negative numbers', () => {
      expect(formatCurrency(-500)).toBe('-$500.00')
    })
  })

  describe('calculateProgress', () => {
    it('should calculate percentage correctly', () => {
      expect(calculateProgress(50, 100)).toBe(50)
      expect(calculateProgress(3, 4)).toBe(75)
      expect(calculateProgress(0, 100)).toBe(0)
      expect(calculateProgress(100, 100)).toBe(100)
    })

    it('should handle edge cases', () => {
      expect(calculateProgress(0, 0)).toBe(0)
      expect(calculateProgress(10, 0)).toBe(0)
      expect(calculateProgress(-10, 100)).toBe(0)
    })
  })

  describe('groupByArea', () => {
    it('should group initiatives by area', () => {
      const initiatives = [
        { id: '1', area: 'Sales', title: 'Initiative 1' },
        { id: '2', area: 'Marketing', title: 'Initiative 2' },
        { id: '3', area: 'Sales', title: 'Initiative 3' }
      ]

      const grouped = groupByArea(initiatives)
      
      expect(grouped).toEqual({
        Sales: [
          { id: '1', area: 'Sales', title: 'Initiative 1' },
          { id: '3', area: 'Sales', title: 'Initiative 3' }
        ],
        Marketing: [
          { id: '2', area: 'Marketing', title: 'Initiative 2' }
        ]
      })
    })
  })
})
```

## Mocking Strategies

### Mocking Modules

```typescript
// Mock entire module
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn()
  }))
}))

// Mock specific exports
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: '123', email: 'test@example.com' },
    loading: false,
    error: null
  }))
}))
```

### Mocking API Calls

```typescript
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('/api/initiatives', (req, res, ctx) => {
    return res(ctx.json({ 
      initiatives: [
        { id: '1', title: 'Test Initiative' }
      ] 
    }))
  }),
  
  rest.post('/api/initiatives', (req, res, ctx) => {
    return res(ctx.status(201), ctx.json({ 
      id: '2',
      ...req.body 
    }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### Mocking Time and Timers

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Time-dependent functionality', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should handle delayed operations', async () => {
    const callback = vi.fn()
    setTimeout(callback, 1000)
    
    expect(callback).not.toHaveBeenCalled()
    
    vi.advanceTimersByTime(1000)
    
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should use mocked date', () => {
    expect(new Date().toISOString()).toBe('2025-01-01T00:00:00.000Z')
  })
})
```

## Testing Patterns

### Testing Async Operations

```typescript
describe('Async operations', () => {
  it('should handle promises', async () => {
    const fetchData = () => Promise.resolve({ data: 'test' })
    
    const result = await fetchData()
    expect(result.data).toBe('test')
  })

  it('should handle rejected promises', async () => {
    const fetchData = () => Promise.reject(new Error('Failed'))
    
    await expect(fetchData()).rejects.toThrow('Failed')
  })

  it('should wait for async updates', async () => {
    const { result } = renderHook(() => useAsyncData())
    
    expect(result.current.loading).toBe(true)
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    expect(result.current.data).toBeDefined()
  })
})
```

### Testing Error Boundaries

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary'

describe('ErrorBoundary', () => {
  it('should catch and display errors', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(getByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('should render children when no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <div>No errors here</div>
      </ErrorBoundary>
    )

    expect(getByText('No errors here')).toBeInTheDocument()
  })
})
```

### Testing Context Providers

```typescript
import { TenantProvider, useTenant } from '@/contexts/TenantContext'

const TestComponent = () => {
  const { tenant, setTenant } = useTenant()
  return (
    <div>
      <span>{tenant?.name || 'No tenant'}</span>
      <button onClick={() => setTenant({ id: '1', name: 'SIGA' })}>
        Set Tenant
      </button>
    </div>
  )
}

describe('TenantContext', () => {
  it('should provide tenant data', () => {
    const { getByText } = render(
      <TenantProvider initialTenant={{ id: '1', name: 'FEMA' }}>
        <TestComponent />
      </TenantProvider>
    )

    expect(getByText('FEMA')).toBeInTheDocument()
  })

  it('should update tenant', async () => {
    const { getByText, getByRole } = render(
      <TenantProvider>
        <TestComponent />
      </TenantProvider>
    )

    expect(getByText('No tenant')).toBeInTheDocument()
    
    fireEvent.click(getByRole('button'))
    
    await waitFor(() => {
      expect(getByText('SIGA')).toBeInTheDocument()
    })
  })
})
```

## Best Practices

### Do's
- ✅ Test behavior, not implementation
- ✅ Use descriptive test names
- ✅ Keep tests simple and focused
- ✅ Mock at the boundaries
- ✅ Clean up after tests
- ✅ Test edge cases and error conditions
- ✅ Use data-testid for complex queries

### Don'ts
- ❌ Test implementation details
- ❌ Use snapshot tests for dynamic content
- ❌ Share state between tests
- ❌ Mock everything
- ❌ Ignore console errors/warnings
- ❌ Write brittle tests with hard-coded values

## Common Testing Scenarios

### Testing Forms with Validation

```typescript
describe('Form validation', () => {
  it('should show validation errors', async () => {
    const { getByRole, getByText } = render(<ContactForm />)
    
    // Submit empty form
    fireEvent.click(getByRole('button', { name: /submit/i }))
    
    // Check for validation messages
    await waitFor(() => {
      expect(getByText('Email is required')).toBeInTheDocument()
      expect(getByText('Message is required')).toBeInTheDocument()
    })
  })
})
```

### Testing Role-Based Rendering

```typescript
describe('Role-based UI', () => {
  it('should show admin controls for admin users', () => {
    const adminUser = { role: 'admin', id: '1' }
    
    const { getByRole } = render(
      <Dashboard user={adminUser} />
    )
    
    expect(getByRole('button', { name: /manage users/i })).toBeInTheDocument()
  })

  it('should hide admin controls for regular users', () => {
    const regularUser = { role: 'user', id: '2' }
    
    const { queryByRole } = render(
      <Dashboard user={regularUser} />
    )
    
    expect(queryByRole('button', { name: /manage users/i })).not.toBeInTheDocument()
  })
})
```

## Debugging Tests

### Using Debug Output

```typescript
import { render, screen, debug } from '@testing-library/react'

it('should debug component output', () => {
  const { container } = render(<MyComponent />)
  
  // Print entire container
  debug(container)
  
  // Print specific element
  debug(screen.getByRole('button'))
  
  // Pretty print with depth limit
  debug(container, 20000)
})
```

### Using Vitest UI

```bash
# Run tests with interactive UI
npm run test:ui

# Opens browser at http://localhost:51204/__vitest__/
```

## Resources

- [Vitest Documentation](https://vitest.dev)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Kent C. Dodds Testing Articles](https://kentcdodds.com/testing)

---

**Last Updated**: 2025-08-16  
**Next**: [Integration Testing Guide](./integration-testing.md)