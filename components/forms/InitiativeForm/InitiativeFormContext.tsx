/**
 * Initiative Form Context
 * 
 * React Context for sharing form state and actions across initiative form components
 * Provides centralized state management for complex multi-step form interactions
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

'use client'

import React, { createContext, useContext, useCallback } from 'react'
import { useInitiativeForm } from './hooks/useInitiativeForm'
import type { Initiative, Area } from '@/lib/types/database'
import type { ManagerInitiativeFormData, AdminInitiativeFormData, ActivityFormData } from './ValidationSchemas'

// ===================================================================================
// CONTEXT TYPES
// ===================================================================================

type InitiativeFormData = ManagerInitiativeFormData | AdminInitiativeFormData

interface InitiativeFormContextType {
  // Form state
  formData: InitiativeFormData
  isDirty: boolean
  isValid: boolean
  errors: Record<string, string[]>
  isSubmitting: boolean
  isSaving: boolean
  lastSaved?: Date

  // User context
  userProfile: any
  canCreateStrategic: boolean
  canSelectArea: boolean

  // Areas data
  areas: Area[]
  loadingAreas: boolean

  // Form actions
  updateField: (field: string, value: any) => void
  updateActivity: (index: number, updates: Partial<ActivityFormData>) => void
  addActivity: (activity?: Partial<ActivityFormData>) => void
  removeActivity: (index: number) => void
  submitForm: () => Promise<void>
  reset: () => void
  cancel: () => void

  // Utility methods
  getError: (field: string) => string[]
  hasError: (field: string) => boolean
  getFieldProps: (field: string) => {
    value: any
    onChange: (value: any) => void
    error?: string[]
    hasError: boolean
  }
}

interface InitiativeFormProviderProps {
  children: React.ReactNode
  initialData?: Partial<Initiative>
  mode: 'create' | 'edit'
  onSuccess?: (initiative: Initiative) => void
  onCancel?: () => void
  autoSaveInterval?: number
}

// ===================================================================================
// CONTEXT CREATION
// ===================================================================================

const InitiativeFormContext = createContext<InitiativeFormContextType | undefined>(undefined)

// ===================================================================================
// CONTEXT PROVIDER
// ===================================================================================

export function InitiativeFormProvider({
  children,
  initialData,
  mode,
  onSuccess,
  onCancel,
  autoSaveInterval
}: InitiativeFormProviderProps) {
  const formHook = useInitiativeForm({
    initialData,
    mode,
    onSuccess,
    onCancel,
    autoSaveInterval
  })

  // ===================================================================================
  // UTILITY METHODS
  // ===================================================================================

  const getError = useCallback((field: string): string[] => {
    return formHook.errors[field] || []
  }, [formHook.errors])

  const hasError = useCallback((field: string): boolean => {
    return Boolean(formHook.errors[field]?.length)
  }, [formHook.errors])

  const getFieldProps = useCallback((field: string) => {
    // Handle nested field access
    const getValue = (obj: any, path: string): any => {
      return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : ''
      }, obj)
    }

    return {
      value: getValue(formHook.formData, field),
      onChange: (value: any) => formHook.updateField(field, value),
      error: getError(field),
      hasError: hasError(field)
    }
  }, [formHook.formData, formHook.updateField, getError, hasError])

  // ===================================================================================
  // CONTEXT VALUE
  // ===================================================================================

  const contextValue: InitiativeFormContextType = {
    // Form state from hook
    formData: formHook.formData,
    isDirty: formHook.isDirty,
    isValid: formHook.isValid,
    errors: formHook.errors,
    isSubmitting: formHook.isSubmitting,
    isSaving: formHook.isSaving,
    lastSaved: formHook.lastSaved,

    // User context from hook
    userProfile: formHook.userProfile,
    canCreateStrategic: formHook.canCreateStrategic,
    canSelectArea: formHook.canSelectArea,

    // Areas data from hook
    areas: formHook.areas,
    loadingAreas: formHook.loadingAreas,

    // Form actions from hook
    updateField: formHook.updateField,
    updateSubtask: formHook.updateSubtask,
    addSubtask: formHook.addSubtask,
    removeSubtask: formHook.removeSubtask,
    redistributeWeights: formHook.redistributeWeights,
    submitForm: formHook.submitForm,
    reset: formHook.reset,
    cancel: formHook.cancel,

    // Utility methods
    getError,
    hasError,
    getFieldProps
  }

  return (
    <InitiativeFormContext.Provider value={contextValue}>
      {children}
    </InitiativeFormContext.Provider>
  )
}

// ===================================================================================
// CONTEXT HOOK
// ===================================================================================

/**
 * Hook to use the InitiativeForm context
 * Must be used within an InitiativeFormProvider
 */
export function useInitiativeFormContext(): InitiativeFormContextType {
  const context = useContext(InitiativeFormContext)
  
  if (context === undefined) {
    throw new Error('useInitiativeFormContext must be used within an InitiativeFormProvider')
  }
  
  return context
}

// ===================================================================================
// FIELD-SPECIFIC HOOKS
// ===================================================================================

/**
 * Hook for specific form fields with built-in error handling
 */
export function useFormField(fieldName: string) {
  const context = useInitiativeFormContext()
  
  return {
    ...context.getFieldProps(fieldName),
    disabled: context.isSubmitting,
    required: true // Most fields are required by default
  }
}

/**
 * Hook for activity management
 */
export function useActivityManager() {
  const context = useInitiativeFormContext()
  
  return {
    activities: context.formData.activities || [],
    addActivity: context.addActivity,
    updateActivity: context.updateActivity,
    removeActivity: context.removeActivity,
    progressMethod: context.formData.progress_method,
    errors: context.getError('activities'),
    hasErrors: context.hasError('activities'),
    isSubmitting: context.isSubmitting
  }
}

/**
 * Hook for strategic initiative features
 */
export function useStrategicFeatures() {
  const context = useInitiativeFormContext()
  
  return {
    canCreateStrategic: context.canCreateStrategic,
    isStrategic: context.formData.is_strategic || false,
    setStrategic: (value: boolean) => context.updateField('is_strategic', value),
    weightFactor: context.formData.weight_factor || 1.0,
    setWeightFactor: (value: number) => context.updateField('weight_factor', value),
    successCriteria: context.formData.success_criteria || {},
    updateSuccessCriteria: (criteria: any) => context.updateField('success_criteria', criteria)
  }
}

/**
 * Hook for form submission and status
 */
export function useFormSubmission() {
  const context = useInitiativeFormContext()
  
  return {
    canSubmit: context.isValid && !context.isSubmitting,
    isSubmitting: context.isSubmitting,
    isSaving: context.isSaving,
    isDirty: context.isDirty,
    submit: context.submitForm,
    reset: context.reset,
    cancel: context.cancel,
    lastSaved: context.lastSaved,
    errors: context.errors
  }
}