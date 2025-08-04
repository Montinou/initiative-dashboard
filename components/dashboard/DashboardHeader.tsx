'use client'

import React from 'react'
import { useTenant } from '@/hooks/useTenant'

export function DashboardHeader() {
  const { tenantName, loading, error } = useTenant()

  // Handle loading state
  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-white/20 rounded animate-pulse"></div>
        <div className="w-24 h-5 bg-white/20 rounded animate-pulse"></div>
        <div className="text-white/50">Dashboard</div>
      </div>
    )
  }

  // Handle error state - fallback to generic name
  if (error || !tenantName) {
    return (
      <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        Dashboard
      </h1>
    )
  }

  return (
    <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
      {tenantName} Dashboard
    </h1>
  )
}