"use client"

import * as React from "react"
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger
} from "./sheet"
import { Button } from "./button"
import { Alert, AlertDescription } from "./alert"
import { X, Menu, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DrawerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  size?: "sm" | "md" | "lg" | "xl" | "full"
  variant?: "default" | "dark" | "glass"
  loading?: boolean
  error?: string | null
  className?: string
  showCloseButton?: boolean
  overlay?: boolean
}

export interface MobileDrawerProps extends Omit<DrawerDialogProps, 'side'> {
  trigger?: React.ReactNode
  triggerClassName?: string
}

export interface BottomSheetProps extends Omit<DrawerDialogProps, 'side' | 'size'> {
  snapPoints?: string[]
  defaultSnap?: number
}

export interface SideNavigationProps extends Omit<DrawerDialogProps, 'side'> {
  navigation: {
    items: {
      id: string
      label: string
      icon?: React.ReactNode
      active?: boolean
      disabled?: boolean
      onClick?: () => void
    }[]
  }
  activeItem?: string
  onItemSelect?: (itemId: string) => void
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md", 
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full"
}

const variantClasses = {
  default: "bg-background border",
  dark: "bg-gray-900/95 backdrop-blur-xl border-white/10",
  glass: "bg-white/10 backdrop-blur-xl border-white/20"
}

// Main DrawerDialog component
export function DrawerDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "right",
  size = "md",
  variant = "default",
  loading = false,
  error = null,
  className,
  showCloseButton = true,
  overlay = true,
  ...props
}: DrawerDialogProps) {
  return (
    <Sheet open={open} onOpenChange={loading ? undefined : onOpenChange} {...props}>
      <SheetContent 
        side={side}
        className={cn(
          sizeClasses[size],
          variantClasses[variant],
          !overlay && "pointer-events-auto",
          className
        )}
      >
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <SheetTitle className={variant === "default" ? "" : "text-white"}>
                {title}
              </SheetTitle>
              {description && (
                <SheetDescription className={variant === "default" ? "" : "text-gray-300"}>
                  {description}
                </SheetDescription>
              )}
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className={cn(
                  "h-8 w-8 p-0",
                  variant !== "default" && "text-white hover:bg-white/10"
                )}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            )}
          </div>
        </SheetHeader>

        {error && (
          <Alert className={cn(
            "bg-red-500/10 border-red-500/20",
            variant === "default" && "bg-red-50 border-red-200"
          )}>
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className={variant === "default" ? "text-red-800" : "text-red-200"}>
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className={cn(
          "flex-1 overflow-auto py-4",
          variant === "default" ? "" : "text-white"
        )}>
          {children}
        </div>

        {footer && (
          <SheetFooter>
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

// Mobile-optimized drawer with trigger
export function MobileDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  trigger,
  triggerClassName,
  size = "lg",
  variant = "default",
  loading = false,
  error = null,
  className,
  ...props
}: MobileDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={loading ? undefined : onOpenChange} {...props}>
      {trigger && (
        <SheetTrigger asChild>
          <Button 
            variant="outline" 
            className={cn("md:hidden", triggerClassName)}
          >
            {trigger}
          </Button>
        </SheetTrigger>
      )}
      
      <SheetContent 
        side="bottom"
        className={cn(
          "max-h-[85vh]",
          variantClasses[variant],
          className
        )}
      >
        <SheetHeader className="text-left">
          <SheetTitle className={variant === "default" ? "" : "text-white"}>
            {title}
          </SheetTitle>
          {description && (
            <SheetDescription className={variant === "default" ? "" : "text-gray-300"}>
              {description}
            </SheetDescription>
          )}
        </SheetHeader>

        {error && (
          <Alert className={cn(
            "bg-red-500/10 border-red-500/20 mt-4",
            variant === "default" && "bg-red-50 border-red-200"
          )}>
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className={variant === "default" ? "text-red-800" : "text-red-200"}>
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className={cn(
          "overflow-auto py-4 max-h-[60vh]",
          variant === "default" ? "" : "text-white"
        )}>
          {children}
        </div>

        {footer && (
          <SheetFooter className="pt-4">
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

// Bottom sheet with snap points (iOS-style)
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  snapPoints = ["25%", "50%", "75%"],
  defaultSnap = 1,
  variant = "default",
  loading = false,
  error = null,
  className,
  ...props
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = React.useState(defaultSnap)

  return (
    <Sheet open={open} onOpenChange={loading ? undefined : onOpenChange} {...props}>
      <SheetContent 
        side="bottom"
        className={cn(
          "transition-all duration-300",
          variantClasses[variant],
          className
        )}
        style={{
          height: snapPoints[currentSnap] || snapPoints[0]
        }}
      >
        {/* Drag indicator */}
        <div className="flex justify-center pt-2 pb-4">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        <SheetHeader className="text-left">
          <SheetTitle className={variant === "default" ? "" : "text-white"}>
            {title}
          </SheetTitle>
          {description && (
            <SheetDescription className={variant === "default" ? "" : "text-gray-300"}>
              {description}
            </SheetDescription>
          )}
        </SheetHeader>

        {error && (
          <Alert className={cn(
            "bg-red-500/10 border-red-500/20 mt-4",
            variant === "default" && "bg-red-50 border-red-200"
          )}>
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className={variant === "default" ? "text-red-800" : "text-red-200"}>
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className={cn(
          "flex-1 overflow-auto py-4",
          variant === "default" ? "" : "text-white"
        )}>
          {children}
        </div>

        {/* Snap point controls */}
        {snapPoints.length > 1 && (
          <div className="flex justify-center gap-2 py-2">
            {snapPoints.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSnap(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  currentSnap === index 
                    ? "bg-primary" 
                    : "bg-gray-300 hover:bg-gray-400"
                )}
              />
            ))}
          </div>
        )}

        {footer && (
          <SheetFooter className="pt-2">
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

// Side navigation drawer
export function SideNavigation({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  navigation,
  activeItem,
  onItemSelect,
  variant = "default",
  loading = false,
  error = null,
  className,
  ...props
}: SideNavigationProps) {
  return (
    <DrawerDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      side="left"
      size="md"
      variant={variant}
      loading={loading}
      error={error}
      className={className}
      footer={footer}
      {...props}
    >
      <nav className="space-y-2">
        {navigation.items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              item.onClick?.()
              onItemSelect?.(item.id)
            }}
            disabled={item.disabled || loading}
            className={cn(
              "flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              item.active || activeItem === item.id
                ? variant === "default"
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/20 text-white"
                : variant === "default"
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                  : "text-gray-300 hover:text-white hover:bg-white/10",
              item.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {item.icon && (
              <span className="flex-shrink-0">
                {item.icon}
              </span>
            )}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {children && (
        <div className="mt-6 pt-6 border-t border-border">
          {children}
        </div>
      )}
    </DrawerDialog>
  )
}

// Export all components
export { 
  DrawerDialog as default, 
  MobileDrawer, 
  BottomSheet, 
  SideNavigation 
}