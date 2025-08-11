# Google Cloud Storage Setup for OKR File Upload

## Required Environment Variables

The following environment variables must be set in Vercel for the OKR file upload to work:

1. **GCP_PROJECT_ID** - Your Google Cloud Project ID (you have: `insaight-backend`)
2. **GCS_BUCKET_NAME** - The bucket name for storing files (you have: `gcf-v2-sources-30705406738-us-central1`)
3. **GCP_SERVICE_ACCOUNT_JSON_BASE64** - Base64 encoded service account JSON (MISSING)

## How to Get Service Account Credentials

### Option 1: Create a New Service Account (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "IAM & Admin" > "Service Accounts"
3. Click "Create Service Account"
4. Name it something like "okr-upload-service"
5. Grant it the following roles:
   - Storage Object Admin (for the specific bucket)
   - Storage Object Creator
6. Click "Create Key" and download the JSON file
7. Convert to Base64:
   ```bash
   base64 -i service-account-key.json | tr -d '\n' > service-account-base64.txt
   ```

### Option 2: Use Existing Service Account

If you already have a service account JSON file:

1. Convert it to Base64:
   ```bash
   base64 -i your-service-account.json | tr -d '\n' > service-account-base64.txt
   ```

## Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add the following variable:
   - **Name**: `GCP_SERVICE_ACCOUNT_JSON_BASE64`
   - **Value**: The entire base64 string from the text file
   - **Environment**: Production, Preview, Development

4. Redeploy your application

## Alternative: Using Application Default Credentials

If you prefer not to use base64 encoding, you can:

1. Create a service account key JSON file
2. Add these environment variables instead:
   - `GOOGLE_APPLICATION_CREDENTIALS`: Path to the JSON file (not recommended for Vercel)
   - Or use Vercel's secret management for the JSON content

## Testing the Configuration

After setting up the credentials:

1. Test locally:
   ```bash
   # Add to .env.local
   GCP_SERVICE_ACCOUNT_JSON_BASE64=your-base64-string-here
   
   # Run the app
   npm run dev
   ```

2. Test in production:
   - Try uploading a file through the dashboard
   - Check the browser console for any errors
   - Check Vercel function logs for server-side errors

## Troubleshooting

### Error: "Could not load the default credentials"
This means the `GCP_SERVICE_ACCOUNT_JSON_BASE64` environment variable is not set or is invalid.

### Error: "Permission denied"
The service account doesn't have the necessary permissions for the bucket.

### Error: "Bucket not found"
Check that `GCS_BUCKET_NAME` is correct and the service account has access to it.

## Security Notes

- Never commit service account keys to Git
- Use environment variables for all sensitive data
- Rotate service account keys regularly
- Use least-privilege principle for permissions