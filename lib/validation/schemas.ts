/**
 * Validation Schemas for New Database Model
 * Aligned with migrations 20240101000001-20240101000007
 * 
 * @date 2025-08-07
 */

import { z } from 'zod'
import type { UserRole } from '@/lib/types/database'

// ===================================================================================
// ENUMS AND BASE SCHEMAS
// ===================================================================================

export const userRoleSchema = z.enum(['CEO', 'Admin', 'Manager'] as const)
export const quarterSchema = z.enum(['Q1', 'Q2', 'Q3', 'Q4'] as const)

// ===================================================================================
// ORGANIZATION & TENANT SCHEMAS
// ===================================================================================

export const organizationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Organization name is required').max(255),
  description: z.string().max(1000).nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
})

export const tenantSchema = z.object({
  id: z.string().uuid().optional(),
  organization_id: z.string().uuid('Organization ID is required'),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(50, 'Subdomain must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
})

// ===================================================================================
// QUARTER SCHEMAS
// ===================================================================================

export const quarterBaseSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid('Tenant ID is required'),
  quarter_name: quarterSchema,
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
})

export const quarterInputSchema = quarterBaseSchema.refine(data => {
  const start = new Date(data.start_date)
  const end = new Date(data.end_date)
  return end > start
}, {
  message: 'End date must be after start date',
  path: ['end_date']
})

// ===================================================================================
// USER & PROFILE SCHEMAS
// ===================================================================================

export const userProfileSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid('Tenant ID is required'),
  email: z.string().email('Invalid email address'),
  full_name: z.string().max(255).nullable().optional(),
  role: userRoleSchema,
  area_id: z.string().uuid().nullable().optional(),
  user_id: z.string().uuid().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
})

// ===================================================================================
// AREA SCHEMAS
// ===================================================================================

export const areaSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid('Tenant ID is required'),
  name: z.string().min(1, 'Area name is required').max(255),
  description: z.string().max(1000).nullable().optional(),
  manager_id: z.string().uuid().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
})

// ===================================================================================
// OBJECTIVE SCHEMAS
// ===================================================================================

export const objectiveSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid('Tenant ID is required'),
  area_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1, 'Objective title is required').max(255),
  description: z.string().max(2000).nullable().optional(),
  created_by: z.string().uuid('Creator ID is required'),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
})

export const objectiveQuarterSchema = z.object({
  id: z.string().uuid().optional(),
  objective_id: z.string().uuid('Objective ID is required'),
  // quarter_id removed - using date-based system
})

// ===================================================================================
// INITIATIVE SCHEMAS (Updated for new model)
// ===================================================================================

export const initiativeBaseSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid('Tenant ID is required'),
  area_id: z.string().uuid('Area ID is required'),
  title: z.string()  // Changed from 'name' to 'title'
    .min(1, 'Initiative title is required')
    .max(255, 'Title must be less than 255 characters'),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .nullable()
    .optional(),
  progress: z.number()
    .min(0, 'Progress cannot be negative')
    .max(100, 'Progress cannot exceed 100')
    .default(0),
  created_by: z.string().uuid('Creator ID is required'),
  due_date: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  completion_date: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
})

export const objectiveInitiativeSchema = z.object({
  id: z.string().uuid().optional(),
  objective_id: z.string().uuid('Objective ID is required'),
  initiative_id: z.string().uuid('Initiative ID is required')
})

// ===================================================================================
// ACTIVITY SCHEMAS (Updated for new model)
// ===================================================================================

export const activitySchema = z.object({
  id: z.string().uuid().optional(),
  initiative_id: z.string().uuid('Initiative ID is required'),
  title: z.string()
    .min(1, 'Activity title is required')
    .max(255, 'Title must be less than 255 characters'),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .nullable()
    .optional(),
  is_completed: z.boolean().default(false),  // Changed from 'completed' to 'is_completed'
  assigned_to: z.string().uuid().nullable().optional(),  // New field for assignment
  created_at: z.string().optional(),
  updated_at: z.string().optional()
})

// ===================================================================================
// PROGRESS HISTORY SCHEMAS
// ===================================================================================

export const progressHistorySchema = z.object({
  id: z.string().uuid().optional(),
  initiative_id: z.string().uuid('Initiative ID is required'),
  completed_activities_count: z.number().min(0).int(),
  total_activities_count: z.number().min(0).int(),
  notes: z.string().max(1000).nullable().optional(),
  updated_by: z.string().uuid('Updater ID is required'),
  created_at: z.string().optional()
})

// ===================================================================================
// FILE UPLOAD SCHEMAS
// ===================================================================================

export const uploadedFileSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid('Tenant ID is required'),
  uploaded_by: z.string().uuid('Uploader ID is required'),
  original_filename: z.string().min(1, 'Filename is required').max(255),
  stored_filename: z.string().min(1, 'Stored filename is required').max(255),
  created_at: z.string().optional()
})

export const fileAreaSchema = z.object({
  id: z.string().uuid().optional(),
  file_id: z.string().uuid('File ID is required'),
  area_id: z.string().uuid('Area ID is required')
})

export const fileInitiativeSchema = z.object({
  id: z.string().uuid().optional(),
  file_id: z.string().uuid('File ID is required'),
  initiative_id: z.string().uuid('Initiative ID is required')
})

// ===================================================================================
// ROLE-BASED FORM SCHEMAS
// ===================================================================================

/**
 * Manager Initiative Form Schema
 * Managers can only create initiatives for their own area
 */
export const managerInitiativeFormSchema = initiativeBaseSchema.omit({
  tenant_id: true,  // Auto-filled from context
  area_id: true,    // Auto-filled from manager's area
  created_by: true  // Auto-filled from user
}).extend({
  objectives: z.array(z.string().uuid()).default([]),  // Link to objectives
  activities: z.array(activitySchema.omit({
    initiative_id: true,
    created_at: true,
    updated_at: true
  })).default([])
})

/**
 * Admin/CEO Initiative Form Schema
 * Can create initiatives for any area
 */
export const adminInitiativeFormSchema = initiativeBaseSchema.omit({
  tenant_id: true,  // Auto-filled from context
  created_by: true  // Auto-filled from user
}).extend({
  objectives: z.array(z.string().uuid()).default([]),  // Link to objectives
  activities: z.array(activitySchema.omit({
    initiative_id: true,
    created_at: true,
    updated_at: true
  })).default([])
})

/**
 * Objective Form Schema
 */
export const objectiveFormSchema = objectiveSchema.omit({
  tenant_id: true,  // Auto-filled from context
  created_by: true  // Auto-filled from user
})

// ===================================================================================
// VALIDATION HELPERS
// ===================================================================================

/**
 * Get the appropriate initiative schema based on user role
 */
export function getInitiativeSchemaForRole(role: UserRole) {
  switch (role) {
    case 'CEO':
    case 'Admin':
      return adminInitiativeFormSchema
    case 'Manager':
    default:
      return managerInitiativeFormSchema
  }
}

/**
 * Validate date range
 */
export function validateDateRange(start: string | null, end: string | null): boolean {
  if (!start || !end) return true
  const startDate = new Date(start)
  const endDate = new Date(end)
  return endDate >= startDate
}

// Quarter validation removed - using date-based system

// ===================================================================================
// TYPE EXPORTS
// ===================================================================================

export type OrganizationInput = z.infer<typeof organizationSchema>
export type TenantInput = z.infer<typeof tenantSchema>
export type QuarterInput = z.infer<typeof quarterInputSchema>
export type UserProfileInput = z.infer<typeof userProfileSchema>
export type AreaInput = z.infer<typeof areaSchema>
export type ObjectiveInput = z.infer<typeof objectiveSchema>
export type InitiativeInput = z.infer<typeof initiativeBaseSchema>
export type ActivityInput = z.infer<typeof activitySchema>
export type ProgressHistoryInput = z.infer<typeof progressHistorySchema>
export type UploadedFileInput = z.infer<typeof uploadedFileSchema>

export type ManagerInitiativeForm = z.infer<typeof managerInitiativeFormSchema>
export type AdminInitiativeForm = z.infer<typeof adminInitiativeFormSchema>
export type ObjectiveForm = z.infer<typeof objectiveFormSchema>

// ===================================================================================
// API SCHEMA EXPORTS
// ===================================================================================

// For API routes that need create/update schemas
export const objectiveCreateSchema = objectiveSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
})

export const objectiveUpdateSchema = objectiveSchema.partial().required({
  id: true
})

export const quarterCreateSchema = quarterBaseSchema.omit({
  id: true
})

export const quarterUpdateSchema = quarterBaseSchema.partial().required({
  id: true
})

export const initiativeCreateSchema = initiativeBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
})

export const initiativeUpdateSchema = initiativeBaseSchema.partial().required({
  id: true
})

export const activityCreateSchema = activitySchema.omit({
  id: true,
  created_at: true,
  updated_at: true
})

export const activityUpdateSchema = activitySchema.partial().required({
  id: true
})

export const areaCreateSchema = areaSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
})

export const areaUpdateSchema = areaSchema.partial().required({
  id: true
})

export const userCreateSchema = userProfileSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
})

export const userUpdateSchema = userProfileSchema.partial().required({
  id: true
})

export const userProfileUpdateSchema = userProfileSchema.partial()

export const fileUploadSchema = uploadedFileSchema.omit({
  id: true,
  created_at: true
})

export const fileAreaLinkSchema = fileAreaSchema.omit({
  id: true
})

export const fileInitiativeLinkSchema = fileInitiativeSchema.omit({
  id: true
})