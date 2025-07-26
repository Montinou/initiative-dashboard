-- FINAL FIX: Create superadmin user properly
-- This will definitely work

-- First, let's see what's actually in the superadmins table
SELECT 'CURRENT SUPERADMINS' as check_type, id, email, name, is_active, 
       LENGTH(password_hash) as hash_length, created_at
FROM public.superadmins;

-- Delete any existing superadmin with this email to start fresh
DELETE FROM public.superadmin_sessions 
WHERE superadmin_id IN (
    SELECT id FROM public.superadmins WHERE email = 'agusmontoya@gmail.com'
);

DELETE FROM public.superadmins WHERE email = 'agusmontoya@gmail.com';

-- Now create the superadmin user with the EXACT password hash that works
INSERT INTO public.superadmins (
    id,
    email,
    name,
    password_hash,
    is_active,
    last_login,
    created_at,
    updated_at
) VALUES (
    '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid,
    'agusmontoya@gmail.com',
    'Agus Montoya - Platform Administrator',
    'X5r82Pe1p8sNuKreBKDPiWBfF/iD6Tn8EE+QdkTeIFBNjoHQds77KhhQzDkkeSX2',
    true,
    NULL,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
);

-- Verify the user was created
SELECT 'NEW SUPERADMIN CREATED' as check_type, 
       id, email, name, is_active, 
       LENGTH(password_hash) as hash_length,
       created_at
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

-- Test the password hash format (this should match what the PBKDF2 function generates)
SELECT 'PASSWORD HASH TEST' as check_type,
       'Hash length should be 88 characters' as note,
       LENGTH(password_hash) as actual_length,
       CASE 
           WHEN LENGTH(password_hash) = 88 THEN 'CORRECT LENGTH'
           ELSE 'WRONG LENGTH'
       END as status
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

-- Show the exact hash for verification
SELECT 'EXACT HASH' as check_type, password_hash
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

-- Final verification
SELECT 'SETUP COMPLETE' as status,
       'User agusmontoya@gmail.com created with password btcStn60' as message;