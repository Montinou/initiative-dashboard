-- QUICK FIX: Ensure superadmin user exists in superadmins table
-- Run this in your Supabase SQL editor

-- Make sure the superadmin exists with the correct password hash
INSERT INTO public.superadmins (
    id,
    email,
    name,
    password_hash,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'agusmontoya@gmail.com',
    'Agus Montoya - Platform Administrator',
    'X5r82Pe1p8sNuKreBKDPiWBfF/iD6Tn8EE+QdkTeIFBNjoHQds77KhhQzDkkeSX2',
    true,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());

-- Verify it was created
SELECT 'Superadmin Check' as check_type, id, email, name, is_active, created_at 
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

-- Check if the superadmins table exists and has the right structure
SELECT 'Table Structure' as check_type, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'superadmins'
ORDER BY ordinal_position;