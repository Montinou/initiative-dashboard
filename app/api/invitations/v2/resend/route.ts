/**
 * Resend Invitation API
 * Allows resending invitation emails with tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth-helper';
import { getBrevoService } from '@/lib/email/brevo-service';
import { z } from 'zod';
import { getOrganizationIdForTenant } from '@/lib/tenant-utils';

const resendSchema = z.object({
  invitationId: z.string().uuid('Invalid invitation ID'),
  updateMessage: z.boolean().optional(),
  customMessage: z.string().max(500).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request);
    
    if (authError || !userProfile) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validationResult = resendSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { invitationId, updateMessage, customMessage } = validationResult.data;

    // Fetch invitation details
    const { data: invitation, error: fetchError } = await supabase
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
      `)
      .eq('id', invitationId)
      
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const canResend = 
      userProfile.role === 'CEO' ||
      (userProfile.role === 'Admin' && invitation.sent_by === userProfile.id) ||
      invitation.sent_by === userProfile.id;

    if (!canResend) {
      return NextResponse.json(
        { error: 'You do not have permission to resend this invitation' },
        { status: 403 }
      );
    }

    // Check invitation status
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'Cannot resend an accepted invitation' },
        { status: 400 }
      );
    }

    if (invitation.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot resend a cancelled invitation' },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    const hasExpired = new Date(invitation.expires_at) < new Date();
    let newExpiresAt = invitation.expires_at;
    
    if (hasExpired) {
      // Extend expiration by 7 days from now
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);
      newExpiresAt = newExpiry.toISOString();
    }

    // Get organization details
    const organizationId = await getOrganizationIdForTenant(supabase, userProfile.tenant_id);
    
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, subdomain')
      .eq('id', organizationId)
      .single();

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 500 }
      );
    }

    // Prepare email data
    const brevoService = getBrevoService();
    
    if (!brevoService.isServiceConfigured()) {
      return NextResponse.json(
        { error: 'Email service is not configured' },
        { status: 500 }
      );
    }

    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/accept-invitation?token=${invitation.token}`;
    
    // Update invitation if needed
    const updateData: any = {
      resend_count: (invitation.resend_count || 0) + 1,
      last_reminder_sent: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (hasExpired) {
      updateData.expires_at = newExpiresAt;
      updateData.status = 'sent'; // Reset status if expired
    }

    if (updateMessage && customMessage) {
      updateData.custom_message = customMessage;
    }

    // Send email
    const emailResult = await brevoService.sendReminder({
      recipientEmail: invitation.email,
      recipientName: invitation.email.split('@')[0],
      inviterName: userProfile.full_name || userProfile.email,
      inviterEmail: userProfile.email,
      organizationName: organization.name,
      tenantSubdomain: organization.subdomain || userProfile.tenant_id,
      roleName: invitation.role,
      areaName: invitation.area?.name,
      customMessage: customMessage || invitation.custom_message,
      invitationLink,
      expiresIn: hasExpired ? '7 days' : `${Math.ceil((new Date(invitation.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`,
      invitationId: invitation.id,
      reminderNumber: (invitation.reminder_count || 0) + 1
    });

    if (!emailResult.success) {
      // Update with error
      await supabase
        .from('invitations')
        .update({
          ...updateData,
          last_error: emailResult.error
        })
        .eq('id', invitationId);

      return NextResponse.json(
        { 
          error: 'Failed to send email',
          details: emailResult.error 
        },
        { status: 500 }
      );
    }

    // Update invitation with success
    updateData.brevo_message_id = emailResult.messageId;
    updateData.email_sent_at = new Date().toISOString();
    
    const { error: updateError } = await supabase
      .from('invitations')
      .update(updateData)
      .eq('id', invitationId);

    if (updateError) {
      console.error('Failed to update invitation after resend:', updateError);
    }

    // Track resend event
    await supabase.rpc('track_invitation_event', {
      p_invitation_id: invitationId,
      p_event_type: 'resent',
      p_metadata: {
        resent_by: userProfile.id,
        reminder_count: (invitation.reminder_count || 0) + 1,
        extended_expiry: hasExpired,
        message_id: emailResult.messageId
      }
    });

    return NextResponse.json({
      success: true,
      message: hasExpired 
        ? 'Invitation resent with extended expiration'
        : 'Invitation resent successfully',
      invitation: {
        id: invitationId,
        email: invitation.email,
        status: hasExpired ? 'sent' : invitation.status,
        expires_at: newExpiresAt,
        resend_count: (invitation.resend_count || 0) + 1,
        message_id: emailResult.messageId
      }
    });

  } catch (error: any) {
    console.error('Resend invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}