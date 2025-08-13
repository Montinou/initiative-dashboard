import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getUserProfile } from '@/lib/server-user-profile'
import { 
  validateUuid,
  searchStringSchema,
  safeStringSchema,
  emailSchema,
  phoneSchema,
  createEnumSchema
} from '@/lib/validation/api-validators'
import { z } from 'zod'
import { logger } from "@/lib/logger"

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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    
    // Validate pagination
    const page = Math.max(1, Math.min(10000, parseInt(searchParams.get('page') || '1')))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const offset = (page - 1) * limit
    
    // Validate and sanitize search
    let search: string | undefined
    const searchParam = searchParams.get('search')
    if (searchParam) {
      try {
        search = searchStringSchema.parse(searchParam)
      } catch (error) {
        return NextResponse.json({ error: 'Invalid search query' }, { status: 400 })
      }
    }
    
    // Validate role
    const roleParam = searchParams.get('role')
    let role: string | undefined
    if (roleParam) {
      const validRoles = ['CEO', 'Admin', 'Manager'] as const
      if (validRoles.includes(roleParam as any)) {
        role = roleParam
      } else {
        return NextResponse.json({ 
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
        }, { status: 400 })
      }
    }
    
    // Validate area ID if provided
    const areaParam = searchParams.get('area')
    let area: string | undefined
    if (areaParam) {
      try {
        const areaId = validateUuid(areaParam)
        if (areaId) area = areaId
      } catch (error: any) {
        // area might be a name, not UUID - allow it for backward compatibility
        area = areaParam
      }
    }
    
    const status = searchParams.get('status') || ''

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

    // Apply filters (search already sanitized)
    if (search) {
      // The search string has already been sanitized by searchStringSchema
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
      logger.error('Count query error:', countError)
      return NextResponse.json({ error: 'Failed to get user count' }, { status: 500 })
    }

    // Get paginated results
    const { data: users, error: usersError } = await query
      .range(offset, offset + limit - 1)

    if (usersError) {
      logger.error('Users query error:', usersError)
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
    logger.error('Users API error:', error)
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
    
    // Create validation schema for user creation
    const userCreateSchema = z.object({
      email: emailSchema,
      full_name: safeStringSchema,
      role: createEnumSchema(['CEO', 'Admin', 'Manager'] as const, 'Invalid role'),
      area: safeStringSchema.optional(),
      phone: phoneSchema
    })
    
    const validationResult = userCreateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }
    
    const { email, full_name, role, area, phone } = validationResult.data

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
      email: email, // Already validated and lowercased
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name // Already validated
      }
    })

    if (authError || !authUser.user) {
      logger.error('Auth user creation error:', authError)
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
        email: email, // Already validated
        full_name: full_name, // Already validated
        role,
        area: area || null,
        phone: phone || null,
        is_active: true
      })
      .select()
      .single()

    if (createError) {
      logger.error('User creation error:', createError)
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'User created successfully',
      user: newUser
    }, { status: 201 })

  } catch (error) {
    logger.error('Create user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
