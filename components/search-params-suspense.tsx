'use client'

import { Suspense, ReactNode } from 'react'
import { DashboardLoadingStates } from '@/components/dashboard/DashboardLoadingStates'

interface SearchParamsSuspenseProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Wrapper component to handle Next.js 15 useSearchParams() Suspense boundary requirement
 */
export function SearchParamsSuspense({ 
  children, 
  fallback = <DashboardLoadingStates.ContentSkeleton /> 
}: SearchParamsSuspenseProps) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  )
}