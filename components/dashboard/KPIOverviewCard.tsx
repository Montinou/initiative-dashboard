"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowUp,
  ArrowDown,
  Eye,
  ChevronRight,
  Activity,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MiniAreaChart } from "@/components/charts/MiniAreaChart"
import { ProgressRing } from "@/components/charts/ProgressRing"

// ===================================================================================
// TYPES
// ===================================================================================

interface KPIOverviewCardProps {
  title: string
  value: number
  previousValue?: number
  trend?: 'up' | 'down' | 'stable'
  trendPercentage?: number
  sparklineData?: number[]
  onClick?: () => void
  loading?: boolean
  colorScheme?: 'success' | 'warning' | 'danger' | 'info'
  unit?: string
  description?: string
  showProgressRing?: boolean
  maxValue?: number
  animated?: boolean
  className?: string
  icon?: React.ReactNode
}

// ===================================================================================
// ANIMATED COUNTER COMPONENT
// ===================================================================================

interface AnimatedCounterProps {
  value: number
  duration?: number
  unit?: string
  className?: string
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ 
  value, 
  duration = 1000, 
  unit = "", 
  className 
}) => {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setDisplayValue(Math.floor(value * easeOutQuart))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration])

  const formatValue = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toLocaleString()
  }

  return (
    <span className={className}>
      {formatValue(displayValue)}{unit}
    </span>
  )
}

// ===================================================================================
// TREND INDICATOR COMPONENT
// ===================================================================================

interface TrendIndicatorProps {
  trend: 'up' | 'down' | 'stable'
  percentage?: number
  colorScheme: 'success' | 'warning' | 'danger' | 'info'
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({ trend, percentage, colorScheme }) => {
  const getTrendConfig = () => {
    switch (trend) {
      case 'up':
        return {
          icon: <ArrowUp className="w-3 h-3" />,
          color: colorScheme === 'danger' ? 'text-red-400' : 'text-green-400',
          bgColor: colorScheme === 'danger' ? 'bg-red-500/20' : 'bg-green-500/20'
        }
      case 'down':
        return {
          icon: <ArrowDown className="w-3 h-3" />,
          color: colorScheme === 'success' ? 'text-red-400' : 'text-green-400',
          bgColor: colorScheme === 'success' ? 'bg-red-500/20' : 'bg-green-500/20'
        }
      case 'stable':
      default:
        return {
          icon: <Minus className="w-3 h-3" />,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20'
        }
    }
  }

  const config = getTrendConfig()

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.3 }}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
        config.color,
        config.bgColor
      )}
    >
      {config.icon}
      {percentage !== undefined && (
        <span>{Math.abs(percentage).toFixed(1)}%</span>
      )}
    </motion.div>
  )
}

// ===================================================================================
// MAIN COMPONENT
// ===================================================================================

export const KPIOverviewCard: React.FC<KPIOverviewCardProps> = ({
  title,
  value,
  previousValue,
  trend = 'stable',
  trendPercentage,
  sparklineData,
  onClick,
  loading = false,
  colorScheme = 'info',
  unit = "",
  description,
  showProgressRing = false,
  maxValue,
  animated = true,
  className,
  icon
}) => {
  // Calculate trend if not provided but previousValue exists
  const calculatedTrend = trend === 'stable' && previousValue !== undefined
    ? value > previousValue ? 'up' : value < previousValue ? 'down' : 'stable'
    : trend

  const calculatedTrendPercentage = trendPercentage !== undefined 
    ? trendPercentage 
    : previousValue !== undefined && previousValue !== 0
    ? ((value - previousValue) / previousValue) * 100
    : 0

  // Color scheme configurations
  const getColorScheme = () => {
    switch (colorScheme) {
      case 'success':
        return {
          gradient: 'from-emerald-400 to-cyan-400',
          accent: 'text-emerald-400',
          glow: 'shadow-emerald-500/20'
        }
      case 'warning':
        return {
          gradient: 'from-yellow-400 to-orange-400',
          accent: 'text-yellow-400',
          glow: 'shadow-yellow-500/20'
        }
      case 'danger':
        return {
          gradient: 'from-red-400 to-pink-400',
          accent: 'text-red-400',
          glow: 'shadow-red-500/20'
        }
      case 'info':
      default:
        return {
          gradient: 'from-purple-400 to-cyan-400',
          accent: 'text-purple-400',
          glow: 'shadow-purple-500/20'
        }
    }
  }

  const colors = getColorScheme()

  // Loading state
  if (loading) {
    return (
      <Card className={cn(
        "glassmorphic-card hover:shadow-xl transition-all duration-300",
        className
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32 bg-white/10" />
            <Skeleton className="h-8 w-8 rounded-full bg-white/10" />
          </div>
          {description && (
            <Skeleton className="h-3 w-48 bg-white/10" />
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <Skeleton className="h-8 w-24 bg-white/10" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-16 bg-white/10" />
              {sparklineData && (
                <Skeleton className="h-8 w-20 bg-white/10" />
              )}
            </div>
            {showProgressRing && (
              <div className="flex justify-center">
                <Skeleton className="h-16 w-16 rounded-full bg-white/10" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
    >
      <Card 
        className={cn(
          "glassmorphic-card hover:shadow-xl transition-all duration-300 cursor-pointer group",
          colors.glow,
          onClick && "hover:shadow-2xl",
          className
        )}
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className={cn(
                "text-sm font-medium text-white/80 group-hover:text-white transition-colors",
                "bg-gradient-to-r bg-clip-text text-transparent",
                colors.gradient
              )}>
                {title}
              </CardTitle>
              {description && (
                <p className="text-xs text-white/60 group-hover:text-white/70 transition-colors">
                  {description}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {icon && (
                <div className={cn("p-2 rounded-lg bg-white/10", colors.accent)}>
                  {icon}
                </div>
              )}
              {onClick && (
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Main Value Display */}
            <div className="flex items-baseline gap-2">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className={cn(
                  "text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                  colors.gradient
                )}
              >
                {animated ? (
                  <AnimatedCounter value={value} unit={unit} />
                ) : (
                  `${value.toLocaleString()}${unit}`
                )}
              </motion.div>

              {/* Trend Indicator */}
              {(calculatedTrend !== 'stable' || calculatedTrendPercentage !== 0) && (
                <TrendIndicator 
                  trend={calculatedTrend}
                  percentage={calculatedTrendPercentage}
                  colorScheme={colorScheme}
                />
              )}
            </div>

            {/* Bottom Section */}
            <div className="flex items-center justify-between">
              {/* Progress Ring or Previous Value */}
              {showProgressRing && maxValue ? (
                <ProgressRing 
                  value={value}
                  maxValue={maxValue}
                  size={48}
                  strokeWidth={4}
                  colorScheme={colorScheme}
                />
              ) : previousValue !== undefined ? (
                <div className="text-xs text-white/60">
                  Anterior: {previousValue.toLocaleString()}{unit}
                </div>
              ) : (
                <div />
              )}

              {/* Sparkline Chart */}
              {sparklineData && sparklineData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  className="flex-shrink-0"
                >
                  <MiniAreaChart 
                    data={sparklineData}
                    width={80}
                    height={32}
                    colorScheme={colorScheme}
                  />
                </motion.div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default KPIOverviewCard