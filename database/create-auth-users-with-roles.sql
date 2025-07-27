-- Create auth.users with proper role handling for Supabase
-- This script properly handles the custom user_role ENUM type

-- First, ensure the user_role type exists (case-sensitive!)
DO $$
BEGIN
    -- Check if user_role type exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('superadmin', 'CEO', 'Admin', 'Manager', 'Analyst');
    ELSE
        -- If it exists, make sure it has all required values
        -- Note: Adding enum values requires careful handling
        BEGIN
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- Create auth.users records with proper role management
-- IMPORTANT: In production, use Supabase Auth API instead of direct inserts

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
    'a1111111-1111-1111-1111-111111111111'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'admin@stratix-platform.com',
    crypt('Password123!', gen_salt('bf')), -- More secure password hashing
    NOW(),
    jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email'],
        'role', 'CEO',  -- Store custom role in app_metadata
        'tenant_id', NULL  -- Will be set by user_profiles
    ),
    jsonb_build_object(
        'full_name', 'Admin Stratix',
        'role_display', 'Chief Executive Officer'
    ),
    false,
    NOW(),
    NOW(),
    false
),
(
    'a2222222-2222-2222-2222-222222222222'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'manager@stratix-platform.com',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email'],
        'role', 'Manager',
        'tenant_id', NULL
    ),
    jsonb_build_object(
        'full_name', 'Manager Stratix',
        'role_display', 'Sales Manager'
    ),
    false,
    NOW(),
    NOW(),
    false
),
(
    'a3333333-3333-3333-3333-333333333333'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'analyst@stratix-platform.com',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email'],
        'role', 'Analyst',
        'tenant_id', NULL
    ),
    jsonb_build_object(
        'full_name', 'Analyst Stratix',
        'role_display', 'Operations Analyst'
    ),
    false,
    NOW(),
    NOW(),
    false
),
-- FEMA Electricidad users
(
    'b1111111-1111-1111-1111-111111111111'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'admin@fema-electricidad.com',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email'],
        'role', 'CEO',
        'tenant_id', NULL
    ),
    jsonb_build_object(
        'full_name', 'Admin FEMA',
        'role_display', 'Director General'
    ),
    false,
    NOW(),
    NOW(),
    false
),
(
    'b2222222-2222-2222-2222-222222222222'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'manager@fema-electricidad.com',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email'],
        'role', 'Manager',
        'tenant_id', NULL
    ),
    jsonb_build_object(
        'full_name', 'Gerente División Industrial',
        'role_display', 'Gerente de División'
    ),
    false,
    NOW(),
    NOW(),
    false
),
(
    'b3333333-3333-3333-3333-333333333333'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'analyst@fema-electricidad.com',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email'],
        'role', 'Analyst',
        'tenant_id', NULL
    ),
    jsonb_build_object(
        'full_name', 'Analista Comercial',
        'role_display', 'Analista de E-commerce'
    ),
    false,
    NOW(),
    NOW(),
    false
),
-- SIGA Turismo users
(
    'c1111111-1111-1111-1111-111111111111'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'admin@siga-turismo.com',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email'],
        'role', 'CEO',
        'tenant_id', NULL
    ),
    jsonb_build_object(
        'full_name', 'Admin SIGA',
        'role_display', 'Director Ejecutivo'
    ),
    false,
    NOW(),
    NOW(),
    false
),
(
    'c2222222-2222-2222-2222-222222222222'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'manager@siga-turismo.com',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email'],
        'role', 'Manager',
        'tenant_id', NULL
    ),
    jsonb_build_object(
        'full_name', 'Director de Desarrollo',
        'role_display', 'Director de Desarrollo Turístico'
    ),
    false,
    NOW(),
    NOW(),
    false
),
(
    'c3333333-3333-3333-3333-333333333333'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'analyst@siga-turismo.com',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email'],
        'role', 'Analyst',
        'tenant_id', NULL
    ),
    jsonb_build_object(
        'full_name', 'Analista de Marketing',
        'role_display', 'Analista de Marketing Turístico'
    ),
    false,
    NOW(),
    NOW(),
    false
),
-- Superadmin user
(
    'd1111111-1111-1111-1111-111111111111'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'superadmin@stratix-platform.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email'],
        'role', 'superadmin',  -- Custom superadmin role
        'tenant_id', NULL,  -- Superadmin has no tenant restriction
        'is_platform_admin', true
    ),
    jsonb_build_object(
        'full_name', 'Platform Superadmin',
        'role_display', 'System Administrator'
    ),
    true,  -- is_super_admin = true for Supabase dashboard access
    NOW(),
    NOW(),
    false
)
ON CONFLICT (id) DO UPDATE SET
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

-- Create corresponding identities
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
        'phone_verified', false,
        'provider', 'email',
        'role', u.raw_app_meta_data->>'role'  -- Include role in identity
    ),
    NULL,
    NOW(),
    NOW(),
    u.email
FROM auth.users u
WHERE u.id IN (
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'a2222222-2222-2222-2222-222222222222'::uuid,
    'a3333333-3333-3333-3333-333333333333'::uuid,
    'b1111111-1111-1111-1111-111111111111'::uuid,
    'b2222222-2222-2222-2222-222222222222'::uuid,
    'b3333333-3333-3333-3333-333333333333'::uuid,
    'c1111111-1111-1111-1111-111111111111'::uuid,
    'c2222222-2222-2222-2222-222222222222'::uuid,
    'c3333333-3333-3333-3333-333333333333'::uuid,
    'd1111111-1111-1111-1111-111111111111'::uuid
)
ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = NOW();

-- Create/update user profiles with proper role casting
INSERT INTO public.user_profiles (
    id, 
    tenant_id, 
    email, 
    full_name, 
    role, 
    area, 
    is_active
)
SELECT 
    u.id,
    t.id as tenant_id,
    u.email,
    u.raw_user_meta_data->>'full_name',
    (u.raw_app_meta_data->>'role')::user_role,  -- Explicit cast to user_role type
    CASE 
        WHEN u.email LIKE '%@stratix-platform%' THEN 
            CASE (u.raw_app_meta_data->>'role')
                WHEN 'CEO' THEN 'Technology'
                WHEN 'Manager' THEN 'Sales'
                WHEN 'Analyst' THEN 'Operations'
                ELSE NULL
            END
        WHEN u.email LIKE '%@fema-electricidad%' THEN 
            CASE (u.raw_app_meta_data->>'role')
                WHEN 'CEO' THEN 'Administración'
                WHEN 'Manager' THEN 'División Industria'
                WHEN 'Analyst' THEN 'E-commerce'
                ELSE NULL
            END
        WHEN u.email LIKE '%@siga-turismo%' THEN 
            CASE (u.raw_app_meta_data->>'role')
                WHEN 'CEO' THEN 'Administración'
                WHEN 'Manager' THEN 'Desarrollo Turístico'
                WHEN 'Analyst' THEN 'Marketing y Promoción'
                ELSE NULL
            END
        ELSE NULL
    END as area,
    true
FROM auth.users u
LEFT JOIN public.tenants t ON 
    CASE 
        WHEN u.email LIKE '%@stratix-platform%' AND u.email != 'superadmin@stratix-platform.com' THEN t.subdomain = 'stratix-demo'
        WHEN u.email LIKE '%@fema-electricidad%' THEN t.subdomain = 'fema-electricidad'
        WHEN u.email LIKE '%@siga-turismo%' THEN t.subdomain = 'siga-turismo'
        ELSE false
    END
WHERE u.id IN (
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'a2222222-2222-2222-2222-222222222222'::uuid,
    'a3333333-3333-3333-3333-333333333333'::uuid,
    'b1111111-1111-1111-1111-111111111111'::uuid,
    'b2222222-2222-2222-2222-222222222222'::uuid,
    'b3333333-3333-3333-3333-333333333333'::uuid,
    'c1111111-1111-1111-1111-111111111111'::uuid,
    'c2222222-2222-2222-2222-222222222222'::uuid,
    'c3333333-3333-3333-3333-333333333333'::uuid,
    'd1111111-1111-1111-1111-111111111111'::uuid
)
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    area = EXCLUDED.area,
    updated_at = NOW();

-- Verify user creation with roles
SELECT 
    u.email,
    u.id,
    u.created_at,
    u.is_super_admin,
    u.raw_app_meta_data->>'role' as auth_role,
    up.role as profile_role,
    up.tenant_id,
    t.subdomain as tenant_subdomain,
    up.area,
    u.raw_user_meta_data->>'full_name' as full_name
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
LEFT JOIN public.tenants t ON up.tenant_id = t.id
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
ORDER BY 
    CASE 
        WHEN u.email = 'superadmin@stratix-platform.com' THEN 0
        ELSE 1
    END,
    t.subdomain,
    up.role;

-- Show role distribution
SELECT 
    up.role,
    COUNT(*) as user_count,
    array_agg(u.email ORDER BY u.email) as users
FROM public.user_profiles up
JOIN auth.users u ON u.id = up.id
GROUP BY up.role
ORDER BY 
    CASE up.role
        WHEN 'superadmin' THEN 0
        WHEN 'CEO' THEN 1
        WHEN 'Admin' THEN 2
        WHEN 'Manager' THEN 3
        WHEN 'Analyst' THEN 4
    END;