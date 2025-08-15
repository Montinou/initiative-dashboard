#!/bin/bash

# Script to create Vertex AI service account and store in Google Cloud Secret Manager

PROJECT_ID="insaight-backend"
SERVICE_ACCOUNT_NAME="vertex-ai-agent"
SECRET_NAME="vertex-ai-service-account"

echo "Setting up Vertex AI service account for project: $PROJECT_ID"

# Check if service account exists
if gcloud iam service-accounts describe "${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" --project=$PROJECT_ID &>/dev/null; then
    echo "Service account already exists"
else
    echo "Creating service account..."
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="Vertex AI Agent Service Account" \
        --project=$PROJECT_ID
fi

# Grant necessary roles
echo "Granting Vertex AI roles..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user" \
    --project=$PROJECT_ID

# Create service account key
echo "Creating service account key..."
gcloud iam service-accounts keys create /tmp/vertex-ai-key.json \
    --iam-account="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --project=$PROJECT_ID

# Check if secret exists
if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &>/dev/null; then
    echo "Secret already exists, creating new version..."
    gcloud secrets versions add $SECRET_NAME \
        --data-file=/tmp/vertex-ai-key.json \
        --project=$PROJECT_ID
else
    echo "Creating secret..."
    gcloud secrets create $SECRET_NAME \
        --data-file=/tmp/vertex-ai-key.json \
        --replication-policy="automatic" \
        --project=$PROJECT_ID
fi

# Clean up temporary file
rm /tmp/vertex-ai-key.json

echo "✅ Setup complete! Secret stored as: $SECRET_NAME"
echo ""
echo "To use in your application:"
echo "1. Grant your service account access to the secret:"
echo "   gcloud secrets add-iam-policy-binding $SECRET_NAME \\"
echo "     --member='serviceAccount:YOUR_APP_SERVICE_ACCOUNT' \\"
echo "     --role='roles/secretmanager.secretAccessor' \\"
echo "     --project=$PROJECT_ID"
echo ""
echo "2. Access the secret in your code using Google Cloud Secret Manager API"