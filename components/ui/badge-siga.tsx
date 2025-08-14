import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Badge específico para SIGA con variantes personalizadas
 * Usa los colores oficiales de SIGA Turismo
 */
const sigaBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Verde SIGA - Principal
        primary: "border-transparent bg-siga-green-500 text-white hover:bg-siga-green-600 dark:bg-siga-green-dark dark:hover:bg-siga-green-dark-hover dark:text-black",
        
        // Amarillo SIGA - Acento
        accent: "border-transparent bg-siga-yellow-500 text-gray-900 hover:bg-siga-yellow-600 dark:bg-siga-yellow-dark dark:hover:bg-siga-yellow-dark-hover dark:text-black",
        
        // Gris Perla - Secundario
        secondary: "border-transparent bg-siga-gray-50 text-siga-green-700 hover:bg-siga-gray-100 dark:bg-siga-dark-muted dark:text-siga-green-dark",
        
        // Estados
        success: "border-siga-green-500 bg-siga-green-50 text-siga-green-700 hover:bg-siga-green-100 dark:border-siga-green-dark dark:bg-siga-green-dark/10 dark:text-siga-green-dark",
        
        warning: "border-siga-yellow-500 bg-siga-yellow-50 text-siga-yellow-700 hover:bg-siga-yellow-100 dark:border-siga-yellow-dark dark:bg-siga-yellow-dark/10 dark:text-siga-yellow-dark",
        
        // Outline variants
        "outline-green": "text-siga-green-600 border-siga-green-500 hover:bg-siga-green-50 dark:text-siga-green-dark dark:border-siga-green-dark dark:hover:bg-siga-green-dark/10",
        
        "outline-yellow": "text-siga-yellow-600 border-siga-yellow-500 hover:bg-siga-yellow-50 dark:text-siga-yellow-dark dark:border-siga-yellow-dark dark:hover:bg-siga-yellow-dark/10",
        
        // Destructive
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        
        // Ghost
        ghost: "hover:bg-siga-gray-50 hover:text-siga-green-600 dark:hover:bg-siga-dark-muted dark:hover:text-siga-green-dark",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
      intensity: {
        light: "opacity-80",
        default: "opacity-100",
        strong: "font-bold",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      intensity: "default",
    },
  }
)

export interface SigaBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sigaBadgeVariants> {
  as?: React.ElementType
}

const SigaBadge = React.forwardRef<HTMLDivElement, SigaBadgeProps>(
  ({ className, variant, size, intensity, as: Component = "div", ...props }, ref) => {
    return (
      <Component 
        ref={ref}
        className={cn(sigaBadgeVariants({ variant, size, intensity }), className)} 
        {...props} 
      />
    )
  }
)
SigaBadge.displayName = "SigaBadge"

export { SigaBadge, sigaBadgeVariants }