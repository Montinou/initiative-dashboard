# Dialogflow CX Messenger - Unauthenticated API Setup Guide

## Problem
The Dialogflow Messenger widget shows a 400 error when trying to send messages from the web application. This happens because the widget requires unauthenticated API access to be enabled for public-facing websites.

## Solution

### Step 1: Access Dialogflow Console
1. Go to [Dialogflow CX Console](https://dialogflow.cloud.google.com/cx)
2. Select project: `insaight-backend`
3. Navigate to agent: `Initiative Dashboard Bot` (ID: `7f297240-ca50-4896-8b71-e82fd707fa88`)

### Step 2: Configure Dialogflow Messenger Integration
1. In the agent, go to **Manage** → **Integrations**
2. Click on **Dialogflow Messenger**
3. In the configuration dialog:
   - **IMPORTANT**: Select **"Unauthenticated API (anonymous access)"**
   - This is required for the widget to work on public websites
   
### Step 3: Configure Allowed Domains
Add the following domains to the allowed list:
- `siga-turismo.vercel.app`
- `fema-electricidad.vercel.app`
- `stratix.vercel.app`
- `localhost:3000`
- `127.0.0.1:3000`
- `*.vercel.app` (if wildcard is supported)

### Step 4: Enable the Integration
1. Click **"Enable Dialogflow Messenger"**
2. The system will generate a code snippet
3. Copy the configuration for reference

### Step 5: Update Widget Configuration
The widget should be configured with these attributes:
```html
<df-messenger
  location="us-central1"
  project-id="insaight-backend"
  agent-id="7f297240-ca50-4896-8b71-e82fd707fa88"
  language-code="es"
  max-query-length="-1"
  allow-feedback="thumbs"
  enable-automatic-welcome-message="true"
>
  <df-messenger-chat-bubble
    chat-title="Initiative Assistant"
  />
</df-messenger>
```

## Verification Steps

### 1. Test in Dialogflow Console
- Use the simulator to verify the webhook works
- Confirm responses include database data

### 2. Test on Vercel Deployment
- Navigate to https://siga-turismo.vercel.app
- Open the AI Assistant
- Send a test message like "muéstrame las iniciativas"
- Verify the response shows actual initiative data

### 3. Check Cloud Function Logs
```bash
gcloud functions logs read dialogflowWebhook --limit 10
```

## Troubleshooting

### Error: 400 Bad Request
- **Cause**: Unauthenticated API not enabled
- **Solution**: Follow steps above to enable unauthenticated access

### Error: 404 Session Not Found
- **Cause**: Session management issues with authenticated API
- **Solution**: Switch to unauthenticated API mode

### Error: CORS Issues
- **Cause**: Domain not in allowed list
- **Solution**: Add domain to allowed domains in Dialogflow Messenger settings

## Important Notes

1. **Billing Required**: Unauthenticated API access requires billing to be enabled on the GCP project
2. **Security**: Only allow specific domains, never use `*` wildcard in production
3. **Rate Limiting**: Unauthenticated access has rate limits - monitor usage
4. **Webhook**: The webhook URL must be publicly accessible (Cloud Function)

## Current Configuration

- **Agent ID**: `7f297240-ca50-4896-8b71-e82fd707fa88`
- **Project**: `insaight-backend`
- **Location**: `us-central1`
- **Webhook**: `https://us-central1-insaight-backend.cloudfunctions.net/dialogflowWebhook`
- **Language**: Spanish (`es`)

## References

- [Dialogflow CX Messenger Documentation](https://cloud.google.com/dialogflow/cx/docs/concept/integration/dialogflow-messenger)
- [Unauthenticated API Access](https://cloud.google.com/dialogflow/cx/docs/concept/integration/dialogflow-messenger#unauthenticated)
- [Domain Restrictions](https://cloud.google.com/dialogflow/cx/docs/concept/integration/dialogflow-messenger#domain)