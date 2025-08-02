"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface LoadingSkeletonProps {
  className?: string
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div className={cn(
      "animate-pulse bg-gradient-to-r from-white/5 to-white/10 rounded-lg backdrop-blur-sm",
      className
    )} />
  )
}

export function CardLoadingSkeleton() {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <div className="space-y-4">
        <LoadingSkeleton className="h-4 w-32" />
        <LoadingSkeleton className="h-8 w-24" />
        <div className="space-y-2">
          <LoadingSkeleton className="h-3 w-full" />
          <LoadingSkeleton className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  )
}

export function ChartLoadingSkeleton() {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <LoadingSkeleton className="h-6 w-48 mb-4" />
      <div className="h-64 flex items-end gap-2">
        {[...Array(6)].map((_, i) => (
          <LoadingSkeleton
            key={i}
            className="flex-1"
            style={{ height: `${Math.random() * 100}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function TableLoadingSkeleton() {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <LoadingSkeleton className="h-6 w-48 mb-4" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <LoadingSkeleton className="h-4 flex-1" />
            <LoadingSkeleton className="h-4 w-24" />
            <LoadingSkeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardLoadingState() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <CardLoadingSkeleton key={i} />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartLoadingSkeleton />
        <ChartLoadingSkeleton />
      </div>
      
      <TableLoadingSkeleton />
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-2">
        <LoadingSkeleton className="h-8 w-64" />
        <LoadingSkeleton className="h-4 w-96" />
      </div>
      <DashboardLoadingState />
    </div>
  )
}

export function ContentSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <CardLoadingSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

// Grouped exports for easier imports
export const DashboardLoadingStates = {
  LoadingSkeleton,
  CardLoadingSkeleton,
  ChartLoadingSkeleton,
  TableLoadingSkeleton,
  DashboardLoadingState,
  PageSkeleton,
  ContentSkeleton,
}