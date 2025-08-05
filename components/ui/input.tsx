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
  error?: boolean
  helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, variant, error, helperText, ...props }, ref) => {
    const inputVariant = error ? "error" : variant
    
    return (
      <div className="space-y-1">
        <input
          type={type}
          className={cn(inputVariants({ size, variant: inputVariant }), className)}
          ref={ref}
          aria-invalid={error}
          aria-describedby={helperText ? `${props.id}-helper` : undefined}
          {...props}
        />
        {helperText && (
          <p
            id={`${props.id}-helper`}
            className={cn(
              "text-sm",
              error ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
