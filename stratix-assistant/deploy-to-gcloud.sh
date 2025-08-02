#!/bin/bash

# Stratix Assistant Google Cloud Functions Deployment Script
# This script deploys the updated backend with real Supabase integration

echo "🚀 Deploying Stratix Assistant Backend to Google Cloud Functions..."

# Set Supabase credentials from your environment
SUPABASE_URL="https://zkkdnslupqnpioltjpeu.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzI4NDgsImV4cCI6MjA2NjU0ODg0OH0.GUqHaOFH7TVWmKQrGlk-zJ8Sr-uovOPU3fLEtIfbk1k"

# Verify credentials are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Error: SUPABASE credentials not configured properly"
    exit 1
fi

# Set the project ID (modify this to your Google Cloud project ID)
PROJECT_ID="insaight-backend"
FUNCTION_NAME="bot-stratix-backend-generative"
REGION="us-central1"

echo "📋 Configuration:"
echo "  Project ID: $PROJECT_ID"
echo "  Function Name: $FUNCTION_NAME"
echo "  Region: $REGION"
echo "  Supabase URL: ${SUPABASE_URL:0:30}..."
echo ""

# Authenticate with Google Cloud (you'll need to sign in)
echo "🔐 Authenticating with Google Cloud..."
gcloud auth login

# Set the project
echo "📌 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Deploy the function with environment variables
echo "🚢 Deploying function..."
gcloud functions deploy $FUNCTION_NAME \
    --gen2 \
    --runtime=python311 \
    --region=$REGION \
    --source=. \
    --entry-point=bot_stratix_backend_generative \
    --trigger-http \
    --allow-unauthenticated \
    --set-env-vars="SUPABASE_URL=$SUPABASE_URL,SUPABASE_KEY=$SUPABASE_KEY" \
    --memory=512MB \
    --timeout=60s

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "📍 Function URL: https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME"
    echo ""
    echo "🧪 Test the function with:"
    echo "curl -X POST https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{\"tool\": \"test\", \"tool_parameters\": {\"user_id\": \"test-user-id\", \"user_query\": \"Test\"}}'"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi