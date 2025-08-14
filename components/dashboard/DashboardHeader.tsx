'use client'

import React from 'react'
import { useTenantId } from '@/lib/auth-context'

// Simple tenant name mapping - no complex data fetching
const TENANT_NAMES = {
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': 'SIGA Turismo',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12': 'FEMA Electricidad', 
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13': 'Stratix Platform'
};

export function DashboardHeader() {
  const tenantId = useTenantId()
  const tenantName = tenantId ? TENANT_NAMES[tenantId as keyof typeof TENANT_NAMES] : null

  return (
    <div className="space-y-1">
      <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        {tenantName} Dashboard
      </h1>
      <p className="text-sm text-muted-foreground">
        Monitor your initiatives and track progress across all areas
      </p>
    </div>
  )
}