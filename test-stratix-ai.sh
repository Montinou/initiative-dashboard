#!/bin/bash

# Test script for Stratix Assistant after deployment
echo "🧪 Testing Stratix Assistant with real data..."

# Test 1: Query with initiative name
echo "Test 1: Getting initiative status..."
curl -X POST "https://us-central1-insaight-backend.cloudfunctions.net/bot-stratix-backend-generative" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6IjBhNTNkZjYwMGE0MDQ4YzhhODJmNDI2YWVkNGY5NzQ1IiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0MDU5OTAwLCJpYXQiOjE3NTQwNTYzMDAsImlzcyI6Imh0dHBzOi8vemtrZG5zbHVwcW5waW9sdGpwZXUuc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnt9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU0MDU2MzAwfV0sInNlc3Npb25faWQiOiJkNzExZTMzYS03YTcwLTRkODItOTU4Zi1hZTRkNDQ5ZGU1MjAifQ.invalid_signature" \
  -d '{
    "tool": "projects/test/agents/test/tools/stratix-analysis",
    "tool_parameters": {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "nombre_iniciativa": "Digital Transformation"
    }
  }' \
  --max-time 15

echo -e "\n\n"

# Test 2: Query with area name
echo "Test 2: Getting area KPIs..."
curl -X POST "https://us-central1-insaight-backend.cloudfunctions.net/bot-stratix-backend-generative" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6IjBhNTNkZjYwMGE0MDQ4YzhhODJmNDI2YWVkNGY5NzQ1IiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0MDU5OTAwLCJpYXQiOjE3NTQwNTYzMDAsImlzcyI6Imh0dHBzOi8vemtrZG5zbHVwcW5waW9sdGpwZXUuc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnt9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU0MDU2MzAwfV0sInNlc3Npb25faWQiOiJkNzExZTMzYS03YTcwLTRkODItOTU4Zi1hZTRkNDQ5ZGU1MjAifQ.invalid_signature" \
  -d '{
    "tool": "projects/test/agents/test/tools/stratix-analysis",
    "tool_parameters": {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "nombre_area": "Marketing"
    }
  }' \
  --max-time 15

echo -e "\n\n"

# Test 3: General company query
echo "Test 3: Getting company overview..."
curl -X POST "https://us-central1-insaight-backend.cloudfunctions.net/bot-stratix-backend-generative" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6IjBhNTNkZjYwMGE0MDQ4YzhhODJmNDI2YWVkNGY5NzQ1IiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0MDU5OTAwLCJpYXQiOjE3NTQwNTYzMDAsImlzcyI6Imh0dHBzOi8vemtrZG5zbHVwcW5waW9sdGpwZXUuc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnt9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU0MDU2MzAwfV0sInNlc3Npb25faWQiOiJkNzExZTMzYS03YTcwLTRkODItOTU4Zi1hZTRkNDQ5ZGU1MjAifQ.invalid_signature" \
  -d '{
    "tool": "projects/test/agents/test/tools/stratix-analysis",
    "tool_parameters": {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_query": "Dame un resumen de mi empresa"
    }
  }' \
  --max-time 15

echo -e "\n\n✅ Testing complete!"