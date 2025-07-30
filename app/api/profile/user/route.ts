import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth-utils'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const currentUser = authResult.user!;

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
    const { data: profileData, error: profileError } = await supabaseAdmin
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
        areas (
          id,
          name,
          description
        )
      `)
      .eq('id', currentUser.id)
      .single();

    if (profileError || !profileData) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Format the response to match the expected structure
    const profile = {
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

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const currentUser = authResult.user!;
    const body = await request.json()
    const { full_name, phone, avatar_url } = body

    console.log('Profile update request:', {
      userId: currentUser.id,
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
      .eq('id', currentUser.id)
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
        areas (
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
    const profile = {
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
      profile 
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}