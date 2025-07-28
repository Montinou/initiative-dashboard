import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { authenticateUser, hasRole, validateInput } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode })
    }

    const currentUser = authResult.user!

    // Create Supabase client
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Only CEO and Admin roles can view all users
    if (!hasRole(currentUser, ['CEO', 'Admin'])) {
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
      .eq('tenant_id', currentUser.tenant_id)
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
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode })
    }

    const currentUser = authResult.user!

    // Create Supabase client
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Only CEO and Admin roles can create users
    if (!hasRole(currentUser, ['CEO', 'Admin'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { email, full_name, role, area, phone } = body

    // Validate input
    const validation = validateInput(body, ['email', 'full_name', 'role'])
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

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
        id: authUser.user.id,
        tenant_id: currentUser.tenant_id,
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