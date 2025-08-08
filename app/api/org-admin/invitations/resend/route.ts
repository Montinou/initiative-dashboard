import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getAdminClient } from '@/utils/supabase/admin'
import { getUserProfile } from '@/lib/server-user-profile'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user and get profile
    const userProfile = await getUserProfile(request)
    
    if (!userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only CEO and Admin can resend invitations
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 })
    }

    // Create Supabase client
    const supabase = await createClient()

    // Get invitation details
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (fetchError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check invitation status
    if (invitation.status === 'accepted') {
      return NextResponse.json({ 
        error: 'Cannot resend an accepted invitation' 
      }, { status: 400 })
    }

    if (invitation.status === 'cancelled') {
      return NextResponse.json({ 
        error: 'Cannot resend a cancelled invitation' 
      }, { status: 400 })
    }

    // Check if invitation is expired and update if needed
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    let newExpiresAt = expiresAt

    if (expiresAt < now) {
      // Extend expiration by 7 days from now
      newExpiresAt = new Date()
      newExpiresAt.setDate(newExpiresAt.getDate() + 7)
    }

    // Send invitation email using Supabase Auth
    try {
      const adminClient = getAdminClient()
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/accept-invitation?token=${invitation.token}`
      
      // Resend invitation email
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        invitation.email,
        {
          redirectTo: inviteUrl,
          data: {
            tenant_id: invitation.tenant_id,
            role: invitation.role,
            area_id: invitation.area_id,
            invitation_token: invitation.token,
            invited_by: userProfile.full_name || userProfile.email,
            is_reminder: true,
            custom_message: invitation.custom_message
          }
        }
      )

      if (inviteError) {
        console.error('Email resend error:', inviteError)
        return NextResponse.json({ 
          error: 'Failed to resend invitation email',
          details: inviteError.message
        }, { status: 500 })
      }

      // Update invitation record
      const { data: updatedInvitation, error: updateError } = await supabase
        .from('invitations')
        .update({
          status: 'sent',
          last_reminder_sent: now.toISOString(),
          reminder_count: (invitation.reminder_count || 0) + 1,
          expires_at: newExpiresAt.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', id)
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
        `)
        .single()

      if (updateError) {
        console.error('Invitation update error:', updateError)
        return NextResponse.json({ 
          error: 'Email sent but failed to update invitation record' 
        }, { status: 500 })
      }

      return NextResponse.json({ 
        message: 'Invitation resent successfully',
        invitation: updatedInvitation,
        invitation_link: inviteUrl,
        email_sent: true,
        expires_at: newExpiresAt.toISOString()
      })

    } catch (emailError) {
      console.error('Email service error:', emailError)
      return NextResponse.json({ 
        error: 'Failed to resend invitation email',
        details: emailError instanceof Error ? emailError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Resend invitation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}