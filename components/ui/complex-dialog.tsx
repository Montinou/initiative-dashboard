"use client"

import * as React from "react"
import { StandardDialog } from "./standard-dialog"
import { Button } from "./button"
import { Progress } from "./progress"
import { Badge } from "./badge"
import { ChevronLeft, ChevronRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Step {
  id: string
  title: string
  description?: string
  content: React.ReactNode
  optional?: boolean
  validation?: () => boolean | Promise<boolean>
}

export interface ComplexDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  steps: Step[]
  currentStep: number
  onStepChange: (step: number) => void
  onComplete: () => void | Promise<void>
  onCancel?: () => void
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "dark" | "glass"
  loading?: boolean
  error?: string | null
  className?: string
  showProgress?: boolean
  allowSkipSteps?: boolean
  completedSteps?: number[]
}

export interface MultiTabDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  tabs: {
    id: string
    label: string
    content: React.ReactNode
    badge?: string | number
  }[]
  activeTab: string
  onTabChange: (tabId: string) => void
  footer?: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "dark" | "glass"
  loading?: boolean
  error?: string | null
  className?: string
}

export interface WizardDialogProps extends Omit<ComplexDialogProps, 'currentStep' | 'onStepChange'> {
  initialStep?: number
  validateStep?: (step: number) => boolean | Promise<boolean>
  onStepValidationError?: (step: number, error: string) => void
}

// Multi-step wizard dialog
export function WizardDialog({
  open,
  onOpenChange,
  title,
  description,
  steps,
  onComplete,
  onCancel,
  size = "lg",
  variant = "default",
  loading = false,
  error = null,
  className,
  showProgress = true,
  allowSkipSteps = false,
  completedSteps = [],
  initialStep = 0,
  validateStep,
  onStepValidationError,
  ...props
}: WizardDialogProps) {
  const [currentStep, setCurrentStep] = React.useState(initialStep)
  const [isValidating, setIsValidating] = React.useState(false)
  const [stepErrors, setStepErrors] = React.useState<Record<number, string>>({})

  const currentStepData = steps[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1
  const canGoNext = allowSkipSteps || completedSteps.includes(currentStep) || !currentStepData?.validation
  const canGoPrevious = !isFirstStep && !loading && !isValidating

  const handleNext = async () => {
    if (isLastStep) {
      await onComplete()
      return
    }

    // Validate current step if validation exists
    if (currentStepData?.validation || validateStep) {
      setIsValidating(true)
      try {
        const validation = currentStepData?.validation || (() => validateStep?.(currentStep) ?? true)
        const isValid = await validation()
        
        if (!isValid) {
          const errorMessage = `Step ${currentStep + 1} validation failed`
          setStepErrors(prev => ({ ...prev, [currentStep]: errorMessage }))
          onStepValidationError?.(currentStep, errorMessage)
          return
        }
        
        // Clear any previous errors for this step
        setStepErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[currentStep]
          return newErrors
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Validation failed'
        setStepErrors(prev => ({ ...prev, [currentStep]: errorMessage }))
        onStepValidationError?.(currentStep, errorMessage)
        return
      } finally {
        setIsValidating(false)
      }
    }

    setCurrentStep(currentStep + 1)
  }

  const handlePrevious = () => {
    if (canGoPrevious) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const progressValue = ((currentStep + 1) / steps.length) * 100

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size={size}
      variant={variant}
      loading={loading}
      error={error || stepErrors[currentStep]}
      className={className}
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className={cn(
              "flex items-center gap-2",
              variant !== "default" && "bg-white/5 border-white/10 text-white hover:bg-white/10"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm text-muted-foreground",
              variant !== "default" && "text-gray-300"
            )}>
              {currentStep + 1} of {steps.length}
            </span>
          </div>

          <Button
            type="button"
            onClick={handleNext}
            disabled={loading || isValidating || (!canGoNext && !allowSkipSteps)}
            className={cn(
              "flex items-center gap-2",
              variant === "dark" && "bg-purple-600 hover:bg-purple-700",
              variant === "glass" && "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {isLastStep ? "Complete" : "Next"}
            {isLastStep ? (
              <Check className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      }
      {...props}
    >
      <div className="space-y-4">
        {showProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className={variant !== "default" ? "text-white" : ""}>
                {currentStepData?.title}
              </span>
              <span className={variant !== "default" ? "text-gray-300" : "text-muted-foreground"}>
                {Math.round(progressValue)}%
              </span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={completedSteps.includes(currentStep) ? "default" : "secondary"}>
              {currentStep + 1}
            </Badge>
            <h3 className={cn(
              "font-medium",
              variant !== "default" && "text-white"
            )}>
              {currentStepData?.title}
            </h3>
            {currentStepData?.optional && (
              <Badge variant="outline" className="text-xs">
                Optional
              </Badge>
            )}
          </div>
          
          {currentStepData?.description && (
            <p className={cn(
              "text-sm text-muted-foreground",
              variant !== "default" && "text-gray-300"
            )}>
              {currentStepData.description}
            </p>
          )}
        </div>

        <div className={variant !== "default" ? "text-white" : ""}>
          {currentStepData?.content}
        </div>
      </div>
    </StandardDialog>
  )
}

// Multi-tab dialog for different content sections
export function MultiTabDialog({
  open,
  onOpenChange,
  title,
  description,
  tabs,
  activeTab,
  onTabChange,
  footer,
  size = "lg",
  variant = "default",
  loading = false,
  error = null,
  className,
  ...props
}: MultiTabDialogProps) {
  const activeTabData = tabs.find(tab => tab.id === activeTab) || tabs[0]

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
      footer={footer}
      {...props}
    >
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1 p-1 bg-muted rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                variant !== "default" && {
                  "bg-white/10 text-white": activeTab === tab.id,
                  "text-gray-300 hover:text-white hover:bg-white/5": activeTab !== tab.id
                }
              )}
              disabled={loading}
            >
              {tab.label}
              {tab.badge && (
                <Badge variant="secondary" className="text-xs">
                  {tab.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className={cn(
          "min-h-[200px]",
          variant !== "default" && "text-white"
        )}>
          {activeTabData?.content}
        </div>
      </div>
    </StandardDialog>
  )
}

// Generic complex dialog that can handle multiple patterns
export function ComplexDialog({
  open,
  onOpenChange,
  title,
  description,
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onCancel,
  size = "lg",
  variant = "default",
  loading = false,
  error = null,
  className,
  showProgress = true,
  allowSkipSteps = false,
  completedSteps = [],
  ...props
}: ComplexDialogProps) {
  return (
    <WizardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      steps={steps}
      onComplete={onComplete}
      onCancel={onCancel}
      size={size}
      variant={variant}
      loading={loading}
      error={error}
      className={className}
      showProgress={showProgress}
      allowSkipSteps={allowSkipSteps}
      completedSteps={completedSteps}
      initialStep={currentStep}
      {...props}
    />
  )
}

// Export all components
export { ComplexDialog as default, WizardDialog, MultiTabDialog }