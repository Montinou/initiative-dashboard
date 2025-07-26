# Complete Database Reset Instructions

## 🔥 NUCLEAR OPTION: Complete Database Reset

This will completely wipe and rebuild your database with clean demo data.

### Step 1: Run the Schema Reset
Copy and paste the contents of `complete_database_reset.sql` into your Supabase SQL Editor and execute it.

This will:
- Drop ALL tables, functions, triggers, and types
- Clear auth.users and auth.identities  
- Recreate the entire schema with proper RLS policies
- Set up all indexes and relationships

### Step 2: Insert Demo Data
Copy and paste the contents of `insert_demo_data.sql` into your Supabase SQL Editor and execute it.

This will create:

**Superadmin User:**
- Email: `agusmontoya@gmail.com`
- Password: `btcStn60`
- Exists in BOTH `auth.users` AND `public.superadmins`

**Demo Tenants:**
1. **FEMA Electricidad** (`fema-electricidad`)
2. **SIGA Turismo** (`siga-turismo`)  
3. **TechCorp Solutions** (`techcorp-solutions`)

**Demo Users (password: `demo123`):**

### FEMA Electricidad:
- `carlos.mendez@fema.com` - CEO
- `maria.rodriguez@fema.com` - Admin
- `jose.garcia@fema.com` - Manager
- `ana.lopez@fema.com` - Analyst

### SIGA Turismo:
- `laura.martinez@siga.com` - CEO
- `pedro.sanchez@siga.com` - Manager
- `sofia.torres@siga.com` - Analyst

### TechCorp Solutions:
- `david.kim@techcorp.com` - CEO
- `jennifer.wong@techcorp.com` - Admin
- `michael.brown@techcorp.com` - Manager

## After Reset:

1. **Superadmin Login**: `https://stratix-platform.vercel.app/superadmin/login`
   - Email: `agusmontoya@gmail.com`
   - Password: `btcStn60`

2. **Regular User Login**: `https://stratix-platform.vercel.app/auth/login`
   - Any demo user email
   - Password: `demo123`

3. **Multi-tenant URLs**:
   - `https://fema-electricidad.stratix-platform.vercel.app`
   - `https://siga-turismo.stratix-platform.vercel.app`
   - `https://techcorp-solutions.stratix-platform.vercel.app`

## What This Fixes:

✅ Superadmin exists in both auth.users and public.superadmins
✅ All demo users have proper auth.users records
✅ All demo users have corresponding user_profiles
✅ Proper RLS policies for multi-tenant access
✅ Clean database with no orphaned data
✅ Proper foreign key relationships
✅ Working session management

## If Something Goes Wrong:

If either script fails, you can run them again. The reset script drops everything first, so it's safe to re-run.

The demo data script uses proper conflict handling for most inserts.