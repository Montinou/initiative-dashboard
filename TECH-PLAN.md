# Technical Implementation Plan: User Profile Management System

## Executive Summary

This technical plan provides a comprehensive architecture and implementation strategy for fixing critical user profile management issues in the Next.js 15.2.4 application. The plan addresses incorrect database relationships, implements efficient caching systems, and ensures consistent profile data access across all application components.

## Problem Analysis

### Current Issues
1. **Database Relationship Error**: Code uses `user_profiles.id = auth.users.id` instead of correct `user_profiles.user_id = auth.users.id`
2. **Performance Issues**: Profile data fetched on every API request without caching
3. **Inconsistent Access**: Multiple implementations for profile fetching across the application
4. **No Centralized Management**: Profile data scattered across components with different access patterns

### Impact Assessment
- Slow application performance due to repeated database queries
- Incorrect user data being displayed or accessed
- Potential security vulnerabilities from incorrect user identification
- Poor user experience with loading delays and inconsistent states

## Architecture Overview

### System Components
```
Frontend Layer (Next.js 15.2.4)
├── Profile Context Provider (React Context)
├── Profile Cache Manager (SWR/React Query)
├── Profile Components (Avatars, Cards, Dropdowns)
└── Error Boundaries (Profile-specific error handling)

Middleware Layer
├── Profile Resolution Middleware
├── Cache Invalidation Manager
├── Profile Validation Layer
└── Security Context Manager

Backend Services
├── Profile Service Layer
├── Database Query Optimization
├── Cache Management (Redis/In-memory)
└── Profile Update Handlers

Database Layer
├── Corrected Query Patterns
├── Optimized Indexes
├── Profile Relationship Fixes
└── Performance Monitoring
```

## Database Schema Analysis & Fixes

### Current Schema Review
Based on the schema, the correct relationship is:
```sql
-- CORRECT RELATIONSHIP
user_profiles.user_id -> auth.users.id

-- INCORRECT (currently used in code)
user_profiles.id -> auth.users.id
```

### Query Pattern Corrections

#### 1. Fix Profile Fetching Queries
```sql
-- BEFORE (Incorrect)
SELECT * FROM user_profiles 
WHERE id = $1; -- Using auth.users.id directly

-- AFTER (Correct)
SELECT up.* FROM user_profiles up
WHERE up.user_id = $1; -- Using the correct foreign key
```

#### 2. Optimized Profile Queries
```sql
-- Basic profile fetch with area and tenant info
SELECT 
  up.id,
  up.full_name,
  up.email,
  up.role,
  up.avatar_url,
  up.phone,
  up.is_active,
  up.area_id,
  a.name as area_name,
  t.name as tenant_name,
  t.subdomain as tenant_subdomain
FROM user_profiles up
LEFT JOIN areas a ON a.id = up.area_id
LEFT JOIN tenants t ON t.id = up.tenant_id
WHERE up.user_id = $1 AND up.is_active = true;

-- Profile with permissions context
SELECT 
  up.*,
  a.name as area_name,
  t.name as tenant_name
FROM user_profiles up
LEFT JOIN areas a ON a.id = up.area_id
LEFT JOIN tenants t ON t.id = up.tenant_id
WHERE up.user_id = $1 
  AND up.tenant_id = $2 
  AND up.is_active = true;
```

#### 3. Performance Indexes
```sql
-- Add missing indexes for profile queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_user ON user_profiles(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active, user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_area_active ON user_profiles(area_id, is_active);
```

## Centralized Profile Service

### 1. Profile Service Implementation
```typescript
// lib/user-profile-service.ts
import { createClient } from '@/utils/supabase/server';
import { cache } from 'react';
import { UserProfile, ProfileCache } from '@/types/database';

class UserProfileService {
  private static cache = new Map<string, ProfileCache>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Cached profile fetching for server components
  static getProfile = cache(async (userId: string, tenantId?: string): Promise<UserProfile | null> => {
    const cacheKey = `${userId}:${tenantId || 'default'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.profile;
    }

    const supabase = createClient();
    
    // CORRECTED QUERY: Using user_id instead of id
    let query = supabase
      .from('user_profiles')
      .select(`
        *,
        areas (
          id,
          name,
          description
        ),
        tenants (
          id,
          name,
          subdomain
        )
      `)
      .eq('user_id', userId)  // FIXED: Using correct foreign key
      .eq('is_active', true)
      .single();

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: profile, error } = await query;

    if (error) {
      console.error('Profile fetch error:', error);
      return null;
    }

    // Cache the result
    this.cache.set(cacheKey, {
      profile,
      timestamp: Date.now()
    });

    return profile;
  });

  // Real-time profile updates
  static async updateProfile(
    userId: string, 
    updates: Partial<UserProfile>,
    tenantId?: string
  ): Promise<UserProfile | null> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)  // FIXED: Using correct foreign key
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Profile update failed: ${error.message}`);
    }

    // Invalidate cache
    this.invalidateCache(userId, tenantId);
    
    return data;
  }

  // Cache management
  static invalidateCache(userId: string, tenantId?: string) {
    const cacheKey = `${userId}:${tenantId || 'default'}`;
    this.cache.delete(cacheKey);
  }

  static clearCache() {
    this.cache.clear();
  }

  // Batch profile fetching for multiple users
  static async getProfiles(userIds: string[], tenantId?: string): Promise<UserProfile[]> {
    const supabase = createClient();
    
    let query = supabase
      .from('user_profiles')
      .select(`
        *,
        areas (id, name),
        tenants (id, name, subdomain)
      `)
      .in('user_id', userIds)  // FIXED: Using correct foreign key
      .eq('is_active', true);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Batch profiles fetch error:', error);
      return [];
    }

    return data || [];
  }
}

export { UserProfileService };
```

### 2. Profile Context Provider
```typescript
// lib/auth-context.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { UserProfile } from '@/types/database';

interface ProfileContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  isAuthenticated: boolean;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      // CORRECTED QUERY: Using user_id instead of id
      const { data, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          areas (
            id,
            name,
            description
          ),
          tenants (
            id,
            name,
            subdomain
          )
        `)
        .eq('user_id', userId)  // FIXED: Using correct foreign key
        .eq('is_active', true)
        .single();

      if (profileError) {
        throw new Error(`Profile fetch failed: ${profileError.message}`);
      }

      setProfile(data);
    } catch (err) {
      setError(err as Error);
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', user.id)  // FIXED: Using correct foreign key
        .select()
        .single();

      if (error) {
        throw new Error(`Profile update failed: ${error.message}`);
      }

      setProfile(data);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [user, profile, supabase]);

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile, supabase]);

  const value: ProfileContextValue = {
    user,
    profile,
    loading,
    error,
    refreshProfile,
    updateProfile,
    isAuthenticated: !!user && !!profile
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
```

## API Routes Corrections

### 1. Profile API Route
```typescript
// app/api/profile/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { UserProfileService } from '@/lib/user-profile-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get authenticated user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant ID from request or user context
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    // Use centralized profile service
    const profile = await UserProfileService.getProfile(session.user.id, tenantId || undefined);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });

  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get authenticated user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    // Update profile using centralized service
    const updatedProfile = await UserProfileService.updateProfile(
      session.user.id,
      updates,
      tenantId || undefined
    );

    return NextResponse.json({ profile: updatedProfile });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Update failed', details: error.message },
      { status: 500 }
    );
  }
}
```

### 2. Middleware Updates
```typescript
// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { UserProfileService } from '@/lib/user-profile-service';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Get user session
  const { data: { user } } = await supabase.auth.getUser();

  // Enhanced profile resolution for protected routes
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    try {
      // Extract tenant context from URL or subdomain
      const tenantId = extractTenantId(request);
      
      // Use centralized profile service with caching
      const profile = await UserProfileService.getProfile(user.id, tenantId);
      
      if (!profile) {
        console.warn(`Profile not found for user ${user.id}`);
        return NextResponse.redirect(new URL('/profile/setup', request.url));
      }

      // Add profile context to request headers for downstream components
      response.headers.set('x-user-profile-id', profile.id);
      response.headers.set('x-user-role', profile.role);
      response.headers.set('x-user-area-id', profile.area_id || '');
      response.headers.set('x-user-tenant-id', profile.tenant_id);

    } catch (error) {
      console.error('Profile resolution error in middleware:', error);
      // Continue with request but log the error
    }
  }

  return response;
}

function extractTenantId(request: NextRequest): string | undefined {
  // Extract from subdomain
  const host = request.headers.get('host');
  if (host && host !== 'localhost:3000') {
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www') {
      return subdomain;
    }
  }

  // Extract from query params as fallback
  return request.nextUrl.searchParams.get('tenant') || undefined;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

## Component Updates

### 1. Profile Avatar Component
```typescript
// components/profile-avatar.tsx
'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface ProfileAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  showOnline?: boolean;
  loading?: boolean;
  fallbackColor?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg'
};

export function ProfileAvatar({
  size = 'md',
  showStatus = false,
  showOnline = false,
  loading: externalLoading = false,
  fallbackColor,
  className
}: ProfileAvatarProps) {
  const { profile, loading: contextLoading } = useProfile();
  const [imageError, setImageError] = useState(false);
  
  const isLoading = externalLoading || contextLoading;
  const sizeClass = sizeClasses[size];

  if (isLoading) {
    return (
      <Skeleton 
        className={cn(
          sizeClass,
          'rounded-full bg-white/10 backdrop-blur-sm',
          className
        )}
      />
    );
  }

  if (!profile) {
    return (
      <Avatar className={cn(sizeClass, className)}>
        <AvatarFallback className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white">
          ?
        </AvatarFallback>
      </Avatar>
    );
  }

  const initials = profile.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || profile.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="relative">
      <Avatar className={cn(sizeClass, className)}>
        {profile.avatar_url && !imageError ? (
          <AvatarImage
            src={profile.avatar_url}
            alt={profile.full_name || 'Profile'}
            onError={() => setImageError(true)}
          />
        ) : null}
        <AvatarFallback 
          className={cn(
            'bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-medium',
            fallbackColor && `bg-${fallbackColor}`
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      
      {showOnline && (
        <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
      )}
      
      {showStatus && profile.role && (
        <Badge 
          variant="secondary" 
          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs bg-white/10 backdrop-blur-sm"
        >
          {profile.role}
        </Badge>
      )}
    </div>
  );
}
```

### 2. Profile Dropdown Component
```typescript
// components/profile-dropdown.tsx
'use client';

import { LogOut, Settings, User, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProfileAvatar } from './profile-avatar';
import { useProfile } from '@/lib/auth-context';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ProfileDropdown() {
  const { profile, loading, refreshProfile } = useProfile();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <ProfileAvatar loading={true} />;
  }

  if (!profile) {
    return (
      <Button variant="ghost" size="sm" onClick={() => router.push('/auth/login')}>
        Sign In
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
          <ProfileAvatar size="md" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-56 bg-white/10 backdrop-blur-xl border border-white/20" 
        align="end"
      >
        <DropdownMenuLabel className="text-white">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile.full_name || 'User'}
            </p>
            <p className="text-xs leading-none text-white/70">
              {profile.email}
            </p>
            {profile.areas && (
              <p className="text-xs leading-none text-white/50">
                {profile.areas.name}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/20" />
        <DropdownMenuItem 
          className="text-white hover:bg-white/10 focus:bg-white/10"
          onClick={() => router.push('/profile')}
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="text-white hover:bg-white/10 focus:bg-white/10"
          onClick={() => router.push('/settings')}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="text-white hover:bg-white/10 focus:bg-white/10"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/20" />
        <DropdownMenuItem 
          className="text-red-300 hover:bg-red-500/10 focus:bg-red-500/10"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Hook Updates

### 1. Updated useUserProfile Hook
```typescript
// hooks/useUserProfile.ts
'use client';

import { useProfile } from '@/lib/auth-context';
import { UserProfile } from '@/types/database';

// Wrapper hook for backward compatibility
export function useUserProfile() {
  const { profile, loading, error, refreshProfile, updateProfile } = useProfile();

  return {
    profile,
    loading,
    error,
    refetch: refreshProfile,
    updateProfile,
    // Computed properties for convenience
    isManager: profile?.role === 'Manager',
    isAdmin: profile?.role === 'Admin' || profile?.is_system_admin,
    isAnalyst: profile?.role === 'Analyst',
    hasArea: !!profile?.area_id,
    areaName: profile?.areas?.name,
    tenantName: profile?.tenants?.name
  };
}

// Hook for profile operations
export function useProfileOperations() {
  const { updateProfile, refreshProfile } = useProfile();

  const updateAvatar = async (avatarUrl: string) => {
    await updateProfile({ avatar_url: avatarUrl });
  };

  const updateBasicInfo = async (info: Pick<UserProfile, 'full_name' | 'phone'>) => {
    await updateProfile(info);
  };

  return {
    updateAvatar,
    updateBasicInfo,
    refreshProfile
  };
}
```

## Error Handling & Monitoring

### 1. Profile Error Boundary
```typescript
// components/profile-error-boundary.tsx
'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface ProfileErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ProfileErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class ProfileErrorBoundary extends React.Component<
  ProfileErrorBoundaryProps,
  ProfileErrorBoundaryState
> {
  constructor(props: ProfileErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ProfileErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Profile Error Boundary caught an error:', error, errorInfo);
    
    // Send to monitoring service
    if (typeof window !== 'undefined') {
      // Log to analytics/monitoring service
      console.error('Profile error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultProfileErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error!}
          retry={() => {
            this.setState({ hasError: false, error: undefined });
            window.location.reload();
          }}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultProfileErrorFallback({ 
  error, 
  retry 
}: { 
  error: Error; 
  retry: () => void; 
}) {
  return (
    <Alert className="bg-red-500/10 border-red-500/20 backdrop-blur-sm">
      <AlertTriangle className="h-4 w-4 text-red-400" />
      <AlertTitle className="text-red-200">Profile Loading Error</AlertTitle>
      <AlertDescription className="text-red-300 space-y-2">
        <p>Unable to load your profile information.</p>
        <p className="text-sm">{error.message}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={retry}
          className="bg-red-500/20 border-red-500/30 text-red-200 hover:bg-red-500/30"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

### 2. Performance Monitoring
```typescript
// lib/profile-monitoring.ts
interface ProfileMetrics {
  fetchTime: number;
  cacheHit: boolean;
  errorRate: number;
  userAgent: string;
  timestamp: number;
}

class ProfileMonitor {
  private metrics: ProfileMetrics[] = [];

  recordFetch(startTime: number, cacheHit: boolean, error?: Error) {
    const fetchTime = Date.now() - startTime;
    
    this.metrics.push({
      fetchTime,
      cacheHit,
      errorRate: error ? 1 : 0,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      timestamp: Date.now()
    });

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Log performance issues
    if (fetchTime > 2000) {
      console.warn('Slow profile fetch detected:', {
        fetchTime,
        cacheHit,
        error: error?.message
      });
    }
  }

  getPerformanceStats() {
    const recentMetrics = this.metrics.slice(-50);
    
    return {
      averageFetchTime: recentMetrics.reduce((sum, m) => sum + m.fetchTime, 0) / recentMetrics.length,
      cacheHitRate: recentMetrics.filter(m => m.cacheHit).length / recentMetrics.length,
      errorRate: recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length,
      totalRequests: recentMetrics.length
    };
  }
}

export const profileMonitor = new ProfileMonitor();
```

## Testing Strategy

### 1. Profile Service Tests
```typescript
// __tests__/lib/user-profile-service.test.ts
import { UserProfileService } from '@/lib/user-profile-service';
import { createClient } from '@supabase/supabase-js';

jest.mock('@/utils/supabase/server');

describe('UserProfileService', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('getProfile', () => {
    it('should fetch profile with correct user_id relationship', async () => {
      const mockProfile = {
        id: 'profile-123',
        user_id: 'user-456',
        full_name: 'Test User',
        email: 'test@example.com'
      };

      mockSupabase.single.mockResolvedValue({ 
        data: mockProfile, 
        error: null 
      });

      const result = await UserProfileService.getProfile('user-456', 'tenant-789');

      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-456'); // Correct relationship
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
      expect(result).toEqual(mockProfile);
    });

    it('should handle profile fetch errors gracefully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' }
      });

      const result = await UserProfileService.getProfile('user-456');

      expect(result).toBeNull();
    });

    it('should cache profile data', async () => {
      const mockProfile = { id: 'profile-123', user_id: 'user-456' };
      
      mockSupabase.single.mockResolvedValue({ 
        data: mockProfile, 
        error: null 
      });

      // First call
      await UserProfileService.getProfile('user-456');
      
      // Second call should use cache
      await UserProfileService.getProfile('user-456');

      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateProfile', () => {
    it('should update profile with correct user_id relationship', async () => {
      const updates = { full_name: 'Updated Name' };
      const mockUpdatedProfile = {
        id: 'profile-123',
        user_id: 'user-456',
        full_name: 'Updated Name'
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUpdatedProfile,
        error: null
      });

      const result = await UserProfileService.updateProfile('user-456', updates, 'tenant-789');

      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-456'); // Correct relationship
      expect(result).toEqual(mockUpdatedProfile);
    });
  });
});
```

### 2. Profile Context Tests
```typescript
// __tests__/lib/auth-context.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { ProfileProvider, useProfile } from '@/lib/auth-context';
import { createClient } from '@/utils/supabase/client';

jest.mock('@/utils/supabase/client');

function TestComponent() {
  const { profile, loading, error } = useProfile();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!profile) return <div>No profile</div>;
  
  return <div>Profile: {profile.full_name}</div>;
}

describe('ProfileProvider', () => {
  const mockSupabase = {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn()
  };

  beforeEach(() => {
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('should fetch profile with correct query', async () => {
    const mockSession = {
      user: { id: 'user-123' }
    };
    
    const mockProfile = {
      id: 'profile-456',
      user_id: 'user-123',
      full_name: 'Test User'
    };

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession }
    });
    
    mockSupabase.single.mockResolvedValue({
      data: mockProfile,
      error: null
    });

    render(
      <ProfileProvider>
        <TestComponent />
      </ProfileProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Profile: Test User')).toBeInTheDocument();
    });

    expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123'); // Correct relationship
  });
});
```

## Implementation Roadmap

### Phase 1: Database & Backend Fixes (Week 1)
1. **Day 1-2**: Audit and fix all database queries using incorrect relationships
2. **Day 3-4**: Implement UserProfileService with proper caching
3. **Day 5-7**: Update all API routes to use centralized service

### Phase 2: Frontend Context & Components (Week 2)
1. **Day 1-2**: Implement ProfileProvider context with error handling
2. **Day 3-4**: Update all profile-related components
3. **Day 5-7**: Update hooks and ensure backward compatibility

### Phase 3: Testing & Performance (Week 3)
1. **Day 1-3**: Comprehensive test coverage for all profile functionality
2. **Day 4-5**: Performance monitoring and optimization
3. **Day 6-7**: Error boundary implementation and testing

### Phase 4: Integration & Deployment (Week 4)
1. **Day 1-3**: Integration testing across all dashboard components
2. **Day 4-5**: Load testing and cache optimization
3. **Day 6-7**: Production deployment with monitoring

## Success Metrics

### Performance Targets
- Profile load time: < 200ms (cached), < 800ms (fresh)
- Cache hit rate: > 85%
- Error rate: < 2%
- Database query reduction: > 60%

### Quality Targets
- Test coverage: > 90% for profile-related code
- Zero incorrect database relationship queries
- Consistent profile data across all components
- Graceful error handling in all scenarios

This technical plan provides a comprehensive solution to fix the user profile management issues while maintaining performance, security, and user experience standards.