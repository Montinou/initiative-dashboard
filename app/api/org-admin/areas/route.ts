import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getAdminClient } from '@/utils/supabase/admin'
import { getUserProfile } from '@/lib/server-user-profile'
import { z } from 'zod'

// Validation schemas
const createAreaSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  manager_id: z.string().uuid().optional(),
  is_active: z.boolean().optional().default(true)
})

const updateAreaSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  manager_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional()
})

export async function GET(request: NextRequest) {
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

    // Create Supabase client
    const supabase = await createClient()

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const search = searchParams.get('search') || ''
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const offset = (page - 1) * limit

    // Build query for areas with manager details
    let query = supabase
      .from('areas')
      .select(`
        *,
        manager:user_profiles!areas_manager_id_fkey(
          id,
          full_name,
          email,
          avatar_url,
          role
        )
      `, { count: 'exact' })
      .eq('tenant_id', userProfile.tenant_id)
      .order('created_at', { ascending: false })

    // Filter by active status unless includeInactive is true
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    // Apply search filter
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    // Get paginated results with count
    const { data: areas, error: areasError, count: totalCount } = await query
      .range(offset, offset + limit - 1)

    if (areasError) {
      console.error('Areas query error:', areasError)
      return NextResponse.json({ error: 'Failed to fetch areas' }, { status: 500 })
    }

    // Get initiative statistics for each area
    let areasWithStats = areas || []
    
    if (areas && areas.length > 0) {
      const areaIds = areas.map(area => area.id)
      
      // Get initiative counts grouped by area
      const { data: initiativeStats, error: statsError } = await supabase
        .from('initiatives')
        .select('area_id, status, progress')
        .in('area_id', areaIds)
        .eq('tenant_id', userProfile.tenant_id)

      if (!statsError && initiativeStats) {
        // Group stats by area
        const statsByArea = initiativeStats.reduce((acc, initiative) => {
          if (!acc[initiative.area_id]) {
            acc[initiative.area_id] = {
              total: 0,
              planning: 0,
              in_progress: 0,
              completed: 0,
              on_hold: 0,
              totalProgress: 0
            }
          }
          acc[initiative.area_id].total++
          acc[initiative.area_id][initiative.status] = (acc[initiative.area_id][initiative.status] || 0) + 1
          acc[initiative.area_id].totalProgress += initiative.progress || 0
          return acc
        }, {} as Record<string, any>)

        // Calculate average progress
        Object.keys(statsByArea).forEach(areaId => {
          const stats = statsByArea[areaId]
          stats.averageProgress = stats.total > 0 ? Math.round(stats.totalProgress / stats.total) : 0
          delete stats.totalProgress
        })

        // Add stats to areas
        areasWithStats = areas.map(area => ({
          ...area,
          stats: statsByArea[area.id] || {
            total: 0,
            planning: 0,
            in_progress: 0,
            completed: 0,
            on_hold: 0,
            averageProgress: 0
          }
        }))
      }

      // Get user counts for each area
      const { data: userCounts, error: userCountError } = await supabase
        .from('user_profiles')
        .select('area_id')
        .in('area_id', areaIds)
        .eq('tenant_id', userProfile.tenant_id)

      if (!userCountError && userCounts) {
        const userCountByArea = userCounts.reduce((acc, user) => {
          if (user.area_id) {
            acc[user.area_id] = (acc[user.area_id] || 0) + 1
          }
          return acc
        }, {} as Record<string, number>)

        areasWithStats = areasWithStats.map(area => ({
          ...area,
          userCount: userCountByArea[area.id] || 0
        }))
      }
    }

    return NextResponse.json({
      areas: areasWithStats,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Areas API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user and get profile
    const userProfile = await getUserProfile(request)
    
    if (!userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only CEO and Admin can create areas
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate request body
    const validatedData = createAreaSchema.parse(body)

    // Create Supabase client
    const supabase = await createClient()

    // If manager_id is provided, verify it's a valid user in the same tenant
    if (validatedData.manager_id) {
      const { data: manager, error: managerError } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('id', validatedData.manager_id)
        .eq('tenant_id', userProfile.tenant_id)
        .eq('is_active', true)
        .single()

      if (managerError || !manager) {
        return NextResponse.json({ 
          error: 'Invalid manager ID or manager not found' 
        }, { status: 400 })
      }

      // Verify the user has Manager role
      if (manager.role !== 'Manager') {
        return NextResponse.json({ 
          error: 'Selected user must have Manager role' 
        }, { status: 400 })
      }
    }

    // Check if area name already exists in the tenant
    const { data: existingArea } = await supabase
      .from('areas')
      .select('id')
      .eq('tenant_id', userProfile.tenant_id)
      .ilike('name', validatedData.name)
      .single()

    if (existingArea) {
      return NextResponse.json({ 
        error: 'An area with this name already exists' 
      }, { status: 400 })
    }

    // Create the area
    const { data: newArea, error: createError } = await supabase
      .from('areas')
      .insert({
        tenant_id: userProfile.tenant_id,
        name: validatedData.name,
        description: validatedData.description || null,
        manager_id: validatedData.manager_id || null,
        is_active: validatedData.is_active
      })
      .select(`
        *,
        manager:user_profiles!areas_manager_id_fkey(
          id,
          full_name,
          email,
          avatar_url,
          role
        )
      `)
      .single()

    if (createError) {
      console.error('Area creation error:', createError)
      return NextResponse.json({ error: 'Failed to create area' }, { status: 500 })
    }

    // Update manager's area_id if a manager was assigned
    if (validatedData.manager_id) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ area_id: newArea.id })
        .eq('id', validatedData.manager_id)

      if (updateError) {
        console.error('Manager update error:', updateError)
        // Don't fail the request, but log the error
      }
    }

    return NextResponse.json({ 
      message: 'Area created successfully',
      area: newArea
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Create area error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Area ID is required' }, { status: 400 })
    }

    // Validate update data
    const validatedData = updateAreaSchema.parse(updateData)

    // Create Supabase client
    const supabase = await createClient()

    // Verify the area exists and belongs to the same tenant
    const { data: existingArea, error: fetchError } = await supabase
      .from('areas')
      .select('id, manager_id')
      .eq('id', id)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (fetchError || !existingArea) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 })
    }

    // If changing manager, validate the new manager
    if (validatedData.manager_id !== undefined) {
      if (validatedData.manager_id) {
        const { data: manager, error: managerError } = await supabase
          .from('user_profiles')
          .select('id, role')
          .eq('id', validatedData.manager_id)
          .eq('tenant_id', userProfile.tenant_id)
          .eq('is_active', true)
          .single()

        if (managerError || !manager) {
          return NextResponse.json({ 
            error: 'Invalid manager ID or manager not found' 
          }, { status: 400 })
        }

        if (manager.role !== 'Manager') {
          return NextResponse.json({ 
            error: 'Selected user must have Manager role' 
          }, { status: 400 })
        }
      }

      // Remove area_id from previous manager if changing
      if (existingArea.manager_id && existingArea.manager_id !== validatedData.manager_id) {
        await supabase
          .from('user_profiles')
          .update({ area_id: null })
          .eq('id', existingArea.manager_id)
      }

      // Set area_id for new manager
      if (validatedData.manager_id) {
        await supabase
          .from('user_profiles')
          .update({ area_id: id })
          .eq('id', validatedData.manager_id)
      }
    }

    // Update the area
    const { data: updatedArea, error: updateError } = await supabase
      .from('areas')
      .update(validatedData)
      .eq('id', id)
      .select(`
        *,
        manager:user_profiles!areas_manager_id_fkey(
          id,
          full_name,
          email,
          avatar_url,
          role
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

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Area ID is required' }, { status: 400 })
    }

    // Create Supabase client
    const supabase = await createClient()

    // Verify the area exists and belongs to the same tenant
    const { data: existingArea, error: fetchError } = await supabase
      .from('areas')
      .select('id, manager_id')
      .eq('id', id)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (fetchError || !existingArea) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 })
    }

    // Check if area has any initiatives
    const { count: initiativeCount } = await supabase
      .from('initiatives')
      .select('id', { count: 'exact', head: true })
      .eq('area_id', id)

    if (initiativeCount && initiativeCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete area with existing initiatives. Please reassign or delete initiatives first.' 
      }, { status: 400 })
    }

    // Remove area_id from manager if exists
    if (existingArea.manager_id) {
      await supabase
        .from('user_profiles')
        .update({ area_id: null })
        .eq('id', existingArea.manager_id)
    }

    // Delete the area
    const { error: deleteError } = await supabase
      .from('areas')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Area deletion error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete area' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Area deleted successfully' 
    })

  } catch (error) {
    console.error('Delete area error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}