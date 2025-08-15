import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getUserProfile } from '@/lib/server-user-profile'

export async function GET() {
  try {
    const { user, userProfile } = await getUserProfile(request)
    
    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only CEO and Admin can access organization settings
    if (userProfile.role !== 'CEO' && userProfile.role !== 'Admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabase = await createClient()

    // Get organization data
    const { data: tenant } = await supabase
      .from('tenants')
      .select(`
        id,
        subdomain,
        organizations (
          id,
          name,
          description,
          website,
          industry,
          company_size,
          timezone,
          logo_url,
          primary_color,
          secondary_color
        )
      `)
      .eq('id', userProfile.tenant_id)
      .single()

    if (!tenant || !tenant.organizations) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const org = tenant.organizations

    // Get organization settings if they exist
    const { data: orgSettings } = await supabase
      .from('organization_settings')
      .select('settings_type, settings_data')
      .eq('tenant_id', userProfile.tenant_id)

    // Parse settings data
    const settings: any = {
      basic: {
        name: org.name || '',
        description: org.description || '',
        website: org.website || '',
        subdomain: tenant.subdomain || '',
        industry: org.industry || 'Technology',
        size: org.company_size || '1-10',
        timezone: org.timezone || 'America/New_York',
        logo_url: org.logo_url || ''
      },
      branding: {
        primary_color: org.primary_color || '#3B82F6',
        secondary_color: org.secondary_color || '#8B5CF6',
        logo_url: org.logo_url || '',
        favicon_url: '',
        custom_css: ''
      },
      security: {
        two_factor_required: false,
        session_timeout: 480,
        password_policy: 'strong',
        login_attempts: 5,
        data_retention_days: 365
      },
      advanced: {
        auto_backup: true,
        backup_frequency: 'daily',
        audit_logging: true,
        api_access: false,
        custom_integrations: false
      }
    }

    // Override with saved settings
    if (orgSettings && orgSettings.length > 0) {
      orgSettings.forEach(setting => {
        if (setting.settings_data && typeof setting.settings_data === 'object') {
          settings[setting.settings_type] = {
            ...settings[setting.settings_type],
            ...setting.settings_data
          }
        }
      })
    }

    return NextResponse.json({ settings })

  } catch (error) {
    console.error('Organization settings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, userProfile } = await getUserProfile(request)
    
    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only CEO and Admin can update organization settings
    if (userProfile.role !== 'CEO' && userProfile.role !== 'Admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const updates = await request.json()
    const supabase = await createClient()

    // Update organization basic info if provided
    if (updates.basic) {
      const basicUpdates: any = {}
      
      if (updates.basic.name) basicUpdates.name = updates.basic.name
      if (updates.basic.description !== undefined) basicUpdates.description = updates.basic.description
      if (updates.basic.website !== undefined) basicUpdates.website = updates.basic.website
      if (updates.basic.industry) basicUpdates.industry = updates.basic.industry
      if (updates.basic.size) basicUpdates.company_size = updates.basic.size
      if (updates.basic.timezone) basicUpdates.timezone = updates.basic.timezone
      if (updates.basic.logo_url !== undefined) basicUpdates.logo_url = updates.basic.logo_url

      if (Object.keys(basicUpdates).length > 0) {
        // Get the organization ID first
        const { data: tenant } = await supabase
          .from('tenants')
          .select('organizations!inner(id)')
          .eq('id', userProfile.tenant_id)
          .single()

        if (tenant?.organizations?.id) {
          await supabase
            .from('organizations')
            .update(basicUpdates)
            .eq('id', tenant.organizations.id)
        }
      }

      // Update subdomain if provided
      if (updates.basic.subdomain) {
        await supabase
          .from('tenants')
          .update({ subdomain: updates.basic.subdomain })
          .eq('id', userProfile.tenant_id)
      }
    }

    // Update branding settings if provided
    if (updates.branding) {
      const brandingUpdates: any = {}
      
      if (updates.branding.primary_color) brandingUpdates.primary_color = updates.branding.primary_color
      if (updates.branding.secondary_color) brandingUpdates.secondary_color = updates.branding.secondary_color
      if (updates.branding.logo_url !== undefined) brandingUpdates.logo_url = updates.branding.logo_url

      if (Object.keys(brandingUpdates).length > 0) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('organizations!inner(id)')
          .eq('id', userProfile.tenant_id)
          .single()

        if (tenant?.organizations?.id) {
          await supabase
            .from('organizations')
            .update(brandingUpdates)
            .eq('id', tenant.organizations.id)
        }
      }

      // Save other branding settings
      const brandingSettings = {
        favicon_url: updates.branding.favicon_url,
        custom_css: updates.branding.custom_css
      }

      await supabase
        .from('organization_settings')
        .upsert({
          tenant_id: userProfile.tenant_id,
          settings_type: 'branding',
          settings_data: brandingSettings
        }, {
          onConflict: 'tenant_id,settings_type'
        })
    }

    // Update other settings sections
    const settingsSections = ['security', 'advanced']
    for (const section of settingsSections) {
      if (updates[section]) {
        await supabase
          .from('organization_settings')
          .upsert({
            tenant_id: userProfile.tenant_id,
            settings_type: section,
            settings_data: updates[section]
          }, {
            onConflict: 'tenant_id,settings_type'
          })
      }
    }

    return NextResponse.json({ success: true, message: 'Settings updated successfully' })

  } catch (error) {
    console.error('Update organization settings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}