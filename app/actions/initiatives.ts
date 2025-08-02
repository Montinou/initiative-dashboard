'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { initiativeSchema } from '@/lib/validations/initiative'
// Initiative type imported but not used in server actions - removed

export async function createInitiativeAction(formData: FormData) {
  try {
    const supabase = createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // Validate form data
    const validatedFields = initiativeSchema.safeParse({
      title: formData.get('title'),
      description: formData.get('description') || undefined,
      area_id: formData.get('area_id') || null,
    })

    if (!validatedFields.success) {
      return { error: 'Invalid form data', details: validatedFields.error.flatten() }
    }

    // Insert initiative
    const { data, error } = await supabase
      .from('initiatives')
      .insert(validatedFields.data)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to create initiative' }
    }

    revalidatePath('/dashboard')
    return { success: true, data }
  } catch (error) {
    console.error('Server error:', error)
    return { error: 'Internal server error' }
  }
}

export async function updateInitiativeAction(id: string, formData: FormData) {
  try {
    const supabase = createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // Validate form data
    const validatedFields = initiativeSchema.safeParse({
      title: formData.get('title'),
      description: formData.get('description') || undefined,
      area_id: formData.get('area_id') || null,
    })

    if (!validatedFields.success) {
      return { error: 'Invalid form data', details: validatedFields.error.flatten() }
    }

    // Update initiative
    const { data, error } = await supabase
      .from('initiatives')
      .update(validatedFields.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to update initiative' }
    }

    revalidatePath('/dashboard')
    return { success: true, data }
  } catch (error) {
    console.error('Server error:', error)
    return { error: 'Internal server error' }
  }
}

export async function deleteInitiativeAction(id: string) {
  try {
    const supabase = createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // Delete initiative (cascades to subtasks)
    const { error } = await supabase
      .from('initiatives')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to delete initiative' }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Server error:', error)
    return { error: 'Internal server error' }
  }
}