/**
 * Zod Validation Schemas for Role-Based Initiative Form
 * 
 * Provides comprehensive validation for initiative creation and editing
 * with role-based field restrictions and KPI standardization support
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

import { z } from 'zod'
import type { ProgressMethod } from '@/types/database'

// ===================================================================================
// BASE SCHEMAS FOR REUSE
// ===================================================================================

const progressMethodSchema = z.enum(['manual', 'subtask_based', 'hybrid'] as const)

const prioritySchema = z.enum(['low', 'medium', 'high', 'critical'])

const statusSchema = z.enum(['planning', 'in_progress', 'completed', 'on_hold'])

const kpiCategorySchema = z.enum([
  'operational', 
  'strategic', 
  'financial', 
  'customer', 
  'learning', 
  'sustainability'
])

// Success criteria schema with flexible structure
const successCriteriaSchema = z.object({
  completion_target: z.number().min(0).max(100).optional(),
  quality_threshold: z.string().optional(),
  budget_adherence: z.boolean().optional(),
  // Allow additional custom criteria
}).catchall(z.any())

// Subtask schema for form validation
const subtaskSchema = z.object({
  id: z.string().optional(), // Optional for new subtasks
  title: z.string().min(1, 'Subtask title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  weight_percentage: z.number()
    .min(0.1, 'Weight must be at least 0.1%')
    .max(100, 'Weight cannot exceed 100%'),
  estimated_hours: z.number().min(0).optional(),
  priority: prioritySchema.default('medium'),
  assigned_to: z.string().uuid().optional(),
  due_date: z.string().optional(),
  dependencies: z.array(z.string().uuid()).default([]),
  notes: z.string().max(500, 'Notes too long').optional()
})

// ===================================================================================
// ROLE-BASED INITIATIVE SCHEMAS
// ===================================================================================

/**
 * Base initiative schema - fields available to all roles
 */
const baseInitiativeSchema = z.object({
  id: z.string().uuid().optional(), // Optional for creation
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  priority: prioritySchema.default('medium'),
  target_date: z.string().optional(),
  budget: z.number().min(0, 'Budget must be positive').optional(),
  
  // KPI standardization fields (basic)
  progress_method: progressMethodSchema.default('manual'),
  estimated_hours: z.number().min(0, 'Estimated hours must be positive').optional(),
  kpi_category: kpiCategorySchema.default('operational'),
  dependencies: z.array(z.string().uuid()).default([]),
  success_criteria: successCriteriaSchema.default({}),
  
  // Subtasks for progress tracking
  subtasks: z.array(subtaskSchema).default([])
})

/**
 * Manager-specific schema - restricted fields and validations
 */
export const managerInitiativeSchema = baseInitiativeSchema.extend({
  // Managers cannot set strategic status
  is_strategic: z.literal(false).default(false),
  
  // Weight factor limited for managers
  weight_factor: z.number()
    .min(0.5, 'Weight factor must be at least 0.5')
    .max(2.0, 'Weight factor cannot exceed 2.0')
    .default(1.0),
    
  // Area ID is automatically set from manager's area
  area_id: z.string().uuid().optional()
}).refine((data) => {
  // Validate subtask weights sum to 100% for subtask-based progress
  if (data.progress_method === 'subtask_based' && data.subtasks.length > 0) {
    const totalWeight = data.subtasks.reduce((sum, subtask) => sum + subtask.weight_percentage, 0)
    return Math.abs(totalWeight - 100) < 0.01 // Allow for small floating point differences
  }
  return true
}, {
  message: 'Subtask weights must sum to exactly 100% for subtask-based progress tracking',
  path: ['subtasks']
})

/**
 * CEO/Admin schema - full access to all fields
 */
export const adminInitiativeSchema = baseInitiativeSchema.extend({
  // Strategic initiatives allowed
  is_strategic: z.boolean().default(false),
  
  // Full weight factor range
  weight_factor: z.number()
    .min(0.1, 'Weight factor must be at least 0.1')
    .max(3.0, 'Weight factor cannot exceed 3.0')
    .default(1.0),
    
  // Can specify area for cross-area initiatives
  area_id: z.string().uuid().optional(),
  
  // Can set initial status for strategic initiatives
  status: statusSchema.default('planning'),
  
  // Advanced success criteria for strategic initiatives
  success_criteria: successCriteriaSchema.extend({
    strategic_alignment: z.string().optional(),
    stakeholder_approval: z.boolean().optional(),
    roi_threshold: z.number().optional()
  }).default({})
}).refine((data) => {
  // Same subtask weight validation as manager
  if (data.progress_method === 'subtask_based' && data.subtasks.length > 0) {
    const totalWeight = data.subtasks.reduce((sum, subtask) => sum + subtask.weight_percentage, 0)
    return Math.abs(totalWeight - 100) < 0.01
  }
  return true
}, {
  message: 'Subtask weights must sum to exactly 100% for subtask-based progress tracking',
  path: ['subtasks']
}).refine((data) => {
  // Strategic initiatives require higher weight factor and specific criteria
  if (data.is_strategic) {
    return data.weight_factor >= 1.5 && data.estimated_hours && data.estimated_hours > 0
  }
  return true
}, {
  message: 'Strategic initiatives require weight factor ≥ 1.5 and estimated hours',
  path: ['weight_factor']
})

// ===================================================================================
// FORM STATE SCHEMAS
// ===================================================================================

/**
 * Form draft schema for auto-save functionality
 */
export const initiativeDraftSchema = z.object({
  id: z.string().optional(),
  title: z.string().default(''),
  description: z.string().default(''),
  priority: prioritySchema.default('medium'),
  target_date: z.string().optional(),
  budget: z.number().optional(),
  progress_method: progressMethodSchema.default('manual'),
  weight_factor: z.number().default(1.0),
  estimated_hours: z.number().optional(),
  is_strategic: z.boolean().default(false),
  kpi_category: kpiCategorySchema.default('operational'),
  area_id: z.string().uuid().optional(),
  dependencies: z.array(z.string().uuid()).default([]),
  success_criteria: successCriteriaSchema.default({}),
  subtasks: z.array(subtaskSchema).default([]),
  last_saved: z.string().optional(),
  is_draft: z.boolean().default(true)
})

// ===================================================================================
// TYPE EXPORTS
// ===================================================================================

export type ManagerInitiativeFormData = z.infer<typeof managerInitiativeSchema>
export type AdminInitiativeFormData = z.infer<typeof adminInitiativeSchema>
export type InitiativeDraftData = z.infer<typeof initiativeDraftSchema>
export type SubtaskFormData = z.infer<typeof subtaskSchema>

// ===================================================================================
// VALIDATION UTILITIES
// ===================================================================================

/**
 * Get the appropriate schema based on user role
 */
export function getInitiativeSchemaForRole(role: string) {
  if (['CEO', 'Admin'].includes(role)) {
    return adminInitiativeSchema
  }
  return managerInitiativeSchema
}

/**
 * Validate subtask weight distribution
 */
export function validateSubtaskWeights(subtasks: SubtaskFormData[]): {
  isValid: boolean
  totalWeight: number
  errors: string[]
} {
  if (subtasks.length === 0) {
    return { isValid: true, totalWeight: 0, errors: [] }
  }

  const totalWeight = subtasks.reduce((sum, subtask) => sum + subtask.weight_percentage, 0)
  const errors: string[] = []

  if (Math.abs(totalWeight - 100) > 0.01) {
    errors.push(`Total weight is ${totalWeight.toFixed(2)}% but must equal 100%`)
  }

  // Check for individual subtask weight issues
  subtasks.forEach((subtask, index) => {
    if (subtask.weight_percentage < 0.1) {
      errors.push(`Subtask ${index + 1}: Weight must be at least 0.1%`)
    }
    if (subtask.weight_percentage > 100) {
      errors.push(`Subtask ${index + 1}: Weight cannot exceed 100%`)
    }
  })

  return {
    isValid: errors.length === 0,
    totalWeight,
    errors
  }
}

/**
 * Auto-distribute weights evenly across subtasks
 */
export function redistributeSubtaskWeights(subtasks: SubtaskFormData[]): SubtaskFormData[] {
  if (subtasks.length === 0) return subtasks

  const evenWeight = Math.round((100 / subtasks.length) * 100) / 100 // Round to 2 decimals
  let remainingWeight = 100

  return subtasks.map((subtask, index) => {
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
}