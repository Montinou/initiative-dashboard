-- Create first superadmin user
-- Email: agusmontoya@gmail.com
-- Password: btcStn60

-- First, let's use the edge-compatible approach (PBKDF2) to hash the password
-- This matches our lib/edge-compatible-auth.ts implementation

-- Create the superadmin user with hashed password
INSERT INTO public.superadmins (email, name, password_hash) VALUES (
    'agusmontoya@gmail.com',
    'Agus Montoya - Platform Administrator',
    -- For now using a placeholder, we'll update with proper hash
    'PLACEHOLDER_WILL_UPDATE'
);

-- Get the superadmin ID for reference
SELECT id, email, name, is_active, created_at 
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

-- Verify superadmin tables exist and are properly configured
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' AND rowsecurity = true
        ) THEN 'RLS Enabled'
        ELSE 'RLS Disabled'
    END as rls_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'superadmin%'
ORDER BY table_name;

-- Check superadmin functions exist
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'superadmin%'
ORDER BY routine_name;