'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { activitySchema } from '@/lib/validations/initiative'

export async function createActivityAction(initiativeId: string, formData: FormData) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // Get user profile for tenant_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return { error: 'User profile not found' }
    }

    // Validate form data
    const validatedFields = activitySchema.safeParse({
      title: formData.get('title'),
      description: formData.get('description') || null,
      is_completed: formData.get('is_completed') === 'true',
      assigned_to: formData.get('assigned_to') || null,
    })

    if (!validatedFields.success) {
      return { error: 'Invalid form data', details: validatedFields.error.flatten() }
    }

    // Insert activity
    const { data, error } = await supabase
      .from('activities')
      .insert({
        ...validatedFields.data,
        initiative_id: initiativeId,
        tenant_id: profile.tenant_id
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to create activity' }
    }

    revalidatePath('/dashboard')
    return { success: true, data }
  } catch (error) {
    console.error('Server error:', error)
    return { error: 'Internal server error' }
  }
}

export async function updateActivityAction(id: string, formData: FormData) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // Validate form data
    const validatedFields = activitySchema.safeParse({
      title: formData.get('title'),
      description: formData.get('description') || null,
      is_completed: formData.get('is_completed') === 'true',
      assigned_to: formData.get('assigned_to') || null,
    })

    if (!validatedFields.success) {
      return { error: 'Invalid form data', details: validatedFields.error.flatten() }
    }

    // Update activity
    const { data, error } = await supabase
      .from('activities')
      .update(validatedFields.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to update activity' }
    }

    revalidatePath('/dashboard')
    return { success: true, data }
  } catch (error) {
    console.error('Server error:', error)
    return { error: 'Internal server error' }
  }
}

export async function deleteActivityAction(id: string) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // Delete activity
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to delete activity' }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Server error:', error)
    return { error: 'Internal server error' }
  }
}

export async function toggleActivityCompletionAction(id: string, isCompleted: boolean) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // Toggle activity completion
    const { data, error } = await supabase
      .from('activities')
      .update({ is_completed: isCompleted })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to update activity' }
    }

    revalidatePath('/dashboard')
    return { success: true, data }
  } catch (error) {
    console.error('Server error:', error)
    return { error: 'Internal server error' }
  }
}