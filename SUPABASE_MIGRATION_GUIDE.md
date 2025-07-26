# Supabase Database Migration Guide

## 🚨 Important: Backup Your Data First!

This guide will help you safely migrate your Supabase database to the new authentication schema. Follow these steps carefully to avoid data loss.

## 📋 Migration Steps

### Step 1: Check Current Schema
First, understand what tables and data currently exist in your database:

```sql
-- Run this in Supabase SQL Editor
-- Copy from: scripts/check-existing-schema.sql
```

This will show you:
- All existing tables
- Custom types
- RLS policies
- Functions and triggers
- Foreign key relationships

### Step 2: Backup Existing Data
Run the backup script to save your current data:

```sql
-- Run this in Supabase SQL Editor
-- Copy from: scripts/backup-and-migrate.sql
```

This creates a `backup_20250126` schema with copies of your existing tables.

### Step 3: Apply New Schema
After backing up, apply the new schema:

```sql
-- Run this in Supabase SQL Editor
-- Copy from: scripts/validate-and-setup-database.sql
```

This will:
- Drop existing tables (after confirming backups)
- Create new table structure
- Set up RLS policies
- Create necessary functions
- Insert default data

### Step 4: Migrate Existing Data
If you had existing data, restore it to the new schema:

```sql
-- Run this after creating new schema
SELECT migrate_existing_data();
```

### Step 5: Create Test Users
Create test users through Supabase Auth dashboard first, then add their profiles:

```sql
-- Example: Create test user profiles
-- First create auth users in Supabase Dashboard, then run:

INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area) VALUES
-- Replace these UUIDs with actual auth.users IDs from your Supabase Auth
('YOUR-CEO-USER-ID', '550e8400-e29b-41d4-a716-446655440000', 'ceo@fema-electricidad.com', 'CEO Test User', 'CEO', NULL),
('YOUR-ADMIN-USER-ID', '550e8400-e29b-41d4-a716-446655440000', 'admin@fema-electricidad.com', 'Admin Test User', 'Admin', NULL),
('YOUR-MANAGER-USER-ID', '550e8400-e29b-41d4-a716-446655440000', 'manager@fema-electricidad.com', 'Manager Test User', 'Manager', 'División Iluminación'),
('YOUR-ANALYST-USER-ID', '550e8400-e29b-41d4-a716-446655440000', 'analyst@fema-electricidad.com', 'Analyst Test User', 'Analyst', NULL);
```

### Step 6: Create Superadmin Account
Create an initial superadmin for platform management:

```sql
-- Create a superadmin account
-- Note: You'll need to hash the password first or use the API
INSERT INTO public.superadmins (email, name, password_hash) VALUES
('admin@Stratix-platform.com', 'Platform Admin', 'YOUR_HASHED_PASSWORD');
```

### Step 7: Verify Migration
Run these checks to ensure everything is working:

```sql
-- Check table creation
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'user_profiles', 'areas', 'initiatives')
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Check user profiles
SELECT id, email, role, tenant_id 
FROM public.user_profiles;

-- Check areas
SELECT * FROM public.areas;

-- Test permission function
SELECT user_has_permission('manageUsers');
```

### Step 8: Clean Up
Once you've verified the migration is successful:

```sql
-- Remove backup schema (ONLY after confirming data is migrated)
DROP SCHEMA backup_20250126 CASCADE;
```

## 🔧 Troubleshooting

### Common Issues

1. **Foreign Key Violations**
   - Ensure auth.users exist before creating user_profiles
   - Check tenant_id references are valid

2. **Type Already Exists**
   - The script handles this with `DROP TYPE IF EXISTS CASCADE`
   - If issues persist, manually drop the type first

3. **Permission Denied**
   - Ensure you're using the service role key for admin operations
   - Check RLS policies aren't blocking access

4. **Missing auth.users**
   - Create users through Supabase Auth dashboard first
   - User profiles reference auth.users via foreign key

### Rollback Plan

If something goes wrong, you can restore from backup:

```sql
-- Restore a specific table from backup
DROP TABLE IF EXISTS public.user_profiles CASCADE;
CREATE TABLE public.user_profiles AS 
SELECT * FROM backup_20250126.user_profiles;
```

## 📊 Schema Overview

### Key Tables
- `tenants` - Multi-tenant organizations
- `user_profiles` - Extended user data with roles
- `areas` - Departments/divisions
- `initiatives` - Business initiatives
- `audit_log` - User action tracking
- `superadmins` - Platform administrators

### User Roles
- **CEO**: Full access to everything
- **Admin**: User and area management
- **Manager**: Department-specific access
- **Analyst**: Read-only with export capabilities

### Security Features
- Row Level Security on all tables
- Role-based permissions
- Audit logging
- Tenant isolation

## 🚀 Next Steps

After successful migration:

1. Update your application environment variables
2. Test authentication flow end-to-end
3. Configure email templates in Supabase
4. Set up monitoring and alerts
5. Document any custom configurations

## ⚠️ Important Notes

- Always backup before making schema changes
- Test in a development environment first
- Keep the backup schema until you're certain everything works
- Monitor application logs after migration
- Have a rollback plan ready

## 📞 Support

If you encounter issues:
1. Check Supabase logs in the dashboard
2. Review RLS policies for permission issues
3. Verify foreign key relationships
4. Ensure all required extensions are enabled

Remember: Take your time and verify each step. It's better to be cautious with database migrations.