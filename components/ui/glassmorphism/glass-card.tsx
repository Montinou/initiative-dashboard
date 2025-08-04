/**
 * Glassmorphism Card Component
 * 
 * Accessible, responsive card component with glassmorphism styling,
 * WCAG 2.1 AA compliance, and customizable variants
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

'use client'

import React, { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

// ===================================================================================
// TYPES AND INTERFACES
// ===================================================================================

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, 'ref'> {
  variant?: 'default' | 'elevated' | 'bordered' | 'subtle' | 'interactive'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  blur?: 'sm' | 'md' | 'lg' | 'xl'
  opacity?: 'low' | 'medium' | 'high'
  glow?: boolean
  animated?: boolean
  interactive?: boolean
  children: React.ReactNode
  className?: string
}

// ===================================================================================
// STYLE CONFIGURATIONS
// ===================================================================================

const variants = {
  default: 'bg-white/5 border border-white/10',
  elevated: 'bg-white/10 border border-white/20 shadow-2xl',
  bordered: 'bg-white/5 border-2 border-white/20',
  subtle: 'bg-white/[0.02] border border-white/5',
  interactive: 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer'
}

const sizes = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8'
}

const blurs = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl'
}

const opacities = {
  low: 'bg-opacity-30',
  medium: 'bg-opacity-50', 
  high: 'bg-opacity-70'
}

// ===================================================================================
// ANIMATION VARIANTS
// ===================================================================================

const animationVariants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  hover: {
    y: -2,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1
    }
  }
}

// ===================================================================================
// MAIN COMPONENT
// ===================================================================================

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(({
  variant = 'default',
  size = 'md',
  blur = 'xl',
  opacity = 'medium',
  glow = false,
  animated = true,
  interactive = false,
  children,
  className,
  ...props
}, ref) => {
  
  const baseClasses = cn(
    // Core glassmorphism styles
    'rounded-xl',
    variants[variant],
    sizes[size],
    blurs[blur],
    
    // Glow effect
    glow && 'shadow-[0_0_30px_rgba(139,92,246,0.3)]',
    
    // Interactive states
    interactive && 'transform-gpu',
    
    // Focus styles for accessibility
    'focus-within:ring-2 focus-within:ring-primary/50 focus-within:outline-none',
    
    // Custom classes
    className
  )

  // Determine if we should use motion.div or regular div
  const Component = animated ? motion.div : 'div'
  
  const motionProps = animated ? {
    initial: animationVariants.initial,
    animate: animationVariants.animate,
    whileHover: interactive ? animationVariants.hover : undefined,
    whileTap: interactive ? animationVariants.tap : undefined,
    layout: true
  } : {}

  return (
    <Component
      ref={ref}
      className={baseClasses}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? 'Interactive card' : undefined}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  )
})

GlassCard.displayName = 'GlassCard'

// ===================================================================================
// SPECIALIZED CARD VARIANTS
// ===================================================================================

/**
 * Glass Card Header Component
 */
interface GlassCardHeaderProps {
  children: React.ReactNode
  className?: string
}

export const GlassCardHeader = forwardRef<HTMLDivElement, GlassCardHeaderProps>(({
  children,
  className,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col space-y-1.5 pb-4 border-b border-white/10',
      className
    )}
    {...props}
  >
    {children}
  </div>
))

GlassCardHeader.displayName = 'GlassCardHeader'

/**
 * Glass Card Title Component
 */
interface GlassCardTitleProps {
  children: React.ReactNode
  className?: string
  level?: 1 | 2 | 3 | 4 | 5 | 6
}

export const GlassCardTitle = forwardRef<HTMLHeadingElement, GlassCardTitleProps>(({
  children,
  className,
  level = 3,
  ...props
}, ref) => {
  const HeadingTag = `h${level}` as const
  
  return (
    <HeadingTag
      ref={ref}
      className={cn(
        'text-lg font-semibold text-white leading-none tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </HeadingTag>
  )
})

GlassCardTitle.displayName = 'GlassCardTitle'

/**
 * Glass Card Description Component
 */
interface GlassCardDescriptionProps {
  children: React.ReactNode
  className?: string
}

export const GlassCardDescription = forwardRef<HTMLParagraphElement, GlassCardDescriptionProps>(({
  children,
  className,
  ...props
}, ref) => (
  <p
    ref={ref}
    className={cn(
      'text-sm text-white/70 leading-relaxed',
      className
    )}
    {...props}
  >
    {children}
  </p>
))

GlassCardDescription.displayName = 'GlassCardDescription'

/**
 * Glass Card Content Component
 */
interface GlassCardContentProps {
  children: React.ReactNode
  className?: string
}

export const GlassCardContent = forwardRef<HTMLDivElement, GlassCardContentProps>(({
  children,
  className,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('pt-4', className)}
    {...props}
  >
    {children}
  </div>
))

GlassCardContent.displayName = 'GlassCardContent'

/**
 * Glass Card Footer Component
 */
interface GlassCardFooterProps {
  children: React.ReactNode
  className?: string
}

export const GlassCardFooter = forwardRef<HTMLDivElement, GlassCardFooterProps>(({
  children,
  className,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center pt-4 border-t border-white/10',
      className
    )}
    {...props}
  >
    {children}
  </div>
))

GlassCardFooter.displayName = 'GlassCardFooter'

// ===================================================================================
// UTILITY HOOKS
// ===================================================================================

/**
 * Hook for managing glass card interactions
 */
export function useGlassCard() {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isFocused, setIsFocused] = React.useState(false)
  const [isPressed, setIsPressed] = React.useState(false)

  const cardProps = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    onMouseDown: () => setIsPressed(true),
    onMouseUp: () => setIsPressed(false),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        setIsPressed(true)
      }
    },
    onKeyUp: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        setIsPressed(false)
      }
    }
  }

  return {
    isHovered,
    isFocused,
    isPressed,
    cardProps
  }
}

export default GlassCard