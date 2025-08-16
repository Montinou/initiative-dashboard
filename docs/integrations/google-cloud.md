# Google Cloud Platform Integration Documentation

## Overview
The Initiative Dashboard integrates with multiple Google Cloud Platform services for file storage, AI capabilities, secret management, and data synchronization.

## Services Used

1. **Google Cloud Storage (GCS)** - File uploads and storage
2. **Google Secret Manager** - Secure credential storage
3. **Vertex AI** - Advanced AI models
4. **Gemini API** - Generative AI capabilities
5. **BigQuery** - Data warehouse synchronization
6. **Cloud Functions** - Serverless backend operations
7. **Dialogflow** - Conversational AI

## Configuration

### Environment Variables
```env
# Project Configuration
GCP_PROJECT_ID=insaight-backend
GOOGLE_SERVICE_ACCOUNT=insaight-backend@appspot.gserviceaccount.com

# Storage
GCS_BUCKET_NAME=gcf-v2-sources-30705406738-us-central1

# AI Services
GOOGLE_AI_API_KEY=AIzaSyA_nF4BAKtiKwtwOW41vLI0iA5DNm7teTc
GOOGLE_API_KEY=AIzaSyCBAFNZsH-_14GnsNGPFSMRdZMwnFSBX-4
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyCBAFNZsH-_14GnsNGPFSMRdZMwnFSBX-4

# Dialogflow
NEXT_PUBLIC_DF_PROJECT_ID=insaight-backend
NEXT_PUBLIC_DF_LOCATION=us-central1
NEXT_PUBLIC_DF_AGENT_ID=7f297240-ca50-4896-8b71-e82fd707fa88
NEXT_PUBLIC_DF_ENABLED=true

# BigQuery Sync
BIGQUERY_SYNC_WEBHOOK_URL=https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2
BIGQUERY_SYNC_WEBHOOK_SECRET=f4b1e9c3a27d5f86b0c2d9e4738a1f54...
```

## Google Cloud Storage (GCS)

### Setup and Configuration
```typescript
// lib/gcs-client.ts
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);
```

### File Upload Implementation
```typescript
// Upload file to GCS
export async function uploadToGCS(
  file: File,
  path: string
): Promise<string> {
  const blob = bucket.file(path);
  const stream = blob.createWriteStream({
    metadata: {
      contentType: file.type,
    },
  });

  return new Promise((resolve, reject) => {
    stream.on('error', reject);
    stream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve(publicUrl);
    });
    stream.end(Buffer.from(await file.arrayBuffer()));
  });
}

// Download file from GCS
export async function downloadFromGCS(path: string): Promise<Buffer> {
  const [file] = await bucket.file(path).download();
  return file;
}

// Delete file from GCS
export async function deleteFromGCS(path: string): Promise<void> {
  await bucket.file(path).delete();
}
```

### File Organization Structure
```
bucket/
├── tenants/
│   ├── {tenant_id}/
│   │   ├── uploads/
│   │   │   ├── okr-imports/
│   │   │   └── documents/
│   │   └── exports/
└── temp/
```

## Google Secret Manager

### Implementation (`lib/gcp-secret-manager.ts`)
```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient({
  projectId: 'insaight-backend',
});

// Retrieve secret
export async function getSecret(secretName: string): Promise<string> {
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
  const [version] = await client.accessSecretVersion({ name });
  const payload = version.payload?.data;
  return Buffer.from(payload as Buffer).toString('utf8');
}

// Cache credentials
let cachedCredentials: any = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getVertexAICredentials() {
  if (cachedCredentials && !isExpired()) {
    return cachedCredentials;
  }
  
  const secretValue = await getSecret('vertex-ai-service-account');
  cachedCredentials = JSON.parse(secretValue);
  return cachedCredentials;
}
```

### Secret Storage Best Practices
1. **Never commit secrets to code**
2. **Use Secret Manager for all sensitive data**
3. **Implement caching to reduce API calls**
4. **Rotate secrets regularly**
5. **Use versioning for secret updates**

## Vertex AI Integration

### Client Setup (`lib/vertex-ai-client.ts`)
```typescript
import { GoogleAuth } from 'google-auth-library';

export async function getVertexAIAuth() {
  const authClient = new GoogleAuth({
    projectId: 'insaight-backend',
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  
  return authClient;
}

// Get access token for API calls
export async function getVertexAIAccessToken(): Promise<string> {
  const auth = await getVertexAIAuth();
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token!;
}
```

### Making Vertex AI Requests
```typescript
const response = await fetch(
  `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/endpoints/${endpointId}:predict`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ content: prompt }],
      parameters: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  }
);
```

## Gemini API Integration

### Service Implementation (`lib/gemini-service.ts`)
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY!
);

export async function generateContent(prompt: string) {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-pro' 
  });
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

// Streaming responses
export async function* streamContent(prompt: string) {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-pro' 
  });
  
  const result = await model.generateContentStream(prompt);
  
  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}
```

### Use Cases
1. **AI Assistant for insights**
2. **Content generation**
3. **Data analysis**
4. **Natural language processing**

## BigQuery Integration

### Data Synchronization
```typescript
// Webhook handler for BigQuery sync
export async function syncToBigQuery(data: any) {
  const response = await fetch(
    process.env.BIGQUERY_SYNC_WEBHOOK_URL!,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.BIGQUERY_SYNC_WEBHOOK_SECRET!,
      },
      body: JSON.stringify(data),
    }
  );
  
  return response.json();
}
```

### Schema Mapping
```sql
-- BigQuery schema mirrors Supabase tables
CREATE TABLE initiatives (
  id STRING,
  tenant_id STRING,
  title STRING,
  progress INT64,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  -- Additional fields
);
```

## Cloud Functions

### Deployed Functions
1. **syncSupabaseToBigQueryV2** - Data synchronization
2. **bot-stratix-backend-generative** - AI chat backend
3. **getInitiativeData** - Initiative data processing

### Function Configuration
```javascript
// cloud-functions/getInitiativeData/index.js
exports.getInitiativeData = async (req, res) => {
  // CORS handling
  res.set('Access-Control-Allow-Origin', '*');
  
  // Process request
  const { tenantId, initiativeId } = req.body;
  
  // Fetch from Supabase
  const data = await fetchInitiativeData(tenantId, initiativeId);
  
  // Return response
  res.json({ success: true, data });
};
```

## Dialogflow Integration

### Configuration (`lib/dialogflow-config.ts`)
```typescript
export const dialogflowConfig = {
  projectId: process.env.NEXT_PUBLIC_DF_PROJECT_ID,
  location: process.env.NEXT_PUBLIC_DF_LOCATION,
  agentId: process.env.NEXT_PUBLIC_DF_AGENT_ID,
  enabled: process.env.NEXT_PUBLIC_DF_ENABLED === 'true',
};
```

### Chat Widget Implementation
```typescript
// components/dialogflow-chat-widget.tsx
export function DialogflowChatWidget() {
  const [messages, setMessages] = useState([]);
  
  const sendMessage = async (text: string) => {
    const response = await fetch('/api/dialogflow/detect-intent', {
      method: 'POST',
      body: JSON.stringify({ 
        text,
        sessionId: getSessionId() 
      }),
    });
    
    const result = await response.json();
    setMessages([...messages, result.fulfillmentText]);
  };
  
  return <ChatInterface onSend={sendMessage} messages={messages} />;
}
```

## Authentication with GCP

### Service Account Authentication
```typescript
// For local development
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

// For production (Vercel)
const credentials = JSON.parse(
  Buffer.from(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!,
    'base64'
  ).toString('utf-8')
);
```

### Workload Identity (Recommended for GKE)
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: initiative-dashboard
  annotations:
    iam.gke.io/gcp-service-account: insaight-backend@appspot.gserviceaccount.com
```

## Error Handling

### Retry Logic
```typescript
async function retryableGCPCall<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on permanent errors
      if (error.code === 403 || error.code === 401) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  
  throw lastError;
}
```

## Monitoring and Logging

### Structured Logging
```typescript
import { Logging } from '@google-cloud/logging';

const logging = new Logging({ projectId: 'insaight-backend' });
const log = logging.log('initiative-dashboard');

export function logEvent(severity: string, message: string, metadata?: any) {
  const entry = log.entry({
    severity,
    resource: { type: 'global' },
    jsonPayload: {
      message,
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  });
  
  log.write(entry);
}
```

### Key Metrics to Monitor
- GCS upload/download latency
- Secret Manager access frequency
- Vertex AI API usage and costs
- BigQuery sync success rate
- Cloud Function execution time
- Error rates by service

## Cost Optimization

1. **Use GCS lifecycle policies** to auto-delete old files
2. **Implement caching** for Secret Manager
3. **Batch BigQuery operations**
4. **Use Cloud CDN** for static assets
5. **Monitor API usage** to avoid bill surprises

## Security Best Practices

1. **Principle of least privilege** for service accounts
2. **Enable audit logging** for all services
3. **Use VPC Service Controls** for sensitive data
4. **Implement Cloud KMS** for encryption
5. **Regular security reviews**
6. **Enable Cloud Security Scanner**

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check service account permissions
   - Verify environment variables
   - Ensure credentials are valid

2. **Storage Issues**
   - Check bucket permissions
   - Verify CORS configuration
   - Monitor quota limits

3. **API Rate Limiting**
   - Implement exponential backoff
   - Use batch operations
   - Monitor quotas

### Debug Commands
```bash
# Test authentication
gcloud auth application-default login

# Check project configuration
gcloud config get-value project

# Test Secret Manager access
gcloud secrets versions access latest --secret="secret-name"

# Check storage bucket
gsutil ls gs://bucket-name

# View Cloud Function logs
gcloud functions logs read function-name --limit 50
```

## References

- [GCP Documentation](https://cloud.google.com/docs)
- [Vertex AI Guide](https://cloud.google.com/vertex-ai/docs)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Cloud Storage](https://cloud.google.com/storage/docs)
- [BigQuery](https://cloud.google.com/bigquery/docs)
- [Cloud Functions](https://cloud.google.com/functions/docs)
- [Dialogflow](https://cloud.google.com/dialogflow/docs)