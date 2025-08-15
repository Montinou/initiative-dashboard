"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { UserRole } from './role-permissions';

// Simplified UserProfile interface - only essential fields
interface UserProfile {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  area_id: string | null;
  is_active: boolean;
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
  isAuthenticated: boolean;
  tenantId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  initialSession?: Session | null;
  initialProfile?: UserProfile | null;
}

export function AuthProvider({ children, initialSession, initialProfile }: AuthProviderProps) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(initialSession?.user || null);
  const [session, setSession] = useState<Session | null>(initialSession || null);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile || null);
  const [loading, setLoading] = useState(!initialSession);

  // Fetch user profile when user changes
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, tenant_id, email, full_name, role, area_id, is_active, created_at, updated_at')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
        return;
      }

      setProfile(data as UserProfile);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfile(null);
    }
  }, [supabase]);

  // Initialize auth state following Supabase best practices
  useEffect(() => {
    let isActive = true;

    const initializeAuth = async () => {
      // ✅ BEST PRACTICE: Get initial session on client-side
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (isActive) {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        
        if (currentSession?.user && !initialProfile) {
          await fetchProfile(currentSession.user.id);
        }
        
        setLoading(false);
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isActive) return;

        setSession(newSession);
        setUser(newSession?.user || null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
        } else if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        }

        setLoading(false);
      }
    );

    // Initialize if no initial session provided
    if (!initialSession) {
      initializeAuth();
    } else if (initialSession.user && !initialProfile) {
      fetchProfile(initialSession.user.id);
      setLoading(false);
    } else {
      setLoading(false);
    }

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, initialSession, initialProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
      }
      
      setUser(null);
      setSession(null);
      setProfile(null);
      
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    } catch (error) {
      console.error('Sign out error:', error);
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user && !!session,
    tenantId: profile?.tenant_id || null,
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

// Simplified helper hooks
export function useUserRole(): UserRole | null {
  const { profile } = useAuth();
  return profile?.role || null;
}

export function useTenantId(): string | null {
  const { profile } = useAuth();
  return profile?.tenant_id || null;
}

export function useUserProfile(): UserProfile | null {
  const { profile } = useAuth();
  return profile;
}