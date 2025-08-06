import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Create Supabase clients
    const supabase = await createClient()
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token or user not found' }, { status: 401 })
    }

    // Get user's tenant info from user_profiles table
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get company profile from tenants table
    const { data: companyProfile, error: companyError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', userProfile.tenant_id)
      .single()

    if (companyError) {
      // If no company profile exists, return default structure
      return NextResponse.json({ 
        profile: {
          tenant_id: userProfile.tenant_id,
          company_name: '',
          industry: '',
          website: '',
          phone: '',
          email: '',
          address: '',
          description: '',
          logo_url: '',
          cover_image_url: '',
          mission: '',
          vision: '',
          values: [],
          social_media: {}
        }
      })
    }

    return NextResponse.json({ profile: companyProfile })
  } catch (error) {
    console.error('Company profile fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Create Supabase clients
    const supabase = await createClient()
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token or user not found' }, { status: 401 })
    }

    // Get user's tenant info and check permissions from user_profiles table
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if user has permission (CEO or Admin only)
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions. Only CEO and Admin can edit company profile.' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      company_name, 
      industry, 
      website, 
      phone, 
      email, 
      address, 
      description, 
      logo_url,
      cover_image_url,
      mission, 
      vision, 
      values, 
      social_media 
    } = body

    // Validate required fields
    if (!company_name?.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    const updateData = {
      company_name: company_name.trim(),
      industry: industry?.trim() || null,
      website: website?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      description: description?.trim() || null,
      logo_url: logo_url?.trim() || null,
      cover_image_url: cover_image_url?.trim() || null,
      mission: mission?.trim() || null,
      vision: vision?.trim() || null,
      values: Array.isArray(values) ? values.filter(v => v?.trim()) : [],
      social_media: social_media || {},
      updated_at: new Date().toISOString()
    }

    // Try to update existing profile first
    const { data: existingProfile } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('id', userProfile.tenant_id)
      .single()

    let result
    if (existingProfile) {
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('tenants')
        .update(updateData)
        .eq('id', userProfile.tenant_id)
        .select()
        .single()

      if (updateError) {
        console.error('Company profile update error:', updateError)
        return NextResponse.json({ error: 'Failed to update company profile' }, { status: 500 })
      }

      result = updatedProfile
    } else {
      // Create new profile - since we're using tenants table, this should be an update
      // The tenant already exists, so we update it with the company profile data
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('tenants')
        .update(updateData)
        .eq('id', userProfile.tenant_id)
        .select()
        .single()

      if (createError) {
        console.error('Company profile create error:', createError)
        return NextResponse.json({ error: 'Failed to create company profile' }, { status: 500 })
      }

      result = newProfile
    }

    return NextResponse.json({ 
      message: 'Company profile updated successfully', 
      profile: result 
    })
  } catch (error) {
    console.error('Company profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}