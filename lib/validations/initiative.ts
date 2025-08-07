/**
 * Initiative Validation Schemas
 * 
 * Zod schemas for validating initiative and activity data
 * matching the database schema hierarchy
 * 
 * @date 2025-08-07
 */

import { z } from 'zod'

export const initiativeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().optional(),
  area_id: z.string().uuid().optional().nullable(),
})

export const activitySchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().optional().nullable(),
  is_completed: z.boolean().default(false),
  assigned_to: z.string().uuid().optional().nullable(),
})

export const initiativeWithActivitiesSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().optional(),
  area_id: z.string().uuid().optional().nullable(),
  activities: z.array(activitySchema).optional().default([]),
})

export type InitiativeFormData = z.infer<typeof initiativeSchema>
export type ActivityFormData = z.infer<typeof activitySchema>
export type InitiativeWithActivitiesFormData = z.infer<typeof initiativeWithActivitiesSchema>