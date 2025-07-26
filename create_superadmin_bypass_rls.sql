-- CREATE SUPERADMIN USER - BYPASS RLS
-- This script runs with elevated privileges to bypass RLS

-- Step 1: Temporarily disable RLS on superadmins table
ALTER TABLE public.superadmins DISABLE ROW LEVEL SECURITY;

-- Step 2: Clear any existing superadmin with this email
DELETE FROM public.superadmin_sessions 
WHERE superadmin_id IN (
    SELECT id FROM public.superadmins WHERE email = 'agusmontoya@gmail.com'
);

DELETE FROM public.superadmins WHERE email = 'agusmontoya@gmail.com';

-- Step 3: Insert the superadmin user
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

-- Step 4: Re-enable RLS
ALTER TABLE public.superadmins ENABLE ROW LEVEL SECURITY;

-- Step 5: Verify the user was created (this should work even with RLS)
SELECT 'SUPERADMIN CREATED' as status,
       id, email, name, is_active, created_at
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

-- Step 6: Check that RLS policies allow service role access
SELECT 'RLS POLICIES CHECK' as check_type,
       schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'superadmins'
ORDER BY policyname;

-- Step 7: Test login capability
SELECT 'LOGIN TEST READY' as status,
       'Try logging in with agusmontoya@gmail.com / btcStn60' as instruction;