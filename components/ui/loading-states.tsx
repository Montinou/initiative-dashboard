"use client"

import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  className?: string
}

export function MetricsGridSkeleton({ className }: LoadingStateProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="glassmorphic-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-2 w-full mb-2" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function ChartSkeleton({ className }: LoadingStateProps) {
  return (
    <Card className={cn("glassmorphic-card", className)}>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-64 w-full" />
          <div className="flex justify-center space-x-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TableSkeleton({ className }: LoadingStateProps) {
  return (
    <Card className={cn("glassmorphic-card", className)}>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="border rounded-md">
            <div className="border-b p-4">
              <div className="flex space-x-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-20" />
                ))}
              </div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border-b p-4 last:border-b-0">
                <div className="flex space-x-4">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-20" />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardSkeleton({ className }: LoadingStateProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header skeleton */}
      <div className="glassmorphic-card rounded-none border-x-0 border-t-0 mb-6">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics grid skeleton */}
      <MetricsGridSkeleton />

      {/* Tabs skeleton */}
      <div className="space-y-6">
        <div className="glassmorphic-card p-1 w-full lg:w-auto">
          <div className="flex space-x-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-32" />
            ))}
          </div>
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>

      {/* Quick actions skeleton */}
      <Card className="glassmorphic-card">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface LoadingWrapperProps {
  loading: boolean
  error?: Error
  children: React.ReactNode
  skeleton?: React.ComponentType<LoadingStateProps>
  className?: string
}

export function LoadingWrapper({
  loading,
  error,
  children,
  skeleton: SkeletonComponent = DashboardSkeleton,
  className,
}: LoadingWrapperProps) {
  if (error) {
    return (
      <Card className={cn("glassmorphic-card", className)}>
        <CardContent className="p-6">
          <div className="text-center text-red-400">
            <p className="text-sm">Failed to load data</p>
            <p className="text-xs text-gray-500 mt-1">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return <SkeletonComponent className={className} />
  }

  return <>{children}</>
}