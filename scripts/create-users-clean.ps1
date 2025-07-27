# PowerShell script to create users using Supabase Management API
# Run this script before executing the complete-data-setup.sql

# Configuration - Hardcoded values
$SUPABASE_URL = "https://zkkdnslupqnpioltjpeu.supabase.co"
$SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw"

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
        
        Write-Host "  Request body: $body" -ForegroundColor Gray
        
        # Create user using Supabase Admin API
        $headers = @{
            "Authorization" = "Bearer $SUPABASE_SERVICE_ROLE_KEY"
            "Content-Type" = "application/json"
            "apikey" = $SUPABASE_SERVICE_ROLE_KEY
        }
        
        $response = Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/admin/users" -Method Post -Body $body -Headers $headers
        
        Write-Host "  Success: $($user.email)" -ForegroundColor Green
        $successCount++
    }
    catch {
        Write-Host "  Failed: $($user.email)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode
            Write-Host "    HTTP Status: $statusCode" -ForegroundColor Red
            
            # Try to get response content
            try {
                $responseStream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($responseStream)
                $responseContent = $reader.ReadToEnd()
                Write-Host "    Response: $responseContent" -ForegroundColor Red
            }
            catch {
                Write-Host "    Could not read response content" -ForegroundColor Red
            }
        }
        Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
    
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "Successfully created: $successCount users" -ForegroundColor Green
Write-Host "Failed: $errorCount users" -ForegroundColor Red

if ($successCount -gt 0) {
    Write-Host ""
    Write-Host "User creation completed!" -ForegroundColor Green
    Write-Host "You can now run the complete-data-setup.sql script to create user profiles." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "No users were created successfully." -ForegroundColor Yellow
    Write-Host "Please check your Supabase configuration and try again." -ForegroundColor Yellow
}
