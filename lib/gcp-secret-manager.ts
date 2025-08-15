import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

let secretClient: SecretManagerServiceClient | null = null;

/**
 * Get the Secret Manager client
 */
function getSecretClient() {
  if (!secretClient) {
    // Check if we have explicit credentials for Vercel
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      try {
        const credentials = JSON.parse(
          Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, 'base64').toString('utf-8')
        );
        secretClient = new SecretManagerServiceClient({
          projectId: 'insaight-backend',
          credentials: credentials,
        });
      } catch (error) {
        console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error);
        // Fallback to default credentials
        secretClient = new SecretManagerServiceClient({
          projectId: 'insaight-backend',
        });
      }
    } else {
      // Use default credentials (for local development or GCP environments)
      secretClient = new SecretManagerServiceClient({
        projectId: 'insaight-backend',
      });
    }
  }
  return secretClient;
}

/**
 * Retrieve a secret from Google Cloud Secret Manager
 */
export async function getSecret(secretName: string): Promise<string> {
  try {
    const client = getSecretClient();
    const projectId = 'insaight-backend';
    
    // Build the resource name of the secret version
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    
    // Access the secret
    const [version] = await client.accessSecretVersion({ name });
    
    // Extract the payload as a string
    const payload = version.payload?.data;
    if (!payload) {
      throw new Error(`Secret ${secretName} has no payload`);
    }
    
    // Convert from buffer to string
    const secretValue = Buffer.from(payload as Buffer).toString('utf8');
    
    return secretValue;
  } catch (error) {
    console.error(`Failed to retrieve secret ${secretName}:`, error);
    throw new Error(`Unable to access secret: ${secretName}`);
  }
}

/**
 * Cache for Vertex AI credentials to avoid repeated Secret Manager calls
 */
let cachedVertexCredentials: any = null;
let credentialsCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get Vertex AI service account credentials from Secret Manager
 */
export async function getVertexAICredentials() {
  // Check if we have cached credentials that are still valid
  const now = Date.now();
  if (cachedVertexCredentials && (now - credentialsCacheTime) < CACHE_DURATION) {
    return cachedVertexCredentials;
  }
  
  try {
    const secretValue = await getSecret('vertex-ai-service-account');
    const credentials = JSON.parse(secretValue);
    
    // Cache the credentials
    cachedVertexCredentials = credentials;
    credentialsCacheTime = now;
    
    return credentials;
  } catch (error) {
    console.error('Failed to get Vertex AI credentials:', error);
    throw new Error('Unable to retrieve Vertex AI credentials');
  }
}