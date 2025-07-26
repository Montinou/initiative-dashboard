# Database Setup Instructions

## ⚠️ Database Migrations Ready

I've prepared your database migrations and they're ready to run. Here's how to apply them:

### Option 1: Using Supabase CLI (Recommended)

1. **Get your database password** from [Supabase Dashboard](https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/settings/database)

2. **Run the migrations**:
   ```bash
   cd "/mnt/e/Projects/Stratix projectos/Stratix"
   supabase db push
   ```
   
   Enter your database password when prompted.

### Option 2: Using Supabase SQL Editor

Copy and paste the following files in order in your [Supabase SQL Editor](https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/sql):

1. **First**: Copy contents of `supabase/migrations/20250126000001_clean_setup.sql`
2. **Second**: Copy contents of `supabase/migrations/20250126000002_superadmin_schema.sql`

### Option 3: Direct SQL Connection

If you have psql installed:
```bash
psql "postgresql://postgres.zkkdnslupqnpioltjpeu:[YOUR_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres" < supabase/migrations/20250126000001_clean_setup.sql

psql "postgresql://postgres.zkkdnslupqnpioltjpeu:[YOUR_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres" < supabase/migrations/20250126000002_superadmin_schema.sql
```

## 📁 Migration Files Created

✅ `supabase/migrations/20250126000001_clean_setup.sql` - Main database schema
✅ `supabase/migrations/20250126000002_superadmin_schema.sql` - Superadmin functionality

## 🔧 What These Migrations Include

### Main Schema (clean_setup.sql):
- ✅ Drops existing conflicting tables
- ✅ Creates proper user_profiles table linked to auth.users
- ✅ Sets up tenants, areas, initiatives, audit_log tables
- ✅ Implements Row Level Security (RLS) policies
- ✅ Creates permission functions
- ✅ Inserts default FEMA tenant and areas

### Superadmin Schema (superadmin_schema.sql):
- ✅ Creates superadmin authentication system
- ✅ Adds area templates functionality
- ✅ Sets up audit logging for platform management
- ✅ Creates secure session management
- ✅ Implements management functions for tenants/users

## 🚀 After Running Migrations

1. **Create test users** in [Supabase Auth Dashboard](https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/auth/users)

2. **Add user profiles** via SQL Editor:
   ```sql
   -- Replace USER_IDs with actual auth.users IDs from dashboard
   INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area) VALUES
   ('YOUR-CEO-USER-ID', '550e8400-e29b-41d4-a716-446655440000', 'ceo@fema-electricidad.com', 'CEO Test User', 'CEO', NULL),
   ('YOUR-ADMIN-USER-ID', '550e8400-e29b-41d4-a716-446655440000', 'admin@fema-electricidad.com', 'Admin Test User', 'Admin', NULL),
   ('YOUR-MANAGER-USER-ID', '550e8400-e29b-41d4-a716-446655440000', 'manager@fema-electricidad.com', 'Manager Test User', 'Manager', 'División Iluminación'),
   ('YOUR-ANALYST-USER-ID', '550e8400-e29b-41d4-a716-446655440000', 'analyst@fema-electricidad.com', 'Analyst Test User', 'Analyst', NULL);
   ```

3. **Test the authentication** by running the app:
   ```bash
   npm run dev
   ```

## 🔍 Verification Queries

After running migrations, verify everything works:

```sql
-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Test permission function
SELECT user_has_permission('manageUsers');
```

## 🎯 Current Project Status

- ✅ **Role conflicts resolved** - Single source of truth in `lib/role-permissions.ts`
- ✅ **Mock auth replaced** - Real Supabase integration in `lib/auth-context.tsx`
- ✅ **Edge Runtime fixed** - Web Crypto API in `lib/edge-compatible-auth.ts`
- ✅ **Database schema ready** - Complete multi-tenant setup with RLS
- ✅ **Migrations prepared** - Ready to run in Supabase

Just run the migrations and you'll have a fully functional authentication system!