# Complete Dialogflow CX Tool Integration Setup Guide

## Overview
This guide will help you set up the complete Dialogflow CX integration with a custom tool that retrieves real-time initiative data from your Supabase database.

## Architecture
```
User → Dialogflow CX → Tool (OpenAPI) → Cloud Function → Supabase → Response
```

## Step 1: Deploy the Cloud Function

### 1.1 Set Environment Variables
```bash
# Get your Supabase service key from your Supabase dashboard
export SUPABASE_SERVICE_KEY="your-supabase-service-role-key-here"
```

### 1.2 Install Dependencies and Deploy
```bash
cd cloud-functions/getInitiativeData
npm install
chmod +x deploy.sh
./deploy.sh
```

The function will be deployed to:
```
https://us-central1-insaight-backend.cloudfunctions.net/getInitiativeData
```

### 1.3 Test the Function
```bash
curl -X POST https://us-central1-insaight-backend.cloudfunctions.net/getInitiativeData \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "show initiatives",
    "filters": {
      "status": "in_progress"
    }
  }'
```

## Step 2: Configure the Tool in Dialogflow CX

### 2.1 Access Your Agent
1. Go to [Dialogflow CX Console](https://dialogflow.cloud.google.com/cx)
2. Navigate to your agent: `projects/insaight-backend/locations/us-central1/agents/7f297240-ca50-4896-8b71-e82fd707fa88`

### 2.2 Create the Tool
1. In the left menu, click **Manage** → **Tools**
2. Click **+ Create Tool**
3. Configure the tool:

**Basic Information:**
- **Tool Name:** `initiative_data_tool`
- **Display Name:** Initiative Data Tool
- **Description:** Retrieves real-time initiative dashboard data from Supabase

**Tool Type:**
- Select: **OpenAPI**

**Authentication:**
- Type: **None** (the Cloud Function is public)

**OpenAPI Specification:**
Copy and paste this schema:

```yaml
openapi: 3.0.0
info:
  title: Initiative Dashboard API
  version: 1.0.0
servers:
  - url: https://us-central1-insaight-backend.cloudfunctions.net
paths:
  /getInitiativeData:
    post:
      summary: Retrieve initiative dashboard data
      operationId: getInitiativeData
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                query:
                  type: string
                  description: The user's query about initiatives
                filters:
                  type: object
                  description: Optional filters for the data
                  properties:
                    status:
                      type: string
                      enum: [planning, in_progress, completed, on_hold]
                    date_range:
                      type: string
                      enum: [current_quarter, last_30_days, next_30_days]
              required:
                - query
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
```

4. Click **Save**

## Step 3: Update the Playbook

### 3.1 Navigate to Playbooks
1. In the left menu, click **Playbooks**
2. Select your existing playbook or create a new one

### 3.2 Update Playbook Configuration
Replace your playbook content with:

```yaml
goal: |
  Help users access and analyze initiative dashboard data in real-time.

instructions: |
  You MUST use ${TOOL:initiative_data_tool} for ALL queries about:
  - Initiatives, projects, or programs
  - Status updates or progress reports
  - Dashboard metrics or KPIs
  - Performance analysis
  - Activities or tasks
  
  NEVER make up data. ALWAYS use the tool.
  
  When using the tool:
  1. Pass the user's query in the 'query' parameter
  2. Add filters if the user specifies status or date ranges
  3. Format the response clearly
  4. Highlight important insights
  5. Suggest next actions

examples:
  - user_input: "Show me all initiatives"
    agent_response: |
      I'll retrieve all initiatives for you.
      ${TOOL:initiative_data_tool}
      [Format and present the data returned by the tool]
  
  - user_input: "What initiatives are in progress?"
    agent_response: |
      Let me get the in-progress initiatives.
      ${TOOL:initiative_data_tool}
      [Present filtered results with insights]
```

### 3.3 Save and Activate
1. Click **Save**
2. Make sure the playbook is **Active**

## Step 4: Configure Agent Settings

### 4.1 Generative AI Settings
1. Go to **Agent Settings** → **Generative AI**
2. Configure:
   - **Model:** gemini-1.5-flash (or gemini-2.0-flash-exp if available)
   - **Temperature:** 0.7
   - **Max Output Tokens:** 2048

### 4.2 Enable Generative Fallback
1. In **Agent Settings** → **Generative AI**
2. Enable **Generative Fallback**
3. Add this fallback prompt:

```
You are an assistant for the Initiative Dashboard system.
If the tool is not available or returns an error, provide helpful general guidance about project management and suggest the user try again.
Always maintain a professional and helpful tone.
```

## Step 5: Test the Integration

### 5.1 Use the Test Agent
1. Click on **Test Agent** in the top right
2. Try these test queries:

**Basic Queries:**
- "Show me all initiatives"
- "What's the current status of our projects?"
- "Display dashboard metrics"

**Filtered Queries:**
- "Show only in-progress initiatives"
- "What initiatives are planned?"
- "Show completed projects"

**Analysis Queries:**
- "Which initiatives need attention?"
- "What's our average progress?"
- "Show me initiative statistics"

### 5.2 Verify Tool Execution
In the test console, you should see:
1. **Tool Use** indicator when the tool is called
2. **Tool Response** with the actual data
3. **Agent Response** with formatted output

### 5.3 Check Logs
Monitor execution in Cloud Logging:
```bash
gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=getInitiativeData" \
  --limit 50 \
  --project insaight-backend \
  --format json
```

## Step 6: Troubleshooting

### Issue: Tool Not Being Called

**Solution 1: More Explicit Instructions**
Update playbook instructions to be more forceful:
```yaml
instructions: |
  CRITICAL: You MUST IMMEDIATELY call ${TOOL:initiative_data_tool} for ANY question about initiatives, projects, or data.
  DO NOT respond without calling the tool first.
  This is MANDATORY for all data queries.
```

**Solution 2: Add More Examples**
Add 5-10 specific examples in your playbook showing tool usage.

### Issue: Tool Returns Error

**Check Cloud Function Logs:**
```bash
gcloud functions logs read getInitiativeData --project insaight-backend
```

**Common Fixes:**
- Verify SUPABASE_SERVICE_KEY is set correctly
- Check network connectivity
- Ensure Supabase tables exist and have data

### Issue: Response Format Issues

**Solution: Update Cloud Function**
Modify the response format in `index.js` to match Dialogflow's expectations.

### Issue: Authentication Errors

**For Dialogflow to Cloud Function:**
```bash
# Grant invoker permission
gcloud functions add-iam-policy-binding getInitiativeData \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker" \
  --project insaight-backend
```

## Step 7: Production Deployment

### 7.1 Secure the Cloud Function
Instead of `--allow-unauthenticated`, use service account authentication:

```bash
# Create service account
gcloud iam service-accounts create dialogflow-tool-sa \
  --display-name="Dialogflow Tool Service Account" \
  --project insaight-backend

# Grant permissions
gcloud functions add-iam-policy-binding getInitiativeData \
  --member="serviceAccount:dialogflow-tool-sa@insaight-backend.iam.gserviceaccount.com" \
  --role="roles/cloudfunctions.invoker" \
  --project insaight-backend
```

### 7.2 Update Tool Authentication
In Dialogflow CX Console:
1. Edit the tool
2. Change Authentication to **OAuth 2.0** or **API Key**
3. Configure with service account credentials

### 7.3 Add Monitoring
Set up alerts for:
- Function errors
- High latency (>3 seconds)
- Authentication failures

## Step 8: Widget Integration

To use this in your application:

```javascript
// In your React component
window.dfMessenger = {
  projectId: 'insaight-backend',
  agentId: '7f297240-ca50-4896-8b71-e82fd707fa88',
  region: 'us-central1',
  // The tool will be called automatically when users ask about initiatives
};
```

## Verification Checklist

- [ ] Cloud Function deployed and responding
- [ ] Tool created in Dialogflow CX
- [ ] Playbook updated with tool instructions
- [ ] Test queries returning real data
- [ ] Logs showing successful tool calls
- [ ] Widget integrated in application

## Next Steps

1. **Add More Tools:**
   - Create tools for creating initiatives
   - Add tools for updating activities
   - Build tools for analytics

2. **Enhance Responses:**
   - Add data visualization
   - Include trend analysis
   - Provide recommendations

3. **Improve Performance:**
   - Cache frequent queries
   - Optimize database queries
   - Add connection pooling

## Support

For issues or questions:
1. Check Cloud Function logs
2. Review Dialogflow CX diagnostics
3. Verify Supabase connectivity
4. Test with curl commands first

## Security Notes

⚠️ **Important Security Considerations:**
- Never expose service keys in client-side code
- Use environment variables for sensitive data
- Implement rate limiting on Cloud Functions
- Add authentication for production use
- Monitor for unusual activity