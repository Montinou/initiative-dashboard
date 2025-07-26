-- INSERT DEMO DATA - SAFE VERSION
-- This script handles conflicts gracefully

-- ============================================================================
-- STEP 1: CREATE SUPERADMIN USER IN AUTH.USERS
-- ============================================================================

-- Create superadmin in auth.users
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
    crypt('btcStn60', gen_salt('bf')),
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
    updated_at = NOW()
ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

-- Create identity for superadmin
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
) ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = NOW();

-- ============================================================================
-- STEP 2: CREATE SUPERADMIN IN SUPERADMINS TABLE
-- ============================================================================

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

-- ============================================================================
-- STEP 3: CREATE DEMO TENANTS
-- ============================================================================

INSERT INTO public.tenants (id, name, subdomain, description, industry, is_active, created_by_superadmin) VALUES
    ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'FEMA Electricidad', 'fema-electricidad', 'Empresa eléctrica con múltiples divisiones', 'Electricidad', true, '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid),
    ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'SIGA Turismo', 'siga-turismo', 'Agencia de turismo y viajes', 'Turismo', true, '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid),
    ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'TechCorp Solutions', 'techcorp-solutions', 'Empresa de soluciones tecnológicas', 'Tecnología', true, '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = timezone('utc'::text, now())
ON CONFLICT (subdomain) DO UPDATE SET  
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = timezone('utc'::text, now());

-- Success message
SELECT 'BASIC SETUP COMPLETE' as status, 
       'Superadmin and tenants created' as message,
       'Login: agusmontoya@gmail.com / btcStn60' as credentials;