"use client"

import * as React from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "./dialog"
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from "./alert-dialog"
import { Button } from "./button"
import { Alert, AlertDescription } from "./alert"
import { Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StandardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "dark" | "glass"
  loading?: boolean
  error?: string | null
  className?: string
}

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  variant?: "default" | "destructive"
  loading?: boolean
  icon?: React.ReactNode
}

export interface FormDialogProps extends Omit<StandardDialogProps, 'children'> {
  onSubmit: (e: React.FormEvent) => void | Promise<void>
  submitText?: string
  cancelText?: string
  onCancel?: () => void
  children: React.ReactNode
  submitDisabled?: boolean
}

const sizeClasses = {
  sm: "sm:max-w-[400px]",
  md: "sm:max-w-[500px]", 
  lg: "sm:max-w-[600px]",
  xl: "sm:max-w-[800px]"
}

const variantClasses = {
  default: "bg-background border",
  dark: "bg-gray-900/95 backdrop-blur-xl border-white/10",
  glass: "bg-white/10 backdrop-blur-xl border-white/20"
}

// Main StandardDialog component for general use
export function StandardDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  variant = "default",
  loading = false,
  error = null,
  className,
  ...props
}: StandardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange} {...props}>
      <DialogContent 
        className={cn(
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
      >
        <DialogHeader>
          <DialogTitle className={variant === "default" ? "" : "text-white"}>
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className={variant === "default" ? "" : "text-gray-300"}>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

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

        <div className={variant === "default" ? "" : "text-white"}>
          {children}
        </div>

        {footer && (
          <DialogFooter>
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ConfirmDialog for confirmations
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel", 
  onConfirm,
  onCancel,
  variant = "default",
  loading = false,
  icon
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      // Error handling should be done by parent
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={loading || isLoading ? undefined : onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {icon}
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription>
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={loading || isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading || isLoading}
            className={cn(
              variant === "destructive" && "bg-red-600 hover:bg-red-700"
            )}
          >
            {(loading || isLoading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// FormDialog for forms
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  submitText = "Save",
  cancelText = "Cancel",
  onCancel,
  children,
  submitDisabled = false,
  size = "md",
  variant = "default",
  loading = false,
  error = null,
  className,
  ...props
}: FormDialogProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(e)
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size={size}
      variant={variant}
      loading={loading}
      error={error}
      className={className}
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className={cn(
              variant !== "default" && "bg-white/5 border-white/10 text-white hover:bg-white/10"
            )}
          >
            {cancelText}
          </Button>
          <Button
            type="submit"
            form="dialog-form"
            disabled={loading || submitDisabled}
            className={cn(
              variant === "dark" && "bg-purple-600 hover:bg-purple-700",
              variant === "glass" && "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitText}
          </Button>
        </div>
      }
      {...props}
    >
      <form id="dialog-form" onSubmit={handleSubmit} className="space-y-4">
        {children}
      </form>
    </StandardDialog>
  )
}

// Export all components
export { StandardDialog as default }