import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, unauthorizedResponse } from '@/lib/api-auth-helper'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { user, userProfile, supabase, error } = await authenticateRequest(request);
    
    if (error || !user || !userProfile) {
      return unauthorizedResponse(error || 'Authentication required');
    }

    // Transform the response to match expected format with all fields
    // Note: userProfile already contains tenant and organization data from authenticateRequest
    const transformed = {
      id: userProfile.id,
      email: userProfile.email,
      full_name: userProfile.full_name,
      phone: userProfile.phone,
      avatar_url: userProfile.avatar_url,
      role: userProfile.role,
      tenant_id: userProfile.tenant_id,
      area_id: userProfile.area_id,
      is_active: userProfile.is_active,
      is_system_admin: userProfile.is_system_admin,
      last_login: userProfile.last_login,
      created_at: userProfile.created_at,
      updated_at: userProfile.updated_at,
      tenant: userProfile.tenant ? {
        id: userProfile.tenant.id,
        name: userProfile.tenant.organization?.name || 'Default',
        slug: userProfile.tenant.subdomain, // Keep subdomain for display only
        settings: {}
      } : null,
      area: userProfile.area_id ? { id: userProfile.area_id } : null
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
    const { user, userProfile, supabase, error } = await authenticateRequest(request);
    
    if (error || !user || !userProfile) {
      return unauthorizedResponse(error || 'Authentication required');
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