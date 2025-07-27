-- Fixed user creation script with proper role handling
-- This addresses the role casting issues

-- First, ensure we have the user_role enum with all required values
DO $$
BEGIN
    -- Check if user_role type exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('CEO', 'Admin', 'Manager', 'Analyst', 'superadmin');
    ELSE
        -- Add superadmin if it doesn't exist
        BEGIN
            ALTER TYPE user_role ADD VALUE 'superadmin';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- Create auth.users with proper passwords and IDs
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
-- Stratix users
('a1111111-1111-1111-1111-111111111111'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'admin@stratix-platform.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Admin Stratix"}', false, NOW(), NOW(), false),
('a2222222-2222-2222-2222-222222222222'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'manager@stratix-platform.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Manager Stratix"}', false, NOW(), NOW(), false),
('a3333333-3333-3333-3333-333333333333'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'analyst@stratix-platform.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Analyst Stratix"}', false, NOW(), NOW(), false),
-- FEMA users  
('b1111111-1111-1111-1111-111111111111'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'admin@fema-electricidad.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Admin FEMA"}', false, NOW(), NOW(), false),
('b2222222-2222-2222-2222-222222222222'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'manager@fema-electricidad.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Gerente División Industrial"}', false, NOW(), NOW(), false),
('b3333333-3333-3333-3333-333333333333'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'analyst@fema-electricidad.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Analista Comercial"}', false, NOW(), NOW(), false),
-- SIGA users
('c1111111-1111-1111-1111-111111111111'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'admin@siga-turismo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Admin SIGA"}', false, NOW(), NOW(), false),
('c2222222-2222-2222-2222-222222222222'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'manager@siga-turismo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Director de Desarrollo"}', false, NOW(), NOW(), false),
('c3333333-3333-3333-3333-333333333333'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'analyst@siga-turismo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Analista de Marketing"}', false, NOW(), NOW(), false),
-- Superadmin
('d1111111-1111-1111-1111-111111111111'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'superadmin@stratix-platform.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Platform Superadmin"}', true, NOW(), NOW(), false)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

-- Create identities
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
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Create user profiles with proper role casting
INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at)
SELECT 
    u.id,
    t.id as tenant_id,
    u.email,
    u.raw_user_meta_data->>'full_name',
    CASE 
        WHEN u.email = 'superadmin@stratix-platform.com' THEN 'superadmin'::user_role
        WHEN u.email LIKE 'admin@%' THEN 'CEO'::user_role
        WHEN u.email LIKE 'manager@%' THEN 'Manager'::user_role
        WHEN u.email LIKE 'analyst@%' THEN 'Analyst'::user_role
        ELSE 'Analyst'::user_role
    END as role,
    CASE 
        WHEN u.email LIKE '%@stratix-platform%' AND u.email != 'superadmin@stratix-platform.com' THEN 
            CASE 
                WHEN u.email LIKE 'admin@%' THEN 'Technology'
                WHEN u.email LIKE 'manager@%' THEN 'Sales'
                WHEN u.email LIKE 'analyst@%' THEN 'Operations'
            END
        WHEN u.email LIKE '%@fema-electricidad%' THEN 
            CASE 
                WHEN u.email LIKE 'admin@%' THEN 'Administración'
                WHEN u.email LIKE 'manager@%' THEN 'División Industria'
                WHEN u.email LIKE 'analyst@%' THEN 'E-commerce'
            END
        WHEN u.email LIKE '%@siga-turismo%' THEN 
            CASE 
                WHEN u.email LIKE 'admin@%' THEN 'Administración'
                WHEN u.email LIKE 'manager@%' THEN 'Desarrollo Turístico'
                WHEN u.email LIKE 'analyst@%' THEN 'Marketing y Promoción'
            END
        ELSE NULL
    END as area,
    true as is_active,
    NOW() as created_at,
    NOW() as updated_at
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
    tenant_id = EXCLUDED.tenant_id,
    updated_at = NOW();

-- Verification
SELECT 
    'Setup Complete' as status,
    (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@stratix-platform.com' OR email LIKE '%@fema-electricidad.com' OR email LIKE '%@siga-turismo.com') as auth_users_created,
    (SELECT COUNT(*) FROM public.user_profiles) as profiles_created,
    (SELECT COUNT(*) FROM public.tenants) as tenants_available;