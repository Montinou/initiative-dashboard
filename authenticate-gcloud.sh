#!/bin/bash

# Setup environment
export CLOUDSDK_PYTHON=/usr/bin/python3
export PATH="/tmp/google-cloud-sdk/bin:$PATH"

echo "🔐 Starting Google Cloud authentication..."
echo ""
echo "Please run the following command and follow the prompts:"
echo ""
echo "gcloud auth login"
echo ""
echo "After authentication, you can deploy the fixed Cloud Function with:"
echo "cd stratix-assistant && ./deploy-fix.sh"
echo ""

# Start interactive authentication
gcloud auth login