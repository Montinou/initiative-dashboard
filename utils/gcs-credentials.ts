import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

let cachedCredentials: any = null;
let cacheExpiry: number = 0;

/**
 * Gets credentials for Secret Manager client
 */
function getSecretManagerCredentials() {
  // Use GOOGLE_APPLICATION_CREDENTIALS_BASE64 if available (for Vercel)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
    const json = Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 'base64').toString('utf8');
    return JSON.parse(json);
  }
  
  // Fallback to GOOGLE_APPLICATION_CREDENTIALS
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  }
  
  // Otherwise use Application Default Credentials
  return undefined;
}

/**
 * Fetches GCS credentials from Google Secret Manager
 * Caches the credentials for 1 hour to avoid repeated API calls
 */
export async function getGCSCredentialsFromSecretManager(): Promise<any> {
  // Check if we have cached credentials that haven't expired
  if (cachedCredentials && Date.now() < cacheExpiry) {
    return cachedCredentials;
  }

  try {
    const projectId = process.env.GCP_PROJECT_ID || process.env.NEXT_PUBLIC_DF_PROJECT_ID || 'insaight-backend';
    const secretManagerCreds = getSecretManagerCredentials();
    
    // Initialize Secret Manager client with appropriate credentials
    const client = new SecretManagerServiceClient({
      projectId,
      credentials: secretManagerCreds,
    });

    const secretName = 'supabase-bigquery-sa-key';
    
    // Build the resource name
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

    // Access the secret
    const [version] = await client.accessSecretVersion({ name });
    
    // Extract the payload
    const payload = version.payload?.data;
    if (!payload) {
      throw new Error('Secret payload is empty');
    }

    // Parse the JSON credentials
    const credentials = JSON.parse(payload.toString());
    
    // Cache for 1 hour
    cachedCredentials = credentials;
    cacheExpiry = Date.now() + (60 * 60 * 1000);
    
    return credentials;
  } catch (error) {
    console.error('Failed to fetch credentials from Secret Manager:', error);
    
    // Fallback to environment variable if Secret Manager fails
    // This is useful for local development
    if (process.env.GCP_SERVICE_ACCOUNT_JSON_BASE64) {
      const json = Buffer.from(process.env.GCP_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf8');
      return JSON.parse(json);
    }
    
    if (process.env.GCP_SERVICE_ACCOUNT_JSON) {
      return JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON);
    }
    
    throw new Error('No GCS credentials available');
  }
}