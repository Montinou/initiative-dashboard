'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const areaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().optional(),
})

export async function createAreaAction(formData: FormData) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // Validate form data
    const validatedFields = areaSchema.safeParse({
      name: formData.get('name'),
      description: formData.get('description') || undefined,
    })

    if (!validatedFields.success) {
      return { error: 'Invalid form data', details: validatedFields.error.flatten() }
    }

    // Insert area
    const { data, error } = await supabase
      .from('areas')
      .insert(validatedFields.data)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to create company area' }
    }

    revalidatePath('/dashboard')
    return { success: true, data }
  } catch (error) {
    console.error('Server error:', error)
    return { error: 'Internal server error' }
  }
}

export async function updateAreaAction(id: string, formData: FormData) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // Validate form data
    const validatedFields = areaSchema.safeParse({
      name: formData.get('name'),
      description: formData.get('description') || undefined,
    })

    if (!validatedFields.success) {
      return { error: 'Invalid form data', details: validatedFields.error.flatten() }
    }

    // Update area
    const { data, error } = await supabase
      .from('areas')
      .update(validatedFields.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to update company area' }
    }

    revalidatePath('/dashboard')
    return { success: true, data }
  } catch (error) {
    console.error('Server error:', error)
    return { error: 'Internal server error' }
  }
}

export async function deleteAreaAction(id: string) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // Check if area has initiatives
    const { data: initiatives, error: checkError } = await supabase
      .from('initiatives')
      .select('id')
      .eq('area_id', id)
      .limit(1)

    if (checkError) {
      console.error('Database error:', checkError)
      return { error: 'Failed to check area usage' }
    }

    if (initiatives && initiatives.length > 0) {
      return { error: 'Cannot delete area that has initiatives assigned to it' }
    }

    // Delete area
    const { error } = await supabase
      .from('areas')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to delete company area' }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Server error:', error)
    return { error: 'Internal server error' }
  }
}