import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Button específico para SIGA con variantes personalizadas
 * Usa los colores oficiales de SIGA Turismo
 */
const sigaButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Verde SIGA - Principal
        primary: "bg-siga-green-500 text-white hover:bg-siga-green-600 dark:bg-siga-green-dark dark:hover:bg-siga-green-dark-hover dark:text-black",
        
        // Amarillo SIGA - Acento
        accent: "bg-siga-yellow-500 text-gray-900 hover:bg-siga-yellow-600 dark:bg-siga-yellow-dark dark:hover:bg-siga-yellow-dark-hover dark:text-black",
        
        // Gris Perla - Secundario
        secondary: "bg-siga-gray-50 text-siga-green-600 hover:bg-siga-gray-100 dark:bg-siga-dark-muted dark:text-siga-green-dark dark:hover:bg-siga-dark-subtle",
        
        // Destructive
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        
        // Outline variants
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        
        "outline-green": "border border-siga-green-500 text-siga-green-600 hover:bg-siga-green-50 dark:border-siga-green-dark dark:text-siga-green-dark dark:hover:bg-siga-green-dark/10",
        
        "outline-yellow": "border border-siga-yellow-500 text-siga-yellow-600 hover:bg-siga-yellow-50 dark:border-siga-yellow-dark dark:text-siga-yellow-dark dark:hover:bg-siga-yellow-dark/10",
        
        // Ghost variants
        ghost: "hover:bg-accent hover:text-accent-foreground",
        
        "ghost-green": "text-siga-green-600 hover:bg-siga-green-50 hover:text-siga-green-700 dark:text-siga-green-dark dark:hover:bg-siga-green-dark/10",
        
        "ghost-yellow": "text-siga-yellow-600 hover:bg-siga-yellow-50 hover:text-siga-yellow-700 dark:text-siga-yellow-dark dark:hover:bg-siga-yellow-dark/10",
        
        // Link variant
        link: "text-primary underline-offset-4 hover:underline",
        
        // Gradient variant
        gradient: "bg-gradient-to-r from-siga-green-500 to-siga-green-600 text-white hover:from-siga-green-600 hover:to-siga-green-700 dark:from-siga-green-dark dark:to-siga-green-dark-hover",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-md px-10 text-base",
        icon: "h-10 w-10",
      },
      rounded: {
        default: "rounded-md",
        full: "rounded-full",
        lg: "rounded-lg",
        xl: "rounded-xl",
        none: "rounded-none",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      rounded: "default",
    },
  }
)

export interface SigaButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof sigaButtonVariants> {
  asChild?: boolean
}

const SigaButton = React.forwardRef<HTMLButtonElement, SigaButtonProps>(
  ({ className, variant, size, rounded, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(sigaButtonVariants({ variant, size, rounded, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
SigaButton.displayName = "SigaButton"

export { SigaButton, sigaButtonVariants }