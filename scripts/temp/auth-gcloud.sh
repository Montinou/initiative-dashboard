#!/bin/bash

# Setup environment
export CLOUDSDK_PYTHON=/usr/bin/python3
export PATH="/tmp/google-cloud-sdk/bin:$PATH"

# Run authentication with proper environment
echo "4/0AVMBsJj8RBrGeqCTIsK9Th5Hj_4vP59nKQ2muQPqYrLgml4Sx6nQk5uVhNRndrmb90ryWQ" | /tmp/google-cloud-sdk/bin/gcloud auth login --no-launch-browser