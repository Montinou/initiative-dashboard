# Complete Setup Instructions

Due to issues with the Supabase Auth API, we'll create users directly in the database. Here's the correct order of operations:

## Step 1: Create Auth Users
First, run the SQL script that creates users directly in the auth.users table:

```sql
-- Connect to your Supabase database and run:
\i database/create-auth-users.sql
```

This script will:
- Create all users directly in the `auth.users` table with proper password hashing
- Create corresponding entries in `auth.identities` table
- Set up proper metadata and authentication status
- Mark the superadmin user with `is_super_admin = true`

## Step 2: Create Tenants, Areas, and User Profiles
After the auth users are created, run the main setup script:

```sql
-- Run the complete data setup:
\i database/complete-data-setup.sql
```

This will:
- Create tenants (Stratix, FEMA, SIGA)
- Create areas for each tenant
- Create user profiles that link to the auth users created in Step 1
- Create sample initiatives
- Create audit log entries

## Alternative: Single Combined Script
I can also create a single script that does everything in the correct order if you prefer.

## Why This Approach?
The Supabase Auth API was returning "Database error creating new user" (HTTP 500), which suggests:
1. There might be database constraints or triggers preventing user creation via API
2. The auth schema might have custom configurations
3. Direct database insertion bypasses API validation but ensures users are created

## Security Notes
- Passwords are properly hashed using bcrypt (via `crypt()` function)
- Users are created with `email_confirmed_at` set (no email verification needed)
- Proper metadata is set for authentication
- Super admin is properly flagged

## Verification
After running both scripts, you can verify the setup with:

```sql
-- Check auth users
SELECT email, id, created_at, is_super_admin FROM auth.users ORDER BY email;

-- Check user profiles
SELECT email, full_name, role, area FROM public.user_profiles ORDER BY email;

-- Check tenants
SELECT name, subdomain FROM public.tenants ORDER BY name;
```
