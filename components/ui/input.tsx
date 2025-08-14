import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors md:text-sm",
  {
    variants: {
      size: {
        default: "h-10",
        sm: "h-8 px-2 text-sm",
        lg: "h-12 px-4 text-lg",
        xs: "h-7 px-2 text-xs",
      },
      variant: {
        default: "border-input",
        error: "border-destructive focus-visible:ring-destructive/20",
        success: "border-green-500 focus-visible:ring-green-500/20",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface InputProps
  extends React.ComponentProps<"input">,
    VariantProps<typeof inputVariants> {
  error?: boolean | string | string[]
  success?: boolean | string
  helperText?: string
  label?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  loading?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type, 
    size, 
    variant, 
    error, 
    success,
    helperText, 
    label,
    leftIcon,
    rightIcon,
    loading = false,
    ...props 
  }, ref) => {
    const hasError = Boolean(error)
    const hasSuccess = Boolean(success) && !hasError
    const inputVariant = hasError ? "error" : hasSuccess ? "success" : variant
    const errorMessages = Array.isArray(error) ? error : error ? [String(error)] : []
    const successMessage = typeof success === "string" ? success : undefined
    
    return (
      <div className="space-y-2">
        {/* Label */}
        {label && (
          <label 
            htmlFor={props.id} 
            className="block text-sm font-medium text-foreground"
          >
            {label}
            {props.required && <span className="text-destructive ml-1" aria-label="required">*</span>}
          </label>
        )}
        
        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          
          {/* Input */}
          <input
            type={type}
            className={cn(
              inputVariants({ size, variant: inputVariant }), 
              leftIcon && "pl-10",
              (rightIcon || loading) && "pr-10",
              className
            )}
            ref={ref}
            aria-invalid={hasError}
            aria-describedby={cn(
              helperText && `${props.id}-helper`,
              hasError && `${props.id}-error`,
              hasSuccess && `${props.id}-success`
            )}
            {...props}
          />
          
          {/* Right Side Icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Loading Spinner */}
            {loading && (
              <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            )}
            
            {/* Right Icon */}
            {rightIcon && !loading && (
              <div className="w-4 h-4 text-muted-foreground">
                {rightIcon}
              </div>
            )}
          </div>
        </div>
        
        {/* Helper Text */}
        {helperText && !hasError && !hasSuccess && (
          <p
            id={`${props.id}-helper`}
            className="text-sm text-muted-foreground"
          >
            {helperText}
          </p>
        )}
        
        {/* Error Messages */}
        {hasError && errorMessages.length > 0 && (
          <div id={`${props.id}-error`} className="space-y-1">
            {errorMessages.map((err, index) => (
              <p key={index} className="text-sm text-destructive flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-destructive/20 flex-shrink-0" />
                {err}
              </p>
            ))}
          </div>
        )}
        
        {/* Success Message */}
        {hasSuccess && successMessage && (
          <p
            id={`${props.id}-success`}
            className="text-sm text-green-600 flex items-center gap-2"
          >
            <span className="w-3 h-3 rounded-full bg-green-600/20 flex-shrink-0" />
            {successMessage}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
