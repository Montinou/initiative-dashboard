"use client";

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { UserRole, hasPermission, canAccessArea, getPermittedAreas } from './role-permissions';
import { SessionPersistence } from '@/utils/session-persistence';

// Optional debug helper (set NEXT_PUBLIC_DEBUG_AUTH=true to enable verbose logs)
const authDebug = (...args: any[]) => {
  if (process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true') {
    // eslint-disable-next-line no-console
    console.log('[Auth]', ...args)
  }
};

// Updated UserProfile interface to match our schema
interface UserProfile {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  area_id: string | null;
  area: {
    id: string;
    name: string;
    description?: string;
  } | null;
  avatar_url?: string | null;
  phone?: string | null;
  is_active?: boolean;
  is_system_admin?: boolean;
  last_login?: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
  hasPermission: (permission: string) => boolean;
  canAccessArea: (area: string) => boolean;
  getPermittedAreas: () => string[];
  tenantId: string | null; // Direct access to tenant ID
  isAuthenticated: boolean; // Quick check for auth status
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode
  initialSession?: any
  initialProfile?: any
}

export function AuthProvider({ children, initialSession, initialProfile }: AuthProviderProps) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(initialSession?.user || null);
  const [session, setSession] = useState<Session | null>(initialSession || null);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile || null);
  const [loading, setLoading] = useState(!initialSession); // Only load if no initial session
  const [authListenerReady, setAuthListenerReady] = useState(false);
  const profileRef = useRef<UserProfile | null>(initialProfile || null);

  // Keep profileRef in sync with profile state
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Optimized session initialization effect with persistence
  useEffect(() => {
    let isActive = true;
    let authSubscription: any = null;

    const initializeAuth = async () => {
      // Load minimal cached session & profile first (fast paint)
      const cachedSession = SessionPersistence.loadCachedSession();
      const cachedProfile = cachedSession?.user?.id ? SessionPersistence.loadCachedProfile(cachedSession.user.id) : null;
      if (cachedSession?.user) {
        authDebug('Using cached session user', cachedSession.user.id);
        setUser(cachedSession.user as User);
      }
      if (!initialProfile && cachedProfile) {
        authDebug('Hydrating cached profile', cachedProfile.id);
        setProfile(cachedProfile as UserProfile);
        profileRef.current = cachedProfile;
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          if (!isActive) return;
          authDebug('Auth state change', event, newSession?.user?.id);
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            SessionPersistence.saveSession(newSession);
          } else if (event === 'SIGNED_OUT') {
            SessionPersistence.clearAll?.();
          }
          setSession(newSession);
          setUser(newSession?.user ?? null);

          if (event === 'SIGNED_OUT') {
            setProfile(null);
            setLoading(false);
            return;
          }

            if (newSession?.user) {
              // Always refetch profile on sign in / token refresh; keep existing to avoid flicker on refresh
              const keepExisting = event === 'TOKEN_REFRESHED';
              await fetchUserProfile(newSession.user.id, newSession, keepExisting);
            } else {
              setProfile(null);
              setLoading(false);
            }
        }
      );

      authSubscription = subscription;

      if (initialSession) {
        authDebug('Using server-provided initial session');
        setLoading(false);
        return;
      }

      // Initial session fetch if none passed from server
      try {
        authDebug('Fetching initial session');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (!isActive) return;
        if (error) {
          authDebug('Initial session fetch error', error.message);
          setLoading(false);
          return;
        }
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          // If no profile hydrated yet attempt cached profile then network
          if (!profileRef.current) {
            const cached = SessionPersistence.loadCachedProfile(currentSession.user.id);
            if (cached) {
              authDebug('Applied cached profile before network', cached.id);
              setProfile(cached as UserProfile);
              profileRef.current = cached as UserProfile;
            }
          }
          await fetchUserProfile(currentSession.user.id, currentSession, true);
        }
        setLoading(false);
      } catch (err) {
        authDebug('initializeAuth exception', err);
        if (isActive) setLoading(false);
      }
    };

    initializeAuth();
    return () => {
      isActive = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  // Optimized profile fetching with better error handling and tenant_id extraction
  const fetchUserProfile = async (userId: string, session: any, keepExisting: boolean = false) => {
    try {
      authDebug('Fetching profile', userId, { keepExisting });
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          user_id,
          tenant_id,
          email,
          full_name,
          role,
          area_id,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)
        .single();

      if (error) {
        // Email fallback if row missing user_id
        if (error.code === 'PGRST116' && session?.user?.email) {
          authDebug('Primary lookup failed, trying email fallback');
          const { data: fallbackProfile } = await supabase
            .from('user_profiles')
            .select(`id, user_id, tenant_id, email, full_name, role, area_id, created_at, updated_at`)
            .eq('email', session.user.email)
            .single();
          if (fallbackProfile) {
            const validProfile: UserProfile = {
              area: null,
              avatar_url: null,
              phone: null,
              is_active: undefined,
              is_system_admin: undefined,
              last_login: undefined,
              ...(fallbackProfile as any)
            } as UserProfile;
            setProfile(validProfile);
            profileRef.current = validProfile;
            SessionPersistence.saveProfile({ ...validProfile, user_id: userId });
            updateLastLogin(validProfile.id);
            authDebug('Email fallback succeeded');
            return;
          }
        }
        authDebug('Profile fetch error', error.message);
        if (!keepExisting) setProfile(null);
        return;
      }

      if (userProfile) {
        const validProfile: UserProfile = {
          area: null,
          avatar_url: null,
          phone: null,
          is_active: undefined,
          is_system_admin: undefined,
          last_login: undefined,
          ...(userProfile as any)
        } as UserProfile;
        setProfile(validProfile);
        profileRef.current = validProfile;
        SessionPersistence.saveProfile({ ...validProfile, user_id: userId });
        updateLastLogin(validProfile.id);
        authDebug('Profile fetched & cached');
      } else if (!keepExisting) {
        setProfile(null);
      }
    } catch (err: any) {
      authDebug('fetchUserProfile exception', err?.message || err);
      if (!keepExisting) setProfile(null);
    }
  };
  
  // Helper function to update last login timestamp
  const updateLastLogin = async (profileId: string) => {
    try {
      await supabase
        .from('user_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', profileId);
    } catch (error) {
      console.error('❌ AuthContext: Failed to update last_login:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // Profile will be loaded by the auth state change listener
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // Improved signOut with complete cleanup and redirection
  const signOut = async () => {
    authDebug('Sign out start');
    try {
      setUser(null);
      setSession(null);
      setProfile(null);
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) authDebug('Sign out error', error.message);
      if (typeof window !== 'undefined') {
        SessionPersistence.clearAll?.();
        window.location.href = '/auth/login';
      }
    } catch (error) {
      if (typeof window !== 'undefined') window.location.href = '/auth/login';
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) {
      return { error: new Error('No authenticated user') };
    }
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) {
        throw error;
      }
      const updatedProfile = data as UserProfile;
      setProfile(updatedProfile);
      profileRef.current = updatedProfile;
      SessionPersistence.saveProfile({ ...updatedProfile, user_id: user.id });
      authDebug('Profile updated');
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // Permission check wrapper functions adapting signature
  const hasPermissionWrapper = (permission: string) => {
    if (!profile) return false;
    return hasPermission(profile.role, permission as any);
  };
  const canAccessAreaWrapper = (area: string) => {
    if (!profile) return false;
    return canAccessArea(profile.role, profile.area?.name || null, area);
  };
  const getPermittedAreasWrapper = () => {
    if (!profile) return [];
    return getPermittedAreas(profile.role, profile.area?.name || undefined);
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
    updateProfile,
    hasPermission: hasPermissionWrapper,
    canAccessArea: canAccessAreaWrapper,
    getPermittedAreas: getPermittedAreasWrapper,
    tenantId: profile?.tenant_id ?? null,
    isAuthenticated: !!user && !!session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hooks for common auth checks with better performance
export function useUserRole(): UserRole | null {
  const { profile } = useAuth();
  return profile?.role ?? null;
}

// Optimized tenant ID hook with consistent retrieval
export function useTenantId(): string | null {
  const { profile, user } = useAuth();
  
  // Priority: profile.tenant_id > user metadata > null
  if (profile?.tenant_id) {
    return profile.tenant_id;
  }
  
  // Fallback to user metadata if profile not loaded yet
  if (user?.user_metadata?.tenant_id) {
    return user.user_metadata.tenant_id as string;
  }
  
  return null;
}

export function useUserProfile(): UserProfile | null {
  const { profile } = useAuth();
  return profile;
}

// Permission hook
export function usePermissions() {
  const { hasPermission } = useAuth();
  return { hasPermission };
}

// Area access hook
export function useAreaAccess() {
  const { canAccessArea, getPermittedAreas } = useAuth();
  return { canAccessArea, getPermittedAreas };
}

// Hook for audit logging
export function useAuditLog() {
  const supabase = createClient();
  
  const logEvent = async (
    action: string,
    resourceType: string,
    resourceId?: string,
    oldValues?: any,
    newValues?: any
  ) => {
    try {
      const { error } = await supabase.rpc('log_audit_event', {
        action_name: action,
        resource_type: resourceType,
        resource_id: resourceId || null,
        old_values: oldValues || null,
        new_values: newValues || null,
        ip_address: null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });

      if (error) {
        console.error('Error logging audit event:', error);
      }
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  };

  return { logEvent };
}

// Manager-specific hooks and utilities
export function useManagerContext() {
  const { profile } = useAuth();
  
  const isManager = profile?.role === 'Manager';
  const managedAreaId = isManager ? profile?.area_id : null;
  const managedAreaName = isManager ? profile?.area?.name : null;
  
  // Check if current user is a manager and can access specific area
  const canManageArea = (areaId: string): boolean => {
    if (!profile || profile.role !== 'Manager') return false;
    return profile.area_id === areaId;
  };
  
  // Get manager's area info
  const getManagerArea = () => {
    if (!isManager || !profile?.area) return null;
    return {
      id: profile.area.id,
      name: profile.area.name,
      description: profile.area.description || profile.area.name
    };
  };
  
  return {
    isManager,
    managedAreaId,
    managedAreaName,
    canManageArea,
    getManagerArea,
    managerProfile: isManager ? profile : null
  };
}

// Area-specific data filtering hook for managers
export function useAreaDataFilter() {
  const { profile } = useAuth();
  
  // Get the appropriate area filter for current user
  const getAreaFilter = () => {
    if (!profile) return null;
    
    // Managers can only access their own area
    if (profile.role === 'Manager') {
      return { area_id: profile.area_id };
    }
    
    // CEO, Admin, and Analyst can access all areas
    if (['CEO', 'Admin', 'Analyst'].includes(profile.role)) {
      return null; // No filter - access all areas
    }
    
    return { area_id: null }; // Default: no access
  };
  
  // Get the tenant filter (always applies)
  const getTenantFilter = () => {
    if (!profile?.tenant_id) return null;
    return { tenant_id: profile.tenant_id };
  };
  
  // Get combined filters for database queries
  const getDataFilters = () => {
    const tenantFilter = getTenantFilter();
    const areaFilter = getAreaFilter();
    
    if (!tenantFilter) return null;
    
    if (areaFilter) {
      return { ...tenantFilter, ...areaFilter };
    }
    
    return tenantFilter;
  };
  
  return {
    getAreaFilter,
    getTenantFilter,
    getDataFilters,
    isAreaRestricted: profile?.role === 'Manager'
  };
}

// Manager permissions hook
export function useManagerPermissions() {
  const { profile, hasPermission } = useAuth();
  const { isManager, managedAreaId } = useManagerContext();
  
  // Check if manager can upload files for their area
  const canUploadFiles = (): boolean => {
    return isManager && !!managedAreaId;
  };
  
  // Check if manager can create initiatives in their area
  const canCreateInitiatives = (): boolean => {
    return isManager && hasPermission('createInitiatives');
  };
  
  // Check if manager can edit specific initiative
  const canEditInitiative = (initiativeAreaId: string): boolean => {
    if (!isManager || !managedAreaId) return false;
    return managedAreaId === initiativeAreaId && hasPermission('editInitiatives');
  };
  
  // Check if manager can manage activities in their area
  const canManageActivities = (): boolean => {
    return isManager && hasPermission('manageActivities');
  };
  
  // Check if manager can update progress in their area
  const canUpdateProgress = (): boolean => {
    return isManager && hasPermission('updateProgress');
  };
  
  return {
    canUploadFiles,
    canCreateInitiatives,
    canEditInitiative,
    canManageActivities,
    canUpdateProgress,
    isManager,
    managedAreaId
  };
}
