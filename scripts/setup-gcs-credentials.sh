#!/bin/bash

# Script to fetch GCS credentials from Google Secret Manager and prepare for Vercel

echo "🔐 Fetching service account key from Google Secret Manager..."

# Try to fetch the BigQuery service account key (which should have GCS permissions)
SECRET_NAME="supabase-bigquery-sa-key"

# Fetch the secret
echo "Fetching secret: $SECRET_NAME"
gcloud secrets versions access latest --secret="$SECRET_NAME" > service-account-key.json

if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch secret. Make sure you're authenticated with gcloud."
    exit 1
fi

echo "✅ Secret fetched successfully"

# Convert to base64
echo "Converting to base64..."
BASE64_KEY=$(base64 -i service-account-key.json | tr -d '\n')

# Save to file for easy copying
echo "$BASE64_KEY" > service-account-base64.txt

echo "✅ Base64 conversion complete"
echo ""
echo "📋 Next steps:"
echo "1. Copy the contents of service-account-base64.txt"
echo "2. Go to Vercel Dashboard > Settings > Environment Variables"
echo "3. Add a new variable:"
echo "   Name: GCP_SERVICE_ACCOUNT_JSON_BASE64"
echo "   Value: [paste the base64 string]"
echo "   Environment: Production, Preview, Development"
echo ""
echo "Or add to .env.local for local testing:"
echo "GCP_SERVICE_ACCOUNT_JSON_BASE64=$BASE64_KEY"
echo ""
echo "⚠️  Remember to delete the temporary files after use:"
echo "rm service-account-key.json service-account-base64.txt"