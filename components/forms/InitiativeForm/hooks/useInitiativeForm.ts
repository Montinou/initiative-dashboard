/**
 * useInitiativeForm Hook
 * 
 * Comprehensive hook for managing initiative form state, validation,
 * auto-save functionality, and API integration with Phase 1 endpoints
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'
import { useUserProfile } from '@/hooks/useUserProfile'
import { getTenantIdFromLocalStorage } from '@/lib/utils'
import {
  getInitiativeSchemaForRole,
  validateSubtaskWeights,
  redistributeSubtaskWeights,
  type ManagerInitiativeFormData,
  type AdminInitiativeFormData,
  type InitiativeDraftData,
  type SubtaskFormData
} from '../ValidationSchemas'
import type { Initiative, Area } from '@/types/database'

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

interface ValidationError {
  field: string
  messages: string[]
}

// ===================================================================================
// MAIN HOOK IMPLEMENTATION
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
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()
  const isInitializedRef = useRef(false)

  // ===================================================================================
  // STATE MANAGEMENT
  // ===================================================================================

  const [formState, setFormState] = useState<FormState>({
    data: {} as InitiativeFormData,
    isDirty: false,
    isValid: false,
    errors: {},
    isSubmitting: false,
    isSaving: false
  })

  const [areas, setAreas] = useState<Area[]>([])
  const [loadingAreas, setLoadingAreas] = useState(true)

  // ===================================================================================
  // INITIALIZATION
  // ===================================================================================

  // Initialize form data based on user role and initial data
  useEffect(() => {
    if (!userProfile || isInitializedRef.current) return

    const defaultData = {
      title: '',
      description: '',
      priority: 'medium' as const,
      progress_method: 'manual' as const,
      weight_factor: 1.0,
      kpi_category: 'operational' as const,
      is_strategic: false,
      dependencies: [],
      success_criteria: {},
      subtasks: [],
      ...initialData
    }

    // Set area_id based on user role
    if (userProfile.role === 'Manager' && userProfile.area) {
      defaultData.area_id = userProfile.area
    }

    setFormState(prev => ({
      ...prev,
      data: defaultData as InitiativeFormData
    }))

    isInitializedRef.current = true
  }, [userProfile, initialData])

  // Load available areas for CEO/Admin
  useEffect(() => {
    const loadAreas = async () => {
      if (!userProfile || userProfile.role === 'Manager') {
        setLoadingAreas(false)
        return
      }

      try {
        const tenantId = getTenantIdFromLocalStorage()
        const headers: Record<string, string> = {}
        
        if (tenantId) {
          headers['x-tenant-id'] = tenantId
        }

        const response = await fetch('/api/areas', {
          headers,
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          setAreas(data.areas || [])
        }
      } catch (error) {
        console.error('Error loading areas:', error)
        toast({
          title: 'Error',
          description: 'Failed to load areas',
          variant: 'destructive'
        })
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
    if (!userProfile) {
      return { isValid: false, errors: { general: ['User profile not loaded'] } }
    }

    const schema = getInitiativeSchemaForRole(userProfile.role)
    const result = schema.safeParse(data)

    if (result.success) {
      // Additional custom validations
      const customErrors: Record<string, string[]> = {}

      // Validate subtask weights if using subtask-based progress
      if (data.progress_method === 'subtask_based' && data.subtasks.length > 0) {
        const weightValidation = validateSubtaskWeights(data.subtasks)
        if (!weightValidation.isValid) {
          customErrors.subtasks = weightValidation.errors
        }
      }

      return {
        isValid: Object.keys(customErrors).length === 0,
        errors: customErrors
      }
    }

    // Transform Zod errors to our error format
    const errors: Record<string, string[]> = {}
    result.error.errors.forEach(error => {
      const field = error.path.join('.')
      if (!errors[field]) {
        errors[field] = []
      }
      errors[field].push(error.message)
    })

    return { isValid: false, errors }
  }, [userProfile])

  // ===================================================================================
  // FORM FIELD UPDATES
  // ===================================================================================

  const updateField = useCallback((field: string, value: any) => {
    setFormState(prev => {
      const newData = { ...prev.data }
      
      // Handle nested field updates
      if (field.includes('.')) {
        const keys = field.split('.')
        let current: any = newData
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {}
          }
          current = current[keys[i]]
        }
        current[keys[keys.length - 1]] = value
      } else {
        (newData as any)[field] = value
      }

      // Validate updated data
      const validation = validateForm(newData)

      return {
        ...prev,
        data: newData,
        isDirty: true,
        isValid: validation.isValid,
        errors: validation.errors
      }
    })

    // Schedule auto-save
    scheduleAutoSave()
  }, [validateForm])

  const updateSubtask = useCallback((index: number, updates: Partial<SubtaskFormData>) => {
    setFormState(prev => {
      const newSubtasks = [...prev.data.subtasks]
      newSubtasks[index] = { ...newSubtasks[index], ...updates }
      
      const newData = { ...prev.data, subtasks: newSubtasks }
      const validation = validateForm(newData)

      return {
        ...prev,
        data: newData,
        isDirty: true,
        isValid: validation.isValid,
        errors: validation.errors
      }
    })

    scheduleAutoSave()
  }, [validateForm])

  const addSubtask = useCallback((subtask?: Partial<SubtaskFormData>) => {
    const newSubtask: SubtaskFormData = {
      title: '',
      weight_percentage: 0,
      priority: 'medium',
      dependencies: [],
      ...subtask
    }

    setFormState(prev => {
      const newSubtasks = [...prev.data.subtasks, newSubtask]
      
      // Auto-redistribute weights if using subtask-based progress
      const redistributed = prev.data.progress_method === 'subtask_based' 
        ? redistributeSubtaskWeights(newSubtasks)
        : newSubtasks

      const newData = { ...prev.data, subtasks: redistributed }
      const validation = validateForm(newData)

      return {
        ...prev,
        data: newData,
        isDirty: true,
        isValid: validation.isValid,
        errors: validation.errors
      }
    })

    scheduleAutoSave()
  }, [validateForm])

  const removeSubtask = useCallback((index: number) => {
    setFormState(prev => {
      const newSubtasks = prev.data.subtasks.filter((_, i) => i !== index)
      
      // Auto-redistribute weights if using subtask-based progress
      const redistributed = prev.data.progress_method === 'subtask_based' && newSubtasks.length > 0
        ? redistributeSubtaskWeights(newSubtasks)
        : newSubtasks

      const newData = { ...prev.data, subtasks: redistributed }
      const validation = validateForm(newData)

      return {
        ...prev,
        data: newData,
        isDirty: true,
        isValid: validation.isValid,
        errors: validation.errors
      }
    })

    scheduleAutoSave()
  }, [validateForm])

  const redistributeWeights = useCallback(() => {
    setFormState(prev => {
      const redistributed = redistributeSubtaskWeights(prev.data.subtasks)
      const newData = { ...prev.data, subtasks: redistributed }
      const validation = validateForm(newData)

      return {
        ...prev,
        data: newData,
        isDirty: true,
        isValid: validation.isValid,
        errors: validation.errors
      }
    })

    toast({
      title: 'Weights Redistributed',
      description: 'Subtask weights have been evenly redistributed'
    })
  }, [validateForm])

  // ===================================================================================
  // AUTO-SAVE FUNCTIONALITY
  // ===================================================================================

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      if (formState.isDirty && !formState.isSubmitting) {
        performAutoSave()
      }
    }, autoSaveInterval)
  }, [formState.isDirty, formState.isSubmitting, autoSaveInterval])

  const performAutoSave = useCallback(async () => {
    if (!formState.isDirty || formState.isSubmitting) return

    setFormState(prev => ({ ...prev, isSaving: true }))

    try {
      // Save as draft to localStorage
      const draftData: InitiativeDraftData = {
        ...formState.data,
        last_saved: new Date().toISOString(),
        is_draft: true
      }

      localStorage.setItem(`initiative_draft_${mode}`, JSON.stringify(draftData))

      setFormState(prev => ({ 
        ...prev, 
        isSaving: false,
        lastSaved: new Date()
      }))
    } catch (error) {
      console.error('Auto-save failed:', error)
      setFormState(prev => ({ ...prev, isSaving: false }))
    }
  }, [formState.data, formState.isDirty, formState.isSubmitting, mode])

  // ===================================================================================
  // FORM SUBMISSION
  // ===================================================================================

  const submitForm = useCallback(async () => {
    if (!formState.isValid || formState.isSubmitting || !userProfile) {
      return
    }

    setFormState(prev => ({ ...prev, isSubmitting: true }))

    try {
      const tenantId = getTenantIdFromLocalStorage()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      if (tenantId) {
        headers['x-tenant-id'] = tenantId
      }

      const endpoint = mode === 'create' ? '/api/initiatives' : '/api/initiatives'
      const method = mode === 'create' ? 'POST' : 'PUT'

      const requestData = mode === 'edit' 
        ? { id: initialData?.id, ...formState.data }
        : formState.data

      const response = await fetch(endpoint, {
        method,
        headers,
        credentials: 'include',
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Clear draft from localStorage
        localStorage.removeItem(`initiative_draft_${mode}`)

        toast({
          title: 'Success',
          description: `Initiative ${mode === 'create' ? 'created' : 'updated'} successfully`
        })

        onSuccess?.(result.initiative)
      } else {
        throw new Error(result.error || 'Failed to save initiative')
      }
    } catch (error) {
      console.error('Form submission error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save initiative',
        variant: 'destructive'
      })
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }))
    }
  }, [formState.isValid, formState.isSubmitting, formState.data, userProfile, mode, initialData?.id, onSuccess])

  // ===================================================================================
  // CLEANUP
  // ===================================================================================

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  // ===================================================================================
  // RETURN INTERFACE
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
    canCreateStrategic: userProfile ? ['CEO', 'Admin'].includes(userProfile.role) : false,
    canSelectArea: userProfile ? ['CEO', 'Admin'].includes(userProfile.role) : false,

    // Areas data
    areas,
    loadingAreas,

    // Form actions
    updateField,
    updateSubtask,
    addSubtask,
    removeSubtask,
    redistributeWeights,
    submitForm,
    
    // Utility functions
    reset: () => {
      setFormState(prev => ({
        ...prev,
        data: initialData as InitiativeFormData || {} as InitiativeFormData,
        isDirty: false,
        errors: {}
      }))
    },
    
    cancel: () => {
      if (formState.isDirty) {
        // Clear draft
        localStorage.removeItem(`initiative_draft_${mode}`)
      }
      onCancel?.()
    }
  }
}