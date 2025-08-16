import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/utils/supabase/admin'
import { authenticateRequest } from '@/lib/api-auth-helper'
import { z } from 'zod'

// Validation schemas
const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['CEO', 'Admin', 'Manager']),
  area_id: z.string().uuid().nullable().optional(),
  custom_message: z.string().max(500).optional()
})

const updateInvitationSchema = z.object({
  status: z.enum(['sent', 'cancelled']).optional(),
  custom_message: z.string().max(500).optional()
})

export async function GET(request: NextRequest) {
  try {
    // Authenticate user and get profile
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request)
    
    if (authError || !userProfile) {
      return NextResponse.json({ error: authError || 'Authentication required' }, { status: 401 })
    }

    // Only CEO and Admin can access invitations
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''

    const offset = (page - 1) * limit

    // First, expire old invitations (ignore errors if function doesn't exist)
    try {
      await supabase.rpc('expire_old_invitations')
    } catch (error) {
      console.log('expire_old_invitations function not available:', error)
    }

    // Build query for invitations with sender details (try with foreign keys first)
    let query = supabase
      .from('invitations')
      .select(`
        *,
        sender:user_profiles!invitations_sent_by_fkey(
          id,
          full_name,
          email
        ),
        area:areas!invitations_area_id_fkey(
          id,
          name
        )
      `, { count: 'exact' })
      
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%`)
    }

    // Get paginated results with count
    let invitations = []
    let totalCount = 0
    const { data, error: invitationsError, count } = await query
      .range(offset, offset + limit - 1)

    if (invitationsError) {
      console.error('Invitations query error:', invitationsError)
      
      // If foreign key relationship doesn't exist, try simpler query
      if (invitationsError.code === 'PGRST200' || invitationsError.message?.includes('foreign key')) {
        console.log('Foreign key issue detected, trying simpler query...')
        try {
          const fallbackQuery = supabase
            .from('invitations')
            .select('*', { count: 'exact' })
            
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)
          
          const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery
          
          if (!fallbackError) {
            invitations = fallbackData || []
            totalCount = fallbackCount || 0
          } else {
            throw fallbackError
          }
        } catch (fallbackErr) {
          console.error('Fallback query also failed:', fallbackErr)
          return NextResponse.json({ error: 'Database schema error' }, { status: 500 })
        }
      }
      // If table doesn't exist, return empty result
      else if (invitationsError.code === '42P01') {
        return NextResponse.json({
          invitations: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          },
          statistics: {
            total: 0,
            sent: 0,
            accepted: 0,
            expired: 0,
            cancelled: 0,
            pending: 0
          }
        })
      }
      else {
        return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
      }
    } else {
      invitations = data || []
      totalCount = count || 0
    }

    // Get statistics
    const { data: stats } = await supabase
      .from('invitations')
      .select('status')
      

    const statistics = {
      total: stats?.length || 0,
      sent: stats?.filter(s => s.status === 'sent').length || 0,
      accepted: stats?.filter(s => s.status === 'accepted').length || 0,
      expired: stats?.filter(s => s.status === 'expired').length || 0,
      cancelled: stats?.filter(s => s.status === 'cancelled').length || 0,
      pending: stats?.filter(s => s.status === 'pending').length || 0
    }

    return NextResponse.json({
      invitations: invitations,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      statistics
    })

  } catch (error) {
    console.error('Invitations API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user and get profile
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request)
    
    if (authError || !userProfile) {
      return NextResponse.json({ error: authError || 'Authentication required' }, { status: 401 })
    }

    // Only CEO and Admin can create invitations
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate request body
    const validatedData = createInvitationSchema.parse(body)

    // Check if user already exists in the organization
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', validatedData.email)
      
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        error: 'A user with this email already exists in your organization' 
      }, { status: 400 })
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id, status')
      .eq('email', validatedData.email)
      
      .in('status', ['sent', 'pending'])
      .single()

    if (existingInvitation) {
      return NextResponse.json({ 
        error: 'An active invitation already exists for this email' 
      }, { status: 400 })
    }

    // If area_id is provided, verify it exists and belongs to tenant
    if (validatedData.area_id) {
      const { data: area, error: areaError } = await supabase
        .from('areas')
        .select('id')
        .eq('id', validatedData.area_id)
        
        .single()

      if (areaError || !area) {
        return NextResponse.json({ 
          error: 'Invalid area ID' 
        }, { status: 400 })
      }
    }

    // Generate invitation token and expiration
    const invitationToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

    // Create invitation record in database
    const { data: invitationData, error: invitationError } = await supabase
      .from('invitations')
      .insert({
        tenant_id: userProfile.tenant_id,
        email: validatedData.email,
        role: validatedData.role,
        area_id: validatedData.area_id || null,
        custom_message: validatedData.custom_message || null,
        status: 'sent',
        sent_by: userProfile.id,
        token: invitationToken,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (invitationError) {
      console.error('Invitation creation error:', invitationError)
      // If table doesn't exist, return helpful error
      if (invitationError.code === '42P01') {
        return NextResponse.json({ 
          error: 'Invitations table not found. Please run database migrations.' 
        }, { status: 500 })
      }
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // Try to get related data separately if needed
    let newInvitation = { ...invitationData }
    try {
      const { data: senderData } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .eq('id', userProfile.id)
        .single()
      
      if (senderData) {
        newInvitation.sender = senderData
      }

      if (validatedData.area_id) {
        const { data: areaData } = await supabase
          .from('areas')
          .select('id, name')
          .eq('id', validatedData.area_id)
          .single()
        
        if (areaData) {
          newInvitation.area = areaData
        }
      }
    } catch (relationError) {
      // Ignore relation fetch errors - we have the core invitation
      console.log('Could not fetch invitation relations:', relationError)
    }

    // Send invitation email using Supabase Auth
    try {
      const adminClient = getAdminClient()
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/accept-invitation?token=${invitationToken}`
      
      // Use Supabase's built-in invitation system
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        validatedData.email,
        {
          redirectTo: inviteUrl,
          data: {
            tenant_id: userProfile.tenant_id,
            role: validatedData.role,
            area_id: validatedData.area_id,
            invitation_token: invitationToken,
            invited_by: userProfile.full_name || userProfile.email
          }
        }
      )

      if (inviteError) {
        console.error('Email sending error:', inviteError)
        // Update invitation status to indicate email failed
        await supabase
          .from('invitations')
          .update({ 
            status: 'pending',
            metadata: { email_error: inviteError.message }
          })
          .eq('id', invitationData.id)
        
        return NextResponse.json({ 
          message: 'Invitation created but email sending failed. You can resend it later.',
          invitation: newInvitation,
          invitation_link: inviteUrl,
          email_sent: false
        }, { status: 201 })
      }

      console.log('Invitation email sent successfully to:', validatedData.email)
    } catch (emailError) {
      console.error('Email service error:', emailError)
      // Continue even if email fails - invitation is created
    }

    return NextResponse.json({ 
      message: 'Invitation created and email sent successfully',
      invitation: newInvitation,
      invitation_link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/accept-invitation?token=${invitationToken}`,
      email_sent: true
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Create invitation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Authenticate user and get profile
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request)
    
    if (authError || !userProfile) {
      return NextResponse.json({ error: authError || 'Authentication required' }, { status: 401 })
    }

    // Only CEO and Admin can update invitations
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 })
    }

    // Validate update data
    const validatedData = updateInvitationSchema.parse(updateData)

    // Verify invitation exists and belongs to tenant
    const { data: existingInvitation, error: fetchError } = await supabase
      .from('invitations')
      .select('id, status')
      .eq('id', id)
      
      .single()

    if (fetchError || !existingInvitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Can only update sent invitations
    if (existingInvitation.status !== 'sent') {
      return NextResponse.json({ 
        error: `Cannot update invitation with status: ${existingInvitation.status}` 
      }, { status: 400 })
    }

    // Update invitation
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('invitations')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Invitation update error:', updateError)
      return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Invitation updated successfully',
      invitation: updatedInvitation
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Update invitation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user and get profile
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request)
    
    if (authError || !userProfile) {
      return NextResponse.json({ error: authError || 'Authentication required' }, { status: 401 })
    }

    // Only CEO and Admin can delete invitations
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 })
    }

    // Verify invitation exists and belongs to tenant
    const { data: existingInvitation, error: fetchError } = await supabase
      .from('invitations')
      .select('id, email, status')
      .eq('id', id)
      
      .single()

    if (fetchError || !existingInvitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Can only delete/cancel pending invitations
    if (existingInvitation.status === 'accepted') {
      return NextResponse.json({ 
        error: 'Cannot delete an accepted invitation' 
      }, { status: 400 })
    }

    // Update status to cancelled instead of hard delete
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Invitation cancellation error:', updateError)
      return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `Invitation to "${existingInvitation.email}" has been cancelled` 
    })

  } catch (error) {
    console.error('Cancel invitation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}