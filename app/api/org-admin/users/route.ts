import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getAdminClient } from '@/utils/supabase/admin'
import { getUserProfile } from '@/lib/server-user-profile'
import { z } from 'zod'

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(100),
  role: z.enum(['CEO', 'Admin', 'Manager']),
  area_id: z.string().uuid().nullable().optional(),
  phone: z.string().optional(),
  send_invitation: z.boolean().optional().default(true)
})

const updateUserSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  role: z.enum(['CEO', 'Admin', 'Manager']).optional(),
  area_id: z.string().uuid().nullable().optional(),
  phone: z.string().nullable().optional(),
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
    const role = searchParams.get('role') || ''
    const area_id = searchParams.get('area_id') || ''
    const is_active = searchParams.get('is_active') || ''

    const offset = (page - 1) * limit

    // Build query for users with area details
    let query = supabase
      .from('user_profiles')
      .select(`
        *,
        area:areas!user_profiles_area_id_fkey(
          id,
          name
        )
      `, { count: 'exact' })
      .eq('tenant_id', userProfile.tenant_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (role) {
      query = query.eq('role', role)
    }

    if (area_id) {
      if (area_id === 'unassigned') {
        query = query.is('area_id', null)
      } else {
        query = query.eq('area_id', area_id)
      }
    }

    if (is_active !== '') {
      query = query.eq('is_active', is_active === 'true')
    }

    // Get paginated results with count
    const { data: users, error: usersError, count: totalCount } = await query
      .range(offset, offset + limit - 1)

    if (usersError) {
      console.error('Users query error:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get statistics
    const { data: stats } = await supabase
      .from('user_profiles')
      .select('role, is_active')
      .eq('tenant_id', userProfile.tenant_id)

    const statistics = {
      total: stats?.length || 0,
      active: stats?.filter(s => s.is_active).length || 0,
      inactive: stats?.filter(s => !s.is_active).length || 0,
      byRole: {
        CEO: stats?.filter(s => s.role === 'CEO').length || 0,
        Admin: stats?.filter(s => s.role === 'Admin').length || 0,
        Manager: stats?.filter(s => s.role === 'Manager').length || 0
      }
    }

    return NextResponse.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      },
      statistics
    })

  } catch (error) {
    console.error('Users API error:', error)
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

    // Only CEO and Admin can create users
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate request body
    const validatedData = createUserSchema.parse(body)

    // Create Supabase clients
    const supabase = await createClient()
    const adminClient = getAdminClient()

    // Check if user with email already exists in tenant
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', validatedData.email)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        error: 'A user with this email already exists in your organization' 
      }, { status: 400 })
    }

    // If area_id is provided, verify it exists and belongs to tenant
    if (validatedData.area_id) {
      const { data: area, error: areaError } = await supabase
        .from('areas')
        .select('id')
        .eq('id', validatedData.area_id)
        .eq('tenant_id', userProfile.tenant_id)
        .single()

      if (areaError || !area) {
        return NextResponse.json({ 
          error: 'Invalid area ID' 
        }, { status: 400 })
      }

      // If role is Manager, check if area already has a manager
      if (validatedData.role === 'Manager') {
        const { data: existingManager } = await supabase
          .from('areas')
          .select('manager_id')
          .eq('id', validatedData.area_id)
          .single()

        if (existingManager?.manager_id) {
          return NextResponse.json({ 
            error: 'This area already has a manager assigned' 
          }, { status: 400 })
        }
      }
    }

    // Check if user exists in auth system
    const { data: authUser } = await adminClient.auth.admin.getUserByEmail(
      validatedData.email
    )

    let userId: string

    if (authUser?.user) {
      // User exists in auth, just create profile
      userId = authUser.user.id
    } else {
      // Create new auth user (they'll set password on first login)
      const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
        email: validatedData.email,
        email_confirm: false,
        user_metadata: {
          full_name: validatedData.full_name
        }
      })

      if (authError || !newAuthUser.user) {
        console.error('Auth user creation error:', authError)
        return NextResponse.json({ 
          error: 'Failed to create user account' 
        }, { status: 500 })
      }

      userId = newAuthUser.user.id
    }

    // Create user profile
    const { data: newProfile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        tenant_id: userProfile.tenant_id,
        email: validatedData.email,
        full_name: validatedData.full_name,
        role: validatedData.role,
        area_id: validatedData.area_id || null,
        phone: validatedData.phone || null,
        is_active: true
      })
      .select(`
        *,
        area:areas!user_profiles_area_id_fkey(
          id,
          name
        )
      `)
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Try to clean up auth user if profile creation failed
      if (!authUser?.user) {
        await adminClient.auth.admin.deleteUser(userId).catch(console.error)
      }
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
    }

    // Update area manager if role is Manager and area_id is provided
    if (validatedData.role === 'Manager' && validatedData.area_id && newProfile) {
      await supabase
        .from('areas')
        .update({ manager_id: newProfile.id })
        .eq('id', validatedData.area_id)
    }

    // Create invitation record if send_invitation is true
    if (validatedData.send_invitation) {
      const invitationToken = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

      await supabase
        .from('invitations')
        .insert({
          tenant_id: userProfile.tenant_id,
          email: validatedData.email,
          role: validatedData.role,
          area_id: validatedData.area_id,
          status: 'sent',
          sent_by: userProfile.id,
          token: invitationToken,
          expires_at: expiresAt.toISOString()
        })

      // Note: Email sending will be implemented in Phase 2
    }

    return NextResponse.json({ 
      message: 'User created successfully',
      user: newProfile,
      invitation_sent: validatedData.send_invitation
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Create user error:', error)
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

    // Only CEO and Admin can update users
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Validate update data
    const validatedData = updateUserSchema.parse(updateData)

    // Create Supabase client
    const supabase = await createClient()

    // Verify user exists and belongs to tenant
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, role, area_id, email')
      .eq('id', id)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent demoting yourself if you're the last admin
    if (existingUser.id === userProfile.id && 
        validatedData.role && 
        validatedData.role !== userProfile.role) {
      const { count } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', userProfile.tenant_id)
        .eq('role', 'Admin')
        .eq('is_active', true)

      if (count === 1) {
        return NextResponse.json({ 
          error: 'Cannot change your own role. You are the last admin.' 
        }, { status: 400 })
      }
    }

    // Handle area assignment changes
    if (validatedData.area_id !== undefined) {
      // If assigning to a new area
      if (validatedData.area_id) {
        const { data: area, error: areaError } = await supabase
          .from('areas')
          .select('id, manager_id')
          .eq('id', validatedData.area_id)
          .eq('tenant_id', userProfile.tenant_id)
          .single()

        if (areaError || !area) {
          return NextResponse.json({ 
            error: 'Invalid area ID' 
          }, { status: 400 })
        }

        // If changing to Manager role, check if area has a manager
        if (validatedData.role === 'Manager' && area.manager_id && area.manager_id !== id) {
          return NextResponse.json({ 
            error: 'This area already has a manager assigned' 
          }, { status: 400 })
        }
      }

      // Remove from previous area's manager if needed
      if (existingUser.area_id && existingUser.role === 'Manager') {
        await supabase
          .from('areas')
          .update({ manager_id: null })
          .eq('manager_id', id)
      }
    }

    // Update user profile
    const { data: updatedUser, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        area:areas!user_profiles_area_id_fkey(
          id,
          name
        )
      `)
      .single()

    if (updateError) {
      console.error('User update error:', updateError)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    // Update area manager if role is Manager
    if (updatedUser && updatedUser.role === 'Manager' && updatedUser.area_id) {
      await supabase
        .from('areas')
        .update({ manager_id: updatedUser.id })
        .eq('id', updatedUser.area_id)
    }

    return NextResponse.json({ 
      message: 'User updated successfully',
      user: updatedUser
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Update user error:', error)
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

    // Only CEO and Admin can deactivate users
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Prevent deactivating yourself
    if (id === userProfile.id) {
      return NextResponse.json({ 
        error: 'You cannot deactivate your own account' 
      }, { status: 400 })
    }

    // Create Supabase client
    const supabase = await createClient()

    // Verify user exists and belongs to tenant
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, full_name, role, area_id')
      .eq('id', id)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove from area if assigned
    if (existingUser.area_id) {
      // Remove as manager if applicable
      if (existingUser.role === 'Manager') {
        await supabase
          .from('areas')
          .update({ manager_id: null })
          .eq('manager_id', id)
      }

      // Remove area assignment
      await supabase
        .from('user_profiles')
        .update({ area_id: null })
        .eq('id', id)
    }

    // Soft delete by setting is_active to false
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('User deactivation error:', updateError)
      return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `User "${existingUser.full_name}" has been deactivated successfully` 
    })

  } catch (error) {
    console.error('Deactivate user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}