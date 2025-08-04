/**
 * Glassmorphism Button Components
 * 
 * Accessible button components with glassmorphism styling,
 * multiple variants, loading states, and WCAG 2.1 AA compliance
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

'use client'

import React, { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ===================================================================================
// TYPES AND INTERFACES
// ===================================================================================

interface GlassButtonProps extends Omit<HTMLMotionProps<"button">, 'ref'> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  glow?: boolean
  animated?: boolean
  children: React.ReactNode
}

interface GlassIconButtonProps extends Omit<GlassButtonProps, 'children' | 'leftIcon' | 'rightIcon'> {
  icon: React.ReactNode
  'aria-label': string
}

interface GlassButtonGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
  attached?: boolean
}

// ===================================================================================
// STYLE CONFIGURATIONS
// ===================================================================================

const variants = {
  default: {
    base: 'glassmorphic-button bg-white/10 border border-white/20 text-white hover:bg-white/20',
    focus: 'focus:ring-2 focus:ring-white/50 focus:outline-none'
  },
  primary: {
    base: 'bg-gradient-to-r from-primary/80 to-primary/60 border border-primary/50 text-white hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25',
    focus: 'focus:ring-2 focus:ring-primary/50 focus:outline-none'
  },
  secondary: {
    base: 'bg-gradient-to-r from-secondary/80 to-secondary/60 border border-secondary/50 text-white hover:from-secondary/90 hover:to-secondary/70',
    focus: 'focus:ring-2 focus:ring-secondary/50 focus:outline-none'
  },
  ghost: {
    base: 'glassmorphic-button-ghost bg-transparent border-transparent text-white/80 hover:bg-white/10 hover:text-white',
    focus: 'focus:ring-2 focus:ring-white/30 focus:outline-none'
  },
  outline: {
    base: 'bg-transparent border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50',
    focus: 'focus:ring-2 focus:ring-white/50 focus:outline-none'
  },
  destructive: {
    base: 'bg-gradient-to-r from-red-600/80 to-red-500/80 border border-red-500/50 text-white hover:from-red-600/90 hover:to-red-500/90 shadow-lg shadow-red-500/25',
    focus: 'focus:ring-2 focus:ring-red-500/50 focus:outline-none'
  },
  success: {
    base: 'bg-gradient-to-r from-green-600/80 to-green-500/80 border border-green-500/50 text-white hover:from-green-600/90 hover:to-green-500/90 shadow-lg shadow-green-500/25',
    focus: 'focus:ring-2 focus:ring-green-500/50 focus:outline-none'
  }
}

const sizes = {
  xs: 'px-2 py-1 text-xs rounded-md',
  sm: 'px-3 py-2 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-xl',
  xl: 'px-8 py-4 text-lg rounded-xl'
}

// ===================================================================================
// ANIMATION VARIANTS
// ===================================================================================

const buttonAnimations = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  tap: { 
    scale: 0.98,
    transition: { duration: 0.1 }
  },
  loading: {
    scale: [1, 1.02, 1],
    transition: { duration: 1, repeat: Infinity, ease: "easeInOut" }
  }
}

// ===================================================================================
// GLASS BUTTON COMPONENT
// ===================================================================================

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(({
  variant = 'default',
  size = 'md',
  loading = false,
  loadingText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  glow = false,
  animated = true,
  children,
  className,
  disabled,
  ...props
}, ref) => {
  
  const variantConfig = variants[variant]
  const isDisabled = disabled || loading
  
  const buttonClasses = cn(
    // Base styles
    'inline-flex items-center justify-center font-medium transition-all duration-200 backdrop-blur-xl',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
    'transform-gpu select-none',
    
    // Variant styles
    variantConfig.base,
    variantConfig.focus,
    
    // Size styles
    sizes[size],
    
    // Glow effect
    glow && variant === 'primary' && 'shadow-[0_0_20px_rgba(139,92,246,0.4)]',
    glow && variant === 'destructive' && 'shadow-[0_0_20px_rgba(239,68,68,0.4)]',
    glow && variant === 'success' && 'shadow-[0_0_20px_rgba(34,197,94,0.4)]',
    
    // Full width
    fullWidth && 'w-full',
    
    // Custom classes
    className
  )

  const motionProps = animated ? {
    initial: buttonAnimations.initial,
    whileHover: !isDisabled ? buttonAnimations.hover : undefined,
    whileTap: !isDisabled ? buttonAnimations.tap : undefined,
    animate: loading ? buttonAnimations.loading : buttonAnimations.initial,
  } : {}

  return (
    <motion.button
      ref={ref}
      className={buttonClasses}
      disabled={isDisabled}
      aria-busy={loading}
      aria-describedby={loading && loadingText ? 'loading-text' : undefined}
      {...motionProps}
      {...props}
    >
      {/* Loading Spinner */}
      {loading && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
      )}
      
      {/* Left Icon */}
      {leftIcon && !loading && (
        <span className="mr-2 flex-shrink-0" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      
      {/* Button Content */}
      <span className={cn(loading && loadingText && 'sr-only')}>
        {loading && loadingText ? loadingText : children}
      </span>
      
      {/* Right Icon */}
      {rightIcon && !loading && (
        <span className="ml-2 flex-shrink-0" aria-hidden="true">
          {rightIcon}
        </span>
      )}
      
      {/* Screen reader loading text */}
      {loading && loadingText && (
        <span id="loading-text" className="sr-only">
          {loadingText}
        </span>
      )}
    </motion.button>
  )
})

GlassButton.displayName = 'GlassButton'

// ===================================================================================
// GLASS ICON BUTTON COMPONENT
// ===================================================================================

export const GlassIconButton = forwardRef<HTMLButtonElement, GlassIconButtonProps>(({
  icon,
  variant = 'ghost',
  size = 'md',
  glow = false,
  animated = true,
  className,
  ...props
}, ref) => {
  
  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7'
  }
  
  const buttonSizes = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
    xl: 'p-4'
  }

  return (
    <GlassButton
      ref={ref}
      variant={variant}
      glow={glow}
      animated={animated}
      className={cn(
        'aspect-square',
        buttonSizes[size],
        className
      )}
      {...props}
    >
      <span className={iconSizes[size]} aria-hidden="true">
        {icon}
      </span>
    </GlassButton>
  )
})

GlassIconButton.displayName = 'GlassIconButton'

// ===================================================================================
// GLASS BUTTON GROUP COMPONENT
// ===================================================================================

export const GlassButtonGroup = forwardRef<HTMLDivElement, GlassButtonGroupProps>(({
  children,
  className,
  orientation = 'horizontal',
  attached = false,
  ...props
}, ref) => {
  
  const groupClasses = cn(
    'inline-flex',
    orientation === 'horizontal' ? 'flex-row' : 'flex-col',
    attached && orientation === 'horizontal' && '[&>*:not(:first-child)]:ml-0 [&>*:not(:first-child)]:border-l-0 [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none [&>*:not(:first-child):not(:last-child)]:rounded-none',
    attached && orientation === 'vertical' && '[&>*:not(:first-child)]:mt-0 [&>*:not(:first-child)]:border-t-0 [&>*:first-child]:rounded-b-none [&>*:last-child]:rounded-t-none [&>*:not(:first-child):not(:last-child)]:rounded-none',
    !attached && orientation === 'horizontal' && 'gap-2',
    !attached && orientation === 'vertical' && 'gap-2',
    className
  )

  return (
    <div
      ref={ref}
      className={groupClasses}
      role="group"
      {...props}
    >
      {children}
    </div>
  )
})

GlassButtonGroup.displayName = 'GlassButtonGroup'

// ===================================================================================
// UTILITY HOOKS
// ===================================================================================

/**
 * Hook for managing button loading states
 */
export function useButtonLoading(initialState = false) {
  const [loading, setLoading] = React.useState(initialState)
  
  const startLoading = React.useCallback(() => setLoading(true), [])
  const stopLoading = React.useCallback(() => setLoading(false), [])
  const toggleLoading = React.useCallback(() => setLoading(prev => !prev), [])
  
  return {
    loading,
    startLoading,
    stopLoading,
    toggleLoading,
    setLoading
  }
}

/**
 * Hook for async button actions
 */
export function useAsyncButton() {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  const execute = React.useCallback(async (asyncFn: () => Promise<void>) => {
    setLoading(true)
    setError(null)
    
    try {
      await asyncFn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])
  
  return {
    loading,
    error,
    execute,
    clearError: () => setError(null)
  }
}

export default { GlassButton, GlassIconButton, GlassButtonGroup, useButtonLoading, useAsyncButton }