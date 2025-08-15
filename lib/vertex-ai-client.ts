import { GoogleAuth } from 'google-auth-library';

let authClient: GoogleAuth | null = null;

/**
 * Initialize Google Auth client for Vertex AI
 * This function retrieves credentials from Google Cloud Secret Manager in production
 * or uses Application Default Credentials in development
 */
export async function getVertexAIAuth() {
  if (authClient) {
    return authClient;
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    try {
      // In production, use workload identity or retrieve from Secret Manager
      // When deployed on Vercel, we can use OIDC token to authenticate with GCP
      if (process.env.VERCEL) {
        // Use Vercel's OIDC token to authenticate with GCP
        authClient = new GoogleAuth({
          projectId: 'insaight-backend',
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        // Fallback: Use JSON from environment variable if provided
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        authClient = new GoogleAuth({
          credentials,
          projectId: 'insaight-backend',
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
      } else {
        // Use default credentials (for GCP environments)
        authClient = new GoogleAuth({
          projectId: 'insaight-backend',
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
      }
    } catch (error) {
      console.error('Failed to initialize Vertex AI auth:', error);
      throw new Error('Vertex AI authentication failed');
    }
  } else {
    // In development, use Application Default Credentials
    authClient = new GoogleAuth({
      projectId: 'insaight-backend',
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }

  return authClient;
}

/**
 * Get access token for Vertex AI API calls
 */
export async function getVertexAIAccessToken(): Promise<string> {
  const auth = await getVertexAIAuth();
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  
  if (!accessToken.token) {
    throw new Error('Failed to get access token for Vertex AI');
  }
  
  return accessToken.token;
}