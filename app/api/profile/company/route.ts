import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authenticateUser, hasRole, validateInput, sanitizeString } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    const user = authResult.user!;

    // Get company profile
    const { data: companyProfile, error: companyError } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .single()

    if (companyError) {
      // If no company profile exists, return default structure
      return NextResponse.json({ 
        profile: {
          tenant_id: user.tenant_id,
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
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    const user = authResult.user!;

    // Check if user has permission (CEO or Admin only)
    if (!hasRole(user, ['CEO', 'Admin'])) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only CEO and Admin can edit company profile.' },
        { status: 403 }
      );
    }

    const body = await request.json();
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
    } = body;

    // Validate input
    const validation = validateInput(body, ['company_name']);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Sanitize and prepare update data
    const updateData = {
      company_name: sanitizeString(company_name),
      industry: industry ? sanitizeString(industry) : null,
      website: website ? sanitizeString(website) : null,
      phone: phone ? sanitizeString(phone) : null,
      email: email ? sanitizeString(email) : null,
      address: address ? sanitizeString(address) : null,
      description: description ? sanitizeString(description) : null,
      logo_url: logo_url ? sanitizeString(logo_url) : null,
      cover_image_url: cover_image_url ? sanitizeString(cover_image_url) : null,
      mission: mission ? sanitizeString(mission) : null,
      vision: vision ? sanitizeString(vision) : null,
      values: Array.isArray(values) ? values.map(v => sanitizeString(v)).filter(v => v) : [],
      social_media: social_media || {},
      updated_at: new Date().toISOString()
    }

    // Try to update existing profile first
    const { data: existingProfile, error: fetchError } = await supabase
      .from('company_profiles')
      .select('id')
      .eq('tenant_id', user.tenant_id)
      .single()

    let result
    if (existingProfile) {
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('company_profiles')
        .update(updateData)
        .eq('tenant_id', user.tenant_id)
        .select()
        .single()

      if (updateError) {
        console.error('Company profile update error:', updateError)
        return NextResponse.json({ error: 'Failed to update company profile' }, { status: 500 })
      }

      result = updatedProfile
    } else {
      // Create new profile
      const { data: newProfile, error: createError } = await supabase
        .from('company_profiles')
        .insert({
          tenant_id: user.tenant_id,
          ...updateData
        })
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