"use client";

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { UserRole, hasPermission, canAccessArea, getPermittedAreas } from './role-permissions';
import { SessionPersistence } from '@/utils/session-persistence';

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
      // Try to load cached session for faster initial render
      const cachedSession = SessionPersistence.loadCachedSession();
      if (cachedSession && cachedSession.user) {
        console.log('📦 AuthContext: Using cached session for faster load');
        setUser(cachedSession.user as User);
        // Don't set full session yet, wait for validation
      }

      // Setup auth state change listener first
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          if (!isActive) return;
          
          console.log(`🔄 AuthContext: Auth state changed - ${event}`);
          
          // Persist session changes
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            SessionPersistence.saveSession(newSession);
          } else if (event === 'SIGNED_OUT') {
            SessionPersistence.clearSession();
          }
          
          // Update session and user immediately
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          // Handle profile based on event type
          if (event === 'SIGNED_OUT') {
            // Clear profile immediately on sign out
            setProfile(null);
            setLoading(false);
          } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
            // On token refresh, keep existing profile if we have it
            // Only fetch if profile is missing
            if (!profileRef.current || profileRef.current.user_id !== newSession.user.id) {
              await fetchUserProfile(newSession.user.id, newSession);
            }
          } else if (newSession?.user) {
            // For other events with a user, fetch profile
            await fetchUserProfile(newSession.user.id, newSession);
          } else {
            setProfile(null);
            setLoading(false);
          }
        }
      );
      
      authSubscription = subscription;
      setAuthListenerReady(true);

      // Skip session fetch if we have initial session from server
      if (initialSession) {
        console.log('✅ AuthContext: Using initial session from server');
        setLoading(false);
        return;
      }

      // Get initial session only if no initial session provided
      try {
        console.log('🔍 AuthContext: Fetching initial session...');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (!isActive) return;
        
        if (error) {
          console.warn('⚠️ AuthContext: Session fetch error:', error.message);
          setLoading(false);
          return;
        }
        
        if (currentSession) {
          console.log('✅ AuthContext: Session found:', {
            userId: currentSession.user?.id,
            email: currentSession.user?.email
          });
          
          setSession(currentSession);
          setUser(currentSession.user);
          await fetchUserProfile(currentSession.user.id, currentSession);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('❌ AuthContext: Error initializing auth:', error);
        if (isActive) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isActive = false;
      authSubscription?.unsubscribe();
    };
  }, []); // Remove dependencies to prevent re-runs

  // Optimized profile fetching with better error handling and tenant_id extraction
  const fetchUserProfile = async (userId: string, session: any) => {
    try {
      console.log('👤 AuthContext: Fetching profile for user:', userId);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      try {
        // Try to fetch profile using user_id (current schema)
        // Note: Some columns may not exist yet in production
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
          .single()
          .abortSignal(controller.signal);
        
        clearTimeout(timeout);

        if (error) {
          // Try email fallback if user_id not found
          if (error.code === 'PGRST116' && session?.user?.email) {
            console.log('🔄 AuthContext: Trying email-based fallback...');
            const { data: fallbackProfile, error: fallbackError } = await supabase
              .from('user_profiles')
              .select(`
                id,
                user_id,
                tenant_id,
                email,
                full_name,
                avatar_url,
                phone,
                role,
                area_id,
                is_active,
                is_system_admin,
                last_login,
                created_at,
                updated_at
              `)
              .eq('email', session.user.email)
              .single();
            
            if (!fallbackError && fallbackProfile) {
              console.log('✅ AuthContext: Profile found via email fallback');
              setProfile(fallbackProfile as UserProfile);
              
              // Update last_login asynchronously
              updateLastLogin(fallbackProfile.id);
              return;
            }
          }
          
          console.error('❌ AuthContext: Profile fetch error:', error.message);
          setProfile(null);
        } else if (userProfile) {
          console.log('✅ AuthContext: Profile fetched:', {
            email: userProfile.email,
            role: userProfile.role,
            tenant_id: userProfile.tenant_id
          });
          
          const validProfile = userProfile as UserProfile;
          setProfile(validProfile);
          profileRef.current = validProfile;
          
          // Update last_login asynchronously
          updateLastLogin(userProfile.id);
        } else {
          console.warn('⚠️ AuthContext: No profile found for user');
          setProfile(null);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.error('⏱️ AuthContext: Profile fetch timeout');
        } else {
          console.error('❌ AuthContext: Profile fetch exception:', error);
        }
        setProfile(null);
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      console.error('❌ AuthContext: Unexpected error in fetchUserProfile:', error);
      setProfile(null);
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
    console.log('🚪 AuthContext: Starting sign out process...');
    
    try {
      // Clear local state immediately for better UX
      setUser(null);
      setSession(null);
      setProfile(null);
      setLoading(true);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ AuthContext: Sign out error:', error);
        // Even if there's an error, we should clear local state
      }
      
      console.log('✅ AuthContext: Sign out completed');
      
      // Clear any cached data
      if (typeof window !== 'undefined') {
        // Clear any stored session data in localStorage
        const keysToRemove = Object.keys(localStorage).filter(key => 
          key.startsWith('sb-') || key.includes('supabase')
        );
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear sessionStorage as well
        const sessionKeysToRemove = Object.keys(sessionStorage).filter(key => 
          key.startsWith('sb-') || key.includes('supabase')
        );
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
        
        // Redirect to login page
        window.location.href = '/auth/login';
      }
    } catch (error) {
      console.error('❌ AuthContext: Unexpected error during sign out:', error);
      // Still redirect even on error
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
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
        return { error };
      }

      setProfile(data as UserProfile);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // Permission check wrapper
  const checkPermission = (permission: string): boolean => {
    if (!profile) return false;
    return hasPermission(profile.role, permission as any);
  };

  // Area access check wrapper
  const checkAreaAccess = (area: string): boolean => {
    if (!profile) return false;
    return canAccessArea(profile.role, profile.area?.name || null, area);
  };

  // Get permitted areas wrapper
  const getUserPermittedAreas = (): string[] => {
    if (!profile) return [];
    return getPermittedAreas(profile.role, profile.area?.name || undefined);
  };

  // Compute derived values
  const tenantId = profile?.tenant_id || user?.user_metadata?.tenant_id || null;
  const isAuthenticated = !!user && !!session;

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
    updateProfile,
    hasPermission: checkPermission,
    canAccessArea: checkAreaAccess,
    getPermittedAreas: getUserPermittedAreas,
    tenantId,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
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
