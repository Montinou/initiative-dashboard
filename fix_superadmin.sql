-- Fix Superadmin Setup - Complete Reset and Recreation
-- Run this if the debug script shows issues

-- STEP 1: Create superadmin user with correct credentials
-- This will create or update the superadmin with the exact password hash

-- First, ensure the user exists with correct hash
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

-- STEP 2: Verify the superadmin was created/updated
SELECT 
    'Superadmin Fix Result' as result_type,
    id,
    email,
    name,
    is_active,
    LENGTH(password_hash) as hash_length,
    created_at,
    updated_at
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

-- STEP 3: Clean up any old sessions
DELETE FROM public.superadmin_sessions 
WHERE superadmin_id IN (
    SELECT id FROM public.superadmins WHERE email = 'agusmontoya@gmail.com'
);

-- STEP 4: Test that we can select from the table (tests RLS)
SELECT 
    'RLS Test' as test_type,
    COUNT(*) as superadmin_count,
    'Should be 1 if RLS allows access' as expected
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

-- STEP 5: Add some test data if missing
INSERT INTO public.tenants (id, name, subdomain, description, industry) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'FEMA Electricidad',
    'fema-electricidad',
    'Empresa eléctrica con múltiples divisiones',
    'Electricidad'
) ON CONFLICT (subdomain) DO NOTHING;

INSERT INTO public.tenants (id, name, subdomain, description, industry) VALUES (
    'aa0e8400-e29b-41d4-a716-446655440001',
    'SIGA Automatización',
    'siga-automatizacion',
    'Empresa de automatización industrial y control de procesos',
    'Automatización'
) ON CONFLICT (subdomain) DO NOTHING;

-- FINAL CHECK
SELECT 'SETUP COMPLETE' as status,
       'Login at /superadmin/login with agusmontoya@gmail.com / btcStn60' as credentials,
       (SELECT COUNT(*) FROM public.superadmins WHERE email = 'agusmontoya@gmail.com') as superadmin_ready,
       (SELECT COUNT(*) FROM public.tenants) as tenant_count;