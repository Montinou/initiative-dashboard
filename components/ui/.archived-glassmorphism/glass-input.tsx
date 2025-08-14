/**
 * Glassmorphism Input Components
 * 
 * Accessible form input components with glassmorphism styling,
 * comprehensive validation states, and WCAG 2.1 AA compliance
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

'use client'

import React, { forwardRef, useState, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// ===================================================================================
// TYPES AND INTERFACES
// ===================================================================================

interface BaseInputProps {
  label?: string
  description?: string
  error?: string | string[]
  success?: string
  info?: string
  required?: boolean
  optional?: boolean
  className?: string
  containerClassName?: string
  labelClassName?: string
  variant?: 'default' | 'floating' | 'minimal'
  size?: 'sm' | 'md' | 'lg'
}

interface GlassInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, BaseInputProps {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  loading?: boolean
}

interface GlassTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, BaseInputProps {
  resize?: boolean
  autoResize?: boolean
}

interface GlassPasswordInputProps extends Omit<GlassInputProps, 'type'> {
  showStrength?: boolean
}

// ===================================================================================
// STYLE CONFIGURATIONS
// ===================================================================================

const inputVariants = {
  default: {
    container: 'space-y-2',
    label: 'block text-sm font-medium text-white/90 mb-1',
    input: 'w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50',
    floating: false
  },
  floating: {
    container: 'relative',
    label: 'absolute left-3 text-sm font-medium text-white/70 transition-all duration-200 pointer-events-none',
    input: 'w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 peer',
    floating: true
  },
  minimal: {
    container: 'space-y-1',
    label: 'block text-xs font-medium text-white/80 mb-1',
    input: 'w-full rounded-md border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-primary/40',
    floating: false
  }
}

const inputSizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-sm',
  lg: 'px-4 py-4 text-base'
}

const floatingLabelSizes = {
  sm: 'top-2.5 peer-focus:-top-2 peer-focus:left-2 peer-focus:text-xs peer-focus:bg-black/50 peer-focus:px-2 peer-focus:rounded',
  md: 'top-3.5 peer-focus:-top-2 peer-focus:left-2 peer-focus:text-xs peer-focus:bg-black/50 peer-focus:px-2 peer-focus:rounded',
  lg: 'top-4 peer-focus:-top-2 peer-focus:left-2 peer-focus:text-xs peer-focus:bg-black/50 peer-focus:px-2 peer-focus:rounded'
}

// ===================================================================================
// VALIDATION STATE STYLES
// ===================================================================================

const getValidationStyles = (hasError: boolean, hasSuccess: boolean) => {
  if (hasError) {
    return {
      input: 'border-red-500/50 bg-red-500/5 focus:border-red-500/70 focus:ring-red-500/20',
      icon: 'text-red-400'
    }
  }
  
  if (hasSuccess) {
    return {
      input: 'border-green-500/50 bg-green-500/5 focus:border-green-500/70 focus:ring-green-500/20',
      icon: 'text-green-400'
    }
  }
  
  return {
    input: 'border-white/20 bg-white/5 hover:border-white/30 focus:border-primary/50',
    icon: 'text-white/60'
  }
}

// ===================================================================================
// GLASS INPUT COMPONENT
// ===================================================================================

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(({
  label,
  description,
  error,
  success,
  info,
  required = false,
  optional = false,
  className,
  containerClassName,
  labelClassName,
  variant = 'default',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  ...props
}, ref) => {
  
  const id = useId()
  const inputId = props.id || id
  const [isFocused, setIsFocused] = useState(false)
  
  const hasError = Boolean(error)
  const hasSuccess = Boolean(success)
  const errorArray = Array.isArray(error) ? error : error ? [error] : []
  
  const variantConfig = inputVariants[variant]
  const validationStyles = getValidationStyles(hasError, hasSuccess)
  
  const inputClasses = cn(
    'glassmorphic-input',
    variantConfig.input,
    inputSizes[size],
    validationStyles.input,
    leftIcon && 'pl-10',
    rightIcon && 'pr-10',
    loading && 'pr-10',
    className
  )
  
  const labelClasses = cn(
    variantConfig.label,
    variantConfig.floating && floatingLabelSizes[size],
    variantConfig.floating && isFocused && 'text-primary/80',
    labelClassName
  )

  return (
    <div className={cn(variantConfig.container, containerClassName)}>
      {/* Label */}
      {label && (
        <label htmlFor={inputId} className={labelClasses}>
          {label}
          {required && <span className="text-red-400 ml-1" aria-label="required">*</span>}
          {optional && <span className="text-white/50 ml-1 text-xs">(optional)</span>}
        </label>
      )}

      {/* Description */}
      {description && (
        <p className="text-xs text-white/60 mt-1" id={`${inputId}-description`}>
          {description}
        </p>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60">
            {leftIcon}
          </div>
        )}

        {/* Input */}
        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          aria-describedby={cn(
            description && `${inputId}-description`,
            hasError && `${inputId}-error`,
            success && `${inputId}-success`,
            info && `${inputId}-info`
          )}
          aria-invalid={hasError}
          aria-required={required}
          onFocus={(e) => {
            setIsFocused(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            props.onBlur?.(e)
          }}
          {...props}
        />

        {/* Right Side Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {/* Loading Spinner */}
          {loading && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-white/30 border-t-primary rounded-full"
            />
          )}

          {/* Validation Icons */}
          {hasError && <AlertCircle className="w-4 h-4 text-red-400" />}
          {hasSuccess && <CheckCircle2 className="w-4 h-4 text-green-400" />}
          {info && !hasError && !hasSuccess && <Info className="w-4 h-4 text-blue-400" />}

          {/* Custom Right Icon */}
          {rightIcon && !loading && (
            <div className="w-4 h-4 text-white/60">
              {rightIcon}
            </div>
          )}
        </div>
      </div>

      {/* Error Messages */}
      <AnimatePresence>
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            id={`${inputId}-error`}
            className="space-y-1"
          >
            {errorArray.map((err, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Message */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            id={`${inputId}-success`}
            className="flex items-center gap-2 text-xs text-green-400"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Message */}
      <AnimatePresence>
        {info && !hasError && !hasSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            id={`${inputId}-info`}
            className="flex items-center gap-2 text-xs text-blue-400"
          >
            <Info className="w-3 h-3" />
            <span>{info}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

GlassInput.displayName = 'GlassInput'

// ===================================================================================
// GLASS TEXTAREA COMPONENT
// ===================================================================================

export const GlassTextarea = forwardRef<HTMLTextAreaElement, GlassTextareaProps>(({
  label,
  description,
  error,
  success,
  info,
  required = false,
  optional = false,
  className,
  containerClassName,
  labelClassName,
  variant = 'default',
  size = 'md',
  resize = true,
  autoResize = false,
  ...props
}, ref) => {
  
  const id = useId()
  const textareaId = props.id || id
  const [isFocused, setIsFocused] = useState(false)
  
  const hasError = Boolean(error)
  const hasSuccess = Boolean(success)
  const errorArray = Array.isArray(error) ? error : error ? [error] : []
  
  const variantConfig = inputVariants[variant]
  const validationStyles = getValidationStyles(hasError, hasSuccess)
  
  const textareaClasses = cn(
    'glassmorphic-input',
    variantConfig.input,
    inputSizes[size],
    validationStyles.input,
    !resize && 'resize-none',
    autoResize && 'min-h-[80px]',
    className
  )
  
  const labelClasses = cn(
    variantConfig.label,
    labelClassName
  )

  // Auto-resize functionality
  const handleAutoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (autoResize) {
      e.target.style.height = 'auto'
      e.target.style.height = `${e.target.scrollHeight}px`
    }
    props.onChange?.(e)
  }

  return (
    <div className={cn(variantConfig.container, containerClassName)}>
      {/* Label */}
      {label && (
        <label htmlFor={textareaId} className={labelClasses}>
          {label}
          {required && <span className="text-red-400 ml-1" aria-label="required">*</span>}
          {optional && <span className="text-white/50 ml-1 text-xs">(optional)</span>}
        </label>
      )}

      {/* Description */}
      {description && (
        <p className="text-xs text-white/60 mt-1" id={`${textareaId}-description`}>
          {description}
        </p>
      )}

      {/* Textarea Container */}
      <div className="relative">
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClasses}
          aria-describedby={cn(
            description && `${textareaId}-description`,
            hasError && `${textareaId}-error`,
            success && `${textareaId}-success`,
            info && `${textareaId}-info`
          )}
          aria-invalid={hasError}
          aria-required={required}
          onFocus={(e) => {
            setIsFocused(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            props.onBlur?.(e)
          }}
          onChange={handleAutoResize}
          {...props}
        />

        {/* Validation Icon */}
        <div className="absolute right-3 top-3">
          {hasError && <AlertCircle className="w-4 h-4 text-red-400" />}
          {hasSuccess && <CheckCircle2 className="w-4 h-4 text-green-400" />}
          {info && !hasError && !hasSuccess && <Info className="w-4 h-4 text-blue-400" />}
        </div>
      </div>

      {/* Error Messages */}
      <AnimatePresence>
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            id={`${textareaId}-error`}
            className="space-y-1"
          >
            {errorArray.map((err, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Message */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            id={`${textareaId}-success`}
            className="flex items-center gap-2 text-xs text-green-400"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Message */}
      <AnimatePresence>
        {info && !hasError && !hasSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            id={`${textareaId}-info`}
            className="flex items-center gap-2 text-xs text-blue-400"
          >
            <Info className="w-3 h-3" />
            <span>{info}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

GlassTextarea.displayName = 'GlassTextarea'

// ===================================================================================
// GLASS PASSWORD INPUT COMPONENT
// ===================================================================================

export const GlassPasswordInput = forwardRef<HTMLInputElement, GlassPasswordInputProps>(({
  showStrength = false,
  ...props
}, ref) => {
  
  const [showPassword, setShowPassword] = useState(false)
  const [strength, setStrength] = useState(0)
  
  const calculateStrength = (password: string): number => {
    let score = 0
    if (password.length >= 8) score += 1
    if (/[a-z]/.test(password)) score += 1
    if (/[A-Z]/.test(password)) score += 1
    if (/\d/.test(password)) score += 1
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1
    return score
  }
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (showStrength) {
      setStrength(calculateStrength(e.target.value))
    }
    props.onChange?.(e)
  }
  
  const getStrengthLabel = (strength: number): string => {
    switch (strength) {
      case 0:
      case 1: return 'Weak'
      case 2: return 'Fair'
      case 3: return 'Good'
      case 4:
      case 5: return 'Strong'
      default: return 'Weak'
    }
  }
  
  const getStrengthColor = (strength: number): string => {
    switch (strength) {
      case 0:
      case 1: return 'bg-red-500'
      case 2: return 'bg-yellow-500'
      case 3: return 'bg-blue-500'
      case 4:
      case 5: return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-3">
      <GlassInput
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-white/60 hover:text-white/80 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        onChange={handlePasswordChange}
        {...props}
      />
      
      {/* Password Strength Meter */}
      {showStrength && props.value && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/70">Password strength:</span>
            <span className="text-xs font-medium text-white/90">{getStrengthLabel(strength)}</span>
          </div>
          
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  'h-1 flex-1 rounded-full transition-all duration-200',
                  index < strength ? getStrengthColor(strength) : 'bg-white/20'
                )}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
})

GlassPasswordInput.displayName = 'GlassPasswordInput'

export default { GlassInput, GlassTextarea, GlassPasswordInput }