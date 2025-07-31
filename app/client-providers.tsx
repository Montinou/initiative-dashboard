"use client"

import { LoadingProvider } from '@/lib/loading-context'
import { AuthProvider } from '@/lib/auth-context'
import type { Session } from '@supabase/supabase-js'

export function ClientProviders({ 
  children,
  session,
  profile
}: { 
  children: React.ReactNode
  session: Session | null
  profile: any
}) {
  return (
    <LoadingProvider>
      <AuthProvider initialSession={session} initialProfile={profile}>
        {children}
      </AuthProvider>
    </LoadingProvider>
  )
}