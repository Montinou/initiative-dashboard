# Setup Google Vertex AI with Vercel AI SDK

## Steps to Configure Vertex AI

### 1. Create Service Account Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: `insaight-backend`
3. Navigate to **IAM & Admin** > **Service Accounts**
4. Find or create a service account: `insaight-backend@appspot.gserviceaccount.com`
5. Click on the service account
6. Go to **Keys** tab
7. Click **Add Key** > **Create new key**
8. Choose **JSON** format
9. Download the key file

### 2. Extract Required Values from JSON

From the downloaded JSON file, you need:
- `client_email`: The service account email
- `private_key`: The private key (including BEGIN/END lines)
- `private_key_id`: The private key ID (optional but recommended)

### 3. Set Environment Variables

Add these to your `.env.local` file:

```bash
# Google Vertex AI Configuration
GOOGLE_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PRIVATE_KEY_ID="your-private-key-id"
```

### 4. For Vercel Production

Add the same environment variables in Vercel:
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add:
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (paste the entire key including BEGIN/END)
   - `GOOGLE_PRIVATE_KEY_ID`

### 5. Enable Vertex AI API

Make sure the Vertex AI API is enabled:
```bash
gcloud services enable aiplatform.googleapis.com --project=insaight-backend
```

### 6. Grant Permissions

Ensure your service account has the necessary permissions:
```bash
gcloud projects add-iam-policy-binding insaight-backend \
  --member="serviceAccount:insaight-backend@appspot.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

## Testing

After configuration, test the integration:
1. Restart your development server
2. Try the AI chat feature
3. Check the console for any error messages

## Troubleshooting

- **Authentication Error**: Verify the service account credentials are correct
- **Permission Denied**: Check that the service account has the `Vertex AI User` role
- **Model Not Found**: Ensure you're using a supported model like `gemini-1.5-flash` or `gemini-1.5-pro`
- **Quota Exceeded**: Check your Google Cloud quotas for Vertex AI

## Available Models

The Vercel AI SDK supports these Gemini models through Vertex AI:
- `gemini-1.5-flash` - Fast, efficient model
- `gemini-1.5-pro` - More capable model
- `gemini-1.0-pro` - Previous generation model

## Code Example

```typescript
import { vertex } from '@ai-sdk/google-vertex';
import { generateText } from 'ai';

const { text } = await generateText({
  model: vertex('gemini-1.5-flash'),
  prompt: 'Your prompt here',
  temperature: 0.7,
  maxTokens: 1024,
});
```