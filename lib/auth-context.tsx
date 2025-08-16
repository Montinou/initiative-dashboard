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

    // Profile fetch - runs in background and won't affect authentication success
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      console.log('🔄 [Background] Fetching profile for user:', userId);

      // First, ensure we have a valid session by calling getUser() - BEST PRACTICE
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.warn('⚠️  [Background] User session not found, skipping profile fetch:', userError?.message);
        setProfile(null);
        return;
      }

      // Strategy 1: Direct RLS query with reasonable timeout
      try {
        console.log('🔄 [Background] Trying direct profile query...');
        const { data, error } = await Promise.race([
          supabase
            .from('user_profiles')
            .select('id, tenant_id, email, full_name, role, area_id, is_active, created_at, updated_at')
            .eq('user_id', user.id)
            .single(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('[Background] Direct query timeout')), 3000)
          )
        ]);

        if (!error && data) {
          console.log('✅ [Background] Profile fetched via RLS query');
          setProfile(data as UserProfile);
          return;
        } else {
          console.warn('⚠️  [Background] Direct query failed, trying API fallback:', error?.message);
        }
      } catch (directError: any) {
        console.warn('⚠️  [Background] Direct query timed out, trying API fallback:', directError?.message);
      }

            // Strategy 2: API fallback with timeout
      try {
        console.log('🔄 [Background] Trying API fallback...');
        const response = await Promise.race([
          fetch('/api/profile/user', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('[Background] API timeout')), 5000)
          )
        ]);

        if (response.ok) {
          const apiData = await response.json();
          if (apiData.profile) {
            console.log('✅ [Background] Profile fetched via API fallback');
            setProfile(apiData.profile as UserProfile);
            return;
          }
        }
      } catch (apiError: any) {
        console.warn('⚠️  [Background] API fallback also failed:', apiError?.message);
      }

      // All strategies failed - this is a NON-CRITICAL error
      // User is already authenticated, profile can be retried later
      console.warn('⚠️  Profile fetch failed but user is authenticated - will retry on next action');
      setProfile(null);
      
    } catch (err: any) {
      console.warn('⚠️  [Background] Unexpected error in fetchProfile:', err?.message);
      setProfile(null);
    }
  }, [supabase]);

  // Initialize auth state following Supabase best practices
  useEffect(() => {
    let isActive = true;

    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing auth state...');
        
        // ✅ BEST PRACTICE: Always use getUser() for server-side validation (when needed)
        // But getSession() is fine for client-side initialization
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (isActive) {
          console.log('📊 Initial session state:', currentSession ? 'authenticated' : 'not authenticated');
          setSession(currentSession);
          setUser(currentSession?.user || null);
          
          if (currentSession?.user && !initialProfile) {
            console.log('👤 Fetching initial user profile...');
            await fetchProfile(currentSession.user.id);
          }
          
          setLoading(false);
          console.log('✅ Auth initialization completed');
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        if (isActive) {
          setLoading(false);
        }
      }
    };

    // Set up auth state change listener - ✅ BEST PRACTICE
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isActive) return;

        console.log('🔄 Auth state change:', event, newSession ? 'session active' : 'no session');
        
        setSession(newSession);
        setUser(newSession?.user || null);

        if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out, clearing profile');
          setProfile(null);
        } else if (event === 'SIGNED_IN' && newSession?.user) {
          console.log('👤 User signed in, fetching profile...');
          await fetchProfile(newSession.user.id);
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          console.log('🔄 Token refreshed, ensuring profile is current...');
          // Only re-fetch profile if we don't have one
          if (!profile) {
            await fetchProfile(newSession.user.id);
          }
        }

        setLoading(false);
      }
    );

    // Initialize based on whether we have initial data
    if (!initialSession) {
      console.log('🔄 No initial session, initializing from scratch...');
      initializeAuth();
    } else if (initialSession.user && !initialProfile) {
      console.log('👤 Initial session provided, fetching profile...');
      fetchProfile(initialSession.user.id);
      setLoading(false);
    } else {
      console.log('✅ Both initial session and profile provided');
      setLoading(false);
    }

    return () => {
      console.log('🧹 Cleaning up auth context...');
      isActive = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, initialSession, initialProfile, profile]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Signing in user:', email);
      
      // Step 1: Authenticate with Supabase (following best practices)
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('❌ Authentication failed:', authError.message);
        return { error: authError };
      }

      if (!data.user) {
        const noUserError = new Error('No user data returned from authentication');
        console.error('❌ No user data returned');
        return { error: noUserError };
      }

      console.log('✅ Authentication successful');
      
      // IMPORTANT: Return success immediately - profile fetching happens in background
      // This prevents UI timeout errors when profile fetch takes longer than expected
      // The onAuthStateChange listener will handle profile fetching asynchronously
      console.log('✅ Sign in completed successfully - profile will load in background');
      return { error: null };

    } catch (error) {
      // Only catch and return ACTUAL authentication errors, not profile fetch errors
      console.error('❌ Authentication error:', error);
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