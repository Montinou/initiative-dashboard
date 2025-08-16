# Email Services Integration Documentation

## Overview
The Initiative Dashboard uses Brevo (formerly Sendinblue) as the primary email service provider for transactional emails, particularly for the invitation system.

## Configuration

### Environment Variables
```env
# Brevo Configuration
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=Your Company Name
BREVO_WEBHOOK_SECRET=your_webhook_secret_here
```

## Brevo Service Implementation

### Service Class (`lib/email/brevo-service.ts`)
```typescript
import * as brevo from '@getbrevo/brevo';

export class BrevoEmailService {
  private transactionalApi: brevo.TransactionalEmailsApi;
  private contactsApi: brevo.ContactsApi;
  
  constructor() {
    const apiKey = process.env.BREVO_API_KEY;
    const defaultClient = brevo.ApiClient.instance;
    const apiKeyAuth = defaultClient.authentications['api-key'];
    apiKeyAuth.apiKey = apiKey;
    
    this.transactionalApi = new brevo.TransactionalEmailsApi();
    this.contactsApi = new brevo.ContactsApi();
  }
}
```

## Email Templates

### Template IDs
```typescript
export enum EmailTemplateId {
  INVITATION = 1,           // New invitation
  INVITATION_REMINDER = 2,  // Reminder email
  INVITATION_ACCEPTED = 3,  // Acceptance confirmation
  INVITATION_EXPIRING = 4,  // Expiration warning
}
```

### Template Variables
```typescript
interface TemplateVariables {
  // Recipient information
  recipientName: string;
  recipientEmail: string;
  
  // Inviter information
  inviterName: string;
  inviterEmail: string;
  
  // Organization details
  organizationName: string;
  tenantSubdomain: string;
  
  // Invitation specifics
  roleName: string;
  areaName?: string;
  customMessage?: string;
  invitationLink: string;
  expiresIn: string;
  
  // Additional context
  reminderNumber?: number;
  hoursUntilExpiry?: number;
}
```

## Sending Emails

### Single Email
```typescript
export async function sendInvitation(data: InvitationEmailData) {
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  
  sendSmtpEmail.templateId = EmailTemplateId.INVITATION;
  sendSmtpEmail.to = [{
    email: data.recipientEmail,
    name: data.recipientName
  }];
  
  sendSmtpEmail.params = {
    recipientName: data.recipientName,
    inviterName: data.inviterName,
    organizationName: data.organizationName,
    roleName: data.roleName,
    invitationLink: data.invitationLink,
    expiresIn: data.expiresIn,
    customMessage: data.customMessage,
  };
  
  sendSmtpEmail.headers = {
    'X-Invitation-ID': data.invitationId,
    'X-Tenant-Subdomain': data.tenantSubdomain
  };
  
  sendSmtpEmail.tags = ['invitation', data.roleName.toLowerCase()];
  
  const response = await this.transactionalApi.sendTransacEmail(sendSmtpEmail);
  
  return {
    success: true,
    messageId: response.messageId
  };
}
```

### Bulk Emails
```typescript
export async function sendBulkInvitations(recipients: InvitationEmailData[]) {
  const results = [];
  const batchSize = 10;
  
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(recipient => sendInvitation(recipient))
    );
    
    results.push(...batchResults);
    
    // Rate limiting delay
    if (i + batchSize < recipients.length) {
      await delay(1000);
    }
  }
  
  return results;
}
```

## Email Types

### 1. Invitation Email
```typescript
async function sendNewInvitation(
  invitation: Invitation,
  inviter: UserProfile
) {
  return await brevoService.sendInvitation({
    recipientEmail: invitation.email,
    recipientName: invitation.recipientName,
    inviterName: inviter.full_name,
    inviterEmail: inviter.email,
    organizationName: organization.name,
    tenantSubdomain: tenant.subdomain,
    roleName: invitation.role,
    areaName: area?.name,
    customMessage: invitation.custom_message,
    invitationLink: `${APP_URL}/auth/accept-invitation?token=${invitation.token}`,
    expiresIn: '7 days',
    invitationId: invitation.id,
    templateId: EmailTemplateId.INVITATION,
  });
}
```

### 2. Reminder Email
```typescript
async function sendReminder(
  invitation: Invitation,
  reminderNumber: number
) {
  const reminderTexts = [
    'This is a friendly reminder about your pending invitation.',
    'We noticed you haven\'t accepted your invitation yet.',
    'Last reminder: Your invitation is about to expire!',
  ];
  
  return await brevoService.sendInvitation({
    ...invitationData,
    templateId: EmailTemplateId.INVITATION_REMINDER,
    templateVariables: {
      reminderNumber,
      reminderText: reminderTexts[reminderNumber - 1],
    },
  });
}
```

### 3. Expiration Warning
```typescript
async function sendExpirationWarning(
  invitation: Invitation,
  hoursRemaining: number
) {
  return await brevoService.sendInvitation({
    ...invitationData,
    templateId: EmailTemplateId.INVITATION_EXPIRING,
    templateVariables: {
      hoursUntilExpiry: hoursRemaining,
      expiryWarningText: `Your invitation expires in ${hoursRemaining} hours`,
      urgentAction: true,
    },
  });
}
```

## Webhook Integration

### Webhook Setup
1. Configure webhook URL in Brevo dashboard
2. Set webhook events to track:
   - Email sent
   - Email delivered
   - Email opened
   - Email clicked
   - Email bounced
   - Email marked as spam

### Webhook Handler
```typescript
// API Route: /api/webhooks/brevo
export async function POST(req: Request) {
  const signature = req.headers.get('x-brevo-signature');
  const body = await req.text();
  
  // Verify signature
  if (!verifyWebhookSignature(signature, body)) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  const event = JSON.parse(body);
  
  // Process event
  await processEmailEvent(event);
  
  return new Response('OK', { status: 200 });
}
```

### Signature Verification
```typescript
function verifyWebhookSignature(
  signature: string,
  body: string
): boolean {
  const webhookSecret = process.env.BREVO_WEBHOOK_SECRET;
  
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');
  
  return signature === expectedSignature;
}
```

### Event Processing
```typescript
async function processEmailEvent(event: BrevoWebhookEvent) {
  const eventType = event.event;
  const messageId = event['message-id'];
  const email = event.email;
  
  switch (eventType) {
    case 'delivered':
      await updateEmailStatus(messageId, 'delivered');
      break;
      
    case 'opened':
      await recordEmailOpen(messageId, event.date);
      break;
      
    case 'clicked':
      await recordLinkClick(messageId, event.link);
      break;
      
    case 'hard_bounce':
    case 'soft_bounce':
      await handleBounce(email, event.reason);
      break;
      
    case 'spam':
      await handleSpamReport(email);
      break;
  }
}
```

## Contact Management

### Create/Update Contact
```typescript
export async function syncContactToBrevo(
  userProfile: UserProfile
) {
  const createContact = new brevo.CreateContact();
  
  createContact.email = userProfile.email;
  createContact.attributes = {
    FIRSTNAME: userProfile.first_name,
    LASTNAME: userProfile.last_name,
    ROLE: userProfile.role,
    TENANT: userProfile.tenant_id,
    AREA: userProfile.area_id,
  };
  
  createContact.listIds = [getListIdForRole(userProfile.role)];
  createContact.updateEnabled = true;
  
  await contactsApi.createContact(createContact);
}
```

### List Management
```typescript
const BREVO_LISTS = {
  ALL_USERS: 1,
  CEOS: 2,
  ADMINS: 3,
  MANAGERS: 4,
  INVITATIONS_PENDING: 5,
};

export async function addToList(
  email: string,
  listId: number
) {
  await contactsApi.addContactToList(listId, {
    emails: [email],
  });
}

export async function removeFromList(
  email: string,
  listId: number
) {
  await contactsApi.removeContactFromList(listId, {
    emails: [email],
  });
}
```

## Smart Sending Features

### Intelligent Resend Manager
```typescript
export class SmartResendManager {
  async shouldSendReminder(invitation: Invitation): Promise<boolean> {
    // Check reminder count
    if (invitation.reminder_count >= 3) {
      return false;
    }
    
    // Check time since last reminder
    const hoursSinceLastReminder = getHoursSince(
      invitation.last_reminder_sent
    );
    
    if (hoursSinceLastReminder < 48) {
      return false;
    }
    
    // Check email engagement
    const engagement = await getEmailEngagement(invitation.email);
    if (engagement.bounced || engagement.unsubscribed) {
      return false;
    }
    
    return true;
  }
  
  async getOptimalSendTime(email: string): Promise<Date> {
    // Analyze past engagement
    const history = await getEngagementHistory(email);
    
    // Find optimal hour
    const optimalHour = findMostActiveHour(history) || 10; // Default 10 AM
    
    // Schedule for next occurrence
    const sendTime = new Date();
    sendTime.setHours(optimalHour, 0, 0, 0);
    
    if (sendTime < new Date()) {
      sendTime.setDate(sendTime.getDate() + 1);
    }
    
    return sendTime;
  }
}
```

### Reminder Scheduler
```typescript
export class ReminderScheduler {
  async scheduleReminders() {
    const pendingInvitations = await getPendingInvitations();
    
    for (const invitation of pendingInvitations) {
      if (await shouldSendReminder(invitation)) {
        const sendTime = await getOptimalSendTime(invitation.email);
        
        await scheduleEmail({
          invitationId: invitation.id,
          type: 'reminder',
          scheduledFor: sendTime,
        });
      }
    }
  }
  
  async scheduleExpirationWarnings() {
    const expiringInvitations = await getExpiringInvitations(24); // 24 hours
    
    for (const invitation of expiringInvitations) {
      if (!invitation.expiration_warning_sent) {
        await scheduleEmail({
          invitationId: invitation.id,
          type: 'expiration_warning',
          scheduledFor: new Date(), // Send immediately
        });
      }
    }
  }
}
```

## Email Analytics

### Tracking Metrics
```typescript
interface EmailMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  spamReports: number;
  
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export async function getEmailMetrics(
  startDate: Date,
  endDate: Date
): Promise<EmailMetrics> {
  const stats = await brevoApi.getEmailEventReport({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    tags: 'invitation',
  });
  
  return calculateMetrics(stats);
}
```

### Engagement Tracking
```typescript
export async function trackEmailEngagement(
  invitationId: string
) {
  const events = await getEmailEvents(invitationId);
  
  return {
    sent: events.find(e => e.type === 'sent')?.timestamp,
    delivered: events.find(e => e.type === 'delivered')?.timestamp,
    firstOpen: events.find(e => e.type === 'opened')?.timestamp,
    totalOpens: events.filter(e => e.type === 'opened').length,
    clicks: events.filter(e => e.type === 'clicked').map(e => ({
      link: e.link,
      timestamp: e.timestamp,
    })),
  };
}
```

## Error Handling

### Retry Logic
```typescript
async function sendWithRetry(
  emailData: any,
  maxRetries: number = 3
): Promise<SendResult> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendEmail(emailData);
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on permanent failures
      if (isPermanentFailure(error)) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

function isPermanentFailure(error: any): boolean {
  const permanentCodes = [400, 401, 403, 404];
  return permanentCodes.includes(error.statusCode);
}
```

### Bounce Handling
```typescript
export async function handleBounce(
  email: string,
  reason: string
) {
  // Update contact status
  await updateContactStatus(email, 'bounced');
  
  // Log bounce
  await logBounce({
    email,
    reason,
    timestamp: new Date(),
  });
  
  // If hard bounce, prevent future sends
  if (isHardBounce(reason)) {
    await addToSuppressionList(email);
  }
}
```

## Testing

### Mock Service
```typescript
export class MockBrevoService implements EmailService {
  private sentEmails: any[] = [];
  
  async sendEmail(data: any): Promise<SendResult> {
    this.sentEmails.push(data);
    
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  }
  
  getSentEmails() {
    return this.sentEmails;
  }
  
  clear() {
    this.sentEmails = [];
  }
}

// Use in tests
const emailService = process.env.NODE_ENV === 'test'
  ? new MockBrevoService()
  : new BrevoEmailService();
```

### Test Templates
```typescript
describe('Email Templates', () => {
  it('should render invitation template correctly', async () => {
    const data = {
      recipientName: 'John Doe',
      inviterName: 'Jane Smith',
      organizationName: 'Acme Corp',
      roleName: 'Manager',
      invitationLink: 'https://example.com/invite/123',
    };
    
    const rendered = await renderTemplate(
      EmailTemplateId.INVITATION,
      data
    );
    
    expect(rendered).toContain('John Doe');
    expect(rendered).toContain('Jane Smith');
    expect(rendered).toContain('Manager');
    expect(rendered).toContain(data.invitationLink);
  });
});
```

## Best Practices

1. **Always verify webhook signatures**
2. **Implement retry logic with exponential backoff**
3. **Handle bounces and unsubscribes properly**
4. **Use templates for consistency**
5. **Track email engagement metrics**
6. **Implement rate limiting**
7. **Test with preview/sandbox mode**
8. **Monitor delivery rates**
9. **Maintain clean email lists**
10. **Comply with email regulations (GDPR, CAN-SPAM)**

## Monitoring

### Key Metrics
- Delivery rate (target: >95%)
- Open rate (target: >20%)
- Click rate (target: >5%)
- Bounce rate (target: <5%)
- Spam complaint rate (target: <0.1%)

### Alerts
```typescript
export async function checkEmailHealth() {
  const metrics = await getEmailMetrics(
    subDays(new Date(), 7),
    new Date()
  );
  
  const alerts = [];
  
  if (metrics.deliveryRate < 0.95) {
    alerts.push({
      level: 'warning',
      message: `Low delivery rate: ${metrics.deliveryRate}%`,
    });
  }
  
  if (metrics.bounceRate > 0.05) {
    alerts.push({
      level: 'error',
      message: `High bounce rate: ${metrics.bounceRate}%`,
    });
  }
  
  return alerts;
}
```

## Troubleshooting

### Common Issues

1. **Emails Not Sending**
   - Check API key validity
   - Verify sender domain
   - Check rate limits

2. **Low Delivery Rates**
   - Review bounce reasons
   - Check sender reputation
   - Verify SPF/DKIM records

3. **Template Errors**
   - Validate template variables
   - Check template ID
   - Test with preview mode

### Debug Mode
```typescript
export const EMAIL_DEBUG = process.env.NODE_ENV === 'development';

export function debugEmail(operation: string, data: any) {
  if (EMAIL_DEBUG) {
    console.log(`[Email Debug] ${operation}:`, data);
  }
}
```

## References

- [Brevo API Documentation](https://developers.brevo.com/docs)
- [Email Best Practices](https://developers.brevo.com/docs/email-best-practices)
- [Webhook Documentation](https://developers.brevo.com/docs/webhooks)
- [Template Guide](https://help.brevo.com/hc/en-us/articles/360000268730)