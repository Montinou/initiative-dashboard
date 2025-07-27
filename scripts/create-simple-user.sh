#!/bin/bash

# Load environment variables
export $(grep -v '^#' ../.env.local | xargs)

echo "Testing simple user creation..."

# Test with minimal user data
response=$(curl -s -X POST \
    "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -d '{
        "email": "test@example.com",
        "password": "password123",
        "email_confirm": true,
        "user_metadata": {
            "full_name": "Test User",
            "role": "CEO",
            "tenant_id": "4f644c1f-0d57-4980-8eba-ecc9ed7b661e"
        }
    }')

echo "Response:"
echo "$response"
echo ""

# Check if successful
if echo "$response" | grep -q '"id"'; then
    echo "SUCCESS: User created"
else
    echo "FAILED: User creation failed"
fi