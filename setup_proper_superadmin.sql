-- PROPER SUPERADMIN SETUP
-- This script creates the superadmin user in both auth.users and public.superadmins

-- ============================================================================
-- STEP 1: ENSURE SCHEMA IS READY
-- ============================================================================

-- Ensure user_role enum exists
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('CEO', 'Admin', 'Manager', 'Analyst');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: CREATE SUPERADMIN USER IN AUTH.USERS
-- ============================================================================

-- First, let's create the user in auth.users (this is the proper Supabase way)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid,
    'authenticated',
    'authenticated',
    'agusmontoya@gmail.com',
    crypt('btcStn60', gen_salt('bf')), -- Use bcrypt for auth.users
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Agus Montoya - Platform Administrator","role":"superadmin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

-- ============================================================================
-- STEP 3: CREATE SUPERADMIN IN PUBLIC.SUPERADMINS TABLE
-- ============================================================================

-- Create/update the superadmin in the superadmins table
INSERT INTO public.superadmins (
    id,
    email,
    name,
    password_hash,
    is_active,
    created_at,
    updated_at
) VALUES (
    '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid,
    'agusmontoya@gmail.com',
    'Agus Montoya - Platform Administrator',
    'X5r82Pe1p8sNuKreBKDPiWBfF/iD6Tn8EE+QdkTeIFBNjoHQds77KhhQzDkkeSX2', -- PBKDF2 hash for btcStn60
    true,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
) ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());

-- ============================================================================
-- STEP 4: CREATE DEFAULT TENANT IF NEEDED
-- ============================================================================

-- Create a default tenant for the platform
INSERT INTO public.tenants (
    id,
    name,
    subdomain,
    description,
    industry,
    is_active,
    created_by_superadmin,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'Stratix Platform',
    'stratix-platform',
    'Main Stratix platform tenant',
    'Technology',
    true,
    '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
) ON CONFLICT (subdomain) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    created_by_superadmin = EXCLUDED.created_by_superadmin,
    updated_at = timezone('utc'::text, now());

-- ============================================================================
-- STEP 5: CREATE USER PROFILE FOR SUPERADMIN
-- ============================================================================

-- Create user profile for the superadmin (this connects auth.users to public.user_profiles)
INSERT INTO public.user_profiles (
    id,
    tenant_id,
    email,
    full_name,
    role,
    area,
    is_active,
    is_system_admin,
    created_by_superadmin,
    created_at,
    updated_at
) VALUES (
    '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'agusmontoya@gmail.com',
    'Agus Montoya - Platform Administrator',
    'CEO'::user_role,
    'Administration',
    true,
    true, -- Mark as system admin
    '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
) ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_system_admin = EXCLUDED.is_system_admin,
    updated_at = timezone('utc'::text, now());

-- ============================================================================
-- STEP 6: CREATE IDENTITY FOR EMAIL LOGIN
-- ============================================================================

-- Create identity record for email/password login
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES (
    '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid,
    '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid,
    '{"sub":"93bf8bef-546b-41d4-b642-f073fa1fc493","email":"agusmontoya@gmail.com"}',
    'email',
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT (provider, id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = NOW();

-- ============================================================================
-- STEP 7: CREATE SAMPLE AREAS
-- ============================================================================

-- Create some default areas for the platform
INSERT INTO public.areas (tenant_id, name, description, manager_id, is_active) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Administration', 'Platform administration and management', '93bf8bef-546b-41d4-b642-f073fa1fc493', true),
    ('550e8400-e29b-41d4-a716-446655440000', 'Development', 'Software development and engineering', NULL, true),
    ('550e8400-e29b-41d4-a716-446655440000', 'Operations', 'Platform operations and maintenance', NULL, true),
    ('550e8400-e29b-41d4-a716-446655440000', 'Support', 'Customer support and success', NULL, true)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ============================================================================
-- STEP 8: VERIFICATION QUERIES
-- ============================================================================

-- Verify the setup
SELECT 'AUTH.USERS CHECK' as check_type, id, email, role, email_confirmed_at IS NOT NULL as email_confirmed 
FROM auth.users 
WHERE email = 'agusmontoya@gmail.com';

SELECT 'SUPERADMINS CHECK' as check_type, id, email, name, is_active 
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

SELECT 'USER_PROFILES CHECK' as check_type, id, email, full_name, role, is_system_admin 
FROM public.user_profiles 
WHERE email = 'agusmontoya@gmail.com';

SELECT 'TENANTS CHECK' as check_type, id, name, subdomain, is_active 
FROM public.tenants 
WHERE subdomain = 'stratix-platform';

SELECT 'AREAS CHECK' as check_type, COUNT(*) as area_count 
FROM public.areas 
WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';

-- Final success message
SELECT 'SETUP COMPLETE' as status, 
       'Superadmin user agusmontoya@gmail.com is now properly configured in both auth.users and public.superadmins' as message;

-- Instructions
SELECT 'NEXT STEPS' as instruction_type,
       'You can now login with agusmontoya@gmail.com / btcStn60 at both /superadmin/login and regular login' as instructions;