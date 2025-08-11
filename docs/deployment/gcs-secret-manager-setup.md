# GCS with Google Secret Manager Setup for Vercel

This guide explains how to configure Google Cloud Storage (GCS) to work with Vercel using Google Secret Manager for secure credential management.

## Overview

Instead of storing service account JSON credentials directly in Vercel environment variables (which can be problematic), we fetch credentials from Google Secret Manager at runtime. This approach is more secure and manageable.

## Architecture

```
Vercel Function → Secret Manager API → Fetch Credentials → GCS Client
```

## Setup Steps

### 1. Create a Service Account for Vercel

```bash
# Create a service account for Vercel
gcloud iam service-accounts create vercel-okr-uploader \
  --display-name="Vercel OKR Uploader" \
  --project=insaight-backend

# Grant necessary permissions
gcloud projects add-iam-policy-binding insaight-backend \
  --member="serviceAccount:vercel-okr-uploader@insaight-backend.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Generate a key for the service account
gcloud iam service-accounts keys create vercel-sa-key.json \
  --iam-account=vercel-okr-uploader@insaight-backend.iam.gserviceaccount.com
```

### 2. Add Service Account to Vercel

```bash
# Convert the service account to base64
base64 -i vercel-sa-key.json | tr -d '\n' > vercel-sa-base64.txt

# Add to Vercel as GOOGLE_APPLICATION_CREDENTIALS_BASE64
vercel env add GOOGLE_APPLICATION_CREDENTIALS_BASE64 production
# Paste the base64 content when prompted

# Clean up local files
rm vercel-sa-key.json vercel-sa-base64.txt
```

### 3. Update Application Code

The application uses a fallback mechanism:

1. **Production (Vercel)**: Fetches credentials from Secret Manager using the Vercel service account
2. **Local Development**: Uses environment variables (GCP_SERVICE_ACCOUNT_JSON_BASE64 or GCP_SERVICE_ACCOUNT_JSON)
3. **Google Cloud**: Uses Application Default Credentials (ADC)

```typescript
// utils/gcs-credentials.ts
export async function getGCSCredentialsFromSecretManager(): Promise<any> {
  // Uses GOOGLE_APPLICATION_CREDENTIALS_BASE64 to authenticate
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({
    name: 'projects/insaight-backend/secrets/supabase-bigquery-sa-key/versions/latest'
  });
  return JSON.parse(version.payload?.data?.toString() || '{}');
}
```

### 4. Required Environment Variables in Vercel

```bash
# Required for Secret Manager authentication
GOOGLE_APPLICATION_CREDENTIALS_BASE64=<base64-encoded-vercel-sa-key>

# GCS configuration
GCS_BUCKET_NAME=gcf-v2-sources-30705406738-us-central1
GCP_PROJECT_ID=insaight-backend

# Optional (for fallback)
VERCEL_ENV=production
```

## Security Benefits

1. **No Direct Credential Storage**: Service account JSON is never stored in Vercel
2. **Centralized Secret Management**: All secrets managed in Google Secret Manager
3. **Audit Trail**: Access to secrets is logged in Google Cloud
4. **Rotation**: Easy to rotate credentials without updating Vercel
5. **Principle of Least Privilege**: Vercel service account only has access to read specific secrets

## Testing

### Local Testing
```bash
# Set local environment variable
export GCP_SERVICE_ACCOUNT_JSON_BASE64=$(cat service-account-base64.txt)

# Run the application
pnpm dev

# Test the upload endpoint
curl -X POST http://localhost:3000/api/upload/okr-file/signed-url \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.csv","contentType":"text/csv","checksum":"abc123","size":1024}'
```

### Production Testing
```bash
# Check health endpoint
curl https://siga-turismo.vercel.app/api/health

# The storage check should show "up" if configured correctly
```

## Troubleshooting

### Error: "Could not load the default credentials"
- Ensure GOOGLE_APPLICATION_CREDENTIALS_BASE64 is set in Vercel
- Verify the service account has `secretmanager.secretAccessor` role
- Check that the secret exists: `gcloud secrets list --project=insaight-backend`

### Error: "Secret payload is empty"
- Verify the secret contains valid JSON: `gcloud secrets versions access latest --secret=supabase-bigquery-sa-key`
- Ensure the secret name in code matches the actual secret name

### Error: "Permission denied on bucket"
- The service account in the secret must have Storage Object Admin role
- Verify: `gcloud storage buckets get-iam-policy gs://gcf-v2-sources-30705406738-us-central1`

## Alternative: Using Workload Identity Federation

For even better security, you can use Workload Identity Federation to avoid service account keys entirely:

```bash
# Create a Workload Identity Pool for Vercel
gcloud iam workload-identity-pools create vercel-pool \
  --location="global" \
  --display-name="Vercel Pool" \
  --project=insaight-backend

# Configure OIDC provider for Vercel
gcloud iam workload-identity-pools providers create-oidc vercel-provider \
  --location="global" \
  --workload-identity-pool="vercel-pool" \
  --issuer-uri="https://oidc.vercel.com" \
  --allowed-audiences="https://vercel.com/agustin-montoyas-projects-554f9f37" \
  --project=insaight-backend
```

This approach eliminates service account keys but requires additional Vercel configuration.