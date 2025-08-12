# Phase 2: Production Setup Guide

## Overview
This guide provides step-by-step instructions for deploying the Phase 2 invitation system to production.

## Prerequisites
- [ ] Brevo account with API access
- [ ] Supabase project with database access
- [ ] Vercel or hosting platform configured
- [ ] Domain with email sending capabilities (SPF, DKIM, DMARC)

---

## Step 1: Environment Variables Configuration

### Required Environment Variables
Add these to your production environment (Vercel, Railway, etc.):

```env
# Existing variables (should already be set)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-production-domain.com

# New variables for invitation system
BREVO_API_KEY=xkeysib-your-brevo-api-key
BREVO_WEBHOOK_SECRET=generate-a-secure-random-string

# Optional configuration
INVITATION_EXPIRY_DAYS=7
MAX_BULK_INVITES=100
ENABLE_EMAIL_TRACKING=true
```

### Generate Webhook Secret
```bash
# Generate a secure webhook secret
openssl rand -hex 32
```

---

## Step 2: Brevo Email Service Configuration

### 2.1 Create Brevo Account
1. Sign up at [https://www.brevo.com](https://www.brevo.com)
2. Verify your email and complete account setup
3. Navigate to Settings > API Keys
4. Generate a new API key with Transactional Email permissions

### 2.2 Configure Domain Authentication
1. Go to Senders & IPs > Domains
2. Add your domain
3. Configure SPF record:
   ```
   TXT record: v=spf1 include:sendinblue.com ~all
   ```
4. Configure DKIM:
   - Copy the DKIM records provided by Brevo
   - Add them to your DNS as TXT records
5. Verify domain ownership

### 2.3 Create Email Templates
1. Navigate to Campaigns > Email Templates
2. Create templates for:
   - **Invitation Email** (Template ID: 1)
   - **Reminder Email** (Template ID: 2)
   - **Accepted Confirmation** (Template ID: 3)
   - **Expiration Warning** (Template ID: 4)

#### Sample Invitation Template
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>You're Invited to {{params.organizationName}}</title>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
    <h1>Welcome to {{params.organizationName}}!</h1>
    
    <p>Hi {{params.recipientName}},</p>
    
    <p>{{params.inviterName}} has invited you to join <strong>{{params.organizationName}}</strong> 
    as a <strong>{{params.roleName}}</strong>{{#if params.areaName}} in the {{params.areaName}} team{{/if}}.</p>
    
    {{#if params.customMessage}}
    <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin: 20px 0;">
      {{params.customMessage}}
    </blockquote>
    {{/if}}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{params.invitationLink}}" 
         style="background: #4F46E5; color: white; padding: 12px 30px; 
                text-decoration: none; border-radius: 6px; display: inline-block;">
        Accept Invitation
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      This invitation expires in {{params.expiresIn}}. 
      If you have any questions, please contact {{params.inviterEmail}}.
    </p>
    
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
    
    <p style="color: #999; font-size: 12px; text-align: center;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="{{params.invitationLink}}" style="color: #4F46E5;">{{params.invitationLink}}</a>
    </p>
  </div>
</body>
</html>
```

### 2.4 Configure Webhook
1. Go to Transactional > Settings > Webhook
2. Add webhook URL:
   ```
   https://your-production-domain.com/api/invitations/v2/webhook
   ```
3. Select events to track:
   - [x] Sent
   - [x] Delivered
   - [x] Opened
   - [x] Clicked
   - [x] Hard Bounce
   - [x] Soft Bounce
   - [x] Blocked
   - [x] Spam
4. Copy the webhook secret and add to environment variables

---

## Step 3: Database Migration

### 3.1 Run Migration Script
Execute the migration in Supabase SQL Editor:

```sql
-- Run the migration from:
-- /supabase/migrations/20250112_enhance_invitations_table.sql
```

### 3.2 Verify Migration
```sql
-- Check that new columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND column_name IN (
  'email_sent_at', 
  'brevo_message_id', 
  'invitation_type'
);

-- Check that new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'invitation_analytics',
  'invitation_batches',
  'invitation_templates'
);

-- Verify RLS policies
SELECT policyname 
FROM pg_policies 
WHERE tablename IN (
  'invitation_analytics',
  'invitation_batches',
  'invitation_templates'
);
```

### 3.3 Create Helper Functions (if not in migration)
```sql
-- Create RPC function for average time to accept
CREATE OR REPLACE FUNCTION get_avg_time_to_accept(p_tenant_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN (
    SELECT AVG(
      EXTRACT(EPOCH FROM (accepted_at - email_sent_at)) / 3600
    )
    FROM invitations
    WHERE tenant_id = p_tenant_id
    AND accepted_at IS NOT NULL
    AND email_sent_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Create increment function for batch statistics
CREATE OR REPLACE FUNCTION increment(
  table_name text,
  column_name text,
  row_id uuid,
  increment_by integer DEFAULT 1
)
RETURNS void AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
    table_name, column_name, column_name
  ) USING increment_by, row_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Step 4: Application Deployment

### 4.1 Install Dependencies
```bash
npm install @getbrevo/brevo
```

### 4.2 Deploy to Vercel
```bash
# Build and test locally first
npm run build

# Deploy to production
vercel --prod
```

### 4.3 Verify Deployment
1. Check environment variables are loaded:
   ```
   https://your-domain.com/api/invitations/v2/webhook (GET)
   ```
2. Response should show:
   ```json
   {
     "status": "healthy",
     "configured": true,
     "webhookSecretConfigured": true
   }
   ```

---

## Step 5: Testing in Production

### 5.1 Test Single Invitation
```bash
curl -X POST https://your-domain.com/api/invitations/v2/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "role": "Manager",
    "customMessage": "Welcome to our team!",
    "sendImmediately": true
  }'
```

### 5.2 Test Webhook
1. Send a test invitation
2. Check Brevo dashboard for email status
3. Verify webhook events in database:
```sql
SELECT * FROM invitation_analytics 
WHERE invitation_id = 'your-invitation-id'
ORDER BY event_timestamp DESC;
```

### 5.3 Test Email Tracking
```sql
-- Check email engagement
SELECT 
  email,
  email_sent_at,
  email_delivered_at,
  email_opened_at,
  email_clicked_at
FROM invitations
WHERE email = 'test@example.com';
```

---

## Step 6: Monitoring Setup

### 6.1 Set Up Alerts
Configure alerts in your monitoring system for:
- Email delivery rate < 95%
- Webhook errors > 10 per hour
- Invitation acceptance rate < 50%
- Database connection errors

### 6.2 Create Monitoring Dashboard
Track these metrics:
- Total invitations sent
- Delivery rate
- Open rate
- Click rate
- Acceptance rate
- Average time to accept
- Expired invitations

### 6.3 Log Aggregation
Ensure logs are being collected for:
- API endpoint errors
- Email sending failures
- Webhook processing errors
- Permission denials

---

## Step 7: Security Checklist

- [ ] BREVO_API_KEY is kept secret and not exposed in client code
- [ ] BREVO_WEBHOOK_SECRET is configured and verified
- [ ] RLS policies are enabled on all invitation tables
- [ ] API endpoints validate user permissions
- [ ] Invitation tokens are cryptographically secure (UUID v4)
- [ ] Email templates are sanitized to prevent XSS
- [ ] Rate limiting is configured on API endpoints
- [ ] CORS is properly configured
- [ ] Database connections use SSL

---

## Step 8: Performance Optimization

### 8.1 Database Indexes
Verify indexes are created:
```sql
-- List all indexes on invitation tables
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN (
  'invitations',
  'invitation_analytics',
  'invitation_batches'
);
```

### 8.2 Email Queue Configuration
For high-volume sending, consider:
- Implementing Redis queue for email jobs
- Setting up worker processes for email sending
- Configuring batch size limits

### 8.3 Caching Strategy
- Cache invitation statistics (5-minute TTL)
- Use CDN for static assets
- Implement database connection pooling

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Emails Not Sending
- Check BREVO_API_KEY is correct
- Verify domain authentication in Brevo
- Check API quota limits
- Review error logs in `/api/invitations/v2/send`

#### 2. Webhook Not Receiving Events
- Verify webhook URL is publicly accessible
- Check BREVO_WEBHOOK_SECRET matches
- Ensure webhook endpoint returns 200 status
- Check Brevo webhook logs

#### 3. Permission Errors
- Verify RLS policies are enabled
- Check user role in user_profiles table
- Ensure tenant_id is correctly set
- Review permission validation logic

#### 4. Database Migration Failures
- Check for existing columns before adding
- Ensure proper permissions for creating tables
- Verify foreign key constraints
- Run migrations in transaction

---

## Rollback Plan

If issues occur, follow this rollback procedure:

1. **Disable invitation endpoints**:
   - Set feature flag to disable new invitation system
   - Route traffic to old endpoints if available

2. **Revert database changes** (if needed):
   ```sql
   -- Remove new columns (careful - this loses data)
   ALTER TABLE invitations 
   DROP COLUMN IF EXISTS email_sent_at,
   DROP COLUMN IF EXISTS brevo_message_id;
   
   -- Disable new tables
   ALTER TABLE invitation_analytics RENAME TO invitation_analytics_backup;
   ALTER TABLE invitation_batches RENAME TO invitation_batches_backup;
   ```

3. **Restore previous deployment**:
   ```bash
   vercel rollback
   ```

4. **Monitor and assess**:
   - Check error rates return to normal
   - Verify core functionality works
   - Plan fixes for identified issues

---

## Maintenance Tasks

### Daily
- Monitor email delivery rates
- Check for expired invitations
- Review error logs

### Weekly
- Analyze invitation acceptance rates
- Review webhook processing performance
- Check email engagement metrics

### Monthly
- Audit user permissions
- Review and optimize slow queries
- Update email templates if needed
- Clean up old invitation data (optional)

---

## Support Contacts

- **Brevo Support**: [https://help.brevo.com](https://help.brevo.com)
- **Supabase Support**: [https://supabase.com/support](https://supabase.com/support)
- **Internal Team**: Document your team contacts here

---

## Appendix: API Testing Collection

### Postman Collection
Import this collection for testing all endpoints:

```json
{
  "info": {
    "name": "Invitation System v2",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{jwt_token}}",
        "type": "string"
      }
    ]
  },
  "item": [
    {
      "name": "Send Single Invitation",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/invitations/v2/send",
        "body": {
          "mode": "raw",
          "raw": {
            "email": "user@example.com",
            "role": "Manager",
            "areaId": null,
            "customMessage": "Welcome!",
            "sendImmediately": true
          }
        }
      }
    },
    {
      "name": "Send Bulk Invitations",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/invitations/v2/send",
        "body": {
          "mode": "raw",
          "raw": {
            "emails": ["user1@example.com", "user2@example.com"],
            "role": "Manager",
            "batchName": "Q1 2025 Hires",
            "sendImmediately": true
          }
        }
      }
    },
    {
      "name": "List Invitations",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/invitations/v2/list?page=1&limit=20&status=sent&includeAnalytics=true"
      }
    },
    {
      "name": "Resend Invitation",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/invitations/v2/resend",
        "body": {
          "mode": "raw",
          "raw": {
            "invitationId": "uuid-here",
            "updateMessage": true,
            "customMessage": "Reminder: Please join us!"
          }
        }
      }
    },
    {
      "name": "Cancel Invitation",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/invitations/v2/cancel",
        "body": {
          "mode": "raw",
          "raw": {
            "invitationId": "uuid-here",
            "reason": "Position filled"
          }
        }
      }
    }
  ]
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-12  
**Status**: Ready for Production Deployment