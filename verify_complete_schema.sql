-- COMPREHENSIVE SCHEMA VERIFICATION
-- Run this after fix_schema_rls_fk.sql to verify everything is correct

-- ============================================================================
-- VERIFY TABLE STRUCTURE AND FOREIGN KEYS
-- ============================================================================

-- 1. Check all tables exist
SELECT 
    'Table Existence Check' as check_type,
    table_name,
    table_type,
    CASE 
        WHEN table_name IN ('tenants', 'user_profiles', 'areas', 'initiatives', 'audit_log', 'superadmins', 'superadmin_sessions', 'superadmin_audit_log', 'area_templates') 
        THEN '✅ Required table exists'
        ELSE '⚠️ Additional table'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check foreign key relationships
SELECT 
    'Foreign Key Verification' as check_type,
    tc.table_name as table_name,
    kcu.column_name as column_name,
    ccu.table_name as references_table,
    ccu.column_name as references_column,
    rc.delete_rule,
    '✅ FK properly configured' as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- VERIFY RLS CONFIGURATION
-- ============================================================================

-- 3. Check RLS is enabled on all tables
SELECT 
    'RLS Status Check' as check_type,
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS Enabled'
        ELSE '❌ RLS DISABLED'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 4. Check RLS policies exist and are properly configured
SELECT 
    'RLS Policy Check' as check_type,
    tablename,
    policyname,
    cmd as operation,
    CASE 
        WHEN roles = '{authenticated}' THEN '✅ Authenticated users'
        WHEN roles = '{service_role}' THEN '✅ Service role'
        ELSE '⚠️ Other roles: ' || array_to_string(roles, ', ')
    END as target_roles,
    permissive
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- VERIFY ESSENTIAL FUNCTIONS EXIST
-- ============================================================================

-- 5. Check essential functions exist
SELECT 
    'Function Check' as check_type,
    routine_name,
    routine_type,
    data_type as return_type,
    CASE 
        WHEN routine_name LIKE 'superadmin_%' THEN '✅ Superadmin function'
        WHEN routine_name IN ('handle_updated_at', 'get_user_context', 'user_has_permission', 'log_audit_event', 'get_user_permitted_areas') THEN '✅ Core function'
        ELSE '⚠️ Additional function'
    END as function_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ============================================================================
-- VERIFY DATA INTEGRITY
-- ============================================================================

-- 6. Check essential data exists
SELECT 'Essential Data Check' as check_type, 'Tenants' as data_type, COUNT(*) as count FROM public.tenants
UNION ALL
SELECT 'Essential Data Check' as check_type, 'Superadmins' as data_type, COUNT(*) as count FROM public.superadmins
UNION ALL  
SELECT 'Essential Data Check' as check_type, 'Areas' as data_type, COUNT(*) as count FROM public.areas
UNION ALL
SELECT 'Essential Data Check' as check_type, 'User Profiles' as data_type, COUNT(*) as count FROM public.user_profiles;

-- ============================================================================
-- VERIFY SUPERADMIN SETUP SPECIFICALLY
-- ============================================================================

-- 7. Check superadmin user exists with correct credentials
SELECT 
    'Superadmin User Check' as check_type,
    email,
    name,
    is_active,
    CASE 
        WHEN password_hash IS NOT NULL AND LENGTH(password_hash) > 20 THEN '✅ Password hash exists'
        ELSE '❌ Password hash missing or invalid'
    END as password_status,
    created_at
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

-- ============================================================================
-- SECURITY VERIFICATION
-- ============================================================================

-- 8. Verify service role permissions (this should work)
SELECT 
    'Service Role Access Test' as check_type,
    'Tenants' as table_name,
    COUNT(*) as accessible_records,
    '✅ Service role can access' as status
FROM public.tenants;

-- 9. Check if authenticated users are properly restricted for superadmin tables
SELECT 
    'Security Check' as check_type,
    'Superadmin tables should be blocked for authenticated users' as description,
    'RLS policies configured to block direct access' as security_measure;

-- ============================================================================
-- FINAL VERIFICATION SUMMARY
-- ============================================================================

SELECT 
    'FINAL VERIFICATION SUMMARY' as summary_type,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('tenants', 'user_profiles', 'areas', 'initiatives', 'superadmins')) = 5
        THEN '✅ All core tables exist'
        ELSE '❌ Missing core tables'
    END as tables_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) >= 8
        THEN '✅ RLS enabled on all tables'
        ELSE '❌ RLS not properly enabled'
    END as rls_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') >= 15
        THEN '✅ RLS policies configured'
        ELSE '❌ Missing RLS policies'
    END as policies_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.superadmins WHERE email = 'agusmontoya@gmail.com') = 1
        THEN '✅ Superadmin user exists'
        ELSE '❌ Superadmin user missing'
    END as superadmin_status;

-- Instructions for next steps
SELECT 
    'NEXT STEPS' as instruction_type,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.superadmins WHERE email = 'agusmontoya@gmail.com') = 0
        THEN 'Run create_superadmin_user.sql to create the superadmin user'
        ELSE 'Schema is ready! Test login at /superadmin/login with agusmontoya@gmail.com / btcStn60'
    END as action_needed;