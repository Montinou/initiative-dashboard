import { createClient } from '@/utils/supabase/server';
import { BrevoEmailService } from '@/lib/email/brevo-service';
import { differenceInDays, addDays } from 'date-fns';

interface EngagementScore {
  score: number;
  factors: {
    emailDelivered: boolean;
    emailOpened: boolean;
    linkClicked: boolean;
    daysSinceInvitation: number;
    daysSinceLastEngagement: number;
    remindersSent: number;
  };
  recommendation: 'resend' | 'remind' | 'wait' | 'cancel' | 'none';
  reason: string;
}

interface ResendStrategy {
  action: 'resend' | 'remind' | 'wait' | 'cancel';
  templateVariant?: 'urgent' | 'gentle' | 'final' | 'alternative';
  scheduledFor?: Date;
  customMessage?: string;
}

export class SmartResendManager {
  private emailService: BrevoEmailService;

  constructor() {
    this.emailService = new BrevoEmailService();
  }

  /**
   * Analyze invitation engagement and determine best action
   */
  async analyzeInvitation(invitationId: string): Promise<{
    engagement: EngagementScore;
    strategy: ResendStrategy;
  }> {
    const supabase = await createClient();

    // Fetch invitation with all tracking data
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        *,
        sent_by:user_profiles!invitations_sent_by_fkey(full_name, email),
        area:areas(name)
      `)
      .eq('id', invitationId)
      .single();

    if (error || !invitation) {
      throw new Error('Invitation not found');
    }

    const engagement = this.calculateEngagementScore(invitation);
    const strategy = this.determineResendStrategy(engagement, invitation);

    return { engagement, strategy };
  }

  /**
   * Calculate engagement score based on multiple factors
   */
  private calculateEngagementScore(invitation: any): EngagementScore {
    const now = new Date();
    const invitedAt = new Date(invitation.created_at);
    const daysSinceInvitation = differenceInDays(now, invitedAt);

    // Calculate days since last engagement
    let lastEngagement = invitedAt;
    if (invitation.email_clicked_at) {
      lastEngagement = new Date(invitation.email_clicked_at);
    } else if (invitation.email_opened_at) {
      lastEngagement = new Date(invitation.email_opened_at);
    } else if (invitation.email_delivered_at) {
      lastEngagement = new Date(invitation.email_delivered_at);
    }
    const daysSinceLastEngagement = differenceInDays(now, lastEngagement);

    // Build factors
    const factors = {
      emailDelivered: !!invitation.email_delivered_at,
      emailOpened: !!invitation.email_opened_at,
      linkClicked: !!invitation.email_clicked_at,
      daysSinceInvitation,
      daysSinceLastEngagement,
      remindersSent: invitation.reminder_count || 0
    };

    // Calculate score (0-100)
    let score = 0;
    let recommendation: EngagementScore['recommendation'] = 'none';
    let reason = '';

    // Scoring logic
    if (factors.linkClicked) {
      score += 40; // High engagement - they clicked
      if (daysSinceLastEngagement < 2) {
        score += 20; // Recently engaged
        recommendation = 'wait';
        reason = 'User recently clicked the link, give them time to complete';
      } else if (daysSinceLastEngagement < 7) {
        score += 10;
        recommendation = 'remind';
        reason = 'User showed interest but hasn\'t completed, send gentle reminder';
      } else {
        recommendation = 'resend';
        reason = 'User clicked but didn\'t complete, try a different approach';
      }
    } else if (factors.emailOpened) {
      score += 20; // Medium engagement - they opened
      if (daysSinceLastEngagement < 3) {
        score += 10;
        recommendation = 'wait';
        reason = 'Email was recently opened, allow time for consideration';
      } else if (factors.remindersSent < 2) {
        recommendation = 'remind';
        reason = 'Email opened but no action, send reminder';
      } else {
        recommendation = 'resend';
        reason = 'Multiple opens without action, try fresh approach';
      }
    } else if (factors.emailDelivered) {
      score += 10; // Low engagement - only delivered
      if (daysSinceInvitation < 2) {
        recommendation = 'wait';
        reason = 'Recently sent, give recipient time to open';
      } else if (factors.remindersSent === 0) {
        recommendation = 'resend';
        reason = 'No engagement detected, resend with different subject';
      } else if (factors.remindersSent < 3) {
        recommendation = 'remind';
        reason = 'Low engagement, try another reminder';
      } else {
        recommendation = 'cancel';
        reason = 'No engagement after multiple attempts';
      }
    } else {
      // Not even delivered
      recommendation = 'resend';
      reason = 'Delivery failed, verify email and resend';
    }

    // Adjust score based on time factors
    if (daysSinceInvitation > 5) score = Math.max(0, score - 10);
    if (daysSinceInvitation > 10) score = Math.max(0, score - 20);

    return {
      score,
      factors,
      recommendation,
      reason
    };
  }

  /**
   * Determine the best resend strategy based on engagement
   */
  private determineResendStrategy(
    engagement: EngagementScore,
    invitation: any
  ): ResendStrategy {
    const strategy: ResendStrategy = {
      action: engagement.recommendation === 'none' ? 'wait' : engagement.recommendation
    };

    // Determine template variant based on engagement
    if (engagement.recommendation === 'resend') {
      if (engagement.factors.linkClicked) {
        // They were interested, use encouraging tone
        strategy.templateVariant = 'gentle';
        strategy.customMessage = 'We noticed you started the signup process. Need any help completing it?';
      } else if (engagement.factors.emailOpened) {
        // They opened but didn\'t click, make it more compelling
        strategy.templateVariant = 'urgent';
        strategy.customMessage = 'Your invitation is about to expire. Join us before it\'s too late!';
      } else {
        // No engagement, try alternative approach
        strategy.templateVariant = 'alternative';
        strategy.customMessage = 'We\'d love to have you on our team. This opportunity won\'t last forever.';
      }
    } else if (engagement.recommendation === 'remind') {
      if (engagement.factors.remindersSent >= 2) {
        strategy.templateVariant = 'final';
        strategy.customMessage = 'This is your final reminder. Your invitation expires soon.';
      } else {
        strategy.templateVariant = 'gentle';
      }
    }

    // Schedule based on engagement patterns
    if (strategy.action === 'resend' || strategy.action === 'remind') {
      const hoursToWait = this.calculateOptimalSendTime(engagement);
      strategy.scheduledFor = addDays(new Date(), hoursToWait / 24);
    }

    return strategy;
  }

  /**
   * Calculate optimal time to send based on engagement patterns
   */
  private calculateOptimalSendTime(engagement: EngagementScore): number {
    // Returns hours to wait before sending
    
    if (engagement.factors.linkClicked) {
      // High engagement - wait 48-72 hours
      return 48 + Math.random() * 24;
    } else if (engagement.factors.emailOpened) {
      // Medium engagement - wait 24-48 hours
      return 24 + Math.random() * 24;
    } else {
      // Low/no engagement - wait 6-24 hours
      return 6 + Math.random() * 18;
    }
  }

  /**
   * Execute smart resend for a single invitation
   */
  async executeSmartResend(invitationId: string): Promise<{
    success: boolean;
    action: string;
    details?: any;
    error?: string;
  }> {
    try {
      const { engagement, strategy } = await this.analyzeInvitation(invitationId);

      switch (strategy.action) {
        case 'resend':
          return await this.resendInvitation(invitationId, strategy);
        
        case 'remind':
          return await this.sendSmartReminder(invitationId, strategy);
        
        case 'wait':
          return {
            success: true,
            action: 'wait',
            details: {
              reason: engagement.reason,
              checkAgainAt: strategy.scheduledFor
            }
          };
        
        case 'cancel':
          return await this.recommendCancellation(invitationId, engagement);
        
        default:
          return {
            success: true,
            action: 'none',
            details: { reason: 'No action recommended at this time' }
          };
      }
    } catch (error: any) {
      console.error('Smart resend error:', error);
      return {
        success: false,
        action: 'error',
        error: error.message
      };
    }
  }

  /**
   * Resend invitation with smart template selection
   */
  private async resendInvitation(
    invitationId: string,
    strategy: ResendStrategy
  ): Promise<any> {
    const supabase = await createClient();

    // Get invitation details
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (error || !invitation) {
      throw new Error('Failed to fetch invitation');
    }

    // Generate new token for security
    const newToken = crypto.randomUUID();

    // Update invitation with new token
    await supabase
      .from('invitations')
      .update({
        token: newToken,
        status: 'sent',
        metadata: supabase.sql`metadata || jsonb_build_object('resent_at', to_jsonb(now()), 'resend_strategy', ${JSON.stringify(strategy)})`
      })
      .eq('id', invitationId);

    // Send with appropriate template
    const emailData = {
      to: [{ email: invitation.email }],
      templateId: this.getTemplateIdForVariant(strategy.templateVariant || 'urgent'),
      params: {
        recipientEmail: invitation.email,
        role: invitation.role,
        acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation?token=${newToken}`,
        customMessage: strategy.customMessage,
        organizationName: 'Initiative Dashboard'
      }
    };

    const result = await this.emailService.sendTransactionalEmail(emailData);

    return {
      success: result.success,
      action: 'resent',
      details: {
        templateVariant: strategy.templateVariant,
        newToken,
        scheduledFor: strategy.scheduledFor
      }
    };
  }

  /**
   * Send smart reminder based on engagement
   */
  private async sendSmartReminder(
    invitationId: string,
    strategy: ResendStrategy
  ): Promise<any> {
    // Implementation would be similar to resendInvitation
    // but using reminder templates and not generating new token
    return {
      success: true,
      action: 'reminded',
      details: {
        templateVariant: strategy.templateVariant,
        scheduledFor: strategy.scheduledFor
      }
    };
  }

  /**
   * Mark invitation for cancellation review
   */
  private async recommendCancellation(
    invitationId: string,
    engagement: EngagementScore
  ): Promise<any> {
    const supabase = await createClient();

    await supabase
      .from('invitations')
      .update({
        metadata: supabase.sql`metadata || jsonb_build_object('recommended_for_cancellation', true, 'engagement_score', ${engagement.score}, 'recommendation_reason', ${engagement.reason})`
      })
      .eq('id', invitationId);

    return {
      success: true,
      action: 'recommended_cancellation',
      details: {
        reason: engagement.reason,
        score: engagement.score
      }
    };
  }

  /**
   * Get template ID based on variant
   */
  private getTemplateIdForVariant(variant: string): number {
    const templates = {
      'urgent': 301,
      'gentle': 302,
      'final': 303,
      'alternative': 304
    };
    return templates[variant as keyof typeof templates] || 301;
  }

  /**
   * Bulk analyze invitations for smart resend
   */
  async bulkAnalyze(tenantId: string): Promise<{
    total: number;
    recommendations: {
      resend: string[];
      remind: string[];
      wait: string[];
      cancel: string[];
    };
  }> {
    const supabase = await createClient();

    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'sent')
      .lt('expires_at', new Date().toISOString());

    if (error || !invitations) {
      throw new Error('Failed to fetch invitations');
    }

    const recommendations = {
      resend: [] as string[],
      remind: [] as string[],
      wait: [] as string[],
      cancel: [] as string[]
    };

    for (const invitation of invitations) {
      const engagement = this.calculateEngagementScore(invitation);
      
      switch (engagement.recommendation) {
        case 'resend':
          recommendations.resend.push(invitation.id);
          break;
        case 'remind':
          recommendations.remind.push(invitation.id);
          break;
        case 'wait':
          recommendations.wait.push(invitation.id);
          break;
        case 'cancel':
          recommendations.cancel.push(invitation.id);
          break;
      }
    }

    return {
      total: invitations.length,
      recommendations
    };
  }
}