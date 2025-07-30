'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
  requiredRole?: string[]
}

export function ProtectedRoute({ 
  children, 
  fallback, 
  redirectTo = '/auth/login',
  requiredRole 
}: ProtectedRouteProps) {
  console.log('🛡️ ProtectedRoute: Component rendering...');
  
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session?.user) {
          router.replace(redirectTo)
          return
        }

        setUser(session.user)

        // If role checking is required, fetch user profile
        if (requiredRole && requiredRole.length > 0) {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role, is_active')
            .eq('id', session.user.id)
            .single()

          if (profileError || !profile) {
            console.error('Error fetching user profile:', profileError)
            router.replace('/unauthorized')
            return
          }

          setUserProfile(profile)

          // Check if user has required role
          if (!requiredRole.includes(profile.role) || !profile.is_active) {
            router.replace('/unauthorized')
            return
          }
        }

        setAuthorized(true)
      } catch (error) {
        console.error('Auth check error:', error)
        router.replace(redirectTo)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.replace(redirectTo)
        } else if (event === 'SIGNED_IN' && session) {
          await checkAuth()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, redirectTo, requiredRole, supabase])

  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen glassmorphic-scrollbar bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/70">Loading...</p>
          </div>
        </div>
      )
    )
  }

  if (!authorized) {
    return null // Will be redirected
  }

  return <>{children}</>
}

// Higher-order component for easier usage
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}