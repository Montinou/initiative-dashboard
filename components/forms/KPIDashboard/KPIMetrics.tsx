/**
 * KPI Metrics Component
 * 
 * Displays real-time KPI metrics with animated counters,
 * role-based visibility, and performance indicators
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { 
  Target, 
  TrendingUp, 
  TrendingDown,
  Clock, 
  Users, 
  DollarSign,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  BarChart3,
  Percent
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ===================================================================================
// TYPES
// ===================================================================================

interface KPISummary {
  total_initiatives: number
  strategic_initiatives: number
  completed_initiatives: number
  in_progress_initiatives: number
  average_progress: number
  total_budget: number
  actual_cost: number
  average_weight_factor: number
  completion_rate: number
  on_time_delivery_rate: number
  budget_adherence_rate: number
  strategic_completion_rate: number
}

interface StrategicMetrics {
  strategic_value_score: number
  portfolio_health_score: number
  resource_utilization: number
  risk_assessment: 'low' | 'medium' | 'high'
  strategic_alignment: number
}

interface KPIMetricsProps {
  kpiSummary: KPISummary | null
  strategicMetrics: StrategicMetrics | null
  userProfile: any
  loading: boolean
}

// ===================================================================================
// ANIMATED COUNTER COMPONENT
// ===================================================================================

interface AnimatedCounterProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}

function AnimatedCounter({ 
  value, 
  duration = 1000, 
  decimals = 0, 
  prefix = '', 
  suffix = '',
  className 
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      
      setDisplayValue(value * easeOutQuart)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [value, duration])

  return (
    <span className={className}>
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  )
}

// ===================================================================================
// METRIC CARD COMPONENT
// ===================================================================================

interface MetricCardProps {
  title: string
  value: number | string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: number
  format?: 'number' | 'percentage' | 'currency'
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  subtitle?: string
  animated?: boolean
  className?: string
}

function MetricCard({
  title,
  value,
  icon: Icon,
  trend = 'neutral',
  trendValue,
  format = 'number',
  size = 'md',
  variant = 'default',
  subtitle,
  animated = true,
  className
}: MetricCardProps) {
  
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'percentage':
        return animated ? (
          <AnimatedCounter value={val} suffix="%" decimals={1} />
        ) : `${val.toFixed(1)}%`
      case 'currency':
        return animated ? (
          <AnimatedCounter 
            value={val} 
            prefix="$" 
            decimals={0}
            className="font-mono"
          />
        ) : `$${val.toLocaleString()}`
      default:
        return animated ? (
          <AnimatedCounter value={val} decimals={0} />
        ) : val.toLocaleString()
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-l-4 border-l-green-500/50 bg-green-500/5'
      case 'warning':
        return 'border-l-4 border-l-yellow-500/50 bg-yellow-500/5'
      case 'danger':
        return 'border-l-4 border-l-red-500/50 bg-red-500/5'
      case 'info':
        return 'border-l-4 border-l-blue-500/50 bg-blue-500/5'
      default:
        return 'border-l-4 border-l-primary/50'
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'p-4'
      case 'lg':
        return 'p-8'
      default:
        return 'p-6'
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-400" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-400" />
      default:
        return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-card border border-border rounded-lg transition-all duration-200 hover:bg-secondary",
        getVariantStyles(),
        getSizeStyles(),
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        
        {trendValue !== undefined && (
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className={cn(
              "text-xs font-medium",
              trend === 'up' ? 'text-green-400' :
              trend === 'down' ? 'text-red-400' : 'text-muted-foreground'
            )}>
              {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <div className={cn(
        "font-bold text-foreground mb-1",
        size === 'lg' ? 'text-3xl' : 
        size === 'sm' ? 'text-xl' : 'text-2xl'
      )}>
        {formatValue(value)}
      </div>

      {subtitle && (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}
    </motion.div>
  )
}

// ===================================================================================
// MAIN KPI METRICS COMPONENT
// ===================================================================================

export function KPIMetrics({ 
  kpiSummary, 
  strategicMetrics, 
  userProfile, 
  loading 
}: KPIMetricsProps) {
  
  if (loading || !kpiSummary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 bg-secondary rounded"></div>
              <div className="h-3 bg-secondary rounded w-20"></div>
            </div>
            <div className="h-8 bg-secondary rounded w-16 mb-2"></div>
            <div className="h-2 bg-secondary rounded w-24"></div>
          </div>
        ))}
      </div>
    )
  }

  const canViewStrategic = ['CEO', 'Admin'].includes(userProfile?.role)
  
  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Initiatives */}
        <MetricCard
          title="Total Initiatives"
          value={kpiSummary.total_initiatives}
          icon={Target}
          subtitle={`${kpiSummary.in_progress_initiatives} in progress`}
          variant="info"
        />

        {/* Average Progress */}
        <MetricCard
          title="Average Progress"
          value={kpiSummary.average_progress}
          icon={BarChart3}
          format="percentage"
          variant={kpiSummary.average_progress >= 70 ? 'success' : 
                  kpiSummary.average_progress >= 40 ? 'warning' : 'danger'}
          subtitle="Across all initiatives"
        />

        {/* Completion Rate */}
        <MetricCard
          title="Completion Rate"
          value={kpiSummary.completion_rate * 100}
          icon={CheckCircle2}
          format="percentage"
          variant={kpiSummary.completion_rate >= 0.8 ? 'success' : 
                  kpiSummary.completion_rate >= 0.5 ? 'warning' : 'danger'}
          subtitle={`${kpiSummary.completed_initiatives} completed`}
        />

        {/* Budget Utilization */}
        <MetricCard
          title="Budget Used"
          value={kpiSummary.actual_cost}
          icon={DollarSign}
          format="currency"
          variant={kpiSummary.budget_adherence_rate >= 0.9 ? 'success' : 
                  kpiSummary.budget_adherence_rate >= 0.7 ? 'warning' : 'danger'}
          subtitle={`of $${kpiSummary.total_budget.toLocaleString()} budget`}
        />
      </div>

      {/* Strategic Metrics (CEO/Admin only) */}
      {canViewStrategic && strategicMetrics && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Strategic Metrics</h3>
            <Badge className="bg-primary text-primary-foreground">
              Executive View
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Strategic Initiatives */}
            <MetricCard
              title="Strategic Initiatives"
              value={kpiSummary.strategic_initiatives}
              icon={Zap}
              subtitle={`${(kpiSummary.strategic_completion_rate * 100).toFixed(1)}% completion rate`}
              variant="info"
            />

            {/* Portfolio Health */}
            <MetricCard
              title="Portfolio Health"
              value={strategicMetrics.portfolio_health_score}
              icon={TrendingUp}
              format="number"
              variant={strategicMetrics.portfolio_health_score >= 8 ? 'success' :
                      strategicMetrics.portfolio_health_score >= 6 ? 'warning' : 'danger'}
              subtitle="Overall portfolio score"
            />

            {/* Resource Utilization */}
            <MetricCard
              title="Resource Utilization"
              value={strategicMetrics.resource_utilization * 100}
              icon={Users}
              format="percentage"
              variant={strategicMetrics.resource_utilization >= 0.8 ? 'success' :
                      strategicMetrics.resource_utilization >= 0.6 ? 'warning' : 'danger'}
              subtitle="Team capacity usage"
            />

            {/* Strategic Alignment */}
            <MetricCard
              title="Strategic Alignment"
              value={strategicMetrics.strategic_alignment * 100}
              icon={Target}
              format="percentage"
              variant={strategicMetrics.strategic_alignment >= 0.8 ? 'success' :
                      strategicMetrics.strategic_alignment >= 0.6 ? 'warning' : 'danger'}
              subtitle="Goal alignment score"
            />
          </div>
        </div>
      )}

      {/* Performance Indicators */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Performance Indicators</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* On-Time Delivery */}
          <MetricCard
            title="On-Time Delivery"
            value={kpiSummary.on_time_delivery_rate * 100}
            icon={Calendar}
            format="percentage"
            variant={kpiSummary.on_time_delivery_rate >= 0.9 ? 'success' :
                    kpiSummary.on_time_delivery_rate >= 0.7 ? 'warning' : 'danger'}
            subtitle="Meeting target dates"
            size="sm"
          />

          {/* Budget Adherence */}
          <MetricCard
            title="Budget Adherence"
            value={kpiSummary.budget_adherence_rate * 100}
            icon={DollarSign}
            format="percentage"
            variant={kpiSummary.budget_adherence_rate >= 0.9 ? 'success' :
                    kpiSummary.budget_adherence_rate >= 0.8 ? 'warning' : 'danger'}
            subtitle="Budget compliance"
            size="sm"
          />

          {/* Average Weight Factor */}
          <MetricCard
            title="Avg. Weight Factor"
            value={kpiSummary.average_weight_factor}
            icon={BarChart3}
            format="number"
            variant={kpiSummary.average_weight_factor >= 1.5 ? 'success' :
                    kpiSummary.average_weight_factor >= 1.0 ? 'info' : 'warning'}
            subtitle="Initiative complexity"
            size="sm"
          />
        </div>
      </div>

      {/* Risk Assessment (if available) */}
      {strategicMetrics?.risk_assessment && canViewStrategic && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "bg-card border border-border rounded-lg p-6 border-l-4",
            strategicMetrics.risk_assessment === 'low' ? 'border-l-green-500/50' :
            strategicMetrics.risk_assessment === 'medium' ? 'border-l-yellow-500/50' :
            'border-l-red-500/50'
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className={cn(
              "w-5 h-5",
              strategicMetrics.risk_assessment === 'low' ? 'text-green-400' :
              strategicMetrics.risk_assessment === 'medium' ? 'text-yellow-400' :
              'text-red-400'
            )} />
            <h3 className="text-lg font-semibold text-foreground">Risk Assessment</h3>
            <Badge className={cn(
              "text-xs",
              strategicMetrics.risk_assessment === 'low' ? 'bg-green-500/20 text-green-300' :
              strategicMetrics.risk_assessment === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-red-500/20 text-red-300'
            )}>
              {strategicMetrics.risk_assessment.toUpperCase()} RISK
            </Badge>
          </div>
          
          <p className="text-muted-foreground">
            {strategicMetrics.risk_assessment === 'low' ? 
              'Portfolio is performing well with minimal risk factors.' :
             strategicMetrics.risk_assessment === 'medium' ?
              'Some initiatives may need attention to prevent delays.' :
              'Multiple risk factors detected. Immediate action recommended.'
            }
          </p>
        </motion.div>
      )}
    </div>
  )
}

export default KPIMetrics