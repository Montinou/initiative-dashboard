# Coding Standards & Conventions

## Overview

This document outlines the coding standards and conventions for the Initiative Dashboard project. Following these guidelines ensures consistency, maintainability, and quality across the codebase.

## TypeScript Standards

### Type Safety

**Always use strict typing:**

```typescript
// ✅ Good - Explicit types
interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  tenant_id: string;
}

function getUserById(id: string): Promise<UserProfile> {
  // Implementation
}

// ❌ Bad - Using any
function processData(data: any) {
  // Avoid any type
}
```

**Use type guards for runtime validation:**

```typescript
// Type guard function
function isUserProfile(obj: unknown): obj is UserProfile {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj &&
    'role' in obj
  );
}

// Usage
if (isUserProfile(data)) {
  // TypeScript knows data is UserProfile here
  console.log(data.email);
}
```

### Naming Conventions

```typescript
// Interfaces: PascalCase with descriptive names
interface InitiativeWithRelations { }

// Types: PascalCase
type UserRole = 'CEO' | 'Admin' | 'Manager';

// Enums: PascalCase with UPPER_CASE values
enum Status {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

// Functions: camelCase
function calculateProgress() { }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;

// Variables: camelCase
const userProfile = await fetchProfile();
```

## React & Next.js Patterns

### Component Structure

```typescript
// Standard component structure
import { FC, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { InitiativeProps } from './types';

interface ComponentProps {
  title: string;
  onAction?: () => void;
  className?: string;
}

export const MyComponent: FC<ComponentProps> = ({ 
  title, 
  onAction,
  className 
}) => {
  // 1. State declarations
  const [loading, setLoading] = useState(false);
  
  // 2. Hooks
  const { data, error } = useCustomHook();
  
  // 3. Effects
  useEffect(() => {
    // Effect logic
  }, []);
  
  // 4. Handlers
  const handleClick = () => {
    onAction?.();
  };
  
  // 5. Render
  return (
    <div className={cn("base-styles", className)}>
      <Button onClick={handleClick}>{title}</Button>
    </div>
  );
};
```

### Server vs Client Components

```typescript
// Server Component (default in app directory)
// app/dashboard/page.tsx
import { createClient } from '@/utils/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('initiatives').select();
  
  return <DashboardView initiatives={data} />;
}

// Client Component (needs interactivity)
// components/dashboard/dashboard-view.tsx
"use client";

import { useState } from 'react';

export function DashboardView({ initiatives }) {
  const [selected, setSelected] = useState(null);
  
  return (
    // Interactive UI
  );
}
```

### Custom Hooks Pattern

```typescript
// hooks/useInitiatives.tsx
export function useInitiatives() {
  const [data, setData] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/initiatives');
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result.initiatives);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    initiatives: data,
    loading,
    error,
    refetch: fetchData
  };
}
```

## API Development

### API Route Structure

```typescript
// app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth-helper';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Define validation schemas
const querySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const { user, userProfile, supabase, error } = await authenticateRequest(request);
    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    // 2. Validation
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    // 3. Business logic
    const { data, error: dbError } = await supabase
      .from('table')
      .select()
      .range(
        (query.page - 1) * query.limit,
        query.page * query.limit - 1
      );

    if (dbError) throw dbError;

    // 4. Response
    return NextResponse.json({ data });
  } catch (error) {
    logger.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Error Handling

```typescript
// Centralized error handler
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Usage in API routes
try {
  if (!user) {
    throw new ApiError('Unauthorized', 401, 'AUTH_REQUIRED');
  }
  
  if (!hasPermission) {
    throw new ApiError('Forbidden', 403, 'INSUFFICIENT_PERMISSIONS');
  }
} catch (error) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

## Database Patterns

### Supabase Client Usage

```typescript
// Server-side (app directory)
import { createClient } from '@/utils/supabase/server';

export async function getInitiatives() {
  const supabase = await createClient();
  
  // Always use getUser() on server, never getSession()
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  
  // RLS handles tenant filtering automatically
  const { data } = await supabase
    .from('initiatives')
    .select(`
      *,
      area:areas(name),
      activities(*)
    `)
    .order('created_at', { ascending: false });
    
  return data;
}

// Client-side
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();
```

### Query Patterns

```typescript
// Efficient queries with relationships
const { data } = await supabase
  .from('initiatives')
  .select(`
    id,
    title,
    progress,
    area:area_id (
      id,
      name
    ),
    activities:activities (
      id,
      title,
      is_completed
    ),
    objectives:objective_initiatives (
      objective:objective_id (
        id,
        title
      )
    )
  `)
  .eq('status', 'in_progress')
  .order('created_at', { ascending: false })
  .limit(10);

// Using RPC for complex queries
const { data } = await supabase
  .rpc('get_dashboard_metrics', {
    p_tenant_id: tenantId,
    p_date_from: startDate,
    p_date_to: endDate
  });
```

## Styling Standards

### Tailwind CSS Usage

```typescript
// Use cn() utility for conditional classes
import { cn } from '@/lib/utils';

<div className={cn(
  "base-styles px-4 py-2",
  isActive && "bg-primary text-white",
  isDisabled && "opacity-50 cursor-not-allowed",
  className // Allow override from props
)} />

// Component variants with cva
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "border border-input bg-background",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### CSS Organization

```css
/* globals.css - Follow this order */

/* 1. CSS Variables */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }
}

/* 2. Base styles */
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

/* 3. Component styles */
@layer components {
  .card {
    @apply rounded-lg border bg-card text-card-foreground shadow-sm;
  }
}

/* 4. Utility classes */
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

## Testing Standards

### Unit Test Structure

```typescript
// Component test
import { render, screen, fireEvent } from '@testing-library/react';
import { InitiativeCard } from './InitiativeCard';

describe('InitiativeCard', () => {
  const mockProps = {
    title: 'Test Initiative',
    progress: 50,
    onEdit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render initiative title', () => {
    render(<InitiativeCard {...mockProps} />);
    expect(screen.getByText('Test Initiative')).toBeInTheDocument();
  });

  it('should call onEdit when edit button clicked', () => {
    render(<InitiativeCard {...mockProps} />);
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(mockProps.onEdit).toHaveBeenCalledTimes(1);
  });
});
```

### API Test Structure

```typescript
// API route test
import { GET } from '@/app/api/initiatives/route';
import { createMockRequest } from '@/tests/utils';

describe('GET /api/initiatives', () => {
  it('should return 401 without authentication', async () => {
    const request = createMockRequest();
    const response = await GET(request);
    
    expect(response.status).toBe(401);
  });

  it('should return initiatives for authenticated user', async () => {
    const request = createMockRequest({ 
      authenticated: true,
      userId: 'test-user-id' 
    });
    
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('initiatives');
  });
});
```

## Documentation Standards

### Code Comments

```typescript
/**
 * Fetches initiatives with their relationships
 * @param filters - Optional filters for query
 * @returns Promise with initiatives data
 * @throws {ApiError} When authentication fails
 */
export async function fetchInitiatives(filters?: InitiativeFilters) {
  // Complex logic deserves explanation
  // This query uses RLS to automatically filter by tenant
  const query = supabase.from('initiatives').select();
  
  // Apply conditional filters
  if (filters?.status) {
    query.eq('status', filters.status);
  }
  
  return query;
}
```

### JSDoc for Types

```typescript
/**
 * Represents an initiative with all its relationships
 */
export interface InitiativeWithRelations {
  /** Unique identifier */
  id: string;
  
  /** Initiative title */
  title: string;
  
  /** Progress percentage (0-100) */
  progress: number;
  
  /** Related activities */
  activities?: Activity[];
  
  /** Linked objectives through junction table */
  objectives?: Objective[];
}
```

## Git Commit Standards

### Commit Message Format

```bash
# Format: <type>(<scope>): <subject>

feat(initiatives): Add bulk update functionality
fix(auth): Resolve session refresh issue
docs(api): Update endpoint documentation
style(dashboard): Improve responsive layout
refactor(hooks): Simplify useInitiatives logic
test(initiatives): Add integration tests
chore(deps): Update dependencies
```

### Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Maintenance tasks

## Performance Best Practices

### Code Splitting

```typescript
// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Use Suspense for loading states
<Suspense fallback={<LoadingSpinner />}>
  <HeavyComponent />
</Suspense>
```

### Memoization

```typescript
// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// Memoize components
const MemoizedComponent = memo(ExpensiveComponent);
```

### Data Fetching

```typescript
// Use SWR for client-side fetching
import useSWR from 'swr';

const { data, error, mutate } = useSWR(
  '/api/initiatives',
  fetcher,
  {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 5000,
  }
);
```

## Security Best Practices

### Input Validation

```typescript
// Always validate and sanitize input
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

const schema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).transform(val => 
    DOMPurify.sanitize(val)
  ),
});
```

### Authentication Checks

```typescript
// Server-side authentication
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateRequest(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Proceed with authenticated logic
}
```

### Environment Variables

```typescript
// Type-safe environment variables
const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  // Service keys only on server
  ...(typeof window === 'undefined' && {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
};
```