/**
 * Zod Validation Schemas for Role-Based Initiative Form
 * 
 * Provides comprehensive validation for initiative creation and editing
 * with role-based field restrictions matching the database schema
 * 
 * @date 2025-08-07
 */

import { z } from 'zod'
// Import from new validation schemas
import { 
  activitySchema as baseActivitySchema,
  getInitiativeSchemaForRole as getBaseSchemaForRole,
  type UserRole 
} from '@/lib/validation/schemas'

// ===================================================================================
// BASE SCHEMAS FOR REUSE
// ===================================================================================

const progressMethodSchema = z.enum(['manual', 'activity_based', 'hybrid'] as const)

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

// Activity schema for form validation (matching database schema)
const activitySchema = z.object({
  id: z.string().optional(), // Optional for new activities
  title: z.string().min(1, 'Activity title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').nullable().optional(),
  is_completed: z.boolean().default(false),
  assigned_to: z.string().nullable().optional() // User ID of assigned user
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
  
  // Activities for progress tracking
  activities: z.array(activitySchema).default([])
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
  // so we don't include it in the form schema
})

/**
 * Admin/CEO schema - full access to all fields
 */
export const adminInitiativeSchema = baseInitiativeSchema.extend({
  // Strategic initiative option
  is_strategic: z.boolean().default(false),
  
  // Expanded weight factor range
  weight_factor: z.number()
    .min(0.1, 'Weight factor must be at least 0.1')
    .max(5.0, 'Weight factor cannot exceed 5.0')
    .default(1.0),
    
  // Area selection (required for Admin/CEO)
  area_id: z.string().uuid('Please select an area'),
  
  // Cross-functional initiative support
  cross_functional: z.boolean().default(false),
  participating_areas: z.array(z.string().uuid()).default([]),
  
  // Advanced workflow fields
  approval_required: z.boolean().default(false),
  approvers: z.array(z.string().uuid()).default([]),
  
  // Visibility control
  visibility: z.enum(['area', 'organization', 'public']).default('area'),
  
  // Risk assessment
  risk_level: z.enum(['low', 'medium', 'high']).default('low'),
  
  // Tagging and categorization
  tags: z.array(z.string().max(50)).default([]),
  
  // Custom KPIs for strategic initiatives
  custom_kpis: z.array(z.object({
    name: z.string().max(100),
    target_value: z.number(),
    current_value: z.number().default(0),
    unit: z.string().max(20).optional()
  })).default([])
})

/**
 * Draft initiative schema - minimal required fields for saving drafts
 */
export const initiativeDraftSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  priority: prioritySchema.optional(),
  is_draft: z.literal(true),
  draft_data: z.record(z.any()).optional()
})

// ===================================================================================
// COMPUTED SCHEMAS FOR RUNTIME
// ===================================================================================

/**
 * Get the appropriate schema based on user role
 */
export function getInitiativeSchemaForRole(role: string) {
  switch (role) {
    case 'CEO':
    case 'Admin':
      return adminInitiativeSchema
    case 'Manager':
    default:
      return managerInitiativeSchema
  }
}

// ===================================================================================
// TYPE EXPORTS
// ===================================================================================

export type ManagerInitiativeFormData = z.infer<typeof managerInitiativeSchema>
export type AdminInitiativeFormData = z.infer<typeof adminInitiativeSchema>
export type InitiativeDraftData = z.infer<typeof initiativeDraftSchema>
export type ActivityFormData = z.infer<typeof activitySchema>

// ===================================================================================
// VALIDATION UTILITIES
// ===================================================================================

/**
 * Calculate progress based on completed activities
 */
export function calculateActivityProgress(activities: ActivityFormData[]): number {
  if (activities.length === 0) return 0
  
  const completed = activities.filter(a => a.is_completed).length
  return Math.round((completed / activities.length) * 100)
}

/**
 * Validate that required activities have assignees
 */
export function validateActivityAssignments(activities: ActivityFormData[]): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  activities.forEach((activity, index) => {
    if (!activity.is_completed && !activity.assigned_to) {
      errors.push(`Activity ${index + 1} "${activity.title}" needs to be assigned`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Get activity statistics for an initiative
 */
export function getActivityStats(activities: ActivityFormData[]) {
  const total = activities.length
  const completed = activities.filter(a => a.is_completed).length
  const assigned = activities.filter(a => a.assigned_to).length
  const unassigned = total - assigned
  
  return {
    total,
    completed,
    pending: total - completed,
    assigned,
    unassigned,
    progress: total > 0 ? Math.round((completed / total) * 100) : 0
  }
}