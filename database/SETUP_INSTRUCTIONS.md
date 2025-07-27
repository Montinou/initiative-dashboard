# Database Setup Instructions (Updated)

Since you don't have direct access to the `auth` schema, we need to use a two-step approach:

## Step 1: Run the Basic Database Setup

1. Execute the setup script that creates tenants, areas, and user profiles with placeholder IDs:

```sql
-- Run this file in your Supabase SQL Editor
\i database/setup-without-auth.sql
```

This will create:
- 3 tenants (Stratix, FEMA, SIGA)
- Areas for each tenant
- User profiles with placeholder UUIDs

## Step 2: Create Users in Supabase Dashboard

Go to your Supabase Dashboard → Authentication → Users and manually create these users:

### Stratix Platform Users:
- **Email**: admin@stratix-platform.com, **Password**: StrongPassword123!, **Name**: Admin Stratix
- **Email**: manager@stratix-platform.com, **Password**: StrongPassword123!, **Name**: Manager Stratix  
- **Email**: analyst@stratix-platform.com, **Password**: StrongPassword123!, **Name**: Analyst Stratix

### FEMA Electricidad Users:
- **Email**: admin@fema-electricidad.com, **Password**: StrongPassword123!, **Name**: Admin FEMA
- **Email**: manager@fema-electricidad.com, **Password**: StrongPassword123!, **Name**: Gerente División Industrial
- **Email**: analyst@fema-electricidad.com, **Password**: StrongPassword123!, **Name**: Analista Comercial

### SIGA Turismo Users:
- **Email**: admin@siga-turismo.com, **Password**: StrongPassword123!, **Name**: Admin SIGA
- **Email**: manager@siga-turismo.com, **Password**: StrongPassword123!, **Name**: Director de Desarrollo
- **Email**: analyst@siga-turismo.com, **Password**: StrongPassword123!, **Name**: Analista de Marketing

### Superadmin:
- **Email**: superadmin@stratix-platform.com, **Password**: SuperAdminPassword123!, **Name**: Platform Superadmin

## Step 3: Update User Profile IDs

After creating all users in the dashboard, run the update script:

```sql
-- Run this file in your Supabase SQL Editor
\i database/update-user-ids.sql
```

This will:
1. Show you all the auth users that were created
2. Automatically update the user_profiles table with the correct auth.users IDs
3. Verify that all IDs match correctly

## Step 4: Verification

After running both scripts, you should see:
- All user profiles have matching IDs with auth.users
- Users can log in with the emails and passwords
- Each user is associated with the correct tenant and area

## Alternative: Use Supabase CLI (if available)

If you have Supabase CLI installed, you can try:

```bash
supabase auth users create admin@stratix-platform.com --password StrongPassword123!
# Repeat for all users...
```

But based on our earlier attempts, the CLI might not have the auth commands available in your version.

## Notes:

- The setup-without-auth.sql script is safe to run multiple times (uses ON CONFLICT)
- Make sure to create users with email confirmation enabled in the dashboard
- The placeholder UUIDs will be replaced with actual auth.users IDs in step 3
- All passwords are set to strong defaults but can be changed by users after login
