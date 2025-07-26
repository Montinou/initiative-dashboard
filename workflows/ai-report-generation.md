<task name="AI Report Generation Implementation">

<task_objective>
Implement or enhance AI-powered report generation features in the consultant-copilot platform. This workflow covers the integration between the frontend report generator, Firebase Functions, and the Cloud Run AI service using Vertex AI.
</task_objective>

<detailed_sequence_steps>
# AI Report Generation Process - Detailed Sequence of Steps

## 1. Understand Report Requirements

1. Define report specifications:
   - Report type (strategic, financial, operational)
   - Required data sources (client data, integrations)
   - Output format (PDF, DOCX, markdown)
   - Language requirements (Spanish/English)

2. Review existing AI infrastructure:
   ```bash
   # Check AI service implementation
   ls ia-service/
   cat ia-service/src/index.js
   
   # Review report generator component
   cat components/ai-report-generator.tsx
   ```

## 2. Backend AI Service Setup

1. Update Cloud Run AI service (`/ia-service`):
   ```javascript
   // ia-service/src/index.js
   app.post('/generate-report', async (req, res) => {
     const { clientData, reportType, parameters } = req.body;
     
     // Integrate with Vertex AI
     const vertexAI = new VertexAI({
       project: process.env.GCP_PROJECT_ID,
       location: 'us-central1'
     });
     
     // Generate report using Gemini model
   });
   ```

2. Configure Vertex AI integration:
   - Set up proper authentication
   - Configure model parameters
   - Implement prompt engineering for report types

## 3. Firebase Functions Integration

1. Create report generation function:
   ```typescript
   // functions/src/reports.ts
   export const generateAIReport = functions.https.onCall(async (data, context) => {
     // Validate user permissions
     // Fetch client data from Firestore
     // Call Cloud Run AI service
     // Store report in Firebase Storage
     // Update Firestore with report metadata
   });
   ```

2. Handle asynchronous report generation:
   - Implement status tracking in Firestore
   - Set up real-time updates for progress
   - Handle errors and retries

## 4. Frontend Implementation

1. Enhance AI report generator component:
   ```typescript
   // components/ai-report-generator.tsx
   const AIReportGenerator = ({ clientId }) => {
     // Use Firebase Functions to trigger generation
     // Show real-time progress updates
     // Handle report download/preview
   };
   ```

2. Add report management UI:
   - Report history table
   - Status indicators
   - Download/preview actions
   - Report type selection

## 5. Data Integration

1. Connect with third-party integrations:
   ```bash
   # Review integration data structure
   cat instructins/third_party_software.md
   ```

2. Aggregate data for reports:
   - Fetch from integrationData collection
   - Combine with client metrics
   - Format for AI processing

## 6. Testing and Optimization

1. Test with emulators:
   ```bash
   # Start all services
   firebase emulators:start
   cd ia-service && npm start
   ```

2. Test report generation:
   - Various report types
   - Different data volumes
   - Error scenarios
   - Language outputs

3. Optimize for production:
   - Implement caching strategies
   - Set up proper error handling
   - Configure Cloud Run scaling
   - Monitor Vertex AI usage

## 7. Deployment

1. Deploy AI service to Cloud Run:
   ```bash
   cd ia-service
   gcloud run deploy ia-service --source .
   ```

2. Deploy Firebase Functions:
   ```bash
   firebase deploy --only functions
   ```

3. Update frontend environment:
   - Ensure NEXT_PUBLIC_IA_SERVICE_URL is set
   - Deploy to Firebase Hosting

</detailed_sequence_steps>

</task>