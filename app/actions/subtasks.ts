'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { subtaskSchema } from '@/lib/validations/initiative'

export async function createSubtaskAction(initiativeId: string, formData: FormData) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // Validate form data
    const validatedFields = subtaskSchema.safeParse({
      title: formData.get('title'),
      description: formData.get('description') || undefined,
      completed: formData.get('completed') === 'true',
    })

    if (!validatedFields.success) {
      return { error: 'Invalid form data', details: validatedFields.error.flatten() }
    }

    // Insert subtask
    const { data, error } = await supabase
      .from('subtasks')
      .insert({
        ...validatedFields.data,
        initiative_id: initiativeId,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to create subtask' }
    }

    revalidatePath('/dashboard')
    return { success: true, data }
  } catch (error) {
    console.error('Server error:', error)
    return { error: 'Internal server error' }
  }
}

export async function updateSubtaskAction(id: string, formData: FormData) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // Validate form data
    const validatedFields = subtaskSchema.safeParse({
      title: formData.get('title'),
      description: formData.get('description') || undefined,
      completed: formData.get('completed') === 'true',
    })

    if (!validatedFields.success) {
      return { error: 'Invalid form data', details: validatedFields.error.flatten() }
    }

    // Update subtask
    const { data, error } = await supabase
      .from('subtasks')
      .update(validatedFields.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to update subtask' }
    }

    revalidatePath('/dashboard')
    return { success: true, data }
  } catch (error) {
    console.error('Server error:', error)
    return { error: 'Internal server error' }
  }
}

export async function toggleSubtaskCompletionAction(id: string, completed: boolean) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // Update subtask completion status
    const { data, error } = await supabase
      .from('subtasks')
      .update({ completed })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to update subtask' }
    }

    revalidatePath('/dashboard')
    return { success: true, data }
  } catch (error) {
    console.error('Server error:', error)
    return { error: 'Internal server error' }
  }
}

export async function deleteSubtaskAction(id: string) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // Delete subtask
    const { error } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to delete subtask' }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Server error:', error)
    return { error: 'Internal server error' }
  }
}