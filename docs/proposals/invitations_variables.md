# Invitation System - Required Environment Variables

## Current Status
Since Brevo (SendinBlue) is already configured in production and local environments, only 5 additional environment variables are needed to make the invitation system fully functional.

---

## ✅ Variables You Already Have
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL                    ✓ Already configured
NEXT_PUBLIC_SUPABASE_ANON_KEY              ✓ Already configured
SUPABASE_SERVICE_ROLE_KEY                  ✓ Already configured

# Brevo Email Service
BREVO_API_KEY                               ✓ Already configured
```

---

## 🔴 Variables to Add (5 Required)

### 1. Application URL
```env
NEXT_PUBLIC_APP_URL=https://siga-turismo.vercel.app
```
- **Purpose**: Generates invitation acceptance links
- **Local value**: `http://localhost:3000`
- **Production value**: `https://siga-turismo.vercel.app`
- **Used in**: All invitation emails for the "Accept Invitation" button

### 2. Brevo Webhook Secret
```env
BREVO_WEBHOOK_SECRET=your_webhook_secret_here
```
- **Purpose**: Validates webhook requests from Brevo for email tracking
- **How to get it**:
  1. Go to Brevo dashboard → Transactional → Settings → Webhooks
  2. Add webhook URL: `https://siga-turismo.vercel.app/api/invitations/v2/webhook`
  3. Select events: sent, delivered, opened, clicked, bounced
  4. Brevo generates a secret - copy it
- **Critical for**: Email open/click tracking and engagement analytics

### 3. Brevo Sender Email
```env
BREVO_SENDER_EMAIL=noreply@siga-turismo.com
```
- **Purpose**: "From" email address for all invitations
- **Requirements**: Must be verified in your Brevo account
- **Recommended**: Use a subdomain like `noreply@` or `invitations@`

### 4. Brevo Sender Name
```env
BREVO_SENDER_NAME=SIGA Tourism
```
- **Purpose**: Display name shown in email clients
- **Examples**: "SIGA Tourism", "SIGA Dashboard", "Initiative Dashboard"
- **Best practice**: Keep it short and recognizable

### 5. Cron API Key
```env
CRON_API_KEY=a7f3b8d9e2c5f1a4b7d3e9f2c5a8b4d7e3f9c2a5b8d4e7f3a9c5b2d8e4f7a3c9
```
- **Purpose**: Secures automated reminder and cleanup endpoints
- **Generate with**: 
  ```bash
  openssl rand -hex 32
  ```
- **Used for**: Automated reminders (9 AM, 2 PM) and expired invitation cleanup (2 AM)

---

## 📋 Quick Setup Commands

### For Local Development (.env.local)
```bash
# Add all variables at once
cat >> .env.local << 'EOF'

# Invitation System Variables
NEXT_PUBLIC_APP_URL=http://localhost:3000
BREVO_SENDER_EMAIL=noreply@siga-turismo.com
BREVO_SENDER_NAME=SIGA Tourism
CRON_API_KEY=$(openssl rand -hex 32)
# BREVO_WEBHOOK_SECRET=add_after_webhook_setup
EOF
```

### For Production (Vercel CLI)
```bash
# Add each variable to Vercel
vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://siga-turismo.vercel.app

vercel env add BREVO_SENDER_EMAIL production
# Enter: noreply@siga-turismo.com

vercel env add BREVO_SENDER_NAME production
# Enter: SIGA Tourism

vercel env add CRON_API_KEY production
# Enter: [paste your generated 32-character hex string]

vercel env add BREVO_WEBHOOK_SECRET production
# Enter: [paste secret from Brevo webhook setup]
```

---

## 🔍 Verification

### Test Your Configuration
After adding the variables, test with this simple check:

```javascript
// Run in browser console on your app
const testConfig = () => {
  const required = [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  required.forEach(key => {
    const value = process.env[key];
    console.log(`${key}: ${value ? '✅ Set' : '❌ Missing'}`);
  });
};
```

### Expected Values Example
```env
# Complete working example for production
NEXT_PUBLIC_APP_URL=https://siga-turismo.vercel.app
BREVO_WEBHOOK_SECRET=wh_sec_f4d3a2b1c5e7d9f8a3b5c7d9
BREVO_SENDER_EMAIL=noreply@siga-turismo.com
BREVO_SENDER_NAME=SIGA Tourism
CRON_API_KEY=a7f3b8d9e2c5f1a4b7d3e9f2c5a8b4d7e3f9c2a5b8d4e7f3a9c5b2d8e4f7a3c9
```

---

## ⚠️ Important Notes

1. **BREVO_WEBHOOK_SECRET**: Only needed if you want email tracking (recommended). System works without it but won't track opens/clicks.

2. **CRON_API_KEY**: Only needed for automated features. Manual invitations work without it.

3. **Domain Verification**: Ensure your sender email domain is verified in Brevo to avoid delivery issues.

4. **Local Testing**: For local development, you can use the same Brevo credentials as production, just change `NEXT_PUBLIC_APP_URL` to `http://localhost:3000`.

---

## 🚀 After Adding Variables

1. **Restart your local dev server** to load new environment variables
2. **Redeploy to Vercel** if you added production variables
3. **Test sending an invitation** to verify email delivery
4. **Check Brevo dashboard** for email status

---

**Total New Variables Needed**: 5  
**Critical for Basic Function**: 3 (APP_URL, SENDER_EMAIL, SENDER_NAME)  
**For Full Features**: All 5