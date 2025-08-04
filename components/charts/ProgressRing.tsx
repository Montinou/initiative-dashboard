"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

// ===================================================================================
// TYPES
// ===================================================================================

interface ProgressRingProps {
  value: number
  maxValue: number
  size?: number
  strokeWidth?: number
  colorScheme?: 'success' | 'warning' | 'danger' | 'info'
  showPercentage?: boolean
  showValue?: boolean
  animated?: boolean
  className?: string
  backgroundColor?: string
  duration?: number
}

// ===================================================================================
// MAIN COMPONENT
// ===================================================================================

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  maxValue,
  size = 64,
  strokeWidth = 4,
  colorScheme = 'info',
  showPercentage = true,
  showValue = false,
  animated = true,
  className,
  backgroundColor = "rgba(255, 255, 255, 0.1)",
  duration = 1000
}) => {
  const [animatedValue, setAnimatedValue] = useState(0)

  // Calculate dimensions
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const percentage = Math.min((value / maxValue) * 100, 100)
  
  // Animate the progress
  useEffect(() => {
    if (!animated) {
      setAnimatedValue(percentage)
      return
    }

    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)
      setAnimatedValue(percentage * easeOutCubic)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [percentage, animated, duration])

  // Color configurations
  const getColorConfig = () => {
    switch (colorScheme) {
      case 'success':
        return {
          primary: '#10b981', // emerald-500
          gradient: 'url(#successGradient)',
          text: 'text-emerald-400'
        }
      case 'warning':
        return {
          primary: '#f59e0b', // amber-500
          gradient: 'url(#warningGradient)',
          text: 'text-amber-400'
        }
      case 'danger':
        return {
          primary: '#ef4444', // red-500
          gradient: 'url(#dangerGradient)',
          text: 'text-red-400'
        }
      case 'info':
      default:
        return {
          primary: '#8b5cf6', // violet-500
          gradient: 'url(#infoGradient)',
          text: 'text-purple-400'
        }
    }
  }

  const colors = getColorConfig()
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference

  // Format display value
  const formatValue = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  return (
    <motion.div
      initial={animated ? { scale: 0, opacity: 0 } : undefined}
      animate={animated ? { scale: 1, opacity: 1 } : undefined}
      transition={animated ? { duration: 0.5, ease: "easeOut" } : undefined}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="warningGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="dangerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="infoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.gradient}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          style={{
            transition: animated ? 'stroke-dashoffset 0.5s ease-out' : 'none'
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <motion.div
            initial={animated ? { opacity: 0 } : undefined}
            animate={animated ? { opacity: 1 } : undefined}
            transition={animated ? { delay: 0.5, duration: 0.3 } : undefined}
            className={cn(
              "text-xs font-semibold leading-none",
              colors.text
            )}
          >
            {Math.round(animatedValue)}%
          </motion.div>
        )}
        
        {showValue && (
          <motion.div
            initial={animated ? { opacity: 0 } : undefined}
            animate={animated ? { opacity: 1 } : undefined}
            transition={animated ? { delay: 0.6, duration: 0.3 } : undefined}
            className="text-[10px] text-white/60 leading-none"
          >
            {formatValue(value)}/{formatValue(maxValue)}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default ProgressRing