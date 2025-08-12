/**
 * Brevo Webhook Handler for Email Event Tracking
 * Processes email events (delivered, opened, clicked, bounced) from Brevo
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getBrevoService } from '@/lib/email/brevo-service';
import crypto from 'crypto';

// Brevo webhook event types
interface BrevoWebhookEvent {
  event: 'delivered' | 'opened' | 'clicked' | 'hard_bounce' | 'soft_bounce' | 'blocked' | 'spam' | 'unsub' | 'invalid';
  email: string;
  'message-id': string;
  ts: number; // Unix timestamp
  date: string;
  tags?: string[];
  reason?: string; // For bounces
  link?: string; // For clicks
  ip?: string; // User IP
  'user-agent'?: string;
  device?: string;
  location?: string;
  [key: string]: any;
}

/**
 * Verify webhook signature from Brevo
 */
function verifyWebhookSignature(
  signature: string | null,
  body: string
): boolean {
  const webhookSecret = process.env.BREVO_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('BREVO_WEBHOOK_SECRET is not configured');
    return false;
  }

  if (!signature) {
    console.error('No signature provided in webhook');
    return false;
  }

  // Brevo uses HMAC-SHA256 for webhook signatures
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Extract invitation ID from Brevo message ID or tags
 */
function extractInvitationId(event: BrevoWebhookEvent): string | null {
  // Check custom headers we set (stored in tags or message-id pattern)
  const messageId = event['message-id'];
  
  // Try to find invitation ID in tags
  if (event.tags && Array.isArray(event.tags)) {
    const invitationTag = event.tags.find(tag => 
      tag.startsWith('invitation-') || 
      tag.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    );
    
    if (invitationTag) {
      return invitationTag.replace('invitation-', '');
    }
  }
  
  return null;
}

/**
 * Map Brevo event to our tracking status
 */
function mapEventToStatus(event: string): string {
  const statusMap: Record<string, string> = {
    'delivered': 'delivered',
    'opened': 'opened',
    'clicked': 'clicked',
    'hard_bounce': 'bounced',
    'soft_bounce': 'bounced',
    'blocked': 'failed',
    'spam': 'spam',
    'invalid': 'failed'
  };
  
  return statusMap[event] || 'unknown';
}

/**
 * Process webhook event and update database
 */
async function processWebhookEvent(
  event: BrevoWebhookEvent,
  supabase: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find invitation by email and message ID
    const { data: invitation, error: findError } = await supabase
      .from('invitations')
      .select('id, tenant_id, status, email_sent_at')
      .eq('email', event.email)
      .eq('brevo_message_id', event['message-id'])
      .single();

    if (findError || !invitation) {
      // Try to find by email only (for recent invitations)
      const { data: recentInvitation } = await supabase
        .from('invitations')
        .select('id, tenant_id, status, email_sent_at')
        .eq('email', event.email)
        .in('status', ['sent', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!recentInvitation) {
        console.warn(`No invitation found for email: ${event.email}`);
        return { success: false, error: 'Invitation not found' };
      }
      
      // Update with message ID if missing
      if (!recentInvitation.brevo_message_id) {
        await supabase
          .from('invitations')
          .update({ brevo_message_id: event['message-id'] })
          .eq('id', recentInvitation.id);
      }
      
      invitation.id = recentInvitation.id;
      invitation.tenant_id = recentInvitation.tenant_id;
    }

    // Update invitation based on event type
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    switch (event.event) {
      case 'delivered':
        updateData.email_delivered_at = new Date(event.ts * 1000).toISOString();
        if (invitation.status === 'pending') {
          updateData.status = 'sent';
        }
        break;
      
      case 'opened':
        if (!invitation.email_opened_at) {
          updateData.email_opened_at = new Date(event.ts * 1000).toISOString();
        }
        break;
      
      case 'clicked':
        if (!invitation.email_clicked_at) {
          updateData.email_clicked_at = new Date(event.ts * 1000).toISOString();
        }
        break;
      
      case 'hard_bounce':
      case 'soft_bounce':
        updateData.status = 'failed';
        updateData.last_error = `Email bounced: ${event.reason || 'Unknown reason'}`;
        break;
      
      case 'blocked':
      case 'spam':
        updateData.status = 'failed';
        updateData.last_error = `Email ${event.event}: ${event.reason || 'Unknown reason'}`;
        break;
    }

    // Update invitation record
    const { error: updateError } = await supabase
      .from('invitations')
      .update(updateData)
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Failed to update invitation:', updateError);
      return { success: false, error: 'Failed to update invitation' };
    }

    // Track event in analytics
    const eventMetadata: any = {
      email: event.email,
      message_id: event['message-id'],
      timestamp: event.ts,
      reason: event.reason,
      link: event.link
    };

    // Add device info if available
    if (event.ip) eventMetadata.ip = event.ip;
    if (event['user-agent']) eventMetadata.user_agent = event['user-agent'];
    if (event.device) eventMetadata.device = event.device;
    if (event.location) eventMetadata.location = event.location;

    // Use the tracking function if it exists
    const { error: trackError } = await supabase.rpc('track_invitation_event', {
      p_invitation_id: invitation.id,
      p_event_type: mapEventToStatus(event.event),
      p_metadata: eventMetadata,
      p_ip_address: event.ip || null,
      p_user_agent: event['user-agent'] || null
    });

    if (trackError) {
      console.warn('Failed to track event in analytics:', trackError);
      // Don't fail the webhook - analytics is secondary
    }

    // Update batch statistics if this is part of a bulk invitation
    const { data: invitationDetails } = await supabase
      .from('invitations')
      .select('parent_invitation_id, invitation_type')
      .eq('id', invitation.id)
      .single();

    if (invitationDetails?.parent_invitation_id) {
      // Update batch counters based on event
      if (event.event === 'delivered') {
        await supabase.rpc('increment', {
          table_name: 'invitation_batches',
          column_name: 'delivered_count',
          row_id: invitationDetails.parent_invitation_id
        });
      }
    }

    console.log(`✅ Processed ${event.event} event for invitation ${invitation.id}`);
    return { success: true };

  } catch (error: any) {
    console.error('Error processing webhook event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * POST /api/invitations/v2/webhook
 * Handle incoming webhooks from Brevo
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    
    // Verify webhook signature
    const signature = request.headers.get('x-brevo-signature');
    
    // Skip signature verification in development if secret not set
    const isDevelopment = process.env.NODE_ENV === 'development';
    const hasSecret = !!process.env.BREVO_WEBHOOK_SECRET;
    
    if (!isDevelopment || hasSecret) {
      if (!verifyWebhookSignature(signature, rawBody)) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Parse the webhook body
    let events: BrevoWebhookEvent | BrevoWebhookEvent[];
    try {
      const parsed = JSON.parse(rawBody);
      // Brevo can send single event or array of events
      events = Array.isArray(parsed) ? parsed : [parsed];
    } catch (parseError) {
      console.error('Failed to parse webhook body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Process events
    const supabase = await createClient();
    const results = [];
    
    for (const event of (Array.isArray(events) ? events : [events])) {
      // Validate event structure
      if (!event.event || !event.email) {
        console.warn('Invalid event structure:', event);
        results.push({ 
          email: event.email || 'unknown', 
          success: false, 
          error: 'Invalid event structure' 
        });
        continue;
      }

      // Process the event
      const result = await processWebhookEvent(event, supabase);
      results.push({
        email: event.email,
        event: event.event,
        ...result
      });
    }

    // Log summary
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    console.log(`📧 Webhook processed: ${successCount} successful, ${failedCount} failed`);

    // Return success even if some events failed
    // Brevo expects 200 OK to acknowledge receipt
    return NextResponse.json({
      received: true,
      processed: successCount,
      failed: failedCount,
      results: isDevelopment ? results : undefined // Only include details in dev
    }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook handler error:', error);
    
    // Return 200 to prevent Brevo from retrying
    // Log the error for monitoring
    return NextResponse.json({
      received: true,
      error: 'Internal processing error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 200 });
  }
}

/**
 * GET /api/invitations/v2/webhook
 * Health check endpoint for webhook configuration
 */
export async function GET(request: NextRequest) {
  const brevoService = getBrevoService();
  
  return NextResponse.json({
    status: 'healthy',
    configured: brevoService.isServiceConfigured(),
    webhookSecretConfigured: !!process.env.BREVO_WEBHOOK_SECRET,
    endpoint: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/invitations/v2/webhook`,
    acceptedEvents: [
      'delivered',
      'opened', 
      'clicked',
      'hard_bounce',
      'soft_bounce',
      'blocked',
      'spam',
      'invalid'
    ],
    instructions: {
      brevo: 'Configure this URL in Brevo Dashboard > Transactional > Settings > Webhook',
      signature: 'Set BREVO_WEBHOOK_SECRET environment variable with the secret from Brevo'
    }
  });
}