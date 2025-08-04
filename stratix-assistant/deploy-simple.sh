#!/bin/bash

# Simple deployment script that only updates the code
echo "🚀 Deploying code fix to existing Cloud Function..."

# Setup environment for gcloud
export CLOUDSDK_PYTHON=/usr/bin/python3
export PATH="/tmp/google-cloud-sdk/bin:$PATH"

PROJECT_ID="insaight-backend"
FUNCTION_NAME="bot-stratix-backend-generative"
REGION="us-central1"

echo "📋 Project: $PROJECT_ID"
echo "📋 Function: $FUNCTION_NAME"
echo "📋 Region: $REGION"

# Backup original main.py if it exists
if [ -f "main.py" ] && [ ! -f "main-backup-original.py" ]; then
    echo "📦 Backing up original main.py..."
    cp main.py main-backup-original.py
fi

# Install fixed version
echo "🔧 Installing fixed main.py..."
cp main-fixed.py main.py

# Deploy only the code, keeping existing environment variables
echo "☁️  Deploying code to Google Cloud Functions..."
gcloud functions deploy $FUNCTION_NAME \
    --gen2 \
    --runtime=python311 \
    --region=$REGION \
    --source=. \
    --entry-point=bot_stratix_backend_generative \
    --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Code deployment successful!"
    echo ""
    echo "🔧 Now we need to add the missing environment variable..."
    echo "Please go to Google Cloud Console and add:"
    echo "SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.5P2F3GXNLHWCKk5gdlqXq9rKWwJdwzUg1Bd2tBDnhLE"
    echo ""
    echo "Or run this command:"
    echo "gcloud functions deploy $FUNCTION_NAME --update-env-vars SUPABASE_SERVICE_ROLE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.5P2F3GXNLHWCKk5gdlqXq9rKWwJdwzUg1Bd2tBDnhLE'"
    
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Please check the error messages above."
    exit 1
fi