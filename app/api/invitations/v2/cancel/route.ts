/**
 * Cancel Invitation API
 * Allows cancelling pending invitations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserProfile } from '@/lib/server-user-profile';
import { z } from 'zod';

const cancelSchema = z.object({
  invitationId: z.string().uuid('Invalid invitation ID').optional(),
  invitationIds: z.array(z.string().uuid()).optional(),
  reason: z.string().max(500).optional()
}).refine(
  data => data.invitationId || data.invitationIds,
  { message: 'Either invitationId or invitationIds must be provided' }
);

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { user, userProfile } = await getUserProfile(request);
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validationResult = cancelSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { invitationId, invitationIds, reason } = validationResult.data;
    const supabase = await createClient();

    // Determine which invitations to cancel
    const idsToCancel = invitationIds || (invitationId ? [invitationId] : []);
    
    if (idsToCancel.length === 0) {
      return NextResponse.json(
        { error: 'No invitations specified' },
        { status: 400 }
      );
    }

    // Fetch all invitations to validate
    const { data: invitations, error: fetchError } = await supabase
      .from('invitations')
      .select('id, email, status, sent_by, role, tenant_id')
      .in('id', idsToCancel)
      .eq('tenant_id', userProfile.tenant_id);

    if (fetchError || !invitations || invitations.length === 0) {
      return NextResponse.json(
        { error: 'No invitations found' },
        { status: 404 }
      );
    }

    // Check permissions for each invitation
    const results = [];
    const allowedCancellations = [];
    
    for (const invitation of invitations) {
      // Check if user can cancel this invitation
      const canCancel = 
        userProfile.role === 'CEO' ||
        (userProfile.role === 'Admin' && invitation.sent_by === userProfile.id) ||
        invitation.sent_by === userProfile.id;

      if (!canCancel) {
        results.push({
          id: invitation.id,
          email: invitation.email,
          success: false,
          error: 'Permission denied'
        });
        continue;
      }

      // Check invitation status
      if (invitation.status === 'accepted') {
        results.push({
          id: invitation.id,
          email: invitation.email,
          success: false,
          error: 'Cannot cancel an accepted invitation'
        });
        continue;
      }

      if (invitation.status === 'cancelled') {
        results.push({
          id: invitation.id,
          email: invitation.email,
          success: false,
          error: 'Invitation is already cancelled'
        });
        continue;
      }

      allowedCancellations.push(invitation.id);
      results.push({
        id: invitation.id,
        email: invitation.email,
        success: true
      });
    }

    // Cancel allowed invitations
    if (allowedCancellations.length > 0) {
      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          metadata: supabase.sql`
            COALESCE(metadata, '{}'::jsonb) || 
            jsonb_build_object(
              'cancelled_by', ${userProfile.id},
              'cancelled_at', ${new Date().toISOString()},
              'cancellation_reason', ${reason || 'No reason provided'}
            )
          `
        })
        .in('id', allowedCancellations);

      if (updateError) {
        console.error('Failed to cancel invitations:', updateError);
        return NextResponse.json(
          { error: 'Failed to cancel invitations' },
          { status: 500 }
        );
      }

      // Track cancellation events
      for (const invitationId of allowedCancellations) {
        await supabase.rpc('track_invitation_event', {
          p_invitation_id: invitationId,
          p_event_type: 'cancelled',
          p_metadata: {
            cancelled_by: userProfile.id,
            reason: reason || 'No reason provided'
          }
        }).catch(err => console.warn('Failed to track cancellation:', err));
      }

      // Update batch statistics if any cancelled invitations were part of bulk operations
      const { data: bulkInvitations } = await supabase
        .from('invitations')
        .select('parent_invitation_id')
        .in('id', allowedCancellations)
        .not('parent_invitation_id', 'is', null);

      if (bulkInvitations && bulkInvitations.length > 0) {
        const batchIds = [...new Set(bulkInvitations.map(i => i.parent_invitation_id))];
        
        for (const batchId of batchIds) {
          // Update failed count for the batch
          await supabase.rpc('increment', {
            table_name: 'invitation_batches',
            column_name: 'failed_count',
            row_id: batchId,
            increment_by: bulkInvitations.filter(i => i.parent_invitation_id === batchId).length
          }).catch(err => console.warn('Failed to update batch stats:', err));
        }
      }
    }

    // Prepare response
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    if (idsToCancel.length === 1) {
      // Single cancellation
      const result = results[0];
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Invitation cancelled successfully',
        invitation: {
          id: result.id,
          email: result.email,
          status: 'cancelled'
        }
      });
    } else {
      // Bulk cancellation
      return NextResponse.json({
        success: successCount > 0,
        message: `Cancelled ${successCount} invitation(s)`,
        summary: {
          total: idsToCancel.length,
          cancelled: successCount,
          failed: failedCount
        },
        results
      });
    }

  } catch (error: any) {
    console.error('Cancel invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invitations/v2/cancel
 * Alternative endpoint for cancelling invitations using DELETE method
 */
export async function DELETE(request: NextRequest) {
  // Get invitation ID from URL params
  const url = new URL(request.url);
  const invitationId = url.searchParams.get('id');
  
  if (!invitationId) {
    return NextResponse.json(
      { error: 'Invitation ID is required' },
      { status: 400 }
    );
  }

  // Reuse POST logic with single ID
  const modifiedRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ invitationId })
  });

  return POST(modifiedRequest);
}