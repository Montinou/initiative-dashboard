'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'
import { UserRole, hasPermission } from './role-permissions'

interface AuthRedirectOptions {
  requireAuth?: boolean
  allowedRoles?: UserRole[]
  requiredPermission?: string
  redirectTo?: string
  onAuthSuccess?: (user: any, profile: any) => void
  onAuthFail?: () => void
}

export function useAuthRedirect(options: AuthRedirectOptions = {}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  const {
    requireAuth = true,
    allowedRoles,
    requiredPermission,
    redirectTo = '/auth/login',
    onAuthSuccess,
    onAuthFail
  } = options

  useEffect(() => {
    async function checkAuth() {
      try {
        setIsLoading(true)

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session || !session.user) {
          console.log('No valid session found')
          setIsAuthenticated(false)
          setUser(null)
          setProfile(null)
          
          if (requireAuth) {
            console.log('Auth required, redirecting to:', redirectTo)
            router.replace(redirectTo)
            onAuthFail?.()
            return
          }
        } else {
          const currentUser = session.user
          setUser(currentUser)
          setIsAuthenticated(true)

          // Get user profile if roles/permissions are needed
          if (allowedRoles || requiredPermission) {
            try {
              const { data: userProfile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single()

              if (profileError) {
                console.error('Profile fetch error:', profileError)
                if (requireAuth) {
                  router.replace('/unauthorized')
                  return
                }
              } else {
                setProfile(userProfile)

                // Check role-based access
                if (allowedRoles && userProfile.role) {
                  if (!allowedRoles.includes(userProfile.role as UserRole)) {
                    console.log('Role not allowed:', userProfile.role, 'Required:', allowedRoles)
                    router.replace('/unauthorized')
                    return
                  }
                }

                // Check permission-based access
                if (requiredPermission && userProfile.role) {
                  if (!hasPermission(userProfile.role as UserRole, requiredPermission as any)) {
                    console.log('Permission denied:', requiredPermission, 'for role:', userProfile.role)
                    router.replace('/unauthorized')
                    return
                  }
                }

                onAuthSuccess?.(currentUser, userProfile)
              }
            } catch (error) {
              console.error('Auth check error:', error)
              if (requireAuth) {
                router.replace('/unauthorized')
                return
              }
            }
          } else {
            onAuthSuccess?.(currentUser, null)
          }
        }
      } catch (error) {
        console.error('Auth validation error:', error)
        setIsAuthenticated(false)
        if (requireAuth) {
          router.replace(redirectTo)
          onAuthFail?.()
        }
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false)
        setUser(null)
        setProfile(null)
        if (requireAuth) {
          router.replace(redirectTo)
        }
      } else if (event === 'SIGNED_IN' && session.user) {
        checkAuth() // Re-run full auth check
      }
    })

    return () => subscription.unsubscribe()
  }, [requireAuth, allowedRoles, requiredPermission, redirectTo, router])

  return {
    isLoading,
    isAuthenticated,
    user,
    profile
  }
}

// Specific hooks for common use cases
export function useRequireAuth() {
  return useAuthRedirect({ requireAuth: true })
}

export function useRequireRole(allowedRoles: UserRole[]) {
  return useAuthRedirect({ 
    requireAuth: true, 
    allowedRoles 
  })
}

export function useRequirePermission(permission: string) {
  return useAuthRedirect({ 
    requireAuth: true, 
    requiredPermission: permission 
  })
}