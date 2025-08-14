import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 min-h-[44px] min-w-[44px] touch-manipulation select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline focus:underline",
        // Glassmorphism variants
        glass: "glass-button",
        "glass-ghost": "glass-button-ghost",
        "glass-outline": "glass-button-outline",
        "glass-destructive": "glass-effect glass-destructive rounded-lg glass-hover glass-focus glass-active transition-all duration-200 min-h-[44px] min-w-[44px] shadow-lg",
        "glass-success": "glass-effect glass-success rounded-lg glass-hover glass-focus glass-active transition-all duration-200 min-h-[44px] min-w-[44px] shadow-lg",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-10 rounded-md px-3",
        lg: "h-12 rounded-md px-8",
        icon: "h-11 w-11",
        touch: "h-12 w-12 md:h-10 md:w-10", // Larger on mobile
        xs: "h-8 px-2 text-xs",
        xl: "h-14 px-8 text-lg",
      },
      effect: {
        none: "",
        glow: "glass-glow",
        "glow-strong": "glass-glow-strong",
        elevated: "glass-elevated",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      effect: "none",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  animated?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    effect, 
    asChild = false, 
    loading = false, 
    loadingText = "Loading...", 
    leftIcon,
    rightIcon,
    animated = true,
    disabled, 
    children, 
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    const isDisabled = disabled || loading
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, effect, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {/* Loading Spinner */}
        {loading && (
          <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        )}
        
        {/* Left Icon */}
        {leftIcon && !loading && (
          <span className="mr-2 flex-shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        
        {/* Button Content */}
        <span className={cn(loading && loadingText && "sr-only")}>
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
          <span className="sr-only">
            {loadingText}
          </span>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
