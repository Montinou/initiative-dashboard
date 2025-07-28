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
  area: string | null; // Changed from area_id to area (area name)
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
      
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      if (userProfile) {
        setProfile(userProfile as UserProfile);
        
        // Update last_login timestamp
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userId);
          
        if (updateError) {
          console.error('Error updating last login:', updateError);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
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
    return canAccessArea(profile.role, profile.area || null, area);
  };

  // Get permitted areas wrapper
  const getUserPermittedAreas = (): string[] => {
    if (!profile) return [];
    return getPermittedAreas(profile.role, profile.area || undefined);
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