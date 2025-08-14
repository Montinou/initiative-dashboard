"use client"

import React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Users, 
  DollarSign,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricCard {
  id: string
  title: string
  value: number | string
  previousValue?: number | string
  change?: number
  changeType?: 'increase' | 'decrease' | 'stable'
  prefix?: string
  suffix?: string
  icon: React.ElementType
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  description?: string
  sparklineData?: number[]
}

interface CEOMetricsGridProps {
  metrics?: {
    totalInitiatives: number
    completedInitiatives: number
    averageProgress: number
    totalObjectives: number
    completedObjectives: number
    activeAreas: number
    teamMembers: number
    onTrackPercentage: number
    atRiskCount: number
    revenue?: number
    cost?: number
    efficiency?: number
    trends?: {
      initiatives: number
      objectives: number
      progress: number
    }
  }
  loading: boolean
  timeRange: string
  className?: string
}

function AnimatedCounter({ 
  value, 
  prefix = "", 
  suffix = "",
  duration = 1000
}: { 
  value: number
  prefix?: string
  suffix?: string
  duration?: number
}) {
  const [displayValue, setDisplayValue] = React.useState(0)

  React.useEffect(() => {
    const steps = 60
    const increment = value / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [value, duration])

  return (
    <span className="tabular-nums">
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  )
}

function MetricCardComponent({ metric }: { metric: MetricCard }) {
  const Icon = metric.icon
  
  const colorClasses = {
    primary: "from-blue-600/30 to-blue-800/20 border-blue-500/30",
    success: "from-green-600/30 to-green-800/20 border-green-500/30",
    warning: "from-yellow-600/30 to-yellow-800/20 border-yellow-500/30",
    danger: "from-red-600/30 to-red-800/20 border-red-500/30",
    info: "from-purple-600/30 to-purple-800/20 border-purple-500/30",
  }

  const trendIcon = metric.changeType === 'increase' ? TrendingUp : 
                    metric.changeType === 'decrease' ? TrendingDown : null

  return (
    <Card className={cn(
      "",
      colorClasses[metric.color],
      "hover:scale-[1.02] transition-all duration-200"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {metric.title}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-foreground">
            {typeof metric.value === 'number' ? (
              <AnimatedCounter 
                value={metric.value} 
                prefix={metric.prefix} 
                suffix={metric.suffix}
              />
            ) : (
              metric.value
            )}
          </div>
          
          {metric.change !== undefined && trendIcon && (
            <div className="flex items-center gap-1">
              {React.createElement(trendIcon, {
                className: cn(
                  "h-4 w-4",
                  metric.changeType === 'increase' ? "text-green-500" : "text-red-500"
                )
              })}
              <span className={cn(
                "text-sm font-medium",
                metric.changeType === 'increase' ? "text-green-500" : "text-red-500"
              )}>
                {Math.abs(metric.change)}%
              </span>
              <span className="text-xs text-muted-foreground">vs last {timeRange}</span>
            </div>
          )}
          
          {metric.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {metric.description}
            </p>
          )}

          {metric.sparklineData && (
            <div className="mt-2 h-8">
              <svg className="w-full h-full" viewBox="0 0 100 32">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary/50"
                  points={metric.sparklineData.map((value, i) => 
                    `${(i / (metric.sparklineData!.length - 1)) * 100},${32 - (value / Math.max(...metric.sparklineData!) * 32)}`
                  ).join(' ')}
                />
              </svg>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function CEOMetricsGrid({ 
  metrics, 
  loading, 
  timeRange,
  className 
}: CEOMetricsGridProps) {
  if (loading) {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4", className)}>
        {[...Array(10)].map((_, i) => (
          <Card key={i} >
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const metricCards: MetricCard[] = [
    {
      id: 'total-initiatives',
      title: 'Total Initiatives',
      value: metrics?.totalInitiatives || 0,
      change: metrics?.trends?.initiatives,
      changeType: (metrics?.trends?.initiatives || 0) > 0 ? 'increase' : 'decrease',
      icon: Zap,
      color: 'primary',
      description: 'Active initiatives across all areas'
    },
    {
      id: 'completion-rate',
      title: 'Completion Rate',
      value: metrics?.completedInitiatives && metrics?.totalInitiatives 
        ? Math.round((metrics.completedInitiatives / metrics.totalInitiatives) * 100)
        : 0,
      suffix: '%',
      icon: CheckCircle2,
      color: 'success',
      sparklineData: [65, 70, 68, 72, 75, 78, 82, 85]
    },
    {
      id: 'avg-progress',
      title: 'Average Progress',
      value: metrics?.averageProgress || 0,
      suffix: '%',
      change: metrics?.trends?.progress,
      changeType: (metrics?.trends?.progress || 0) > 0 ? 'increase' : 'decrease',
      icon: TrendingUp,
      color: 'info'
    },
    {
      id: 'objectives',
      title: 'Strategic Objectives',
      value: metrics?.totalObjectives || 0,
      change: metrics?.trends?.objectives,
      changeType: (metrics?.trends?.objectives || 0) > 0 ? 'increase' : 'decrease',
      icon: Target,
      color: 'primary'
    },
    {
      id: 'on-track',
      title: 'On Track',
      value: metrics?.onTrackPercentage || 0,
      suffix: '%',
      icon: Activity,
      color: 'success',
      description: 'Initiatives progressing as planned'
    },
    {
      id: 'at-risk',
      title: 'At Risk',
      value: metrics?.atRiskCount || 0,
      icon: AlertTriangle,
      color: 'danger',
      description: 'Requires immediate attention'
    },
    {
      id: 'active-areas',
      title: 'Active Areas',
      value: metrics?.activeAreas || 0,
      icon: Users,
      color: 'info'
    },
    {
      id: 'team-size',
      title: 'Team Members',
      value: metrics?.teamMembers || 0,
      icon: Users,
      color: 'primary'
    },
    {
      id: 'efficiency',
      title: 'Efficiency Score',
      value: metrics?.efficiency || 85,
      suffix: '%',
      icon: Activity,
      color: 'success',
      sparklineData: [78, 80, 82, 79, 83, 85, 84, 85]
    },
    {
      id: 'timeline',
      title: 'On Schedule',
      value: Math.round((metrics?.onTrackPercentage || 0) * 0.92),
      suffix: '%',
      icon: Clock,
      color: 'warning'
    }
  ]

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4", className)}>
      {metricCards.map((metric, index) => (
        <motion.div
          key={metric.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <MetricCardComponent metric={metric} />
        </motion.div>
      ))}
    </div>
  )
}