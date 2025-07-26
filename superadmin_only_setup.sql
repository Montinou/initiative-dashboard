-- SUPERADMIN ONLY SETUP - MINIMAL AND SAFE
-- This creates just the superadmin user to get you started

-- Step 1: Clear existing superadmin records
DELETE FROM auth.identities WHERE email = 'agusmontoya@gmail.com';
DELETE FROM auth.users WHERE email = 'agusmontoya@gmail.com';
DELETE FROM public.superadmins WHERE email = 'agusmontoya@gmail.com';

-- Step 2: Create superadmin in auth.users
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
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
    crypt('btcStn60', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Agus Montoya - Platform Administrator","role":"superadmin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Step 3: Create identity for superadmin
INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    email
) VALUES (
    '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid,
    '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid,
    '{"sub":"93bf8bef-546b-41d4-b642-f073fa1fc493","email":"agusmontoya@gmail.com"}',
    'email',
    NOW(),
    NOW(),
    NOW(),
    'agusmontoya@gmail.com'
);

-- Step 4: Create superadmin in superadmins table
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
    'X5r82Pe1p8sNuKreBKDPiWBfF/iD6Tn8EE+QdkTeIFBNjoHQds77KhhQzDkkeSX2',
    true,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
);

-- Step 5: Create default tenant if needed
INSERT INTO public.tenants (id, name, subdomain, description, industry, is_active, created_by_superadmin) 
SELECT 
    '550e8400-e29b-41d4-a716-446655440000'::uuid, 
    'Default Tenant', 
    'default', 
    'Default tenant for testing', 
    'Technology', 
    true, 
    '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE subdomain = 'default');

-- Step 6: Verification
SELECT 'AUTH.USERS CHECK' as check_type, id, email, role, email_confirmed_at IS NOT NULL as confirmed
FROM auth.users 
WHERE email = 'agusmontoya@gmail.com';

SELECT 'SUPERADMINS CHECK' as check_type, id, email, name, is_active
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

SELECT 'IDENTITIES CHECK' as check_type, provider_id, user_id, provider, email
FROM auth.identities 
WHERE email = 'agusmontoya@gmail.com';

SELECT 'SETUP COMPLETE' as status, 
       'Superadmin user created in both auth.users and public.superadmins' as message,
       'Login: agusmontoya@gmail.com / btcStn60' as credentials;