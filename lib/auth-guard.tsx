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

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      setIsLoading(false)

      if (requireAuth && !session) {
        router.replace('/auth/login')
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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