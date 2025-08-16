/**
 * Enhanced Invitation API v2 - Send Endpoint
 * Supports single and bulk invitations with Brevo integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth-helper';
import { getOrganizationIdForTenant } from '@/lib/tenant-utils';
import { getBrevoService } from '@/lib/email/brevo-service';
import { z } from 'zod';
import crypto from 'crypto';

// Validation schemas
const singleInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['CEO', 'Admin', 'Manager'], {
    errorMap: () => ({ message: 'Role must be CEO, Admin, or Manager' })
  }),
  areaId: z.string().uuid().nullable().optional(),
  customMessage: z.string().max(500).optional(),
  templateId: z.string().optional(),
  sendImmediately: z.boolean().default(true)
});

const bulkInvitationSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(100),
  role: z.enum(['CEO', 'Admin', 'Manager']),
  areaId: z.string().uuid().nullable().optional(),
  customMessage: z.string().max(500).optional(),
  templateId: z.string().optional(),
  batchName: z.string().optional(),
  sendImmediately: z.boolean().default(true)
});

// Permission validation
function validateInvitationPermissions(
  inviterRole: string,
  inviteeRole: string
): { allowed: boolean; reason?: string } {
  // CEO can invite anyone
  if (inviterRole === 'CEO') {
    return { allowed: true };
  }
  
  // Admin can invite Admin and Manager, but not CEO
  if (inviterRole === 'Admin') {
    if (inviteeRole === 'CEO') {
      return {
        allowed: false,
        reason: 'Admins cannot invite CEOs'
      };
    }
    return { allowed: true };
  }
  
  // Managers cannot invite anyone
  return {
    allowed: false,
    reason: 'Managers do not have permission to send invitations'
  };
}

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

    // Check base permission
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to send invitations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const isBulk = Array.isArray(body.emails);
    
    // Validate request based on type
    const validationResult = isBulk 
      ? bulkInvitationSchema.safeParse(body)
      : singleInvitationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const brevoService = getBrevoService();

    // Check if Brevo service is configured
    if (!brevoService.isServiceConfigured()) {
      return NextResponse.json(
        { 
          error: 'Email service is not configured',
          details: 'Please configure BREVO_API_KEY in environment variables'
        },
        { status: 500 }
      );
    }

    // Get organization details
    const organizationId = await getOrganizationIdForTenant(supabase, userProfile.tenant_id);
    
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name, subdomain')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      console.error('Failed to fetch organization:', orgError);
      return NextResponse.json(
        { error: 'Failed to fetch organization details' },
        { status: 500 }
      );
    }

    // Process invitations
    if (isBulk) {
      // Bulk invitation logic
      const bulkData = data as z.infer<typeof bulkInvitationSchema>;
      
      // Validate role permission for bulk
      const permissionCheck = validateInvitationPermissions(userProfile.role, bulkData.role);
      if (!permissionCheck.allowed) {
        return NextResponse.json(
          { error: permissionCheck.reason },
          { status: 403 }
        );
      }

      // Create batch record
      const { data: batch, error: batchError } = await supabase
        .from('invitation_batches')
        .insert({
          tenant_id: userProfile.tenant_id,
          created_by: userProfile.id,
          batch_name: bulkData.batchName || `Bulk invitation - ${new Date().toISOString()}`,
          total_count: bulkData.emails.length,
          email_list: bulkData.emails,
          default_role: bulkData.role,
          default_area_id: bulkData.areaId,
          default_message: bulkData.customMessage,
          template_id: bulkData.templateId,
          status: 'processing'
        })
        .select()
        .single();

      if (batchError || !batch) {
        console.error('Failed to create batch:', batchError);
        return NextResponse.json(
          { error: 'Failed to create invitation batch' },
          { status: 500 }
        );
      }

      // Process each email
      const results = [];
      let successCount = 0;
      let failedCount = 0;

      for (const email of bulkData.emails) {
        try {
          // Check for existing user or invitation
          const { data: existingUser } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('email', email)
            
            .single();

          if (existingUser) {
            results.push({
              email,
              success: false,
              error: 'User already exists in organization'
            });
            failedCount++;
            continue;
          }

          // Check for pending invitation
          const { data: existingInvitation } = await supabase
            .from('invitations')
            .select('id')
            .eq('email', email)
            
            .in('status', ['sent', 'pending'])
            .single();

          if (existingInvitation) {
            results.push({
              email,
              success: false,
              error: 'Active invitation already exists'
            });
            failedCount++;
            continue;
          }

          // Create invitation
          const invitationToken = crypto.randomUUID();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          const { data: invitation, error: invitationError } = await supabase
            .from('invitations')
            .insert({
              tenant_id: userProfile.tenant_id,
              email,
              role: bulkData.role,
              area_id: bulkData.areaId,
              custom_message: bulkData.customMessage,
              status: 'pending',
              sent_by: userProfile.id,
              token: invitationToken,
              expires_at: expiresAt.toISOString(),
              invitation_type: 'bulk',
              parent_invitation_id: batch.id,
              template_id: bulkData.templateId
            })
            .select()
            .single();

          if (invitationError || !invitation) {
            console.error('Failed to create invitation:', invitationError);
            results.push({
              email,
              success: false,
              error: 'Failed to create invitation'
            });
            failedCount++;
            continue;
          }

          // Send email if immediate sending is enabled
          if (bulkData.sendImmediately) {
            const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/accept-invitation?token=${invitationToken}`;
            
            const emailResult = await brevoService.sendInvitation({
              recipientEmail: email,
              recipientName: email.split('@')[0],
              inviterName: userProfile.full_name || userProfile.email,
              inviterEmail: userProfile.email,
              organizationName: organization.name,
              tenantSubdomain: organization.subdomain || userProfile.tenant_id,
              roleName: bulkData.role,
              areaName: bulkData.areaId ? 'Assigned Area' : undefined,
              customMessage: bulkData.customMessage,
              invitationLink,
              expiresIn: '7 days',
              invitationId: invitation.id,
              templateId: bulkData.templateId ? parseInt(bulkData.templateId) : undefined
            });

            if (emailResult.success && emailResult.messageId) {
              // Update invitation with Brevo message ID
              await supabase
                .from('invitations')
                .update({
                  status: 'sent',
                  brevo_message_id: emailResult.messageId,
                  email_sent_at: new Date().toISOString()
                })
                .eq('id', invitation.id);

              // Track event
              await supabase.rpc('track_invitation_event', {
                p_invitation_id: invitation.id,
                p_event_type: 'sent',
                p_metadata: { brevo_message_id: emailResult.messageId }
              });

              successCount++;
              results.push({
                email,
                success: true,
                invitationId: invitation.id,
                messageId: emailResult.messageId
              });
            } else {
              // Update invitation with error
              await supabase
                .from('invitations')
                .update({
                  last_error: emailResult.error
                })
                .eq('id', invitation.id);

              failedCount++;
              results.push({
                email,
                success: false,
                error: emailResult.error || 'Failed to send email'
              });
            }
          } else {
            // Email will be sent later
            successCount++;
            results.push({
              email,
              success: true,
              invitationId: invitation.id,
              status: 'queued'
            });
          }
        } catch (error: any) {
          console.error(`Error processing invitation for ${email}:`, error);
          failedCount++;
          results.push({
            email,
            success: false,
            error: error.message || 'Unexpected error'
          });
        }
      }

      // Update batch status
      await supabase
        .from('invitation_batches')
        .update({
          sent_count: successCount,
          failed_count: failedCount,
          status: failedCount === bulkData.emails.length ? 'failed' : 
                  successCount === bulkData.emails.length ? 'completed' : 'partial',
          completed_at: new Date().toISOString()
        })
        .eq('id', batch.id);

      return NextResponse.json({
        success: true,
        batchId: batch.id,
        summary: {
          total: bulkData.emails.length,
          sent: successCount,
          failed: failedCount
        },
        results
      }, { status: 201 });

    } else {
      // Single invitation logic
      const singleData = data as z.infer<typeof singleInvitationSchema>;
      
      // Validate role permission
      const permissionCheck = validateInvitationPermissions(userProfile.role, singleData.role);
      if (!permissionCheck.allowed) {
        return NextResponse.json(
          { error: permissionCheck.reason },
          { status: 403 }
        );
      }

      // Check for existing user
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', singleData.email)
        
        .single();

      if (existingUser) {
        return NextResponse.json(
          { error: 'A user with this email already exists in your organization' },
          { status: 400 }
        );
      }

      // Check for pending invitation
      const { data: existingInvitation } = await supabase
        .from('invitations')
        .select('id, status')
        .eq('email', singleData.email)
        
        .in('status', ['sent', 'pending'])
        .single();

      if (existingInvitation) {
        return NextResponse.json(
          { error: 'An active invitation already exists for this email' },
          { status: 400 }
        );
      }

      // Validate area if provided
      if (singleData.areaId) {
        const { data: area } = await supabase
          .from('areas')
          .select('id')
          .eq('id', singleData.areaId)
          
          .single();

        if (!area) {
          return NextResponse.json(
            { error: 'Invalid area ID' },
            { status: 400 }
          );
        }
      }

      // Create invitation
      const invitationToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: invitation, error: invitationError } = await supabase
        .from('invitations')
        .insert({
          tenant_id: userProfile.tenant_id,
          email: singleData.email,
          role: singleData.role,
          area_id: singleData.areaId,
          custom_message: singleData.customMessage,
          status: 'pending',
          sent_by: userProfile.id,
          token: invitationToken,
          expires_at: expiresAt.toISOString(),
          invitation_type: 'single',
          template_id: singleData.templateId
        })
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
        .single();

      if (invitationError || !invitation) {
        console.error('Failed to create invitation:', invitationError);
        return NextResponse.json(
          { error: 'Failed to create invitation' },
          { status: 500 }
        );
      }

      // Track creation event
      await supabase.rpc('track_invitation_event', {
        p_invitation_id: invitation.id,
        p_event_type: 'created',
        p_metadata: { created_by: userProfile.id }
      });

      // Send email if immediate sending is enabled
      let emailSent = false;
      let messageId = null;

      if (singleData.sendImmediately) {
        const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/accept-invitation?token=${invitationToken}`;
        
        const emailResult = await brevoService.sendInvitation({
          recipientEmail: singleData.email,
          recipientName: singleData.email.split('@')[0],
          inviterName: userProfile.full_name || userProfile.email,
          inviterEmail: userProfile.email,
          organizationName: organization.name,
          tenantSubdomain: organization.subdomain || userProfile.tenant_id,
          roleName: singleData.role,
          areaName: invitation.area?.name,
          customMessage: singleData.customMessage,
          invitationLink,
          expiresIn: '7 days',
          invitationId: invitation.id,
          templateId: singleData.templateId ? parseInt(singleData.templateId) : undefined
        });

        if (emailResult.success && emailResult.messageId) {
          emailSent = true;
          messageId = emailResult.messageId;

          // Update invitation with Brevo message ID
          await supabase
            .from('invitations')
            .update({
              status: 'sent',
              brevo_message_id: messageId,
              email_sent_at: new Date().toISOString()
            })
            .eq('id', invitation.id);

          // Track sent event
          await supabase.rpc('track_invitation_event', {
            p_invitation_id: invitation.id,
            p_event_type: 'sent',
            p_metadata: { brevo_message_id: messageId }
          });

          // Add contact to Brevo
          await brevoService.createOrUpdateContact(singleData.email, {
            FIRSTNAME: singleData.email.split('@')[0],
            ORGANIZATION: organization.name,
            ROLE: singleData.role,
            INVITED_BY: userProfile.email,
            INVITATION_DATE: new Date().toISOString()
          });
        } else {
          // Update invitation with error
          await supabase
            .from('invitations')
            .update({
              last_error: emailResult.error
            })
            .eq('id', invitation.id);

          console.error('Failed to send invitation email:', emailResult.error);
        }
      }

      const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/accept-invitation?token=${invitationToken}`;

      return NextResponse.json({
        success: true,
        invitation: {
          ...invitation,
          invitation_link: invitationLink
        },
        email_sent: emailSent,
        message_id: messageId,
        message: emailSent 
          ? 'Invitation created and email sent successfully'
          : singleData.sendImmediately 
            ? 'Invitation created but email sending failed. You can resend it later.'
            : 'Invitation created. Email will be sent later.'
      }, { status: 201 });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    console.error('Invitation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}