"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface SkeletonProps {
  className?: string
  variant?: "default" | "card" | "chart" | "metric" | "table"
  animate?: boolean
}

export function GlassmorphicSkeleton({ 
  className, 
  variant = "default",
  animate = true 
}: SkeletonProps) {
  const baseClasses = "rounded-lg overflow-hidden relative"
  
  const variantClasses = {
    default: "h-4 bg-white/10",
    card: "h-32 bg-white/5 backdrop-blur-xl border border-white/10",
    chart: "h-64 bg-white/5 backdrop-blur-xl border border-white/10",
    metric: "h-24 bg-white/5 backdrop-blur-xl border border-white/10",
    table: "h-12 bg-white/5"
  }
  
  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      {animate && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      )}
    </div>
  )
}

// Dashboard skeleton loader
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <GlassmorphicSkeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <GlassmorphicSkeleton className="h-10 w-32" />
          <GlassmorphicSkeleton className="h-10 w-32" />
        </div>
      </div>
      
      {/* Metrics cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <GlassmorphicSkeleton key={i} variant="metric" />
        ))}
      </div>
      
      {/* Chart skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassmorphicSkeleton variant="chart" />
        <GlassmorphicSkeleton variant="chart" />
      </div>
      
      {/* Table skeleton */}
      <div className="space-y-2">
        <GlassmorphicSkeleton className="h-12 w-full" />
        {[...Array(5)].map((_, i) => (
          <GlassmorphicSkeleton key={i} variant="table" className="w-full" />
        ))}
      </div>
    </div>
  )
}

// Initiative card skeleton
export function InitiativeCardSkeleton() {
  return (
    <GlassmorphicSkeleton variant="card" className="p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <GlassmorphicSkeleton className="h-6 w-3/4" />
          <GlassmorphicSkeleton className="h-6 w-20" />
        </div>
        <GlassmorphicSkeleton className="h-4 w-full" />
        <GlassmorphicSkeleton className="h-4 w-2/3" />
        <div className="flex gap-2 mt-4">
          <GlassmorphicSkeleton className="h-8 w-24" />
          <GlassmorphicSkeleton className="h-8 w-24" />
        </div>
      </div>
    </GlassmorphicSkeleton>
  )
}

// Chart skeleton with animation
export function ChartSkeleton() {
  return (
    <GlassmorphicSkeleton variant="chart" className="p-6">
      <div className="space-y-4">
        <GlassmorphicSkeleton className="h-6 w-48" />
        <div className="relative h-48">
          {/* Animated bars */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around gap-2">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="flex-1 bg-white/10 rounded-t"
                initial={{ height: 0 }}
                animate={{ height: `${Math.random() * 100}%` }}
                transition={{
                  duration: 1,
                  delay: i * 0.1,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </GlassmorphicSkeleton>
  )
}

// Table skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-white/5 rounded-lg">
        {[...Array(4)].map((_, i) => (
          <GlassmorphicSkeleton key={i} className="h-4" />
        ))}
      </div>
      
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4 p-4 bg-white/5 rounded-lg">
          {[...Array(4)].map((_, j) => (
            <GlassmorphicSkeleton key={j} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  )
}

// Metric card skeleton
export function MetricCardSkeleton() {
  return (
    <GlassmorphicSkeleton variant="metric" className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <GlassmorphicSkeleton className="h-4 w-24" />
          <GlassmorphicSkeleton className="h-8 w-32" />
          <GlassmorphicSkeleton className="h-3 w-16" />
        </div>
        <GlassmorphicSkeleton className="h-12 w-12 rounded-full" />
      </div>
    </GlassmorphicSkeleton>
  )
}