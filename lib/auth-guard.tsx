'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  fallback?: React.ReactNode
}

export function AuthGuard({ children, requireAuth = true, fallback }: AuthGuardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Failsafe timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('AuthGuard: Timeout reached, stopping loading')
      setIsLoading(false)
    }, 5000) // 5 second timeout

    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        console.log('AuthGuard: Checking session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('AuthGuard: Session result:', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          error: error?.message 
        })
        
        setIsAuthenticated(!!session)
        
        if (requireAuth && !session) {
          console.log('AuthGuard: No session, redirecting to login')
          router.replace('/auth/login')
        } else if (session) {
          console.log('AuthGuard: Valid session found, showing content')
        }
      } catch (error) {
        console.error('AuthGuard: Session check error:', error)
        setIsAuthenticated(false)
        if (requireAuth) {
          router.replace('/auth/login')
        }
      } finally {
        console.log('AuthGuard: Setting loading to false')
        setIsLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthGuard: Auth state changed:', event, !!session)
      setIsAuthenticated(!!session)
      
      if (requireAuth && !session) {
        router.replace('/auth/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [requireAuth, router])

  if (isLoading) {
    return fallback || (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    )
  }

  if (requireAuth && !isAuthenticated) {
    return null // Will redirect
  }

  return <>{children}</>
}