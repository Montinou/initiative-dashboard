#!/bin/bash
# Bash script to create users using Supabase Management API
# Run this script before executing the complete-data-setup.sql

# Configuration - UPDATE THESE VALUES
SUPABASE_URL="${SUPABASE_URL:-https://your-project-ref.supabase.co}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-your-service-role-key}"

# Check if environment variables are set
if [[ "$SUPABASE_URL" == "https://your-project-ref.supabase.co" ]] || [[ "$SUPABASE_SERVICE_ROLE_KEY" == "your-service-role-key" ]]; then
    echo "❌ Error: Please set your Supabase configuration"
    echo "Set environment variables:"
    echo "  export SUPABASE_URL='https://your-project-ref.supabase.co'"
    echo "  export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'"
    echo ""
    echo "Or edit this script and update the values at the top"
    exit 1
fi

echo "Creating users with Supabase Management API..."
echo "Project URL: $SUPABASE_URL"
echo ""

# Array of users (email:password:name)
users=(
    "admin@stratix-platform.com:StrongPassword123!:Admin Stratix"
    "manager@stratix-platform.com:StrongPassword123!:Manager Stratix"
    "analyst@stratix-platform.com:StrongPassword123!:Analyst Stratix"
    "admin@fema-electricidad.com:StrongPassword123!:Admin FEMA"
    "manager@fema-electricidad.com:StrongPassword123!:Gerente División Industrial"
    "analyst@fema-electricidad.com:StrongPassword123!:Analista Comercial"
    "admin@siga-turismo.com:StrongPassword123!:Admin SIGA"
    "manager@siga-turismo.com:StrongPassword123!:Director de Desarrollo"
    "analyst@siga-turismo.com:StrongPassword123!:Analista de Marketing"
    "superadmin@stratix-platform.com:SuperAdminPassword123!:Platform Superadmin"
)

success_count=0
error_count=0

# Create each user
for user_data in "${users[@]}"; do
    IFS=':' read -r email password name <<< "$user_data"
    
    echo "Creating user: $email"
    
    # Create user using Supabase Admin API
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        "$SUPABASE_URL/auth/v1/admin/users" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -d "{
            \"email\": \"$email\",
            \"password\": \"$password\",
            \"email_confirm\": true,
            \"user_metadata\": {
                \"full_name\": \"$name\"
            }
        }")
    
    # Extract HTTP status code
    http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    if [[ "$http_code" == "200" ]] || [[ "$http_code" == "201" ]]; then
        echo "  ✓ Successfully created: $email"
        ((success_count++))
    else
        echo "  ✗ Failed to create: $email (HTTP $http_code)"
        if [[ -n "$body" ]]; then
            echo "    Error: $body"
        fi
        ((error_count++))
    fi
    
    sleep 1  # Rate limiting
done

echo ""
echo "📊 Summary:"
echo "✅ Successfully created: $success_count users"
echo "❌ Failed: $error_count users"

if [[ $success_count -gt 0 ]]; then
    echo ""
    echo "🎉 User creation completed!"
    echo "You can now run the complete-data-setup.sql script to create user profiles."
else
    echo ""
    echo "⚠️  No users were created successfully."
    echo "Please check your Supabase configuration and try again."
    echo ""
    echo "Make sure you have:"
    echo "1. Set the correct SUPABASE_URL"
    echo "2. Set the correct SUPABASE_SERVICE_ROLE_KEY (not anon key!)"
    echo "3. The service role key has admin privileges"
fi
