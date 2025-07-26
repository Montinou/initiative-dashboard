<task name="Third-Party Integration Setup">

<task_objective>
Implement a new third-party integration (Google Analytics, Salesforce, HubSpot, etc.) following the consultant-copilot's pull-based async architecture. This workflow covers secure credential storage, scheduled data fetching, and integration with the client dashboard.
</task_objective>

<detailed_sequence_steps>
# Third-Party Integration Process - Detailed Sequence of Steps

## 1. Review Integration Architecture

1. Study the integration design:
   ```bash
   cat instructins/third_party_software.md
   ```

2. Understand the data flow:
   - Frontend → Cloud Function → Secret Manager
   - Cloud Scheduler → Cloud Run Worker → Third-party API
   - Fetched data → Firestore → Client Dashboard

3. Check existing integrations:
   ```bash
   # Look for integration examples
   grep -r "integration" functions/src/
   ls app/clientes/*/integraciones/
   ```

## 2. Backend Integration Setup

1. Create connection Cloud Function:
   ```typescript
   // functions/src/integrations/connect-[service].ts
   export const connectServiceIntegration = functions.https.onCall(async (data, context) => {
     const { credentials, orgId } = data;
     
     // Validate credentials
     // Store in Secret Manager
     // Create integration record in Firestore
     // Schedule data fetching
   });
   ```

2. Implement Secret Manager storage:
   ```typescript
   const secretManager = new SecretManagerServiceClient();
   const secretName = `integration-${userId}-${serviceName}-${Date.now()}`;
   
   await secretManager.createSecret({
     parent: `projects/${projectId}`,
     secretId: secretName,
     secret: {
       replication: { automatic: {} }
     }
   });
   ```

## 3. Cloud Run Worker Service

1. Create data fetching service:
   ```javascript
   // Create new service or extend existing worker
   app.post('/fetch-[service]-data', async (req, res) => {
     const { integrationId, secretName } = req.body;
     
     // Retrieve credentials from Secret Manager
     // Connect to third-party API
     // Fetch and transform data
     // Store in Firestore integrationData collection
   });
   ```

2. Handle API-specific logic:
   - Authentication methods (OAuth, API key, etc.)
   - Rate limiting
   - Pagination
   - Error handling and retries

## 4. Cloud Scheduler Configuration

1. Set up scheduled fetching:
   ```bash
   gcloud scheduler jobs create http fetch-[service]-data \
     --location=us-central1 \
     --schedule="0 */24 * * *" \
     --uri="https://[worker-service-url]/fetch-[service]-data" \
     --http-method=POST
   ```

2. Configure job parameters:
   - Frequency (default: every 24 hours)
   - Retry policy
   - Timeout settings

## 5. Frontend Integration UI

1. Create integration configuration page:
   ```typescript
   // app/clientes/[clientId]/integraciones/[service]/page.tsx
   export default function ServiceIntegrationPage() {
     // Connection form
     // Status display
     // Data preview
     // Disconnect option
   }
   ```

2. Update integrations list:
   ```typescript
   // components/integrations-list.tsx
   const AVAILABLE_INTEGRATIONS = [
     { id: 'google-analytics', name: 'Google Analytics', icon: '📊' },
     { id: 'salesforce', name: 'Salesforce', icon: '☁️' },
     // Add new integration
   ];
   ```

## 6. Data Processing and Display

1. Create data transformation logic:
   ```typescript
   // lib/integrations/[service]-transformer.ts
   export function transformServiceData(rawData: any): IntegrationData {
     // Convert third-party data format
     // Extract relevant metrics
     // Normalize for display
   }
   ```

2. Display in client dashboard:
   - Add data widgets
   - Create charts/visualizations
   - Include in AI report generation

## 7. Testing and Security

1. Test with emulators:
   ```bash
   firebase emulators:start
   # Test connection flow
   # Verify secret storage
   # Check data fetching
   ```

2. Security checklist:
   - ✓ Credentials encrypted in Secret Manager
   - ✓ Service account permissions minimal
   - ✓ API keys not exposed in frontend
   - ✓ Data access restricted by organization
   - ✓ Error messages don't leak sensitive info

## 8. Documentation and Deployment

1. Update documentation:
   - Add to available integrations list
   - Document required credentials
   - Add setup instructions

2. Deploy components:
   ```bash
   # Deploy Functions
   firebase deploy --only functions:connectServiceIntegration
   
   # Deploy Cloud Run worker
   gcloud run deploy integration-worker --source .
   
   # Deploy frontend
   npm run build && firebase deploy --only hosting
   ```

</detailed_sequence_steps>

</task>