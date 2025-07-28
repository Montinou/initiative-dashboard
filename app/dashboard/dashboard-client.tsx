"use client"

import { useEffect } from 'react'
import PremiumDashboard from '@/dashboard/dashboard'
import { AuthProvider } from '@/lib/auth-context'
import type { Session, User } from '@supabase/supabase-js'

interface DashboardClientProps {
  initialSession: Session
  initialProfile: any
}

export default function DashboardClient({ initialSession, initialProfile }: DashboardClientProps) {
  useEffect(() => {
    console.log('🚀 DashboardClient: Component mounted');
    console.log('📋 Initial session:', initialSession ? 'Provided' : 'None');
    console.log('👤 Initial profile:', initialProfile ? 'Provided' : 'None');
  }, []);

  console.log('🎯 DashboardClient: Component rendering...');

  return (
    <AuthProvider initialSession={initialSession} initialProfile={initialProfile}>
      <PremiumDashboard />
    </AuthProvider>
  )
}