-- Debug Superadmin Login Issues
-- Run this in Supabase SQL Editor to diagnose the problem

-- 1. Check if superadmin exists and get details
SELECT 
    'Superadmin Existence Check' as check_name,
    COUNT(*) as superadmin_count,
    string_agg(email, ', ') as emails_found
FROM public.superadmins;

-- 2. Get specific superadmin details
SELECT 
    'Specific Superadmin Check' as check_name,
    id,
    email,
    name,
    is_active,
    created_at,
    last_login,
    LENGTH(password_hash) as password_hash_length,
    SUBSTRING(password_hash, 1, 20) || '...' as password_hash_preview
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

-- 3. Check if tables exist
SELECT 
    'Table Check' as check_name,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('superadmins', 'superadmin_sessions', 'superadmin_audit_log')
ORDER BY table_name;

-- 4. Check if authentication function exists
SELECT 
    'Function Check' as check_name,
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'superadmin_authenticate';

-- 5. Test if we can manually insert a superadmin (will fail if table doesn't exist)
-- DO NOT RUN THIS IF SUPERADMIN ALREADY EXISTS
/*
INSERT INTO public.superadmins (email, name, password_hash) VALUES (
    'test@example.com',
    'Test Admin',
    'test_hash'
) ON CONFLICT (email) DO NOTHING;
DELETE FROM public.superadmins WHERE email = 'test@example.com';
*/

-- 6. Check RLS policies on superadmin table
SELECT 
    'RLS Policy Check' as check_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'superadmins';

-- 7. Check if service role can access superadmins table
SELECT 
    'Service Role Access Test' as check_name,
    current_setting('role') as current_role,
    COUNT(*) as superadmin_count
FROM public.superadmins;

-- 8. Check recent audit log entries (to see if login attempts are being logged)
SELECT 
    'Recent Audit Entries' as check_name,
    action,
    target_type,
    details,
    created_at
FROM public.superadmin_audit_log 
ORDER BY created_at DESC 
LIMIT 5;

-- SUMMARY AND NEXT STEPS
SELECT 
    'DIAGNOSIS SUMMARY' as summary_type,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'superadmins') 
        THEN 'ERROR: superadmins table does not exist - Run migration scripts'
        WHEN NOT EXISTS (SELECT 1 FROM public.superadmins WHERE email = 'agusmontoya@gmail.com') 
        THEN 'ERROR: Superadmin user does not exist - Run setup script'
        WHEN EXISTS (SELECT 1 FROM public.superadmins WHERE email = 'agusmontoya@gmail.com' AND NOT is_active) 
        THEN 'ERROR: Superadmin user is inactive'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'superadmin_authenticate') 
        THEN 'ERROR: Authentication function missing - Run migration scripts'
        ELSE 'OK: Basic setup appears complete - Check password hash or API issues'
    END as diagnosis,
    'Next step based on diagnosis above' as next_action;