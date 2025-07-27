
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    is_sso_user
) VALUES 
-- Stratix Platform users
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'admin@stratix-platform.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Admin Stratix"}'::jsonb,
    false,
    NOW(),
    NOW(),
    false,
    false
),
(
        gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'manager@stratix-platform.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Manager Stratix"}'::jsonb,
    false,
    false
),
(
        gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'analyst@stratix-platform.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Analyst Stratix"}'::jsonb,
    false,
    NOW(),
    NOW(),
    false,
    false
),
-- FEMA Electricidad users
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'admin@fema-electricidad.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Admin FEMA"}'::jsonb,
    false,
    NOW(),
    NOW(),
    false,
    false
),
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'manager@fema-electricidad.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Gerente División Industrial"}'::jsonb,
    false,
    NOW(),
    NOW(),
    false,
    false
),
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'analyst@fema-electricidad.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Analista Comercial"}'::jsonb,
    false,
    NOW(),
    NOW(),
    false,
    false
),
-- SIGA Turismo users
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'admin@siga-turismo.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Admin SIGA"}'::jsonb,
    false,
    NOW(),
    NOW(),
    false,
    false
),
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'manager@siga-turismo.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Director de Desarrollo"}'::jsonb,
    false,
    NOW(),
    NOW(),
    NOW(),
    false,
    false
),
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'analyst@siga-turismo.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Analista de Marketing"}'::jsonb,
    false,
    NOW(),
    NOW(),
    NOW(),
    false,
    false
),
-- Superadmin user
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'superadmin@stratix-platform.com',
    '$2a$06$Gy.xJ6x4d13Xc7Uld/AUpOWEP8TV9wXk7Yw9kembjBiZ6UtExRP2m',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Platform Superadmin"}'::jsonb,
    true,  -- is_super_admin = true for superadmin
    NOW(),
    NOW(),
    false,
    false
)
ON CONFLICT (email) DO NOTHING;

-- Create corresponding identities for each user
INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at,
    email
)
SELECT 
    uuid_generate_v4(),
    u.id,
    u.id::text,
    'email',
    jsonb_build_object(
        'sub', u.id::text,
        'email', u.email,
        'email_verified', true,
        'phone_verified', false
    ),
    NULL,
    NOW(),
    NOW(),
    u.email
FROM auth.users u
WHERE u.email IN (
    'admin@stratix-platform.com',
    'manager@stratix-platform.com', 
    'analyst@stratix-platform.com',
    'admin@fema-electricidad.com',
    'manager@fema-electricidad.com',
    'analyst@fema-electricidad.com',
    'admin@siga-turismo.com',
    'manager@siga-turismo.com',
    'analyst@siga-turismo.com',
    'superadmin@stratix-platform.com'
)
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Verify user creation
SELECT 
    email,
    id,
    created_at,
    email_confirmed_at,
    is_super_admin,
    (raw_user_meta_data->>'full_name') as full_name
FROM auth.users 
WHERE email IN (
    'admin@stratix-platform.com',
    'manager@stratix-platform.com', 
    'analyst@stratix-platform.com',
    'admin@fema-electricidad.com',
    'manager@fema-electricidad.com',
    'analyst@fema-electricidad.com',
    'admin@siga-turismo.com',
    'manager@siga-turismo.com',
    'analyst@siga-turismo.com',
    'superadmin@stratix-platform.com'
)
ORDER BY email;

INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    is_sso_user
) VALUES 
-- Stratix Platform users
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'admin@stratix-platform.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Admin Stratix"}'::jsonb,
    false,
    NOW(),
    NOW(),
    false,
    false
),
(
        gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'manager@stratix-platform.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Manager Stratix"}'::jsonb,
    false,
    false
),
(
        gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'analyst@stratix-platform.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Analyst Stratix"}'::jsonb,
    false,
    NOW(),
    NOW(),
    false,
    false
),
-- FEMA Electricidad users
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'admin@fema-electricidad.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Admin FEMA"}'::jsonb,
    false,
    NOW(),
    NOW(),
    false,
    false
),
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'manager@fema-electricidad.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Gerente División Industrial"}'::jsonb,
    false,
    NOW(),
    NOW(),
    false,
    false
),
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'analyst@fema-electricidad.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Analista Comercial"}'::jsonb,
    false,
    NOW(),
    NOW(),
    false,
    false
),
-- SIGA Turismo users
(
    uuid_generate_v4(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'admin@siga-turismo.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Admin SIGA"}'::jsonb,
    false,
    NOW(),
    NOW(),
    false,
    false
),
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'manager@siga-turismo.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Director de Desarrollo"}'::jsonb,
    false,
    NOW(),
    NOW(),
    NOW(),
    false,
    false
),
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'analyst@siga-turismo.com',
    '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Analista de Marketing"}'::jsonb,
    false,
    NOW(),
    NOW(),
    NOW(),
    false,
    false
),
-- Superadmin user
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'superadmin@stratix-platform.com',
    '$2a$06$Gy.xJ6x4d13Xc7Uld/AUpOWEP8TV9wXk7Yw9kembjBiZ6UtExRP2m',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Platform Superadmin"}'::jsonb,
    true,  -- is_super_admin = true for superadmin
    NOW(),
    NOW(),
    false,
    false
)
ON CONFLICT (email) DO NOTHING;

-- Create corresponding identities for each user
INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at,
    email
)
SELECT 
    gen_random_uuid(),
    u.id,
    u.id::text,
    'email',
    jsonb_build_object(
        'sub', u.id::text,
        'email', u.email,
        'email_verified', true,
        'phone_verified', false
    ),
    NULL,
    NOW(),
    NOW(),
    u.email
FROM auth.users u
WHERE u.email IN (
    'admin@stratix-platform.com',
    'manager@stratix-platform.com', 
    'analyst@stratix-platform.com',
    'admin@fema-electricidad.com',
    'manager@fema-electricidad.com',
    'analyst@fema-electricidad.com',
    'admin@siga-turismo.com',
    'manager@siga-turismo.com',
    'analyst@siga-turismo.com',
    'superadmin@stratix-platform.com'
)
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Verify user creation
SELECT 
    email,
    id,
    created_at,
    email_confirmed_at,
    is_super_admin,
    (raw_user_meta_data->>'full_name') as full_name
FROM auth.users 
WHERE email IN (
    'admin@stratix-platform.com',
    'manager@stratix-platform.com', 
    'analyst@stratix-platform.com',
    'admin@fema-electricidad.com',
    'manager@fema-electricidad.com',
    'analyst@fema-electricidad.com',
    'admin@siga-turismo.com',
    'manager@siga-turismo.com',
    'analyst@siga-turismo.com',
    'superadmin@stratix-platform.com'
)
ORDER BY email;
