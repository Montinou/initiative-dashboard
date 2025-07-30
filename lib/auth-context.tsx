"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { UserRole, hasPermission, canAccessArea, getPermittedAreas } from './role-permissions';

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
    description: string;
  } | null;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  is_system_admin: boolean;
  last_login: string | null;
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

  useEffect(() => {
    // Skip session fetch if we have initial session from server
    if (initialSession) {
      console.log('✅ AuthContext: Using initial session from server, skipping client fetch');
      return;
    }

    // Get initial session only if no initial session provided
    const getInitialSession = async () => {
      console.log('AuthContext: Getting initial session...');
      try {
        // Add timeout to prevent hanging on dashboard
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 10000) // Increased to 10 seconds
        );
        
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        console.log('AuthContext: Session query completed');
        console.log('AuthContext: Session error:', error);
        console.log('AuthContext: Session result:', session ? 'Found' : 'None');
        
        if (session) {
          console.log('AuthContext: Session details:', {
            userId: session.user?.id,
            email: session.user?.email,
            expiresAt: session.expires_at
          });
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('AuthContext: Fetching user profile for:', session.user.id);
          await fetchUserProfile(session.user.id, session);
        } else {
          console.log('AuthContext: No user session, setting loading to false');
        }
        
        console.log('AuthContext: Setting loading to false');
        setLoading(false);
      } catch (error) {
        console.error('AuthContext: Error in getInitialSession:', error);
        // On timeout or error, assume no session and continue
        console.log('AuthContext: Continuing without session due to error');
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id, session);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [initialSession]);

  const fetchUserProfile = async (userId: string, session: any) => {
    try {
      console.log('AuthContext: Starting fetchUserProfile for:', userId);
      
      // Add timeout to prevent infinite hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      );
      
      // Try using the API endpoint instead of direct database query
      const fetchPromise = fetch('/api/profile/user', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        return { data: result.profile, error: null };
      }).catch((error) => {
        return { data: null, error };
      });
      
      const { data: userProfile, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) {
        console.error('AuthContext: Error fetching user profile:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          userId: userId
        });
        // Don't return early - we should still set loading to false
      } else {
        console.log('AuthContext: User profile fetched successfully:', userProfile ? 'Found' : 'None');
        if (userProfile) {
          setProfile(userProfile as UserProfile);
          
          // Update last_login timestamp (don't await to avoid blocking)
          console.log('AuthContext: Updating last login timestamp');
          supabase
            .from('user_profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', userId)
            .then(({ error: updateError }) => {
              if (updateError) {
                console.error('AuthContext: Error updating last login:', updateError);
              } else {
                console.log('AuthContext: Last login updated successfully');
              }
            });
        }
      }
    } catch (error) {
      console.error('AuthContext: Error in fetchUserProfile:', error);
    }
    console.log('AuthContext: fetchUserProfile completed');
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
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

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
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
        .eq('id', user.id)
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

// Helper hooks for common auth checks
export function useUserRole(): UserRole | null {
  const { profile } = useAuth();
  return profile?.role ?? null;
}

export function useTenantId(): string | null {
  const { profile } = useAuth();
  return profile?.tenant_id ?? null;
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