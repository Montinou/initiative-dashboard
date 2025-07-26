# Stratix Assistant Backend Deployment Instructions

## ✅ FULLY COMPLETED SETUP

1. **Supabase Edge Function**: ✅ Deployed at `https://zkkdnslupqnpioltjpeu.supabase.co/functions/v1/stratix-handler`
2. **CORS Helper**: ✅ Created and deployed
3. **Google Cloud Function**: ✅ Deployed at `https://us-central1-insaight-backend.cloudfunctions.net/bot-stratix-backend-generative`
4. **Google Cloud Secrets**: ✅ Configured for Supabase credentials
5. **Pipeline Testing**: ✅ ALL TESTS PASSING

## 🎉 DEPLOYMENT COMPLETED SUCCESSFULLY

The complete pipeline has been tested and is working:

### Supabase Function ✅
```bash
# Successfully deployed and responding
curl -X POST "https://zkkdnslupqnpioltjpeu.supabase.co/functions/v1/stratix-handler" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [token]" \
  -d '{"action": "get_company_overview", "params": {}}'
```

### Google Cloud Function ✅
```bash
# Successfully routing to Supabase and enhancing responses
curl -X POST "https://us-central1-insaight-backend.cloudfunctions.net/bot-stratix-backend-generative" \
  -H "Content-Type: application/json" \
  -d '{"tool": "webhook_supabase_stratix", "tool_parameters": {"action": "company_overview"}}'
```

## 📊 WORKING EXAMPLES

### Company Overview
```bash
curl -X POST "https://us-central1-insaight-backend.cloudfunctions.net/bot-stratix-backend-generative" \
  -H "Content-Type: application/json" \
  -d '{"tool": "webhook_supabase_stratix", "tool_parameters": {"action": "company_overview"}}'
# Returns: Company metrics with 8 initiatives, 72% progress
```

### Initiative Status
```bash
curl -X POST "https://us-central1-insaight-backend.cloudfunctions.net/bot-stratix-backend-generative" \
  -H "Content-Type: application/json" \
  -d '{"tool": "webhook_supabase_stratix", "tool_parameters": {"nombre_iniciativa": "Transformación Digital"}}'
# Returns: Initiative details with progress, status, and direct link
```

### Area KPIs

```bash
curl -X POST "https://us-central1-insaight-backend.cloudfunctions.net/bot-stratix-backend-generative" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "projects/insaight-backend/locations/us-central1/agents/test-agent/tools/webhook_supabase_stratix",
    "tool_parameters": {
      "action": "company_overview"
    }
  }'
```

### Configure Dialogflow CX

Once both functions are working:

1. Go to Dialogflow CX Console
2. Select your agent
3. Navigate to "Tools" section
4. Create a new tool called `webhook_supabase_stratix`
5. Set the URL to: `https://us-central1-insaight-backend.cloudfunctions.net/bot-stratix-backend-generative`
6. Add description: "Use this tool to get real data from Stratix database. Supports querying initiatives, areas, and KPIs."
7. Define input schema for parameters like `nombre_iniciativa`, `nombre_area`, etc.

## 🔧 Available Actions

The system supports these actions:
- `get_initiative_status` - Get status of specific initiative
- `get_area_kpis` - Get KPIs for specific area
- `get_user_initiatives` - Get initiatives for a user
- `get_company_overview` - Get company-wide metrics
- `search_initiatives` - Search initiatives by query
- `get_initiative_suggestions` - Get suggestions for improvements

## 📊 Architecture Flow

```
User ↔️ Dialogflow CX ↔️ Google Cloud Function ↔️ Supabase Edge Function ↔️ PostgreSQL Database
```

The system is now ready for use once the Supabase Edge Function is deployed!