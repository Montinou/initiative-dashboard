# State Management Guide

## Overview

The Initiative Dashboard uses a combination of state management strategies optimized for different use cases:

- **Server State**: SWR for data fetching and caching
- **Client State**: React Context for global state
- **Form State**: React Hook Form for forms
- **URL State**: Next.js router for navigation state

## State Management Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Application State                  │
├─────────────────────────────────────────────────────┤
│  Server State (SWR)           Client State (Context)│
│  - API Data                   - User Session        │
│  - Cached Responses           - UI Preferences      │
│  - Background Sync            - Theme Settings      │
│                                                     │
│  Form State (RHF)             URL State (Router)   │
│  - Input Values               - Filters             │
│  - Validation                 - Pagination          │
│  - Submission                 - Search Params       │
└─────────────────────────────────────────────────────┘
```

## Server State with SWR

### Basic Configuration

```typescript
// lib/swr-config.ts
import { SWRConfig } from 'swr';

export const swrConfig = {
  fetcher: (url: string) => fetch(url).then(res => res.json()),
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  dedupingInterval: 2000,
};

// app/providers.tsx
export function Providers({ children }) {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  );
}
```

### Data Fetching Pattern

```typescript
// hooks/useInitiatives.tsx
import useSWR from 'swr';
import { mutate } from 'swr';

export function useInitiatives() {
  const { data, error, isLoading, mutate: revalidate } = useSWR(
    '/api/initiatives',
    {
      revalidateIfStale: false,
      revalidateOnMount: true,
      keepPreviousData: true,
    }
  );

  const createInitiative = async (data: InitiativeInsert) => {
    // Optimistic update
    mutate(
      '/api/initiatives',
      async (initiatives: Initiative[]) => {
        const response = await fetch('/api/initiatives', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        const newInitiative = await response.json();
        return [...initiatives, newInitiative];
      },
      {
        optimisticData: (current) => [...current, { ...data, id: 'temp' }],
        rollbackOnError: true,
        populateCache: true,
        revalidate: false,
      }
    );
  };

  return {
    initiatives: data?.initiatives || [],
    loading: isLoading,
    error,
    createInitiative,
    refetch: revalidate,
  };
}
```

### Cache Management

```typescript
// Cache keys management
const cacheKeys = {
  initiatives: (filters?: Filters) => 
    filters ? `/api/initiatives?${stringify(filters)}` : '/api/initiatives',
  initiative: (id: string) => `/api/initiatives/${id}`,
  objectives: '/api/objectives',
  areas: '/api/areas',
};

// Cache invalidation
export async function invalidateInitiatives() {
  await mutate(
    key => typeof key === 'string' && key.startsWith('/api/initiatives'),
    undefined,
    { revalidate: true }
  );
}

// Prefetching
export async function prefetchDashboard() {
  await Promise.all([
    mutate(cacheKeys.initiatives(), fetch(cacheKeys.initiatives()).then(r => r.json())),
    mutate(cacheKeys.objectives, fetch(cacheKeys.objectives).then(r => r.json())),
    mutate(cacheKeys.areas, fetch(cacheKeys.areas).then(r => r.json())),
  ]);
}
```

## Client State with React Context

### Auth Context

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        await fetchProfile(user.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    setUser(data.user);
    setSession(data.session);
    await fetchProfile(data.user.id);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Theme Context

```typescript
// contexts/ThemeContext.tsx
interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: Theme) => void;
  tenantTheme: TenantTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const tenantTheme = useTenantTheme();

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    
    // Apply tenant colors
    if (tenantTheme) {
      root.style.setProperty('--primary', tenantTheme.primary);
      root.style.setProperty('--secondary', tenantTheme.secondary);
    }
  }, [theme, tenantTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, tenantTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### Filter Context

```typescript
// contexts/FilterContext.tsx
interface FilterContextType {
  filters: FilterState;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  activeFilters: string[];
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterState>({
    area: null,
    status: 'all',
    dateRange: null,
    search: '',
  });

  const setFilter = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      area: null,
      status: 'all',
      dateRange: null,
      search: '',
    });
  };

  const activeFilters = Object.entries(filters)
    .filter(([_, value]) => value && value !== 'all')
    .map(([key]) => key);

  return (
    <FilterContext.Provider value={{
      filters,
      setFilter,
      clearFilters,
      activeFilters,
    }}>
      {children}
    </FilterContext.Provider>
  );
}
```

## Form State with React Hook Form

### Basic Form Setup

```typescript
// components/forms/InitiativeForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const initiativeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(1000).optional(),
  area_id: z.string().uuid('Invalid area'),
  start_date: z.date(),
  due_date: z.date(),
  objectives: z.array(z.string().uuid()).min(1, 'Select at least one objective'),
});

type InitiativeFormData = z.infer<typeof initiativeSchema>;

export function InitiativeForm() {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting, isDirty },
    reset,
    setValue,
    getValues,
  } = useForm<InitiativeFormData>({
    resolver: zodResolver(initiativeSchema),
    defaultValues: {
      title: '',
      description: '',
      objectives: [],
    },
  });

  const onSubmit = async (data: InitiativeFormData) => {
    try {
      await createInitiative(data);
      reset();
    } catch (error) {
      console.error('Failed to create initiative:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} />
      {errors.title && <span>{errors.title.message}</span>}
      
      <Controller
        name="area_id"
        control={control}
        render={({ field }) => (
          <Select {...field}>
            {areas.map(area => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </Select>
        )}
      />
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

### Advanced Form Patterns

```typescript
// Dynamic form fields
export function DynamicForm() {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'activities',
  });

  return (
    <>
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...register(`activities.${index}.title`)} />
          <button onClick={() => remove(index)}>Remove</button>
        </div>
      ))}
      <button onClick={() => append({ title: '' })}>Add Activity</button>
    </>
  );
}

// Conditional fields
export function ConditionalForm() {
  const watchStatus = watch('status');

  return (
    <>
      <select {...register('status')}>
        <option value="planning">Planning</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
      </select>
      
      {watchStatus === 'completed' && (
        <input
          type="date"
          {...register('completion_date', {
            required: 'Completion date is required',
          })}
        />
      )}
    </>
  );
}
```

## URL State Management

### Search Params Hook

```typescript
// hooks/useSearchParams.tsx
import { useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';

export function useSearchParams() {
  const router = useRouter();
  const searchParams = useNextSearchParams();

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    
    router.push(`?${params.toString()}`);
  };

  const setParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    router.push(`?${params.toString()}`);
  };

  return {
    params: Object.fromEntries(searchParams.entries()),
    setParam,
    setParams,
    clearParams: () => router.push(window.location.pathname),
  };
}
```

### Filter Sync with URL

```typescript
// components/FilterBar.tsx
export function FilterBar() {
  const { params, setParams } = useSearchParams();
  const [filters, setFilters] = useState({
    status: params.status || 'all',
    area: params.area || null,
    search: params.search || '',
  });

  // Sync filters to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      setParams(filters);
    }, 500); // Debounce

    return () => clearTimeout(timer);
  }, [filters]);

  return (
    <div>
      <Select
        value={filters.status}
        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
      >
        <option value="all">All</option>
        <option value="planning">Planning</option>
        <option value="in_progress">In Progress</option>
      </Select>
      
      <input
        type="search"
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        placeholder="Search..."
      />
    </div>
  );
}
```

## State Persistence

### Local Storage

```typescript
// hooks/useLocalStorage.tsx
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  };

  return [storedValue, setValue] as const;
}

// Usage
const [preferences, setPreferences] = useLocalStorage('userPreferences', {
  compactView: false,
  showCompleted: true,
  defaultTab: 'overview',
});
```

### Session Storage

```typescript
// hooks/useSessionStorage.tsx
export function useSessionStorage<T>(key: string, initialValue: T) {
  // Similar to useLocalStorage but uses sessionStorage
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

## Optimistic Updates

### Pattern

```typescript
// Optimistic update with rollback
export function useOptimisticUpdate() {
  const { data, mutate } = useSWR('/api/initiatives');

  const updateInitiative = async (id: string, updates: Partial<Initiative>) => {
    const optimisticData = data.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );

    try {
      // Update UI immediately
      await mutate(optimisticData, false);
      
      // Make API call
      const response = await fetch(`/api/initiatives/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error('Update failed');
      
      // Revalidate to get server state
      await mutate();
    } catch (error) {
      // Rollback on error
      await mutate();
      throw error;
    }
  };

  return { updateInitiative };
}
```

## State Synchronization

### Cross-Tab Sync

```typescript
// hooks/useBroadcastChannel.tsx
export function useBroadcastChannel(channelName: string) {
  const [channel] = useState(() => 
    typeof window !== 'undefined' 
      ? new BroadcastChannel(channelName)
      : null
  );

  useEffect(() => {
    if (!channel) return;

    const handleMessage = (event: MessageEvent) => {
      // Handle incoming messages
      if (event.data.type === 'STATE_UPDATE') {
        // Update local state
        mutate(event.data.key);
      }
    };

    channel.addEventListener('message', handleMessage);
    
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [channel]);

  const broadcast = (message: any) => {
    channel?.postMessage(message);
  };

  return { broadcast };
}

// Usage
const { broadcast } = useBroadcastChannel('app-state');

// Broadcast state changes
const updateData = async () => {
  await mutate('/api/data');
  broadcast({ type: 'STATE_UPDATE', key: '/api/data' });
};
```

### Real-time Updates

```typescript
// hooks/useRealtimeSubscription.tsx
export function useRealtimeSubscription(table: string) {
  const { mutate } = useSWR(`/api/${table}`);

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          // Revalidate cache on database changes
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, mutate]);
}
```

## Performance Optimization

### Selective Re-renders

```typescript
// Use memo for expensive components
const ExpensiveComponent = memo(({ data }) => {
  return <div>{/* Render logic */}</div>;
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.data.id === nextProps.data.id;
});

// Split contexts to minimize re-renders
const UserContext = createContext(null);
const PreferencesContext = createContext(null);

// Instead of one large context
const AppContext = createContext({
  user: null,
  preferences: null,
  // ... many other values
});
```

### State Normalization

```typescript
// Normalize nested data
interface NormalizedState {
  entities: {
    initiatives: Record<string, Initiative>;
    activities: Record<string, Activity>;
    objectives: Record<string, Objective>;
  };
  ids: {
    initiatives: string[];
    activities: string[];
    objectives: string[];
  };
}

// Selectors for denormalized data
const selectInitiativeWithRelations = (state: NormalizedState, id: string) => {
  const initiative = state.entities.initiatives[id];
  return {
    ...initiative,
    activities: initiative.activityIds.map(id => state.entities.activities[id]),
    objectives: initiative.objectiveIds.map(id => state.entities.objectives[id]),
  };
};
```

## Testing State Management

### Context Testing

```typescript
// Test provider wrapper
const wrapper = ({ children }) => (
  <AuthProvider>
    <FilterProvider>
      {children}
    </FilterProvider>
  </AuthProvider>
);

// Test hooks
const { result } = renderHook(() => useAuth(), { wrapper });

act(() => {
  result.current.signIn('test@example.com', 'password');
});

expect(result.current.user).toBeDefined();
```

### SWR Testing

```typescript
// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: mockData,
    error: null,
    isLoading: false,
    mutate: vi.fn(),
  })),
}));
```

## Best Practices

1. **Keep state close to where it's used** - Don't lift state unnecessarily
2. **Use the right tool** - Server state (SWR), Client state (Context), Form state (RHF)
3. **Normalize complex state** - Avoid deeply nested structures
4. **Optimize re-renders** - Use memo, useCallback, and split contexts
5. **Handle loading and error states** - Always provide feedback
6. **Make state predictable** - Use TypeScript and immutable updates
7. **Test state logic** - Unit test hooks and context providers