import { z } from 'zod'

export const initiativeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().optional(),
  area_id: z.string().uuid().optional().nullable(),
})

export const subtaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().optional(),
  completed: z.boolean().default(false),
})

export const initiativeWithSubtasksSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().optional(),
  area_id: z.string().uuid().optional().nullable(),
  subtasks: z.array(subtaskSchema).optional().default([]),
})

export type InitiativeFormData = z.infer<typeof initiativeSchema>
export type SubtaskFormData = z.infer<typeof subtaskSchema>
export type InitiativeWithSubtasksFormData = z.infer<typeof initiativeWithSubtasksSchema>