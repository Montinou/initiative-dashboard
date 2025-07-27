# Test script to verify Supabase CLI is working
# Run this before executing the main user creation script

Write-Host "Testing Supabase CLI connection..." -ForegroundColor Green

try {
    # Check if Supabase CLI is installed
    $version = supabase --version
    Write-Host "✓ Supabase CLI is installed: $version" -ForegroundColor Green
}
catch {
    Write-Host "✗ Supabase CLI is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install it with: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

try {
    # Check if project is linked
    $status = supabase status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Supabase project is linked and accessible" -ForegroundColor Green
    } else {
        Write-Host "✗ Supabase project is not linked or accessible" -ForegroundColor Red
        Write-Host "Error: $status" -ForegroundColor Red
        Write-Host "Please run: supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor Yellow
        exit 1
    }
}
catch {
    Write-Host "✗ Error checking Supabase status" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✓ All checks passed! You can now run create-users-supabase.ps1" -ForegroundColor Green
