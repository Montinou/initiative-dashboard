# Vertex AI with Google Cloud Secret Manager Setup

## Overview
We've configured Vertex AI to use Google Cloud Secret Manager for secure credential management instead of storing sensitive keys in environment variables.

## Architecture

```
Vercel App → Secret Manager API → vertex-ai-service-account secret → Vertex AI API
```

## Setup Completed

### 1. Service Account Created
- **Service Account**: `vertex-ai-agent@insaight-backend.iam.gserviceaccount.com`
- **Role**: `roles/aiplatform.user` (Vertex AI User)

### 2. Secret Created in Secret Manager
- **Secret Name**: `vertex-ai-service-account`
- **Content**: Service account JSON key
- **Location**: Google Cloud Secret Manager (insaight-backend project)

### 3. Code Implementation
- **Secret Manager Client**: `/lib/gcp-secret-manager.ts`
  - Retrieves secrets from Google Cloud Secret Manager
  - Caches credentials for 5 minutes to reduce API calls
  
- **Updated Gemini Chat API**: `/app/api/gemini/chat/route.ts`
  - In production: Retrieves credentials from Secret Manager
  - In development: Uses Application Default Credentials

### 4. Model Configuration
- **Current Model**: `gemini-2.5-flash`
- **Location**: `us-central1`
- **Project**: `insaight-backend`

## Vercel Deployment Configuration

### Required Environment Variables in Vercel

No Vertex AI credentials needed in Vercel environment variables! Only these are required:

```env
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Google Cloud Project
GCP_PROJECT_ID=insaight-backend

# For Secret Manager access, Vercel needs either:
# Option 1: Use Google Application Default Credentials (if running on GCP)
# Option 2: Use a service account with Secret Manager access
```

### Granting Vercel Access to Secret Manager

If Vercel needs explicit credentials to access Secret Manager:

1. Create a service account for Vercel:
```bash
gcloud iam service-accounts create vercel-app \
  --display-name="Vercel Application Service Account" \
  --project=insaight-backend
```

2. Grant Secret Manager access:
```bash
gcloud secrets add-iam-policy-binding vertex-ai-service-account \
  --member="serviceAccount:vercel-app@insaight-backend.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=insaight-backend
```

3. Create and download a key for the Vercel service account:
```bash
gcloud iam service-accounts keys create vercel-sa-key.json \
  --iam-account="vercel-app@insaight-backend.iam.gserviceaccount.com" \
  --project=insaight-backend
```

4. Add to Vercel environment variables:
```env
GOOGLE_APPLICATION_CREDENTIALS_JSON=<contents of vercel-sa-key.json>
```

## Testing

### Local Development
```bash
# Ensure you're authenticated with gcloud
gcloud auth application-default login

# Test the API
npm run dev
# Navigate to the app and test the Gemini chat feature
```

### Production Testing
After deployment to Vercel:
1. Check Vercel function logs for any authentication errors
2. Test the Gemini chat feature in production
3. Monitor Secret Manager access logs in GCP Console

## Security Benefits

1. **No hardcoded credentials**: Service account keys are never stored in code or environment variables
2. **Centralized management**: All secrets managed in Google Cloud Secret Manager
3. **Audit trail**: All secret access is logged in GCP
4. **Rotation support**: Keys can be rotated without code changes
5. **Fine-grained access**: Only specific service accounts can access specific secrets

## Troubleshooting

### Common Issues

1. **"Unable to access secret" error**
   - Check that the service account has `roles/secretmanager.secretAccessor` role
   - Verify the secret name is correct: `vertex-ai-service-account`

2. **"Failed to initialize Vertex AI" error**
   - Check that the Vertex AI API is enabled in GCP
   - Verify the service account has `roles/aiplatform.user` role

3. **Authentication errors in Vercel**
   - Ensure Vercel has proper credentials to access Secret Manager
   - Check Vercel function logs for specific error messages

### Monitoring

View Secret Manager access logs:
```bash
gcloud logging read "resource.type=secretmanager.Secret AND resource.labels.secret_id=vertex-ai-service-account" \
  --limit=10 \
  --project=insaight-backend \
  --format=json
```

View Vertex AI API usage:
```bash
gcloud logging read "protoPayload.serviceName=aiplatform.googleapis.com" \
  --limit=10 \
  --project=insaight-backend \
  --format=json
```

## Next Steps

1. Configure Vercel with minimal service account for Secret Manager access
2. Test the deployment in production
3. Set up monitoring alerts for API failures
4. Implement key rotation schedule