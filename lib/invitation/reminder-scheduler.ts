import { createClient } from '@/utils/supabase/server';
import { BrevoEmailService } from '@/lib/email/brevo-service';
import { addDays, differenceInDays, isAfter } from 'date-fns';

interface ReminderSchedule {
  daysSinceInvitation: number;
  reminderNumber: number;
  messageVariant: 'gentle' | 'urgent' | 'final';
}

interface SmartReminderConfig {
  maxReminders: number;
  reminderSchedule: ReminderSchedule[];
  engagementBasedScheduling: boolean;
  skipWeekendsForReminders: boolean;
}

export class InvitationReminderScheduler {
  private emailService: BrevoEmailService;
  private config: SmartReminderConfig;

  constructor() {
    this.emailService = new BrevoEmailService();
    this.config = {
      maxReminders: 3,
      reminderSchedule: [
        { daysSinceInvitation: 2, reminderNumber: 1, messageVariant: 'gentle' },
        { daysSinceInvitation: 4, reminderNumber: 2, messageVariant: 'urgent' },
        { daysSinceInvitation: 6, reminderNumber: 3, messageVariant: 'final' }
      ],
      engagementBasedScheduling: true,
      skipWeekendsForReminders: true
    };
  }

  /**
   * Process all pending invitations and send reminders as needed
   */
  async processReminders(): Promise<{
    processed: number;
    sent: number;
    skipped: number;
    errors: string[];
  }> {
    const supabase = await createClient();
    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: [] as string[]
    };

    try {
      // Fetch pending invitations that haven't expired
      const { data: invitations, error } = await supabase
        .from('invitations')
        .select(`
          *,
          sent_by:user_profiles!invitations_sent_by_fkey(full_name, email),
          area:areas(name)
        `)
        .eq('status', 'sent')
        .lt('expires_at', new Date().toISOString())
        .lt('reminder_count', this.config.maxReminders);

      if (error) throw error;

      for (const invitation of invitations || []) {
        results.processed++;
        
        try {
          const shouldSend = await this.shouldSendReminder(invitation);
          
          if (shouldSend) {
            const sent = await this.sendSmartReminder(invitation);
            if (sent) {
              results.sent++;
              await this.updateReminderTracking(invitation.id);
            } else {
              results.skipped++;
            }
          } else {
            results.skipped++;
          }
        } catch (error: any) {
          results.errors.push(`Failed for ${invitation.email}: ${error.message}`);
        }
      }

      return results;
    } catch (error: any) {
      console.error('Reminder processing error:', error);
      results.errors.push(`General error: ${error.message}`);
      return results;
    }
  }

  /**
   * Determine if a reminder should be sent based on smart logic
   */
  private async shouldSendReminder(invitation: any): Promise<boolean> {
    const now = new Date();
    const invitedAt = new Date(invitation.created_at);
    const daysSinceInvitation = differenceInDays(now, invitedAt);

    // Check if invitation has expired
    if (isAfter(now, new Date(invitation.expires_at))) {
      return false;
    }

    // Skip weekends if configured
    if (this.config.skipWeekendsForReminders) {
      const dayOfWeek = now.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false;
      }
    }

    // Check engagement-based scheduling
    if (this.config.engagementBasedScheduling) {
      // If email was opened but not clicked, wait longer
      if (invitation.email_opened_at && !invitation.email_clicked_at) {
        const daysSinceOpen = differenceInDays(now, new Date(invitation.email_opened_at));
        if (daysSinceOpen < 2) {
          return false; // Give them more time
        }
      }

      // If link was clicked recently, don't remind yet
      if (invitation.email_clicked_at) {
        const daysSinceClick = differenceInDays(now, new Date(invitation.email_clicked_at));
        if (daysSinceClick < 3) {
          return false; // They're likely considering it
        }
      }
    }

    // Check reminder schedule
    const nextReminder = this.config.reminderSchedule.find(
      schedule => 
        schedule.reminderNumber === (invitation.reminder_count + 1) &&
        daysSinceInvitation >= schedule.daysSinceInvitation
    );

    return !!nextReminder;
  }

  /**
   * Send a smart reminder with personalized messaging
   */
  private async sendSmartReminder(invitation: any): Promise<boolean> {
    const reminderNumber = invitation.reminder_count + 1;
    const schedule = this.config.reminderSchedule.find(
      s => s.reminderNumber === reminderNumber
    );

    if (!schedule) return false;

    // Determine message variant based on engagement
    let messageVariant = schedule.messageVariant;
    if (invitation.email_clicked_at) {
      // They showed interest, be more encouraging
      messageVariant = 'gentle';
    } else if (!invitation.email_opened_at) {
      // They haven't even opened it, be more attention-grabbing
      messageVariant = 'urgent';
    }

    // Calculate days remaining
    const daysRemaining = differenceInDays(
      new Date(invitation.expires_at),
      new Date()
    );

    // Prepare reminder data
    const reminderData = {
      to: [{ email: invitation.email }],
      templateId: this.getTemplateId(messageVariant, reminderNumber),
      params: {
        recipientEmail: invitation.email,
        role: invitation.role,
        areaName: invitation.area?.name || 'the team',
        inviterName: invitation.sent_by?.full_name || 'Your team',
        inviterEmail: invitation.sent_by?.email,
        acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation?token=${invitation.token}`,
        daysRemaining,
        reminderNumber,
        customMessage: invitation.custom_message,
        organizationName: 'Initiative Dashboard'
      }
    };

    try {
      const result = await this.emailService.sendTransactionalEmail(reminderData);
      
      if (result.success) {
        console.log(`Reminder ${reminderNumber} sent to ${invitation.email}`);
        return true;
      } else {
        console.error(`Failed to send reminder to ${invitation.email}:`, result.error);
        return false;
      }
    } catch (error) {
      console.error('Reminder send error:', error);
      return false;
    }
  }

  /**
   * Get the appropriate template ID based on variant and reminder number
   */
  private getTemplateId(variant: string, reminderNumber: number): number {
    // Template IDs from Brevo (these would be configured in Brevo)
    const templates = {
      'gentle-1': 101,
      'gentle-2': 102,
      'gentle-3': 103,
      'urgent-1': 201,
      'urgent-2': 202,
      'urgent-3': 203,
      'final-1': 301,
      'final-2': 302,
      'final-3': 303
    };

    const key = `${variant}-${reminderNumber}` as keyof typeof templates;
    return templates[key] || 101; // Default to first gentle reminder
  }

  /**
   * Update reminder tracking in the database
   */
  private async updateReminderTracking(invitationId: string): Promise<void> {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('invitations')
      .update({
        reminder_count: supabase.rpc('increment_reminder_count'),
        last_reminder_sent: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (error) {
      console.error('Failed to update reminder tracking:', error);
    }
  }

  /**
   * Get upcoming reminders for dashboard display
   */
  async getUpcomingReminders(tenantId: string): Promise<{
    total: number;
    byDay: Record<string, number>;
    byStatus: {
      gentle: number;
      urgent: number;
      final: number;
    };
  }> {
    const supabase = await createClient();
    
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'sent')
      .lt('reminder_count', this.config.maxReminders)
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Failed to fetch upcoming reminders:', error);
      return { total: 0, byDay: {}, byStatus: { gentle: 0, urgent: 0, final: 0 } };
    }

    const upcomingByDay: Record<string, number> = {};
    const byStatus = { gentle: 0, urgent: 0, final: 0 };
    let total = 0;

    (invitations || []).forEach(invitation => {
      const nextReminderNumber = invitation.reminder_count + 1;
      const schedule = this.config.reminderSchedule.find(
        s => s.reminderNumber === nextReminderNumber
      );

      if (schedule) {
        const reminderDate = addDays(
          new Date(invitation.created_at),
          schedule.daysSinceInvitation
        );
        const dateKey = reminderDate.toISOString().split('T')[0];
        
        upcomingByDay[dateKey] = (upcomingByDay[dateKey] || 0) + 1;
        byStatus[schedule.messageVariant]++;
        total++;
      }
    });

    return { total, byDay: upcomingByDay, byStatus };
  }

  /**
   * Cancel all pending reminders for a specific invitation
   */
  async cancelReminders(invitationId: string): Promise<boolean> {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('invitations')
      .update({
        reminder_count: this.config.maxReminders, // Set to max to prevent further reminders
        metadata: supabase.sql`metadata || '{"reminders_cancelled": true}'::jsonb`
      })
      .eq('id', invitationId);

    return !error;
  }

  /**
   * Bulk schedule reminders for multiple invitations
   */
  async scheduleMultipleReminders(
    invitationIds: string[],
    customSchedule?: ReminderSchedule[]
  ): Promise<{
    scheduled: number;
    failed: number;
    errors: string[];
  }> {
    const results = { scheduled: 0, failed: 0, errors: [] as string[] };
    
    // Temporarily override schedule if custom one provided
    const originalSchedule = this.config.reminderSchedule;
    if (customSchedule) {
      this.config.reminderSchedule = customSchedule;
    }

    for (const id of invitationIds) {
      try {
        // Mark invitation for reminder processing
        const supabase = await createClient();
        const { error } = await supabase
          .from('invitations')
          .update({
            metadata: supabase.sql`metadata || '{"scheduled_for_reminders": true}'::jsonb`
          })
          .eq('id', id);

        if (error) throw error;
        results.scheduled++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Failed to schedule ${id}: ${error.message}`);
      }
    }

    // Restore original schedule
    if (customSchedule) {
      this.config.reminderSchedule = originalSchedule;
    }

    return results;
  }
}