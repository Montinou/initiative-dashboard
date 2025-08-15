import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getUserProfile } from '@/lib/server-user-profile'
import { z } from 'zod'

// Validation schemas
const assignUsersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1)
})

const removeUsersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1)
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user and get profile
    const { user, userProfile } = await getUserProfile(request)
    
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

    // Verify area exists and belongs to tenant
    const { data: area, error: areaError } = await supabase
      .from('areas')
      .select('id, name')
      .eq('id', areaId)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (areaError || !area) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 })
    }

    // Get all users assigned to this area
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        email,
        role,
        avatar_url,
        phone,
        is_active,
        last_login,
        created_at
      `)
      .eq('area_id', areaId)
      .eq('tenant_id', userProfile.tenant_id)
      .order('full_name')

    if (usersError) {
      console.error('Users query error:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get available users (not assigned to any area)
    const { data: availableUsers, error: availableError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        email,
        role,
        avatar_url
      `)
      .is('area_id', null)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)
      .order('full_name')

    if (availableError) {
      console.error('Available users query error:', availableError)
    }

    return NextResponse.json({
      area: {
        id: area.id,
        name: area.name
      },
      assignedUsers: users || [],
      availableUsers: availableUsers || [],
      stats: {
        total: users?.length || 0,
        byRole: {
          CEO: users?.filter(u => u.role === 'CEO').length || 0,
          Admin: users?.filter(u => u.role === 'Admin').length || 0,
          Manager: users?.filter(u => u.role === 'Manager').length || 0
        }
      }
    })

  } catch (error) {
    console.error('Get area users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user and get profile
    const { user, userProfile } = await getUserProfile(request)
    
    if (!userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only CEO and Admin can assign users
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const areaId = params.id
    const body = await request.json()

    // Validate request body
    const validatedData = assignUsersSchema.parse(body)

    // Create Supabase client
    const supabase = await createClient()

    // Verify area exists and belongs to tenant
    const { data: area, error: areaError } = await supabase
      .from('areas')
      .select('id, name, manager_id')
      .eq('id', areaId)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (areaError || !area) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 })
    }

    // Verify all users exist and belong to the same tenant
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, full_name, area_id, role')
      .in('id', validatedData.userIds)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)

    if (usersError || !users || users.length !== validatedData.userIds.length) {
      return NextResponse.json({ 
        error: 'One or more users not found or inactive' 
      }, { status: 400 })
    }

    // Check if any users are already assigned to other areas
    const alreadyAssigned = users.filter(u => u.area_id && u.area_id !== areaId)
    if (alreadyAssigned.length > 0) {
      return NextResponse.json({ 
        error: `Some users are already assigned to other areas`,
        details: alreadyAssigned.map(u => ({
          id: u.id,
          name: u.full_name,
          currentAreaId: u.area_id
        }))
      }, { status: 400 })
    }

    // Check if trying to assign a Manager role user who is already managing another area
    const managersToAssign = users.filter(u => u.role === 'Manager')
    if (managersToAssign.length > 0) {
      const { data: managedAreas } = await supabase
        .from('areas')
        .select('id, name, manager_id')
        .in('manager_id', managersToAssign.map(m => m.id))
        .neq('id', areaId)

      if (managedAreas && managedAreas.length > 0) {
        return NextResponse.json({ 
          error: 'Some managers are already managing other areas',
          details: managedAreas.map(a => ({
            areaName: a.name,
            managerId: a.manager_id
          }))
        }, { status: 400 })
      }
    }

    // Assign users to the area
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ area_id: areaId })
      .in('id', validatedData.userIds)

    if (updateError) {
      console.error('User assignment error:', updateError)
      return NextResponse.json({ error: 'Failed to assign users' }, { status: 500 })
    }

    // Get updated user list
    const { data: updatedUsers } = await supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        email,
        role,
        avatar_url
      `)
      .in('id', validatedData.userIds)

    return NextResponse.json({ 
      message: `Successfully assigned ${validatedData.userIds.length} user(s) to ${area.name}`,
      assignedUsers: updatedUsers || []
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Assign users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user and get profile
    const { user, userProfile } = await getUserProfile(request)
    
    if (!userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only CEO and Admin can remove users
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const areaId = params.id
    const body = await request.json()

    // Validate request body
    const validatedData = removeUsersSchema.parse(body)

    // Create Supabase client
    const supabase = await createClient()

    // Verify area exists and belongs to tenant
    const { data: area, error: areaError } = await supabase
      .from('areas')
      .select('id, name, manager_id')
      .eq('id', areaId)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (areaError || !area) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 })
    }

    // Check if trying to remove the area manager
    if (area.manager_id && validatedData.userIds.includes(area.manager_id)) {
      return NextResponse.json({ 
        error: 'Cannot remove the area manager. Please assign a new manager first.' 
      }, { status: 400 })
    }

    // Verify all users exist and are assigned to this area
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', validatedData.userIds)
      .eq('area_id', areaId)
      .eq('tenant_id', userProfile.tenant_id)

    if (usersError || !users || users.length !== validatedData.userIds.length) {
      return NextResponse.json({ 
        error: 'One or more users not found in this area' 
      }, { status: 400 })
    }

    // Remove users from the area
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ area_id: null })
      .in('id', validatedData.userIds)
      .eq('area_id', areaId) // Extra safety check

    if (updateError) {
      console.error('User removal error:', updateError)
      return NextResponse.json({ error: 'Failed to remove users' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `Successfully removed ${validatedData.userIds.length} user(s) from ${area.name}`,
      removedUsers: users
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Remove users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}