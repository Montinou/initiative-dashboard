#!/bin/bash

# Script to create and configure a service account for Vercel with minimal permissions

PROJECT_ID="insaight-backend"
SA_NAME="vercel-okr-uploader"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "🔐 Setting up Vercel service account with minimal permissions..."

# Check if service account already exists
if gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
    echo "⚠️  Service account already exists: $SA_EMAIL"
    echo "Do you want to create a new key? (y/n)"
    read -r response
    if [[ "$response" != "y" ]]; then
        echo "Exiting..."
        exit 0
    fi
else
    echo "Creating service account..."
    gcloud iam service-accounts create "$SA_NAME" \
        --display-name="Vercel OKR Uploader (Secret Manager Access Only)" \
        --project="$PROJECT_ID"
fi

echo "Granting Secret Manager access..."
# Grant only Secret Manager accessor role
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/secretmanager.secretAccessor" \
    --condition=None

echo "Creating service account key..."
gcloud iam service-accounts keys create vercel-sa-key.json \
    --iam-account="$SA_EMAIL" \
    --project="$PROJECT_ID"

if [ $? -ne 0 ]; then
    echo "❌ Failed to create service account key"
    exit 1
fi

echo "Converting to base64..."
BASE64_KEY=$(base64 -i vercel-sa-key.json | tr -d '\n')

# Save to file for easy copying
echo "$BASE64_KEY" > vercel-sa-base64.txt

echo "✅ Service account created successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Add to Vercel environment variables:"
echo "   Name: GOOGLE_APPLICATION_CREDENTIALS_BASE64"
echo "   Value: Contents of vercel-sa-base64.txt"
echo "   Environment: Production, Preview, Development"
echo ""
echo "2. Run this command to add to Vercel:"
echo "   cat vercel-sa-base64.txt | vercel env add GOOGLE_APPLICATION_CREDENTIALS_BASE64 production"
echo ""
echo "3. Clean up local files:"
echo "   rm vercel-sa-key.json vercel-sa-base64.txt"
echo ""
echo "⚠️  IMPORTANT: This service account can ONLY read secrets from Secret Manager."
echo "   The actual GCS credentials are stored in the secret: supabase-bigquery-sa-key"