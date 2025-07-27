# User Setup with Supabase Management API

This directory contains scripts to properly create users using the Supabase Management API and then set up their corresponding user profiles in the database.

## Prerequisites

1. **Supabase Project**: You need an active Supabase project
2. **Service Role Key**: You need your project's service role key (not the anon key!)
3. **Environment Variables**: Set up your Supabase configuration

### Getting Your Supabase Keys

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy your **Project URL** and **Service Role Key** (secret key with admin privileges)

## Configuration

Set your Supabase configuration using environment variables:

### For Linux/Mac (Bash):
```bash
export SUPABASE_URL="https://your-project-ref.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

### For Windows (PowerShell):
```powershell
$env:SUPABASE_URL = "https://your-project-ref.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key-here"
```

Alternatively, you can edit the scripts directly and update the configuration values at the top.

## Usage Instructions

### Step 1: Configure Your Supabase Credentials

Set your environment variables (recommended) or edit the script files directly.

### Step 2: Create Users with Supabase Management API

Choose the appropriate script for your operating system:

#### For Windows (PowerShell):
```powershell
# Navigate to the scripts directory
cd scripts

# Execute the PowerShell script
.\create-users-supabase.ps1
```

#### For Linux/Mac (Bash):
```bash
# Navigate to the scripts directory
cd scripts

# Execute the bash script
./create-users-supabase.sh
```

### Step 3: Run the Database Setup Script

After successfully creating users with the Management API, run the main database setup script:

```sql
-- Execute the complete data setup script
-- This will create tenants, areas, and user profiles that link to the Supabase Auth users
\i database/complete-data-setup.sql
```

## Created Users

The scripts will create the following users:

| Email | Password | Role | Tenant |
|-------|----------|------|---------|
| admin@stratix-platform.com | StrongPassword123! | CEO | Stratix Platform |
| manager@stratix-platform.com | StrongPassword123! | Manager | Stratix Platform |
| analyst@stratix-platform.com | StrongPassword123! | Analyst | Stratix Platform |
| admin@fema-electricidad.com | StrongPassword123! | CEO | FEMA Electricidad |
| manager@fema-electricidad.com | StrongPassword123! | Manager | FEMA Electricidad |
| analyst@fema-electricidad.com | StrongPassword123! | Analyst | FEMA Electricidad |
| admin@siga-turismo.com | StrongPassword123! | CEO | SIGA Turismo |
| manager@siga-turismo.com | StrongPassword123! | Manager | SIGA Turismo |
| analyst@siga-turismo.com | StrongPassword123! | Analyst | SIGA Turismo |
| superadmin@stratix-platform.com | SuperAdminPassword123! | Superadmin | Platform-wide |

## Important Notes

1. **Change Default Passwords**: The scripts use default passwords for demonstration. In production, ensure users change their passwords on first login.

2. **Email Confirmation**: Users are created with confirmed email addresses. In production, you may want to require email verification.

3. **Error Handling**: The scripts include basic error handling and will warn you if users already exist or if there are issues during creation.

4. **Rate Limiting**: The scripts include small delays between user creation to respect API rate limits.

## Troubleshooting

### "Error: Please set your Supabase configuration"
- Make sure you've set the SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
- Or edit the script files directly with your configuration

### "User already exists" errors
- This is normal if you're re-running the script. The API will return an error for existing users.

### HTTP 403 or authentication errors
- Make sure you're using the **service role key**, not the anon key
- The service role key should start with `eyJ` and be much longer than the anon key
- Verify the key has admin privileges in your Supabase project

### HTTP 404 errors
- Check that your SUPABASE_URL is correct
- Make sure the URL format is: `https://your-project-ref.supabase.co`

### SQL script warnings about missing users
- This means the API user creation didn't work properly
- Check the output of the user creation script for errors
- Verify your Supabase configuration and try again

## File Structure

```
scripts/
├── create-users-supabase.ps1  # PowerShell script for Windows
├── create-users-supabase.sh   # Bash script for Linux/Mac
└── README.md                  # This file

database/
└── complete-data-setup.sql    # Modified to work with Supabase CLI created users
```
