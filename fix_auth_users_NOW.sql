-- STOP THE MADNESS - CREATE USER IN AUTH.USERS PROPERLY

-- 1. Create the user in auth.users (the ACTUAL Supabase auth table)
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
    crypt('btcStn60', gen_salt('bf')), -- Proper bcrypt hash for Supabase
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
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

-- 2. Create the identity record for email login
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

-- 3. ALSO keep the superadmin in the custom table for the separate superadmin system
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
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());

-- 4. VERIFY EVERYTHING
SELECT 'AUTH.USERS CHECK' as check_type, id, email, role, email_confirmed_at IS NOT NULL as confirmed
FROM auth.users 
WHERE email = 'agusmontoya@gmail.com';

SELECT 'SUPERADMINS CHECK' as check_type, id, email, name, is_active
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

SELECT 'IDENTITIES CHECK' as check_type, id, user_id, provider
FROM auth.identities 
WHERE user_id = '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid;

-- 5. FINAL MESSAGE
SELECT 'DONE' as status, 
       'User exists in BOTH auth.users AND public.superadmins' as message,
       'Login works at /superadmin/login AND regular login' as note;