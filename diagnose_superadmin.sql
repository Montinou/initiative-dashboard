-- DIAGNOSIS: Check current state of superadmin setup

-- 1. Check if superadmins table exists
SELECT 'SUPERADMINS TABLE EXISTS' as check_type, 
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.tables 
           WHERE table_schema = 'public' AND table_name = 'superadmins'
       ) THEN 'YES' ELSE 'NO' END as result;

-- 2. Check superadmins table structure
SELECT 'SUPERADMINS TABLE STRUCTURE' as check_type, 
       column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'superadmins'
ORDER BY ordinal_position;

-- 3. Check if any superadmins exist
SELECT 'SUPERADMINS COUNT' as check_type, COUNT(*) as total_count
FROM public.superadmins;

-- 4. Check specific superadmin
SELECT 'AGUSMONTOYA SUPERADMIN' as check_type, 
       id, email, name, is_active, 
       LENGTH(password_hash) as hash_length,
       created_at
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

-- 5. Check auth.users for comparison
SELECT 'AUTH.USERS CHECK' as check_type,
       CASE WHEN EXISTS (
           SELECT 1 FROM auth.users WHERE email = 'agusmontoya@gmail.com'
       ) THEN 'USER EXISTS IN AUTH.USERS' ELSE 'NO USER IN AUTH.USERS' END as result;

-- 6. Check if superadmin_sessions table exists
SELECT 'SUPERADMIN_SESSIONS TABLE' as check_type,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.tables 
           WHERE table_schema = 'public' AND table_name = 'superadmin_sessions'
       ) THEN 'EXISTS' ELSE 'MISSING' END as result;

-- 7. Check current sessions
SELECT 'ACTIVE SESSIONS' as check_type, COUNT(*) as session_count
FROM public.superadmin_sessions 
WHERE expires_at > NOW();

-- 8. Check RLS status
SELECT 'RLS STATUS' as check_type, 
       schemaname, tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('superadmins', 'superadmin_sessions', 'superadmin_audit_log')
ORDER BY tablename;