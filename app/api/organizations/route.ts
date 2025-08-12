import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getUserProfile } from '@/lib/server-user-profile'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user profile to access tenant_id
    const { userProfile } = await getUserProfile(request)
    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check permissions - only CEO and Admin can view organization details
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get organization through tenant relationship
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('organization_id')
      .eq('id', userProfile.tenant_id)
      .single()

    if (tenantError || !tenant) {
      console.error('Error fetching tenant:', tenantError)
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', tenant.organization_id)
      .single()

    if (orgError) {
      console.error('Error fetching organization:', orgError)
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Format response to match CompanyProfile interface
    const companyProfile = {
      id: organization.id,
      tenant_id: userProfile.tenant_id,
      company_name: organization.name,
      industry: organization.industry,
      website: organization.website,
      phone: organization.phone,
      email: organization.email,
      address: organization.address,
      description: organization.description,
      logo_url: organization.logo_url,
      cover_image_url: organization.cover_image_url,
      mission: organization.mission,
      vision: organization.vision,
      values: organization.values || [],
      social_media: organization.social_media || {},
      founded_year: organization.founded_year,
      employee_count_range: organization.employee_count_range || organization.company_size,
      country: organization.country,
      city: organization.city,
      state_province: organization.state_province,
      postal_code: organization.postal_code,
      primary_color: organization.primary_color,
      secondary_color: organization.secondary_color,
      timezone: organization.timezone
    }

    return NextResponse.json(companyProfile)
  } catch (error) {
    console.error('Error in GET /api/organizations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user profile
    const { userProfile } = await getUserProfile(request)
    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check permissions - only CEO and Admin can update organization
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get organization ID through tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('organization_id')
      .eq('id', userProfile.tenant_id)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Map CompanyProfile fields to organizations table fields
    const updates: any = {}
    
    if (body.company_name !== undefined) updates.name = body.company_name
    if (body.industry !== undefined) updates.industry = body.industry
    if (body.website !== undefined) updates.website = body.website
    if (body.phone !== undefined) updates.phone = body.phone
    if (body.email !== undefined) updates.email = body.email
    if (body.address !== undefined) updates.address = body.address
    if (body.description !== undefined) updates.description = body.description
    if (body.logo_url !== undefined) updates.logo_url = body.logo_url
    if (body.cover_image_url !== undefined) updates.cover_image_url = body.cover_image_url
    if (body.mission !== undefined) updates.mission = body.mission
    if (body.vision !== undefined) updates.vision = body.vision
    if (body.values !== undefined) updates.values = body.values
    if (body.social_media !== undefined) updates.social_media = body.social_media
    if (body.founded_year !== undefined) updates.founded_year = body.founded_year
    if (body.employee_count_range !== undefined) updates.employee_count_range = body.employee_count_range
    if (body.country !== undefined) updates.country = body.country
    if (body.city !== undefined) updates.city = body.city
    if (body.state_province !== undefined) updates.state_province = body.state_province
    if (body.postal_code !== undefined) updates.postal_code = body.postal_code
    if (body.primary_color !== undefined) updates.primary_color = body.primary_color
    if (body.secondary_color !== undefined) updates.secondary_color = body.secondary_color
    if (body.timezone !== undefined) updates.timezone = body.timezone

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString()

    // Update organization
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', tenant.organization_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating organization:', updateError)
      return NextResponse.json(
        { error: 'Failed to update organization' },
        { status: 500 }
      )
    }

    // Format response
    const companyProfile = {
      id: updatedOrg.id,
      tenant_id: userProfile.tenant_id,
      company_name: updatedOrg.name,
      industry: updatedOrg.industry,
      website: updatedOrg.website,
      phone: updatedOrg.phone,
      email: updatedOrg.email,
      address: updatedOrg.address,
      description: updatedOrg.description,
      logo_url: updatedOrg.logo_url,
      cover_image_url: updatedOrg.cover_image_url,
      mission: updatedOrg.mission,
      vision: updatedOrg.vision,
      values: updatedOrg.values || [],
      social_media: updatedOrg.social_media || {},
      founded_year: updatedOrg.founded_year,
      employee_count_range: updatedOrg.employee_count_range || updatedOrg.company_size,
      country: updatedOrg.country,
      city: updatedOrg.city,
      state_province: updatedOrg.state_province,
      postal_code: updatedOrg.postal_code,
      primary_color: updatedOrg.primary_color,
      secondary_color: updatedOrg.secondary_color,
      timezone: updatedOrg.timezone
    }

    return NextResponse.json(companyProfile)
  } catch (error) {
    console.error('Error in PATCH /api/organizations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}