import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getUserProfile } from '@/lib/server-user-profile'
import { z } from 'zod'

// Validation schema for updates
const updateAreaSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  manager_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user and get profile
    const userProfile = await getUserProfile(request)
    
    if (!userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only CEO and Admin can access org-admin endpoints
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const areaId = params.id

    // Create Supabase client
    const supabase = await createClient()

    // Get area with full details
    const { data: area, error: areaError } = await supabase
      .from('areas')
      .select(`
        *,
        manager:user_profiles!areas_manager_id_fkey(
          id,
          full_name,
          email,
          avatar_url,
          role,
          phone,
          is_active
        )
      `)
      .eq('id', areaId)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (areaError || !area) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 })
    }

    // Get statistics for the area
    const [
      { data: initiatives },
      { data: objectives },
      { data: users }
    ] = await Promise.all([
      // Get initiatives stats
      supabase
        .from('initiatives')
        .select('id, status, progress')
        .eq('area_id', areaId)
        .eq('tenant_id', userProfile.tenant_id),
      
      // Get objectives count
      supabase
        .from('objectives')
        .select('id', { count: 'exact', head: true })
        .eq('area_id', areaId)
        .eq('tenant_id', userProfile.tenant_id),
      
      // Get users in this area
      supabase
        .from('user_profiles')
        .select('id, full_name, email, role, avatar_url')
        .eq('area_id', areaId)
        .eq('tenant_id', userProfile.tenant_id)
        .eq('is_active', true)
    ])

    // Calculate initiative statistics
    const stats = {
      initiatives: {
        total: initiatives?.length || 0,
        planning: initiatives?.filter(i => i.status === 'planning').length || 0,
        in_progress: initiatives?.filter(i => i.status === 'in_progress').length || 0,
        completed: initiatives?.filter(i => i.status === 'completed').length || 0,
        on_hold: initiatives?.filter(i => i.status === 'on_hold').length || 0,
        averageProgress: initiatives?.length 
          ? Math.round(initiatives.reduce((sum, i) => sum + (i.progress || 0), 0) / initiatives.length)
          : 0
      },
      objectives: objectives?.length || 0,
      users: users?.length || 0
    }

    return NextResponse.json({
      area: {
        ...area,
        stats,
        users
      }
    })

  } catch (error) {
    console.error('Get area error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user and get profile
    const userProfile = await getUserProfile(request)
    
    if (!userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only CEO and Admin can update areas
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const areaId = params.id
    const body = await request.json()

    // Validate update data
    const validatedData = updateAreaSchema.parse(body)

    // Create Supabase client
    const supabase = await createClient()

    // Verify the area exists and belongs to the same tenant
    const { data: existingArea, error: fetchError } = await supabase
      .from('areas')
      .select('id, manager_id')
      .eq('id', areaId)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (fetchError || !existingArea) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 })
    }

    // Handle manager change
    if (validatedData.manager_id !== undefined) {
      // Validate new manager if provided
      if (validatedData.manager_id) {
        const { data: newManager, error: managerError } = await supabase
          .from('user_profiles')
          .select('id, role, area_id')
          .eq('id', validatedData.manager_id)
          .eq('tenant_id', userProfile.tenant_id)
          .eq('is_active', true)
          .single()

        if (managerError || !newManager) {
          return NextResponse.json({ 
            error: 'Invalid manager ID or manager not found' 
          }, { status: 400 })
        }

        if (newManager.role !== 'Manager') {
          return NextResponse.json({ 
            error: 'Selected user must have Manager role' 
          }, { status: 400 })
        }

        // Check if manager is already assigned to another area
        if (newManager.area_id && newManager.area_id !== areaId) {
          return NextResponse.json({ 
            error: 'Manager is already assigned to another area' 
          }, { status: 400 })
        }
      }

      // Remove area assignment from previous manager
      if (existingArea.manager_id && existingArea.manager_id !== validatedData.manager_id) {
        await supabase
          .from('user_profiles')
          .update({ area_id: null })
          .eq('id', existingArea.manager_id)
      }

      // Assign area to new manager
      if (validatedData.manager_id) {
        await supabase
          .from('user_profiles')
          .update({ area_id: areaId })
          .eq('id', validatedData.manager_id)
      }
    }

    // Check for duplicate name if name is being changed
    if (validatedData.name) {
      const { data: duplicateArea } = await supabase
        .from('areas')
        .select('id')
        .eq('tenant_id', userProfile.tenant_id)
        .ilike('name', validatedData.name)
        .neq('id', areaId)
        .single()

      if (duplicateArea) {
        return NextResponse.json({ 
          error: 'An area with this name already exists' 
        }, { status: 400 })
      }
    }

    // Update the area
    const { data: updatedArea, error: updateError } = await supabase
      .from('areas')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', areaId)
      .select(`
        *,
        manager:user_profiles!areas_manager_id_fkey(
          id,
          full_name,
          email,
          avatar_url,
          role,
          phone,
          is_active
        )
      `)
      .single()

    if (updateError) {
      console.error('Area update error:', updateError)
      return NextResponse.json({ error: 'Failed to update area' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Area updated successfully',
      area: updatedArea
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Update area error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user and get profile
    const userProfile = await getUserProfile(request)
    
    if (!userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only CEO and Admin can delete areas
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const areaId = params.id

    // Create Supabase client
    const supabase = await createClient()

    // Verify the area exists and belongs to the same tenant
    const { data: existingArea, error: fetchError } = await supabase
      .from('areas')
      .select('id, manager_id, name')
      .eq('id', areaId)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (fetchError || !existingArea) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 })
    }

    // Check for dependencies
    const [
      { count: initiativeCount },
      { count: objectiveCount },
      { count: userCount }
    ] = await Promise.all([
      supabase
        .from('initiatives')
        .select('id', { count: 'exact', head: true })
        .eq('area_id', areaId),
      
      supabase
        .from('objectives')
        .select('id', { count: 'exact', head: true })
        .eq('area_id', areaId),
      
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('area_id', areaId)
        .neq('id', existingArea.manager_id || '') // Exclude the manager
    ])

    if (initiativeCount && initiativeCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete area. It has ${initiativeCount} initiative(s). Please reassign or delete them first.` 
      }, { status: 400 })
    }

    if (objectiveCount && objectiveCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete area. It has ${objectiveCount} objective(s). Please reassign or delete them first.` 
      }, { status: 400 })
    }

    if (userCount && userCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete area. It has ${userCount} user(s) assigned. Please reassign them first.` 
      }, { status: 400 })
    }

    // Remove area assignment from manager
    if (existingArea.manager_id) {
      await supabase
        .from('user_profiles')
        .update({ area_id: null })
        .eq('id', existingArea.manager_id)
    }

    // Soft delete by setting is_active to false
    const { error: deleteError } = await supabase
      .from('areas')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', areaId)

    if (deleteError) {
      console.error('Area deletion error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete area' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `Area "${existingArea.name}" has been deactivated successfully` 
    })

  } catch (error) {
    console.error('Delete area error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}