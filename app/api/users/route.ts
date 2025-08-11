import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getUserProfile } from '@/lib/server-user-profile'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user and get profile - use consistent pattern
    const { user, userProfile } = await getUserProfile()
    
    if (!userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Create Supabase client
    const supabase = await createClient()

    // Only CEO and Admin roles can view all users
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const area = searchParams.get('area') || ''
    const status = searchParams.get('status') || ''

    const offset = (page - 1) * limit

    // Build query for users in the same tenant
    let query = supabase
      .from('user_profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        area,
        avatar_url,
        phone,
        is_active,
        last_login,
        created_at,
        updated_at
      `)
      .eq('tenant_id', userProfile.tenant_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    
    if (role) {
      query = query.eq('role', role)
    }
    
    if (area) {
      query = query.eq('area', area)
    }
    
    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'inactive') {
      query = query.eq('is_active', false)
    }

    // Get total count
    const { count: totalCount, error: countError } = await query

    if (countError) {
      console.error('Count query error:', countError)
      return NextResponse.json({ error: 'Failed to get user count' }, { status: 500 })
    }

    // Get paginated results
    const { data: users, error: usersError } = await query
      .range(offset, offset + limit - 1)

    if (usersError) {
      console.error('Users query error:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Users API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user and get profile - use consistent pattern
    const { user, userProfile } = await getUserProfile()
    
    if (!userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only CEO and Admin roles can create users
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { email, full_name, role, area, phone } = body

    // Validate required fields
    if (!email?.trim() || !full_name?.trim() || !role?.trim()) {
      return NextResponse.json({ error: 'Email, full name, and role are required' }, { status: 400 })
    }

    // Create Supabase client
    const supabase = await createClient()

    // Create user in Supabase Auth first using admin client
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create auth user with a temporary password (user will need to reset)
    const tempPassword = crypto.randomUUID() + '!Aa1'
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim()
      }
    })

    if (authError || !authUser.user) {
      console.error('Auth user creation error:', authError)
      return NextResponse.json({ 
        error: authError?.message || 'Failed to create auth user' 
      }, { status: 500 })
    }

    // Create user profile linked to auth user
    const { data: newUser, error: createError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authUser.user.id, // Link to auth.users via user_id field
        tenant_id: userProfile.tenant_id,
        email: email.trim().toLowerCase(),
        full_name: full_name.trim(),
        role,
        area: area?.trim() || null,
        phone: phone?.trim() || null,
        is_active: true
      })
      .select()
      .single()

    if (createError) {
      console.error('User creation error:', createError)
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'User created successfully',
      user: newUser
    }, { status: 201 })

  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
