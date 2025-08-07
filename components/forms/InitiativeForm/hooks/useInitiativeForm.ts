/**
 * useInitiativeForm Hook
 * 
 * Hook for managing initiative form state with activities support,
 * matching the database schema hierarchy
 * 
 * @date 2025-08-07
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'
import { useUserProfile } from '@/hooks/useUserProfile'
import { getTenantIdFromLocalStorage } from '@/lib/utils'
import {
  getInitiativeSchemaForRole,
  type ManagerInitiativeFormData,
  type AdminInitiativeFormData,
  type InitiativeDraftData,
  type ActivityFormData
} from '../ValidationSchemas'
import type { Initiative, Area } from '@/lib/types/database'

// ===================================================================================
// TYPES AND INTERFACES
// ===================================================================================

type InitiativeFormData = ManagerInitiativeFormData | AdminInitiativeFormData

interface UseInitiativeFormProps {
  initialData?: Partial<Initiative>
  mode: 'create' | 'edit'
  onSuccess?: (initiative: Initiative) => void
  onCancel?: () => void
  autoSaveInterval?: number // in milliseconds
}

interface FormState {
  data: InitiativeFormData
  isDirty: boolean
  isValid: boolean
  errors: Record<string, string[]>
  isSubmitting: boolean
  isSaving: boolean // for auto-save
  lastSaved?: Date
}

// ===================================================================================
// INITIAL STATE FACTORY
// ===================================================================================

function createInitialFormData(
  userProfile: any,
  initialData?: Partial<Initiative>
): InitiativeFormData {
  const role = userProfile?.role || 'Manager'
  const isAdminOrCEO = role === 'Admin' || role === 'CEO'

  const baseData = {
    title: initialData?.title || '',
    description: initialData?.description || '',
    priority: initialData?.priority || 'medium',
    target_date: initialData?.due_date || '',
    budget: initialData?.budget || undefined,
    progress_method: 'manual' as const,
    estimated_hours: undefined,
    kpi_category: 'operational' as const,
    dependencies: [],
    success_criteria: {},
    activities: [] // Initialize with empty activities array
  }

  if (isAdminOrCEO) {
    return {
      ...baseData,
      is_strategic: initialData?.is_strategic || false,
      weight_factor: 1.0,
      area_id: initialData?.area_id || '',
      cross_functional: false,
      participating_areas: [],
      approval_required: false,
      approvers: [],
      visibility: 'area' as const,
      risk_level: 'low' as const,
      tags: [],
      custom_kpis: []
    } as AdminInitiativeFormData
  }

  return {
    ...baseData,
    is_strategic: false,
    weight_factor: 1.0
  } as ManagerInitiativeFormData
}

// ===================================================================================
// MAIN HOOK
// ===================================================================================

export function useInitiativeForm({
  initialData,
  mode,
  onSuccess,
  onCancel,
  autoSaveInterval = 30000 // 30 seconds default
}: UseInitiativeFormProps) {
  const router = useRouter()
  const { userProfile, loading: profileLoading } = useUserProfile()
  const [areas, setAreas] = useState<Area[]>([])
  const [loadingAreas, setLoadingAreas] = useState(false)
  const autoSaveTimerRef = useRef<NodeJS.Timeout>()
  const lastSavedDataRef = useRef<string>('')

  // Form state
  const [formState, setFormState] = useState<FormState>(() => ({
    data: createInitialFormData(userProfile, initialData),
    isDirty: false,
    isValid: false,
    errors: {},
    isSubmitting: false,
    isSaving: false
  }))

  // ===================================================================================
  // EFFECTS
  // ===================================================================================

  // Update form data when user profile loads
  useEffect(() => {
    if (!profileLoading && userProfile) {
      setFormState(prev => ({
        ...prev,
        data: createInitialFormData(userProfile, initialData)
      }))
    }
  }, [userProfile, profileLoading])

  // Load areas for admin/CEO users
  useEffect(() => {
    const loadAreas = async () => {
      if (!userProfile) return
      
      const isAdminOrCEO = userProfile.role === 'Admin' || userProfile.role === 'CEO'
      if (!isAdminOrCEO) return

      setLoadingAreas(true)
      try {
        const response = await fetch('/api/areas', {
          headers: {
            'x-tenant-id': getTenantIdFromLocalStorage() || ''
          }
        })

        if (response.ok) {
          const data = await response.json()
          setAreas(data.areas || [])
        }
      } catch (error) {
        console.error('Failed to load areas:', error)
      } finally {
        setLoadingAreas(false)
      }
    }

    loadAreas()
  }, [userProfile])

  // ===================================================================================
  // VALIDATION
  // ===================================================================================

  const validateForm = useCallback((data: InitiativeFormData): { isValid: boolean; errors: Record<string, string[]> } => {
    if (!userProfile) return { isValid: false, errors: {} }

    const schema = getInitiativeSchemaForRole(userProfile.role)
    const result = schema.safeParse(data)

    if (!result.success) {
      const errors: Record<string, string[]> = {}
      result.error.errors.forEach(err => {
        const path = err.path.join('.')
        if (!errors[path]) errors[path] = []
        errors[path].push(err.message)
      })
      return { isValid: false, errors }
    }

    // No need for weight validation since activities don't have weights
    return { isValid: true, errors: {} }
  }, [userProfile])

  // ===================================================================================
  // FORM ACTIONS
  // ===================================================================================

  const updateField = useCallback((field: string, value: any) => {
    setFormState(prev => {
      const newData = { ...prev.data, [field]: value }
      const validation = validateForm(newData)
      
      return {
        ...prev,
        data: newData,
        isDirty: true,
        isValid: validation.isValid,
        errors: validation.errors
      }
    })
  }, [validateForm])

  const updateActivity = useCallback((index: number, updates: Partial<ActivityFormData>) => {
    setFormState(prev => {
      const newActivities = [...prev.data.activities]
      newActivities[index] = { ...newActivities[index], ...updates }
      
      const newData = { ...prev.data, activities: newActivities }
      const validation = validateForm(newData)
      
      return {
        ...prev,
        data: newData,
        isDirty: true,
        isValid: validation.isValid,
        errors: validation.errors
      }
    })
  }, [validateForm])

  const addActivity = useCallback((activity?: Partial<ActivityFormData>) => {
    const newActivity: ActivityFormData = {
      title: '',
      description: null,
      is_completed: false,
      assigned_to: null,
      ...activity
    }

    setFormState(prev => {
      const newActivities = [...prev.data.activities, newActivity]
      const newData = { ...prev.data, activities: newActivities }
      const validation = validateForm(newData)
      
      return {
        ...prev,
        data: newData,
        isDirty: true,
        isValid: validation.isValid,
        errors: validation.errors
      }
    })
  }, [validateForm])

  const removeActivity = useCallback((index: number) => {
    setFormState(prev => {
      const newActivities = prev.data.activities.filter((_, i) => i !== index)
      const newData = { ...prev.data, activities: newActivities }
      const validation = validateForm(newData)
      
      return {
        ...prev,
        data: newData,
        isDirty: true,
        isValid: validation.isValid,
        errors: validation.errors
      }
    })
  }, [validateForm])

  // ===================================================================================
  // FORM SUBMISSION
  // ===================================================================================

  const submitForm = useCallback(async () => {
    if (!userProfile || formState.isSubmitting) return

    // Final validation
    const validation = validateForm(formState.data)
    if (!validation.isValid) {
      setFormState(prev => ({ ...prev, errors: validation.errors }))
      toast({
        title: 'Validation Error',
        description: 'Please check the form for errors',
        variant: 'destructive'
      })
      return
    }

    setFormState(prev => ({ ...prev, isSubmitting: true }))

    try {
      const endpoint = mode === 'create' ? '/api/initiatives' : `/api/initiatives/${initialData?.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      // Prepare data for API
      const apiData = {
        ...formState.data,
        area_id: userProfile.role === 'Manager' ? userProfile.area_id : formState.data.area_id,
        tenant_id: getTenantIdFromLocalStorage()
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': getTenantIdFromLocalStorage() || ''
        },
        body: JSON.stringify(apiData)
      })

      if (!response.ok) {
        throw new Error('Failed to save initiative')
      }

      const result = await response.json()
      
      toast({
        title: 'Success',
        description: `Initiative ${mode === 'create' ? 'created' : 'updated'} successfully`
      })

      if (onSuccess) {
        onSuccess(result.initiative)
      } else {
        router.push('/dashboard/initiatives')
      }
    } catch (error) {
      console.error('Form submission error:', error)
      toast({
        title: 'Error',
        description: `Failed to ${mode} initiative. Please try again.`,
        variant: 'destructive'
      })
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }))
    }
  }, [formState.data, formState.isSubmitting, userProfile, mode, initialData, validateForm, onSuccess, router])

  // ===================================================================================
  // AUTO-SAVE
  // ===================================================================================

  const autoSave = useCallback(async () => {
    if (!formState.isDirty || formState.isSubmitting || mode !== 'edit') return

    const dataString = JSON.stringify(formState.data)
    if (dataString === lastSavedDataRef.current) return

    setFormState(prev => ({ ...prev, isSaving: true }))

    try {
      const response = await fetch(`/api/initiatives/${initialData?.id}/draft`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': getTenantIdFromLocalStorage() || ''
        },
        body: dataString
      })

      if (response.ok) {
        lastSavedDataRef.current = dataString
        setFormState(prev => ({
          ...prev,
          isSaving: false,
          lastSaved: new Date(),
          isDirty: false
        }))
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      setFormState(prev => ({ ...prev, isSaving: false }))
    }
  }, [formState.data, formState.isDirty, formState.isSubmitting, mode, initialData])

  // Set up auto-save timer
  useEffect(() => {
    if (autoSaveInterval && mode === 'edit') {
      autoSaveTimerRef.current = setInterval(autoSave, autoSaveInterval)
      
      return () => {
        if (autoSaveTimerRef.current) {
          clearInterval(autoSaveTimerRef.current)
        }
      }
    }
  }, [autoSave, autoSaveInterval, mode])

  // ===================================================================================
  // UTILITY FUNCTIONS
  // ===================================================================================

  const reset = useCallback(() => {
    setFormState({
      data: createInitialFormData(userProfile, initialData),
      isDirty: false,
      isValid: false,
      errors: {},
      isSubmitting: false,
      isSaving: false
    })
  }, [userProfile, initialData])

  const cancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    } else {
      router.push('/dashboard/initiatives')
    }
  }, [onCancel, router])

  // ===================================================================================
  // RETURN VALUES
  // ===================================================================================

  return {
    // Form state
    formData: formState.data,
    isDirty: formState.isDirty,
    isValid: formState.isValid,
    errors: formState.errors,
    isSubmitting: formState.isSubmitting,
    isSaving: formState.isSaving,
    lastSaved: formState.lastSaved,

    // User context
    userProfile,
    canCreateStrategic: userProfile?.role === 'Admin' || userProfile?.role === 'CEO',
    canSelectArea: userProfile?.role === 'Admin' || userProfile?.role === 'CEO',

    // Areas data
    areas,
    loadingAreas,

    // Form actions
    updateField,
    updateActivity,
    addActivity,
    removeActivity,
    submitForm,
    reset,
    cancel,

    // Utility methods
    getError: (field: string) => formState.errors[field] || [],
    hasError: (field: string) => Boolean(formState.errors[field]?.length)
  }
}

export default useInitiativeForm