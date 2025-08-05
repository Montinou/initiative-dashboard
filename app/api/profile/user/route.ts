import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client (same pattern as other dashboard endpoints)
    const supabase = await createServerClient();

    // Get current user from session (cookie-based)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user profile to get tenant_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const tenantId = profile.tenant_id;

    // Create supabaseAdmin client for fetching complete profile with area info
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Fetch complete user profile with area information
    const { data: profileData, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        id,
        tenant_id,
        email,
        full_name,
        avatar_url,
        phone,
        role,
        is_active,
        is_system_admin,
        last_login,
        created_at,
        updated_at,
        area_id,
        areas!user_profiles_area_id_fkey (
          id,
          name,
          description
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !profileData) {
      console.error('Profile fetch error:', fetchError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Format the response to match the expected structure
    const userProfile = {
      id: profileData.id,
      tenant_id: profileData.tenant_id,
      email: profileData.email,
      full_name: profileData.full_name,
      avatar_url: profileData.avatar_url,
      phone: profileData.phone,
      role: profileData.role,
      is_active: profileData.is_active,
      is_system_admin: profileData.is_system_admin,
      last_login: profileData.last_login,
      created_at: profileData.created_at,
      updated_at: profileData.updated_at,
      area_id: profileData.area_id,
      area: profileData.areas && Array.isArray(profileData.areas) && profileData.areas.length > 0 ? {
        id: profileData.areas[0].id,
        name: profileData.areas[0].name,
        description: profileData.areas[0].description
      } : null
    };

    return NextResponse.json({ profile: userProfile })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Create Supabase client (same pattern as other dashboard endpoints)
    const supabase = await createServerClient();

    // Get current user from session (cookie-based)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const body = await request.json()
    const { full_name, phone, avatar_url } = body

    console.log('Profile update request:', {
      userId: user.id,
      updateData: { full_name, phone, avatar_url }
    });

    // Validate input
    if (!full_name?.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }

    // Update user profile using supabaseAdmin for proper permissions
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        full_name: full_name.trim(),
        phone: phone?.trim() || null,
        avatar_url: avatar_url?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select(`
        id,
        tenant_id,
        email,
        full_name,
        avatar_url,
        phone,
        role,
        is_active,
        is_system_admin,
        last_login,
        created_at,
        updated_at,
        area_id,
        areas!user_profiles_area_id_fkey (
          id,
          name,
          description
        )
      `)
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update profile', 
        details: updateError.message,
        code: updateError.code 
      }, { status: 500 })
    }

    // Format the response to match the expected structure
    const updatedUserProfile = {
      id: updatedProfile.id,
      tenant_id: updatedProfile.tenant_id,
      email: updatedProfile.email,
      full_name: updatedProfile.full_name,
      avatar_url: updatedProfile.avatar_url,
      phone: updatedProfile.phone,
      role: updatedProfile.role,
      is_active: updatedProfile.is_active,
      is_system_admin: updatedProfile.is_system_admin,
      last_login: updatedProfile.last_login,
      created_at: updatedProfile.created_at,
      updated_at: updatedProfile.updated_at,
      area_id: updatedProfile.area_id,
      area: updatedProfile.areas && Array.isArray(updatedProfile.areas) && updatedProfile.areas.length > 0 ? {
        id: updatedProfile.areas[0].id,
        name: updatedProfile.areas[0].name,
        description: updatedProfile.areas[0].description
      } : null
    };

    return NextResponse.json({ 
      message: 'Profile updated successfully', 
      profile: updatedUserProfile 
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}