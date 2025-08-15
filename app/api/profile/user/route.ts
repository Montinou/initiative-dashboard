import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    let supabase: any;
    
    // Check for Bearer token in Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract token from Bearer header
      const token = authHeader.substring(7);
      
      // Create Supabase client with direct token
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );
      
      // When using Bearer token, pass it directly to getUser()
      var { data: { user }, error: authError } = await supabase.auth.getUser(token);
    } else {
      // Fall back to cookie-based auth
      supabase = await createClient();
      
      // For cookie-based auth, call getUser() without parameters
      var { data: { user }, error: authError } = await supabase.auth.getUser();
    }
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get the user profile with proper schema including all fields
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        email,
        full_name,
        phone,
        avatar_url,
        role,
        tenant_id,
        area_id,
        is_active,
        is_system_admin,
        last_login,
        created_at,
        updated_at,
        tenants!user_profiles_tenant_id_fkey (
          id,
          organization_id,
          subdomain,
          organizations (
            id,
            name,
            description
          )
        ),
        areas:areas!user_profiles_area_id_fkey (
          id,
          name,
          description
        )
      `)
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Transform the response to match expected format with all fields
    const transformed = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
      role: profile.role,
      tenant_id: profile.tenant_id,
      area_id: profile.area_id,
      is_active: profile.is_active,
      is_system_admin: profile.is_system_admin,
      last_login: profile.last_login,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      tenant: profile.tenants ? {
        id: profile.tenants.id,
        name: profile.tenants.organizations?.name || 'Default',
        slug: profile.tenants.subdomain,
        settings: {}
      } : null,
      area: profile.areas
    }

    // Return wrapped as { profile } so clients can read data.profile
    return NextResponse.json({ profile: transformed })
  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { full_name, phone, avatar_url } = body

    // Update the user profile with only the allowed fields
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        full_name: full_name || null,
        phone: phone || null,
        avatar_url: avatar_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select(`
        id,
        email,
        full_name,
        phone,
        avatar_url,
        role,
        tenant_id,
        area_id,
        is_active,
        is_system_admin,
        last_login,
        created_at,
        updated_at,
        areas:areas!user_profiles_area_id_fkey (
          id,
          name,
          description
        )
      `)
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 400 }
      )
    }

    // Return the updated profile
    return NextResponse.json({ 
      profile: updatedProfile,
      message: 'Perfil actualizado correctamente' 
    })
  } catch (error) {
    console.error('Profile update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}