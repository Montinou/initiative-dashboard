-- Create Superadmin User - CRITICAL STEP
-- This creates the superadmin user that can login to /superadmin/login

-- IMPORTANT: This is separate from auth.users
-- Superadmins are stored in public.superadmins table
-- Regular users are in auth.users + public.user_profiles

-- 1. First, check if superadmin table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'superadmins')
        THEN 'superadmins table EXISTS - ready to create user'
        ELSE 'ERROR: superadmins table MISSING - run migration scripts first'
    END as table_status;

-- 2. Create the superadmin user with the correct credentials
INSERT INTO public.superadmins (email, name, password_hash, is_active) VALUES (
    'agusmontoya@gmail.com',
    'Agus Montoya - Platform Administrator', 
    'X5r82Pe1p8sNuKreBKDPiWBfF/iD6Tn8EE+QdkTeIFBNjoHQds77KhhQzDkkeSX2',
    true
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());

-- 3. Verify the superadmin was created
SELECT 
    'SUPERADMIN CREATED' as status,
    id,
    email,
    name,
    is_active,
    created_at
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

-- 4. Check total superadmins
SELECT 
    'TOTAL SUPERADMINS' as info,
    COUNT(*) as total_count,
    string_agg(email, ', ') as all_emails
FROM public.superadmins;

-- 5. Instructions
SELECT 'NEXT STEPS' as step, 'Now you can login at /superadmin/login with agusmontoya@gmail.com / btcStn60' as instruction;