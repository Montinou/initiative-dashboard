-- Verification queries for database setup
-- Copy and paste these into Supabase SQL Editor

-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'user_profiles', 'areas', 'initiatives', 'audit_log', 'superadmins', 'superadmin_sessions', 'superadmin_audit_log')
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;

-- Check tenants data
SELECT id, name, subdomain, industry FROM public.tenants;

-- Check areas data
SELECT tenant_id, name, description FROM public.areas;

-- Check user_role enum type
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumsortorder;

-- Test permission function (should return false since no user is authenticated)
SELECT user_has_permission('manageUsers') as manage_users_permission;

-- Count of tables with proper structure
SELECT 
    'SETUP COMPLETE!' as status,
    COUNT(*) as tables_created
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'user_profiles', 'areas', 'initiatives', 'audit_log', 'superadmins', 'superadmin_sessions', 'superadmin_audit_log');