"use client"

import React, { useMemo } from "react"
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

// ===================================================================================
// TYPES
// ===================================================================================

interface MiniAreaChartProps {
  data: number[]
  width?: number
  height?: number
  colorScheme?: 'success' | 'warning' | 'danger' | 'info'
  strokeWidth?: number
  fillOpacity?: number
  animated?: boolean
  className?: string
  showGradient?: boolean
}

// ===================================================================================
// MAIN COMPONENT
// ===================================================================================

export const MiniAreaChart: React.FC<MiniAreaChartProps> = ({
  data,
  width = 80,
  height = 32,
  colorScheme = 'info',
  strokeWidth = 2,
  fillOpacity = 0.3,
  animated = true,
  className,
  showGradient = true
}) => {
  // Transform data for Recharts
  const chartData = useMemo(() => {
    return data.map((value, index) => ({
      index,
      value: value || 0
    }))
  }, [data])

  // Color configurations based on scheme
  const getColorConfig = () => {
    switch (colorScheme) {
      case 'success':
        return {
          stroke: 'hsl(var(--primary))', // Verde Siga
          fillStart: 'hsl(var(--primary))',
          fillEnd: 'hsl(var(--primary))',
          gradientId: 'successGradient'
        }
      case 'warning':
        return {
          stroke: 'hsl(var(--accent))', // Amarillo Siga
          fillStart: 'hsl(var(--accent))',
          fillEnd: 'hsl(var(--accent))',
          gradientId: 'warningGradient'
        }
      case 'danger':
        return {
          stroke: 'hsl(var(--destructive))',
          fillStart: 'hsl(var(--destructive))',
          fillEnd: 'hsl(var(--destructive))',
          gradientId: 'dangerGradient'
        }
      case 'info':
      default:
        return {
          stroke: 'hsl(var(--primary))',
          fillStart: 'hsl(var(--primary))',
          fillEnd: 'hsl(var(--primary))',
          gradientId: 'infoGradient'
        }
    }
  }

  const colors = getColorConfig()

  // Calculate min and max for better scaling
  const minValue = Math.min(...data)
  const maxValue = Math.max(...data)
  const padding = (maxValue - minValue) * 0.1 || 1

  if (data.length === 0) {
    return (
      <div 
        className={cn("flex items-center justify-center bg-muted/20 rounded", className)}
        style={{ width, height }}
      >
        <div className="w-2 h-2 bg-muted-foreground/20 rounded-full" />
      </div>
    )
  }

  return (
    <motion.div
      initial={animated ? { opacity: 0, scale: 0.8 } : undefined}
      animate={animated ? { opacity: 1, scale: 1 } : undefined}
      transition={animated ? { duration: 0.6, ease: "easeOut" } : undefined}
      className={cn("overflow-hidden rounded", className)}
      style={{ width, height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
        >
          {/* Gradient Definition */}
          {showGradient && (
            <defs>
              <linearGradient id={colors.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.fillStart} stopOpacity={fillOpacity} />
                <stop offset="95%" stopColor={colors.fillEnd} stopOpacity={0.1} />
              </linearGradient>
            </defs>
          )}

          {/* Y-axis for proper scaling */}
          <YAxis 
            domain={[minValue - padding, maxValue + padding]}
            hide
          />

          {/* Area */}
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            fill={showGradient ? `url(#${colors.gradientId})` : colors.fillStart}
            fillOpacity={showGradient ? 1 : fillOpacity}
            dot={false}
            activeDot={false}
            isAnimationActive={animated}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

export default MiniAreaChart