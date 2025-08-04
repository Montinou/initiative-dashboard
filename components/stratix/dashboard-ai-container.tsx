'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { DashboardAIWidget } from './dashboard-ai-widget'
import { StratixDataService, type CompanyContext } from '@/lib/stratix/data-service'
import { useAuth, useTenantId } from '@/lib/auth-context'
import type { DashboardView } from '@/lib/stratix/dashboard-ai-integration'
import type { UserRole } from '@/lib/stratix/role-based-ai'

export function DashboardAIContainer() {
  const { session, profile } = useAuth()
  const tenantId = useTenantId()
  const pathname = usePathname()
  
  const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)

  // Determine current dashboard view from pathname
  const getCurrentView = (): DashboardView => {
    if (pathname === '/dashboard') return 'overview'
    if (pathname.includes('/initiatives')) return 'initiatives'
    if (pathname.includes('/areas')) return 'areas'
    if (pathname.includes('/analytics')) return 'analytics'
    return 'overview'
  }

  // Map user role from profile to Stratix role type
  const getUserRole = (): UserRole => {
    if (!profile?.role) return 'Analyst'
    
    switch (profile.role.toLowerCase()) {
      case 'admin':
      case 'system_admin':
        return 'Admin'
      case 'manager':
        return 'Manager'
      case 'ceo':
        return 'CEO'
      case 'analyst':
      default:
        return 'Analyst'
    }
  }

  // Load company context when user and tenant are available
  useEffect(() => {
    const loadCompanyContext = async () => {
      if (!session?.user?.id || !tenantId) return

      try {
        const dataService = new StratixDataService()
        const context = await dataService.gatherCompanyContext(session.user.id)
        setCompanyContext(context)
      } catch (error) {
        console.error('Failed to load company context for AI:', error)
      }
    }

    loadCompanyContext()
  }, [session?.user?.id, tenantId])

  // Don't render if no session or tenant
  if (!session?.user || !tenantId) {
    return null
  }

  // Check if Stratix AI is enabled
  const isStratixEnabled = process.env.NEXT_PUBLIC_ENABLE_STRATIX === 'true'
  if (!isStratixEnabled) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <DashboardAIWidget
        view={getCurrentView()}
        userRole={getUserRole()}
        companyContext={companyContext}
        position="floating"
        minimized={isMinimized}
        onMinimize={setIsMinimized}
      />
    </div>
  )
}