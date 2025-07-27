# PowerShell script to test single user creation
$SUPABASE_URL = "https://zkkdnslupqnpioltjpeu.supabase.co"
$SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw"

Write-Host "Testing single user creation..." -ForegroundColor Green
Write-Host "Project URL: $SUPABASE_URL" -ForegroundColor Cyan

# Test with one user
$user = @{
    email = "test@stratix-platform.com"
    password = "TestPassword123!"
    name = "Test User"
}

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
    
    Write-Host "Request Body:" -ForegroundColor Yellow
    Write-Host $body -ForegroundColor Gray
    
    # Create user using Supabase Admin API
    $headers = @{
        "Authorization" = "Bearer $SUPABASE_SERVICE_ROLE_KEY"
        "Content-Type" = "application/json"
        "apikey" = $SUPABASE_SERVICE_ROLE_KEY
    }
    
    Write-Host "Making request to: $SUPABASE_URL/auth/v1/admin/users" -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/admin/users" -Method Post -Body $body -Headers $headers -Verbose
    
    Write-Host "Success! User created:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3) -ForegroundColor Green
}
catch {
    Write-Host "Failed to create user" -ForegroundColor Red
    Write-Host "Exception Type: $($_.Exception.GetType().FullName)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "HTTP Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $responseStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($responseStream)
            $responseContent = $reader.ReadToEnd()
            Write-Host "Response Content: $responseContent" -ForegroundColor Red
        }
        catch {
            Write-Host "Could not read response content" -ForegroundColor Red
        }
    }
}
