#!/bin/bash

# Enable unauthenticated API access for Dialogflow CX Messenger
# This script configures the Dialogflow agent to allow public access

set -e

AGENT_ID="7f297240-ca50-4896-8b71-e82fd707fa88"
PROJECT_ID="insaight-backend"
LOCATION="us-central1"

echo "🔧 Enabling unauthenticated API access for Dialogflow CX Messenger..."

# First, get the current agent configuration
echo "📥 Fetching current agent configuration..."
gcloud alpha dialogflow cx agents describe "$AGENT_ID" \
  --location="$LOCATION" \
  --project="$PROJECT_ID" \
  --format=json > /tmp/agent-config.json

echo "✅ Agent configuration fetched"

# Enable the Dialogflow Messenger integration with unauthenticated access
echo "🔌 Configuring Dialogflow Messenger integration..."

# Create the integration configuration
cat > /tmp/messenger-config.json << EOF
{
  "displayName": "Dialogflow Messenger",
  "enabled": true,
  "allowedDomains": [
    "siga-turismo.vercel.app",
    "fema-electricidad.vercel.app", 
    "stratix.vercel.app",
    "localhost:3000",
    "127.0.0.1:3000",
    "*.vercel.app"
  ],
  "enableAutomaticWelcomeMessage": true,
  "enableUnauthenticatedAccess": true,
  "language": "es"
}
EOF

echo "📤 Updating Dialogflow Messenger integration..."

# Note: The actual API call to enable unauthenticated access would typically be done
# through the Dialogflow Console or using a REST API call, as the gcloud CLI
# doesn't directly support this configuration.

# For now, we'll output instructions
echo ""
echo "⚠️  MANUAL STEPS REQUIRED:"
echo ""
echo "1. Go to: https://dialogflow.cloud.google.com/cx/projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID/integrations"
echo ""
echo "2. Click on 'Dialogflow Messenger'"
echo ""
echo "3. Select 'Unauthenticated API (anonymous access)'"
echo ""
echo "4. Add these domains to the allowed list:"
echo "   - siga-turismo.vercel.app"
echo "   - fema-electricidad.vercel.app"
echo "   - stratix.vercel.app"
echo "   - localhost:3000"
echo "   - 127.0.0.1:3000"
echo ""
echo "5. Click 'Enable Dialogflow Messenger'"
echo ""
echo "6. Copy the generated code snippet if needed"
echo ""
echo "📋 Alternative: Use the REST API directly:"
echo ""
echo "curl -X PATCH \\"
echo "  -H \"Authorization: Bearer \$(gcloud auth print-access-token)\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"securitySettings\": {\"allowPlaygroundMode\": true}}' \\"
echo "  \"https://$LOCATION-dialogflow.googleapis.com/v3/projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID\""
echo ""
echo "✅ Script complete - please follow the manual steps above"