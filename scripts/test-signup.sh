#!/bin/bash

# Load environment variables
export $(grep -v '^#' ../.env.local | xargs)

echo "Testing signup API (non-admin)..."

# Test with regular signup API using anon key
response=$(curl -s -X POST \
    "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" \
    -H "Content-Type: application/json" \
    -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    -d '{
        "email": "test2@example.com",
        "password": "password123",
        "data": {
            "full_name": "Test User 2",
            "role": "CEO",
            "tenant_id": "4f644c1f-0d57-4980-8eba-ecc9ed7b661e"
        }
    }')

echo "Response:"
echo "$response"
echo ""

# Check if successful
if echo "$response" | grep -q '"id"'; then
    echo "SUCCESS: User created via signup"
else
    echo "FAILED: Signup failed"
fi