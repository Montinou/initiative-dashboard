#!/bin/bash

# ============================================
# VERCEL ENVIRONMENT SETUP SCRIPT
# ============================================
# This script adds all required environment variables to Vercel
# Run with: bash scripts/setup-vercel-env.sh

echo "🚀 Setting up Vercel environment variables for invitation system..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install with: npm i -g vercel"
    exit 1
fi

echo "📝 Adding environment variables to Vercel production..."

# Application URL
echo "Adding NEXT_PUBLIC_APP_URL..."
vercel env add NEXT_PUBLIC_APP_URL production <<< "https://siga-turismo.vercel.app"

# Brevo Webhook Secret (using the predefined value)
echo "Adding BREVO_WEBHOOK_SECRET..."
vercel env add BREVO_WEBHOOK_SECRET production <<< "7a4f9b2e8c1d6a3f9e2b5c8d1a4f7b3e9c5d8a2f6b9e1c4d7a3f6e9b2c5d8f1a4"

# Brevo Sender Email
echo "Adding BREVO_SENDER_EMAIL..."
vercel env add BREVO_SENDER_EMAIL production <<< "noreply@siga-turismo.com"

# Brevo Sender Name
echo "Adding BREVO_SENDER_NAME..."
vercel env add BREVO_SENDER_NAME production <<< "SIGA Tourism"

# Generate and add CRON API Key
CRON_KEY=$(openssl rand -hex 32)
echo "Adding CRON_API_KEY..."
vercel env add CRON_API_KEY production <<< "$CRON_KEY"

echo ""
echo "✅ Environment variables added successfully!"
echo ""
echo "📋 Variables configured:"
echo "  - NEXT_PUBLIC_APP_URL: https://siga-turismo.vercel.app"
echo "  - BREVO_WEBHOOK_SECRET: 7a4f9b2e...8f1a4 (truncated)"
echo "  - BREVO_SENDER_EMAIL: noreply@siga-turismo.com"
echo "  - BREVO_SENDER_NAME: SIGA Tourism"
echo "  - CRON_API_KEY: $CRON_KEY"
echo ""
echo "⚠️  Remember to:"
echo "1. Configure the webhook in Brevo with the secret above"
echo "2. Verify the sender email in Brevo"
echo "3. Deploy to Vercel: vercel --prod"
echo ""
echo "🔗 Brevo Webhook URL to use:"
echo "   https://siga-turismo.vercel.app/api/invitations/v2/webhook"