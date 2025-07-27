# PowerShell script to create users using Supabase Management API
# Run this script before executing the complete-data-setup.sql

# Function to load .env file
function Load-DotEnv {
    param([string]$Path = ".env")
    
    if (Test-Path $Path) {
        Get-Content $Path | ForEach-Object {
            if ($_ -match '^([^#][^=]+)=(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim().Trim('"')
                Set-Item -Path "env:$name" -Value $value
                Write-Host "Loaded: $name" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "Warning: .env file not found at $Path" -ForegroundColor Yellow
    }
}

# Load environment variables from .env file
Write-Host "Loading environment variables from .env file..." -ForegroundColor Cyan
Load-DotEnv

# Configuration
$SUPABASE_URL = $env:SUPABASE_URL
$SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

# Check if environment variables are set
if (-not $SUPABASE_URL -or -not $SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "Error: Missing Supabase configuration" -ForegroundColor Red
    Write-Host "Please make sure your .env file contains:" -ForegroundColor Yellow
    Write-Host "  SUPABASE_URL=your-project-url" -ForegroundColor Yellow
    Write-Host "  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
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
        name = "Gerente Division Industrial"
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
        
        Write-Host "  ✓ Success: $($user.email)" -ForegroundColor Green
        $successCount++
    }
    catch {
        Write-Host "  ✗ Failed: $($user.email)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode
            Write-Host "    HTTP Status: $statusCode" -ForegroundColor Red
        }
        Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
    
    Start-Sleep -Seconds 1
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
    Write-Host "⚠️ No users were created successfully." -ForegroundColor Yellow
    Write-Host "Please check your Supabase configuration and try again." -ForegroundColor Yellow
}
