# Vercel Environment Variables Setup for Vertex AI

## Required Environment Variables

Add these environment variables to your Vercel project:

### 1. Go to Vercel Dashboard
Navigate to your project settings → Environment Variables

### 2. Add the following variables:

```
GOOGLE_CLIENT_EMAIL=insaight-backend@appspot.gserviceaccount.com
```

```
GOOGLE_PRIVATE_KEY_ID=4891ac91a569e9f64d498bfe5ce6326b4a116741
```

```
GCP_PROJECT_ID=insaight-backend
```

### 3. For GOOGLE_PRIVATE_KEY:

Extract the private key from ~/vertex-ai-key.json and add it as:
```
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...(key content)...\n-----END PRIVATE KEY-----\n"
```

**Important**: 
- Include the BEGIN and END lines
- Keep all the \n characters
- Wrap the entire value in double quotes

### 4. Save and Redeploy

After adding all environment variables:
1. Save the changes
2. Trigger a new deployment
3. Test the Gemini AI chat feature

## Local Testing

For local development, the application uses Google Application Default Credentials, which are already configured on your machine.

## Security Note

- Never commit the service account key to git
- The key file ~/vertex-ai-key.json should be kept secure
- Rotate keys periodically for security

## Troubleshooting

If you encounter authentication errors:
1. Verify all environment variables are set correctly
2. Check that the service account has the "Vertex AI User" role
3. Ensure the Vertex AI API is enabled in the GCP project
4. Check the Vercel function logs for specific error messages