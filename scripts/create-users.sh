#!/bin/bash

# Load environment variables
export $(grep -v '^#' ../.env.local | xargs)

echo "Creating demo users via Supabase Auth API..."
echo "============================================"

# Demo accounts
declare -a emails=("ceo@stratix-demo.com" "admin@stratix-demo.com" "ceo@fema-electricidad.com" "admin@fema-electricidad.com" "ceo@siga-turismo.com" "admin@siga-turismo.com")
declare -a names=("CEO Stratix" "Admin Stratix" "CEO FEMA" "Admin FEMA" "CEO SIGA" "Admin SIGA")
declare -a roles=("CEO" "Admin" "CEO" "Admin" "CEO" "Admin")
declare -a tenant_ids=("4f644c1f-0d57-4980-8eba-ecc9ed7b661e" "4f644c1f-0d57-4980-8eba-ecc9ed7b661e" "c5a4dd96-6058-42b3-8268-997728a529bb" "c5a4dd96-6058-42b3-8268-997728a529bb" "d1a3408c-a3d0-487e-a355-a321a07b5ae2" "d1a3408c-a3d0-487e-a355-a321a07b5ae2")

PASSWORD="password123"

echo "Using Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
echo ""

# Create users via Admin API
for i in "${!emails[@]}"; do
    email="${emails[$i]}"
    name="${names[$i]}"
    role="${roles[$i]}"
    tenant_id="${tenant_ids[$i]}"
    
    echo "Creating user: $email ($name)"
    
    # Create user via Supabase Admin API
    response=$(curl -s -X POST \
        "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -d "{
            \"email\": \"$email\",
            \"password\": \"$PASSWORD\",
            \"email_confirm\": true,
            \"user_metadata\": {
                \"full_name\": \"$name\",
                \"role\": \"$role\",
                \"tenant_id\": \"$tenant_id\"
            }
        }")
    
    # Check if request was successful
    if echo "$response" | grep -q '"id"'; then
        user_id=$(echo "$response" | jq -r '.id // empty')
        echo "  ✓ Created user $email with ID: $user_id"
        
        # Create user profile if user was created successfully
        if [ ! -z "$user_id" ]; then
            echo "  Creating user profile..."
            
            profile_response=$(curl -s -X POST \
                "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/user_profiles" \
                -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
                -H "Content-Type: application/json" \
                -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
                -H "Prefer: return=minimal" \
                -d "{
                    \"id\": \"$user_id\",
                    \"tenant_id\": \"$tenant_id\",
                    \"email\": \"$email\",
                    \"full_name\": \"$name\",
                    \"role\": \"$role\",
                    \"area\": \"$([ "$role" = "CEO" ] && echo "Executive" || echo "Administration")\",
                    \"is_active\": true
                }")
            
            if echo "$profile_response" | grep -q "error"; then
                echo "  ⚠️  Warning: Could not create profile: $(echo "$profile_response" | jq -r '.message // .error.message // "Unknown error"')"
            else
                echo "  ✓ Created user profile for $email"
            fi
        fi
    else
        error_msg=$(echo "$response" | jq -r '.message // .error_description // .error // "Unknown error"')
        echo "  ✗ Error creating user $email: $error_msg"
    fi
    
    echo ""
done

echo "Verifying users..."
echo "=================="

# Check created users
response=$(curl -s -X GET \
    "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY")

if echo "$response" | grep -q '"users"'; then
    created_count=$(echo "$response" | jq '[.users[] | select(.email | test("@(stratix-demo|fema-electricidad|siga-turismo)\\.com$"))] | length')
    echo "Auth users created: $created_count/6"
    
    # Show created users
    echo "$response" | jq -r '.users[] | select(.email | test("@(stratix-demo|fema-electricidad|siga-turismo)\\.com$")) | "  - \(.email) (\(.id))"'
else
    echo "Error checking users: $(echo "$response" | jq -r '.message // "Unknown error"')"
fi

echo ""
echo "Demo Accounts Created:"
echo "====================="
echo "Stratix Platform:"
echo "  CEO: ceo@stratix-demo.com / password123"
echo "  Admin: admin@stratix-demo.com / password123"
echo ""
echo "FEMA Electricidad:"
echo "  CEO: ceo@fema-electricidad.com / password123"
echo "  Admin: admin@fema-electricidad.com / password123"
echo ""
echo "SIGA Turismo:"
echo "  CEO: ceo@siga-turismo.com / password123"
echo "  Admin: admin@siga-turismo.com / password123"