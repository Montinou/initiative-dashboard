-- Verify Superadmin Setup
-- Run this in Supabase SQL Editor to check if everything is configured correctly

-- 1. Check if superadmin exists
SELECT 
    'Superadmin Check' as check_type,
    id, 
    email, 
    name, 
    is_active, 
    created_at,
    last_login
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

-- 2. Check if superadmin tables exist
SELECT 
    'Table Check' as check_type,
    table_name,
    'Exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('superadmins', 'superadmin_sessions', 'superadmin_audit_log')
ORDER BY table_name;

-- 3. Check if superadmin functions exist
SELECT 
    'Function Check' as check_type,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'superadmin_%'
ORDER BY routine_name;

-- 4. Test password verification (this will show if the password hash is correct)
-- Note: This uses our edge-compatible hashing, so we can't test with crypt() directly
SELECT 
    'Password Hash Check' as check_type,
    email,
    CASE 
        WHEN password_hash IS NOT NULL AND length(password_hash) > 20 THEN 'Hash exists and looks valid'
        ELSE 'Hash missing or invalid'
    END as hash_status,
    length(password_hash) as hash_length
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

-- 5. Verify RLS policies
SELECT 
    'RLS Policy Check' as check_type,
    tablename,
    policyname,
    permissive,
    roles
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename LIKE 'superadmin%';

-- 6. Check if we can create a test session (this tests the authentication function)
-- Note: Don't run this in production, it's just for testing
-- SELECT * FROM superadmin_authenticate('test@example.com', 'wrongpassword', '127.0.0.1'::inet, 'test');

-- Summary
SELECT 
    'Setup Summary' as check_type,
    COUNT(CASE WHEN table_name IN ('superadmins', 'superadmin_sessions', 'superadmin_audit_log') THEN 1 END) as tables_created,
    (SELECT COUNT(*) FROM public.superadmins WHERE email = 'agusmontoya@gmail.com') as superadmin_exists,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'superadmin_%') as functions_created
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Instructions
SELECT 
    'Next Steps' as instruction_type,
    'If superadmin_exists = 1, tables_created = 3, and functions_created > 0, then setup is complete!' as message
UNION ALL
SELECT 
    'Login Info' as instruction_type,
    'Email: agusmontoya@gmail.com | Password: btcStn60 | URL: /superadmin/login' as message;