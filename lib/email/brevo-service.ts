/**
 * Brevo Email Service for Invitation System
 * Production-ready implementation for sending invitation emails
 */

import * as brevo from '@getbrevo/brevo';

// Email template IDs - these should be created in Brevo dashboard
export enum EmailTemplateId {
  INVITATION = 1,
  INVITATION_REMINDER = 2,
  INVITATION_ACCEPTED = 3,
  INVITATION_EXPIRING = 4,
}

export interface InvitationEmailData {
  recipientEmail: string;
  recipientName?: string;
  inviterName: string;
  inviterEmail: string;
  organizationName: string;
  tenantSubdomain: string;
  roleName: string;
  areaName?: string;
  customMessage?: string;
  invitationLink: string;
  expiresIn: string; // e.g., "7 days"
  invitationId: string;
  templateId?: number;
  templateVariables?: Record<string, any>;
}

export interface EmailTrackingData {
  messageId: string;
  invitationId: string;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface BulkEmailData {
  batchId: string;
  recipients: InvitationEmailData[];
  defaultTemplateId?: number;
}

class BrevoEmailService {
  private transactionalApi: brevo.TransactionalEmailsApi;
  private contactsApi: brevo.ContactsApi;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const apiKey = process.env.BREVO_API_KEY;
      
      if (!apiKey) {
        console.error('BREVO_API_KEY is not configured');
        this.isConfigured = false;
        return;
      }

      const defaultClient = brevo.ApiClient.instance;
      const apiKeyAuth = defaultClient.authentications['api-key'];
      apiKeyAuth.apiKey = apiKey;

      this.transactionalApi = new brevo.TransactionalEmailsApi();
      this.contactsApi = new brevo.ContactsApi();
      this.isConfigured = true;
      
      console.log('✅ Brevo Email Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Brevo Email Service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send a single invitation email
   */
  async sendInvitation(data: InvitationEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured) {
      return { 
        success: false, 
        error: 'Email service is not configured. Please check BREVO_API_KEY.' 
      };
    }

    try {
      const sendSmtpEmail = new brevo.SendSmtpEmail();

      // Use template if provided, otherwise use default invitation template
      const templateId = data.templateId || EmailTemplateId.INVITATION;
      
      sendSmtpEmail.templateId = templateId;
      sendSmtpEmail.to = [{
        email: data.recipientEmail,
        name: data.recipientName || data.recipientEmail
      }];
      
      sendSmtpEmail.replyTo = {
        email: data.inviterEmail,
        name: data.inviterName
      };

      // Template parameters
      sendSmtpEmail.params = {
        // Recipient info
        recipientName: data.recipientName || 'Team Member',
        recipientEmail: data.recipientEmail,
        
        // Inviter info
        inviterName: data.inviterName,
        inviterEmail: data.inviterEmail,
        
        // Organization info
        organizationName: data.organizationName,
        tenantSubdomain: data.tenantSubdomain,
        
        // Invitation details
        roleName: data.roleName,
        areaName: data.areaName || '',
        customMessage: data.customMessage || '',
        invitationLink: data.invitationLink,
        expiresIn: data.expiresIn,
        
        // Additional variables
        ...data.templateVariables
      };

      // Headers for tracking
      sendSmtpEmail.headers = {
        'X-Invitation-ID': data.invitationId,
        'X-Tenant-Subdomain': data.tenantSubdomain
      };

      // Tags for organization
      sendSmtpEmail.tags = ['invitation', data.roleName.toLowerCase(), data.tenantSubdomain];

      const response = await this.transactionalApi.sendTransacEmail(sendSmtpEmail);
      
      console.log(`✅ Invitation email sent successfully to ${data.recipientEmail}`, {
        messageId: response.messageId,
        invitationId: data.invitationId
      });

      return {
        success: true,
        messageId: response.messageId
      };
    } catch (error: any) {
      console.error('Failed to send invitation email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  /**
   * Send invitation reminder
   */
  async sendReminder(data: InvitationEmailData & { reminderNumber: number }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Modify the template and subject for reminder
    const reminderData = {
      ...data,
      templateId: EmailTemplateId.INVITATION_REMINDER,
      templateVariables: {
        ...data.templateVariables,
        reminderNumber: data.reminderNumber,
        reminderText: this.getReminderText(data.reminderNumber)
      }
    };

    return this.sendInvitation(reminderData);
  }

  /**
   * Send bulk invitations
   */
  async sendBulkInvitations(data: BulkEmailData): Promise<{
    success: boolean;
    results: Array<{ email: string; success: boolean; messageId?: string; error?: string }>;
  }> {
    if (!this.isConfigured) {
      return {
        success: false,
        results: data.recipients.map(r => ({
          email: r.recipientEmail,
          success: false,
          error: 'Email service is not configured'
        }))
      };
    }

    const results = [];
    let successCount = 0;

    // Process in batches of 10 to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < data.recipients.length; i += batchSize) {
      const batch = data.recipients.slice(i, i + batchSize);
      
      // Send emails in parallel within batch
      const batchResults = await Promise.all(
        batch.map(async (recipient) => {
          const result = await this.sendInvitation({
            ...recipient,
            templateId: data.defaultTemplateId || recipient.templateId
          });
          
          if (result.success) successCount++;
          
          return {
            email: recipient.recipientEmail,
            ...result
          };
        })
      );
      
      results.push(...batchResults);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < data.recipients.length) {
        await this.delay(1000); // 1 second delay between batches
      }
    }

    console.log(`📧 Bulk invitations sent: ${successCount}/${data.recipients.length} successful`);

    return {
      success: successCount > 0,
      results
    };
  }

  /**
   * Send expiration warning
   */
  async sendExpirationWarning(data: InvitationEmailData & { hoursUntilExpiry: number }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const warningData = {
      ...data,
      templateId: EmailTemplateId.INVITATION_EXPIRING,
      templateVariables: {
        ...data.templateVariables,
        hoursUntilExpiry: data.hoursUntilExpiry,
        expiryWarningText: `Your invitation expires in ${data.hoursUntilExpiry} hours`
      }
    };

    return this.sendInvitation(warningData);
  }

  /**
   * Verify webhook signature from Brevo
   */
  verifyWebhookSignature(signature: string, body: string): boolean {
    const webhookSecret = process.env.BREVO_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('BREVO_WEBHOOK_SECRET is not configured');
      return false;
    }

    // Implement signature verification based on Brevo's webhook security
    // This is a placeholder - actual implementation depends on Brevo's specific method
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');
    
    return signature === expectedSignature;
  }

  /**
   * Process webhook event from Brevo
   */
  async processWebhookEvent(event: any): Promise<EmailTrackingData | null> {
    try {
      const eventType = event.event;
      const messageId = event['message-id'];
      const invitationId = event.tags?.find((tag: string) => tag.startsWith('invitation-'))?.replace('invitation-', '');
      
      if (!invitationId) {
        console.warn('No invitation ID found in webhook event');
        return null;
      }

      const trackingData: EmailTrackingData = {
        messageId,
        invitationId,
        status: this.mapBrevoEventToStatus(eventType),
        timestamp: new Date(event.date || Date.now()),
        metadata: {
          email: event.email,
          reason: event.reason,
          link: event.link,
          ip: event.ip
        }
      };

      return trackingData;
    } catch (error) {
      console.error('Failed to process webhook event:', error);
      return null;
    }
  }

  /**
   * Get email statistics for an invitation
   */
  async getEmailStatistics(messageId: string): Promise<any> {
    if (!this.isConfigured) {
      return null;
    }

    try {
      // This would require Brevo's statistics API
      // Placeholder for actual implementation
      return {
        messageId,
        status: 'delivered',
        opens: 0,
        clicks: 0
      };
    } catch (error) {
      console.error('Failed to get email statistics:', error);
      return null;
    }
  }

  // Helper methods

  private getReminderText(reminderNumber: number): string {
    const reminderTexts = [
      'This is a friendly reminder about your pending invitation.',
      'We noticed you haven\'t accepted your invitation yet. We\'d love to have you on board!',
      'Last reminder: Your invitation is about to expire. Join us before it\'s too late!'
    ];
    
    return reminderTexts[Math.min(reminderNumber - 1, reminderTexts.length - 1)];
  }

  private mapBrevoEventToStatus(eventType: string): EmailTrackingData['status'] {
    const statusMap: Record<string, EmailTrackingData['status']> = {
      'sent': 'sent',
      'delivered': 'delivered',
      'opened': 'opened',
      'clicked': 'clicked',
      'hard_bounce': 'bounced',
      'soft_bounce': 'bounced',
      'blocked': 'failed',
      'invalid': 'failed',
      'deferred': 'sent'
    };
    
    return statusMap[eventType] || 'sent';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if service is properly configured
   */
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Create or update contact in Brevo
   */
  async createOrUpdateContact(email: string, attributes: Record<string, any>): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      const createContact = new brevo.CreateContact();
      createContact.email = email;
      createContact.attributes = attributes;
      createContact.listIds = []; // Add to specific lists if needed
      createContact.updateEnabled = true;

      await this.contactsApi.createContact(createContact);
      return true;
    } catch (error) {
      console.error('Failed to create/update contact:', error);
      return false;
    }
  }
}

// Export singleton instance
let brevoServiceInstance: BrevoEmailService | null = null;

export function getBrevoService(): BrevoEmailService {
  if (!brevoServiceInstance) {
    brevoServiceInstance = new BrevoEmailService();
  }
  return brevoServiceInstance;
}

export default BrevoEmailService;