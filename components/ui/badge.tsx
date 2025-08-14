import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        success:
          "border-transparent bg-green-500 text-white hover:bg-green-600",
        warning:
          "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
        info:
          "border-transparent bg-blue-500 text-white hover:bg-blue-600",
        outline: "text-foreground border-border hover:bg-accent hover:text-accent-foreground",
        // Glass variants
        glass: "glass-badge",
        "glass-primary": "glass-default glass-primary rounded-full text-xs inline-flex items-center",
        "glass-secondary": "glass-default glass-secondary rounded-full text-xs inline-flex items-center",
        "glass-accent": "glass-default glass-accent rounded-full text-xs inline-flex items-center",
        "glass-destructive": "glass-default glass-destructive rounded-full text-xs inline-flex items-center",
        "glass-success": "glass-default glass-success rounded-full text-xs inline-flex items-center",
        "glass-warning": "glass-default glass-warning rounded-full text-xs inline-flex items-center",
        "glass-muted": "glass-default glass-muted rounded-full text-xs inline-flex items-center",
        "glass-outline": "glass-subtle border-2 border-border/50 rounded-full text-xs inline-flex items-center",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  as?: React.ElementType
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, as: Component = "div", ...props }, ref) => {
    return (
      <Component 
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)} 
        {...props} 
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
