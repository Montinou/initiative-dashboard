# PowerShell script to create users using Supabase Management API
# Run this script before executing the complete-data-setup.sql

# Configuration - UPDATE THESE VALUES
$SUPABASE_URL = if ($env:SUPABASE_URL) { $env:SUPABASE_URL } else { "https://your-project-ref.supabase.co" }
$SUPABASE_SERVICE_ROLE_KEY = if ($env:SUPABASE_SERVICE_ROLE_KEY) { $env:SUPABASE_SERVICE_ROLE_KEY } else { "your-service-role-key" }

# Check if environment variables are set
if ($SUPABASE_URL -eq "https://your-project-ref.supabase.co" -or $SUPABASE_SERVICE_ROLE_KEY -eq "your-service-role-key") {
    Write-Host "❌ Error: Please set your Supabase configuration" -ForegroundColor Red
    Write-Host "Set environment variables:" -ForegroundColor Yellow
    Write-Host "  `$env:SUPABASE_URL = 'https://your-project-ref.supabase.co'" -ForegroundColor Yellow
    Write-Host "  `$env:SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or edit this script and update the values at the top" -ForegroundColor Yellow
    exit 1
}

Write-Host "Creating users with Supabase Management API..." -ForegroundColor Green
Write-Host "Project URL: $SUPABASE_URL" -ForegroundColor Cyan
Write-Host ""

# Array of users to create
$users = @(
    @{
        email = "admin@stratix-platform.com"
        password = "StrongPassword123!"
        name = "Admin Stratix"
    },
    @{
        email = "manager@stratix-platform.com"
        password = "StrongPassword123!"
        name = "Manager Stratix"
    },
    @{
        email = "analyst@stratix-platform.com"
        password = "StrongPassword123!"
        name = "Analyst Stratix"
    },
    @{
        email = "admin@fema-electricidad.com"
        password = "StrongPassword123!"
        name = "Admin FEMA"
    },
    @{
        email = "manager@fema-electricidad.com"
        password = "StrongPassword123!"
        name = "Gerente División Industrial"
    },
    @{
        email = "analyst@fema-electricidad.com"
        password = "StrongPassword123!"
        name = "Analista Comercial"
    },
    @{
        email = "admin@siga-turismo.com"
        password = "StrongPassword123!"
        name = "Admin SIGA"
    },
    @{
        email = "manager@siga-turismo.com"
        password = "StrongPassword123!"
        name = "Director de Desarrollo"
    },
    @{
        email = "analyst@siga-turismo.com"
        password = "StrongPassword123!"
        name = "Analista de Marketing"
    },
    @{
        email = "superadmin@stratix-platform.com"
        password = "SuperAdminPassword123!"
        name = "Platform Superadmin"
    }
)

$successCount = 0
$errorCount = 0

# Create each user
foreach ($user in $users) {
    Write-Host "Creating user: $($user.email)" -ForegroundColor Yellow
    
    try {
        # Prepare the request body
        $body = @{
            email = $user.email
            password = $user.password
            email_confirm = $true
            user_metadata = @{
                full_name = $user.name
            }
        } | ConvertTo-Json -Depth 3
        
        # Create user using Supabase Admin API
        $headers = @{
            "Authorization" = "Bearer $SUPABASE_SERVICE_ROLE_KEY"
            "Content-Type" = "application/json"
            "apikey" = $SUPABASE_SERVICE_ROLE_KEY
        }
        
        $response = Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/admin/users" -Method Post -Body $body -Headers $headers
        
        Write-Host "  ✓ Successfully created: $($user.email)" -ForegroundColor Green
        $successCount++
    }
    catch {
        Write-Host "  ✗ Failed to create: $($user.email)" -ForegroundColor Red
        Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
    
    Start-Sleep -Seconds 1  # Rate limiting
}

Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "✅ Successfully created: $successCount users" -ForegroundColor Green
Write-Host "❌ Failed: $errorCount users" -ForegroundColor Red

if ($successCount -gt 0) {
    Write-Host ""
    Write-Host "🎉 User creation completed!" -ForegroundColor Green
    Write-Host "You can now run the complete-data-setup.sql script to create user profiles." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "⚠️  No users were created successfully." -ForegroundColor Yellow
    Write-Host "Please check your Supabase configuration and try again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Make sure you have:" -ForegroundColor Yellow
    Write-Host "1. Set the correct SUPABASE_URL" -ForegroundColor Yellow
    Write-Host "2. Set the correct SUPABASE_SERVICE_ROLE_KEY (not anon key!)" -ForegroundColor Yellow
    Write-Host "3. The service role key has admin privileges" -ForegroundColor Yellow
}
