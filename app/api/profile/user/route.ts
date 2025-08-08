import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
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

    // Get the user profile with proper schema - fix ambiguous relationship
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        tenant_id,
        area_id,
        is_active,
        is_system_admin,
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
          name
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

    // Transform the response to match expected format
    const response = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      tenant_id: profile.tenant_id,
      area_id: profile.area_id,
      is_active: profile.is_active,
      is_system_admin: profile.is_system_admin,
      tenant: profile.tenants ? {
        id: profile.tenants.id,
        name: profile.tenants.organizations?.name || 'Default',
        slug: profile.tenants.subdomain,
        settings: {}
      } : null,
      area: profile.areas
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}