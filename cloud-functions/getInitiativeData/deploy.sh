#!/bin/bash

# Deploy getInitiativeData Cloud Function for Dialogflow CX Tool

echo "🚀 Deploying getInitiativeData Cloud Function..."

# Set variables
PROJECT_ID="insaight-backend"
REGION="us-central1"
FUNCTION_NAME="getInitiativeData"

# Check if SUPABASE_SERVICE_ROLE_KEY is set (try both variable names)
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
    echo "Please set it before running this script:"
    echo "export SUPABASE_SERVICE_ROLE_KEY='your-key-here'"
    exit 1
fi

# Use whichever variable is set
SERVICE_KEY="${SUPABASE_SERVICE_KEY:-$SUPABASE_SERVICE_ROLE_KEY}"

# Deploy the function
gcloud functions deploy $FUNCTION_NAME \
    --runtime nodejs20 \
    --gen2 \
    --trigger-http \
    --allow-unauthenticated \
    --region $REGION \
    --project $PROJECT_ID \
    --entry-point getInitiativeData \
    --set-env-vars "SUPABASE_URL=https://zkkdnslupqnpioltjpeu.supabase.co,SUPABASE_SERVICE_KEY=$SERVICE_KEY" \
    --memory 256MB \
    --timeout 30s

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
    echo ""
    echo "Function URL:"
    echo "https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME"
    echo ""
    echo "Test with:"
    echo "curl -X POST https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{\"query\": \"show initiatives\", \"filters\": {}}'"
else
    echo "❌ Deployment failed!"
    exit 1
fi