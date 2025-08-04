#!/bin/bash

# Deploy fixed Stratix Cloud Function
# This script deploys the RLS-recursion fix to Google Cloud Functions

echo "🚀 Deploying fixed Stratix Cloud Function..."

# Setup environment for gcloud
export CLOUDSDK_PYTHON=/usr/bin/python3
export PATH="/tmp/google-cloud-sdk/bin:$PATH"

# Check if gcloud is installed and authenticated  
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install Google Cloud SDK first."
    echo "Run: curl https://sdk.cloud.google.com | bash"
    exit 1
fi

# Check authentication
echo "🔐 Checking authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 > /dev/null; then
    echo "❌ Not authenticated with gcloud. Please run:"
    echo "  gcloud auth login"
    exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1)
echo "✅ Authenticated as: $ACTIVE_ACCOUNT"

# Set project (adjust as needed)
PROJECT_ID="insaight-backend"
FUNCTION_NAME="bot-stratix-backend-generative"
REGION="us-central1"

echo "📋 Project: $PROJECT_ID"
echo "📋 Function: $FUNCTION_NAME"
echo "📋 Region: $REGION"
echo ""

# Backup original main.py
if [ -f "main.py" ]; then
    echo "📦 Backing up original main.py..."
    cp main.py main-backup-$(date +%Y%m%d-%H%M%S).py
fi

# Replace main.py with fixed version
echo "🔧 Installing fixed main.py..."
cp main-fixed.py main.py

# Deploy the function
echo "☁️  Deploying to Google Cloud Functions..."
gcloud functions deploy $FUNCTION_NAME \
    --gen2 \
    --runtime=python311 \
    --region=$REGION \
    --source=. \
    --entry-point=bot_stratix_backend_generative \
    --trigger-http \
    --allow-unauthenticated \
    --memory=512MB \
    --timeout=540s \
    --set-env-vars=SUPABASE_URL="https://zkkdnslupqnpioltjpeu.supabase.co",SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzI4NDgsImV4cCI6MjA2NjU0ODg0OH0.GUqHaOFH7TVWmKQrGlk-zJ8Sr-uovOPU3fLEtIfbk1k",SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.5P2F3GXNLHWCKk5gdlqXq9rKWwJdwzUg1Bd2tBDnhLE" \
    --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🧪 Testing the function..."
    
    # Test the function with a sample request
    FUNCTION_URL="https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME"
    
    curl -X POST "$FUNCTION_URL" \
        -H "Content-Type: application/json" \
        -d '{
            "tool": "projects/insaight-backend/agents/stratix-agent/tools/stratix-tool",
            "tool_parameters": {
                "user_query": "Test query",
                "user_id": "573d6535-a480-4e75-985b-8820e16437ad"
            }
        }' | jq '.'
    
    echo ""
    echo "🎉 Deployment and test completed!"
    echo "📊 Function URL: $FUNCTION_URL"
    
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Please check the error messages above and try again."
    exit 1
fi