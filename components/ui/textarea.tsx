import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const textareaVariants = cva(
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors md:text-sm",
  {
    variants: {
      variant: {
        default: "border-input",
        error: "border-destructive focus-visible:ring-destructive/20",
        success: "border-green-500 focus-visible:ring-green-500/20",
      },
      resize: {
        none: "resize-none",
        vertical: "resize-y",
        horizontal: "resize-x",
        both: "resize",
      },
    },
    defaultVariants: {
      variant: "default",
      resize: "vertical",
    },
  }
)

export interface TextareaProps
  extends React.ComponentProps<"textarea">,
    VariantProps<typeof textareaVariants> {
  error?: boolean | string | string[]
  success?: boolean | string
  helperText?: string
  label?: string
  autoResize?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    variant, 
    resize,
    error, 
    success,
    helperText, 
    label,
    autoResize = false,
    ...props 
  }, ref) => {
    const hasError = Boolean(error)
    const hasSuccess = Boolean(success) && !hasError
    const textareaVariant = hasError ? "error" : hasSuccess ? "success" : variant
    const errorMessages = Array.isArray(error) ? error : error ? [String(error)] : []
    const successMessage = typeof success === "string" ? success : undefined

    // Auto-resize functionality
    const handleAutoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        e.target.style.height = 'auto'
        e.target.style.height = `${e.target.scrollHeight}px`
      }
      props.onChange?.(e)
    }

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
        
        {/* Textarea */}
        <textarea
          className={cn(
            textareaVariants({ variant: textareaVariant, resize }), 
            className
          )}
          ref={ref}
          aria-invalid={hasError}
          aria-describedby={cn(
            helperText && `${props.id}-helper`,
            hasError && `${props.id}-error`,
            hasSuccess && `${props.id}-success`
          )}
          onChange={handleAutoResize}
          {...props}
        />
        
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
Textarea.displayName = "Textarea"

export { Textarea, textareaVariants }
