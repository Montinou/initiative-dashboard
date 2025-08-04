/**
 * useSubtaskWeights Hook
 * 
 * Specialized hook for managing subtask weight distribution,
 * validation, and automatic redistribution logic
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

import { useState, useCallback, useEffect } from 'react'
import { toast } from '@/hooks/use-toast'
import type { SubtaskFormData } from '../../InitiativeForm/ValidationSchemas'

// ===================================================================================
// TYPES AND INTERFACES
// ===================================================================================

interface WeightValidationResult {
  isValid: boolean
  totalWeight: number
  errors: string[]
  warnings: string[]
}

interface UseSubtaskWeightsProps {
  subtasks: SubtaskFormData[]
  onSubtasksChange: (subtasks: SubtaskFormData[]) => void
  progressMethod: 'manual' | 'subtask_based' | 'hybrid'
  autoValidate?: boolean
}

interface WeightDistributionStats {
  totalTasks: number
  completedTasks: number
  averageWeight: number
  minWeight: number
  maxWeight: number
  standardDeviation: number
}

// ===================================================================================
// MAIN HOOK IMPLEMENTATION
// ===================================================================================

export function useSubtaskWeights({
  subtasks,
  onSubtasksChange,
  progressMethod,
  autoValidate = true
}: UseSubtaskWeightsProps) {
  
  const [validationResult, setValidationResult] = useState<WeightValidationResult>({
    isValid: true,
    totalWeight: 0,
    errors: [],
    warnings: []
  })

  const [distributionStats, setDistributionStats] = useState<WeightDistributionStats>({
    totalTasks: 0,
    completedTasks: 0,
    averageWeight: 0,
    minWeight: 0,
    maxWeight: 0,
    standardDeviation: 0
  })

  const requiresWeightValidation = progressMethod === 'subtask_based'

  // ===================================================================================
  // VALIDATION LOGIC
  // ===================================================================================

  const validateWeights = useCallback((tasks: SubtaskFormData[]): WeightValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []
    
    if (tasks.length === 0) {
      return { isValid: true, totalWeight: 0, errors, warnings }
    }

    const totalWeight = tasks.reduce((sum, task) => sum + (task.weight_percentage || 0), 0)
    
    // Critical validations for subtask-based progress
    if (requiresWeightValidation) {
      if (Math.abs(totalWeight - 100) > 0.01) {
        errors.push(`Total weight is ${totalWeight.toFixed(2)}% but must equal exactly 100%`)
      }

      tasks.forEach((task, index) => {
        if (!task.weight_percentage || task.weight_percentage < 0.1) {
          errors.push(`Subtask ${index + 1}: Weight must be at least 0.1%`)
        }
        if (task.weight_percentage > 100) {
          errors.push(`Subtask ${index + 1}: Weight cannot exceed 100%`)
        }
      })
    }

    // Warnings for optimization
    if (tasks.length > 1) {
      const weights = tasks.map(t => t.weight_percentage || 0)
      const average = totalWeight / tasks.length
      const hasUnbalanced = weights.some(w => Math.abs(w - average) > 15)
      
      if (hasUnbalanced && requiresWeightValidation) {
        warnings.push('Consider redistributing weights for better balance')
      }
    }

    const isValid = errors.length === 0

    return { isValid, totalWeight, errors, warnings }
  }, [requiresWeightValidation])

  // ===================================================================================
  // STATISTICS CALCULATION
  // ===================================================================================

  const calculateStats = useCallback((tasks: SubtaskFormData[]): WeightDistributionStats => {
    if (tasks.length === 0) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        averageWeight: 0,
        minWeight: 0,
        maxWeight: 0,
        standardDeviation: 0
      }
    }

    const weights = tasks.map(t => t.weight_percentage || 0)
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    const averageWeight = totalWeight / tasks.length
    const minWeight = Math.min(...weights)
    const maxWeight = Math.max(...weights)
    
    // Calculate standard deviation
    const variance = weights.reduce((sum, w) => sum + Math.pow(w - averageWeight, 2), 0) / tasks.length
    const standardDeviation = Math.sqrt(variance)

    const completedTasks = tasks.filter(t => t.title && t.title.trim().length > 0).length

    return {
      totalTasks: tasks.length,
      completedTasks,
      averageWeight,
      minWeight,
      maxWeight,
      standardDeviation
    }
  }, [])

  // ===================================================================================
  // WEIGHT REDISTRIBUTION METHODS
  // ===================================================================================

  const redistributeEvenly = useCallback(() => {
    if (subtasks.length === 0) return

    const evenWeight = Math.round((100 / subtasks.length) * 100) / 100 // Round to 2 decimals
    let remainingWeight = 100

    const redistributed = subtasks.map((subtask, index) => {
      let weight = evenWeight
      
      // Handle rounding issues on the last subtask
      if (index === subtasks.length - 1) {
        weight = remainingWeight
      } else {
        remainingWeight -= weight
      }

      return {
        ...subtask,
        weight_percentage: weight
      }
    })

    onSubtasksChange(redistributed)
    
    toast({
      title: 'Weights Redistributed',
      description: `Evenly distributed across ${subtasks.length} subtasks`
    })
  }, [subtasks, onSubtasksChange])

  const redistributeByPriority = useCallback(() => {
    if (subtasks.length === 0) return

    const priorityWeights = {
      critical: 40,
      high: 30,
      medium: 20,
      low: 10
    }

    // Calculate total priority points
    const totalPoints = subtasks.reduce((sum, subtask) => {
      return sum + (priorityWeights[subtask.priority as keyof typeof priorityWeights] || 20)
    }, 0)

    // Distribute weights based on priority
    const redistributed = subtasks.map(subtask => {
      const priorityPoints = priorityWeights[subtask.priority as keyof typeof priorityWeights] || 20
      const weight = Math.round((priorityPoints / totalPoints) * 100 * 100) / 100
      
      return {
        ...subtask,
        weight_percentage: weight
      }
    })

    // Adjust for rounding errors
    const totalWeight = redistributed.reduce((sum, t) => sum + t.weight_percentage, 0)
    if (Math.abs(totalWeight - 100) > 0.01) {
      const adjustment = (100 - totalWeight) / redistributed.length
      redistributed.forEach(t => t.weight_percentage += adjustment)
    }

    onSubtasksChange(redistributed)
    
    toast({
      title: 'Weights Redistributed by Priority',
      description: `Higher priority tasks assigned greater weights`
    })
  }, [subtasks, onSubtasksChange])

  const redistributeByEstimatedHours = useCallback(() => {
    if (subtasks.length === 0) return

    const tasksWithHours = subtasks.filter(t => t.estimated_hours && t.estimated_hours > 0)
    
    if (tasksWithHours.length === 0) {
      toast({
        title: 'Cannot Redistribute by Hours',
        description: 'No subtasks have estimated hours defined',
        variant: 'destructive'
      })
      return
    }

    const totalHours = tasksWithHours.reduce((sum, t) => sum + (t.estimated_hours || 0), 0)

    const redistributed = subtasks.map(subtask => {
      if (!subtask.estimated_hours || subtask.estimated_hours <= 0) {
        // Give minimal weight to tasks without hours
        return { ...subtask, weight_percentage: 1 }
      }

      const weight = Math.round((subtask.estimated_hours / totalHours) * 99 * 100) / 100
      return { ...subtask, weight_percentage: weight }
    })

    // Normalize to 100%
    const totalWeight = redistributed.reduce((sum, t) => sum + t.weight_percentage, 0)
    const factor = 100 / totalWeight
    redistributed.forEach(t => t.weight_percentage = Math.round(t.weight_percentage * factor * 100) / 100)

    onSubtasksChange(redistributed)
    
    toast({
      title: 'Weights Redistributed by Hours',
      description: `Distributed based on estimated effort`
    })
  }, [subtasks, onSubtasksChange])

  // ===================================================================================
  // AUTO-VALIDATION EFFECT
  // ===================================================================================

  useEffect(() => {
    if (autoValidate) {
      const validation = validateWeights(subtasks)
      const stats = calculateStats(subtasks)
      
      setValidationResult(validation)
      setDistributionStats(stats)
    }
  }, [subtasks, validateWeights, calculateStats, autoValidate])

  // ===================================================================================
  // INDIVIDUAL WEIGHT UPDATES
  // ===================================================================================

  const updateWeight = useCallback((index: number, newWeight: number) => {
    if (index < 0 || index >= subtasks.length) return

    const clampedWeight = Math.max(0.1, Math.min(100, newWeight))
    
    const updated = [...subtasks]
    updated[index] = { ...updated[index], weight_percentage: clampedWeight }
    
    onSubtasksChange(updated)
  }, [subtasks, onSubtasksChange])

  const normalizeWeights = useCallback(() => {
    if (subtasks.length === 0) return

    const totalWeight = subtasks.reduce((sum, t) => sum + (t.weight_percentage || 0), 0)
    
    if (totalWeight === 0) {
      redistributeEvenly()
      return
    }

    const factor = 100 / totalWeight
    const normalized = subtasks.map(subtask => ({
      ...subtask,
      weight_percentage: Math.round((subtask.weight_percentage || 0) * factor * 100) / 100
    }))

    onSubtasksChange(normalized)
    
    toast({
      title: 'Weights Normalized',
      description: 'Proportionally adjusted to sum to 100%'
    })
  }, [subtasks, onSubtasksChange, redistributeEvenly])

  // ===================================================================================
  // RETURN INTERFACE
  // ===================================================================================

  return {
    // Validation state
    validation: validationResult,
    stats: distributionStats,
    isValid: validationResult.isValid,
    hasErrors: validationResult.errors.length > 0,
    hasWarnings: validationResult.warnings.length > 0,
    requiresWeights: requiresWeightValidation,

    // Weight manipulation methods
    redistributeEvenly,
    redistributeByPriority,
    redistributeByEstimatedHours,
    normalizeWeights,
    updateWeight,

    // Utility methods
    validateWeights: (tasks: SubtaskFormData[]) => validateWeights(tasks),
    getTotalWeight: () => subtasks.reduce((sum, t) => sum + (t.weight_percentage || 0), 0),
    
    // Helper methods
    canRedistribute: subtasks.length > 1,
    suggestOptimalDistribution: () => {
      const hasHours = subtasks.some(t => t.estimated_hours && t.estimated_hours > 0)
      const hasPriorities = subtasks.some(t => t.priority !== 'medium')
      
      if (hasHours) return 'hours'
      if (hasPriorities) return 'priority'
      return 'even'
    }
  }
}