import { Storage } from '@google-cloud/storage';
import { getGCSCredentialsFromSecretManager } from './gcs-credentials';

export interface GCSMetadata {
  tenant_id: string;
  user_id: string;
  area_id?: string;
  filename: string;
  checksum: string;
  content_type: string;
  session_id: string;
  source: 'web_upload' | 'api' | 'bot';
}

// Cache the Storage client to avoid recreating it on every request
let storageClient: Storage | null = null;

export async function getGCSClient(): Promise<Storage> {
  // Return cached client if available
  if (storageClient) {
    return storageClient;
  }

  try {
    // In production (Vercel), use Secret Manager
    if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
      const credentials = await getGCSCredentialsFromSecretManager();
      storageClient = new Storage({
        projectId: process.env.GCP_PROJECT_ID || process.env.NEXT_PUBLIC_DF_PROJECT_ID || 'insaight-backend',
        credentials,
      });
      return storageClient;
    }
  } catch (error) {
    console.error('Failed to get credentials from Secret Manager, falling back to env vars:', error);
  }

  // For local development or if Secret Manager fails, try env vars
  if (process.env.GCP_SERVICE_ACCOUNT_JSON_BASE64) {
    const json = Buffer.from(process.env.GCP_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf8');
    storageClient = new Storage({
      projectId: process.env.GCP_PROJECT_ID || process.env.NEXT_PUBLIC_DF_PROJECT_ID,
      credentials: JSON.parse(json),
    });
    return storageClient;
  }
  
  if (process.env.GCP_SERVICE_ACCOUNT_JSON) {
    storageClient = new Storage({
      projectId: process.env.GCP_PROJECT_ID || process.env.NEXT_PUBLIC_DF_PROJECT_ID,
      credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON),
    });
    return storageClient;
  }
  
  // Fallback to Application Default Credentials (ADC)
  // This works automatically in Google Cloud environments
  storageClient = new Storage({
    projectId: process.env.GCP_PROJECT_ID || process.env.NEXT_PUBLIC_DF_PROJECT_ID || 'insaight-backend',
  });
  return storageClient;
}

export function buildObjectKey(params: {
  tenantId: string;
  userId: string;
  timestamp: number;
  checksum: string;
  filename: string;
}): string {
  const date = new Date(params.timestamp);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const sanitizedFilename = params.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `okr-uploads/${params.tenantId}/${yyyy}/${mm}/${dd}/${params.userId}/${params.timestamp}-${params.checksum}-${sanitizedFilename}`;
}

export async function generateSignedPostPolicy(params: {
  objectKey: string;
  contentType: string;
  metadata: GCSMetadata;
}): Promise<{ url: string; fields: Record<string, string> }> {
  const storage = await getGCSClient();
  const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);
  const file = bucket.file(params.objectKey);
  const maxSize = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50') * 1024 * 1024;
  const ttlMs = parseInt(process.env.GCS_SIGNED_URL_TTL_SECONDS || '1800') * 1000;

  const [policy] = await file.generateSignedPostPolicyV4({
    expires: Date.now() + ttlMs,
    conditions: [
      ['content-length-range', 0, maxSize],
      ['eq', '$Content-Type', params.contentType],
    ],
    fields: {
      'Content-Type': params.contentType,
      'x-goog-meta-tenant-id': params.metadata.tenant_id,
      'x-goog-meta-user-id': params.metadata.user_id,
      'x-goog-meta-area-id': params.metadata.area_id || '',
      'x-goog-meta-filename': params.metadata.filename,
      'x-goog-meta-checksum': params.metadata.checksum,
      'x-goog-meta-source': params.metadata.source,
      'x-goog-meta-session-id': params.metadata.session_id,
    },
  });

  return { url: policy.url, fields: policy.fields };
}

export async function getObjectHead(objectKey: string) {
  const storage = await getGCSClient();
  const [metadata] = await storage.bucket(process.env.GCS_BUCKET_NAME!).file(objectKey).getMetadata();
  return metadata; // includes size, contentType, metadata
}

export async function downloadObject(objectKey: string): Promise<Buffer> {
  const storage = await getGCSClient();
  const [buffer] = await storage.bucket(process.env.GCS_BUCKET_NAME!).file(objectKey).download();
  return buffer;
}

export async function deleteObject(objectKey: string): Promise<void> {
  const storage = await getGCSClient();
  await storage.bucket(process.env.GCS_BUCKET_NAME!).file(objectKey).delete();
}

export async function objectExists(objectKey: string): Promise<boolean> {
  const storage = await getGCSClient();
  const [exists] = await storage.bucket(process.env.GCS_BUCKET_NAME!).file(objectKey).exists();
  return exists;
}