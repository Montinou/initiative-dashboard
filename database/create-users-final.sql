-- Final working user creation script
-- Password for demo users: Password123! (bcrypt hash: $2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i)
-- Password for superadmin: password123 (bcrypt hash: $2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i)

-- Create auth.users first
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
('a1111111-1111-1111-1111-111111111111'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'admin@stratix-platform.com', '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Admin Stratix"}', false, NOW(), NOW(), false),
('a2222222-2222-2222-2222-222222222222'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'manager@stratix-platform.com', '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Manager Stratix"}', false, NOW(), NOW(), false),
('a3333333-3333-3333-3333-333333333333'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'analyst@stratix-platform.com', '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Analyst Stratix"}', false, NOW(), NOW(), false),
-- FEMA users  
('b1111111-1111-1111-1111-111111111111'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'admin@fema-electricidad.com', '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Admin FEMA"}', false, NOW(), NOW(), false),
('b2222222-2222-2222-2222-222222222222'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'manager@fema-electricidad.com', '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Gerente División Industrial"}', false, NOW(), NOW(), false),
('b3333333-3333-3333-3333-333333333333'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'analyst@fema-electricidad.com', '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Analista Comercial"}', false, NOW(), NOW(), false),
-- SIGA users
('c1111111-1111-1111-1111-111111111111'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'admin@siga-turismo.com', '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Admin SIGA"}', false, NOW(), NOW(), false),
('c2222222-2222-2222-2222-222222222222'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'manager@siga-turismo.com', '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Director de Desarrollo"}', false, NOW(), NOW(), false),
('c3333333-3333-3333-3333-333333333333'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'analyst@siga-turismo.com', '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Analista de Marketing"}', false, NOW(), NOW(), false),
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

-- Now create user profiles with explicit enum casting
-- Stratix users
INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) 
SELECT 
    'a1111111-1111-1111-1111-111111111111'::uuid,
    t.id,
    'admin@stratix-platform.com',
    'Admin Stratix',
    'CEO'::user_role,
    'Technology',
    true,
    NOW(),
    NOW()
FROM public.tenants t WHERE t.subdomain = 'stratix-demo'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, area = EXCLUDED.area, updated_at = NOW();

INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) 
SELECT 
    'a2222222-2222-2222-2222-222222222222'::uuid,
    t.id,
    'manager@stratix-platform.com',
    'Manager Stratix',
    'Manager'::user_role,
    'Sales',
    true,
    NOW(),
    NOW()
FROM public.tenants t WHERE t.subdomain = 'stratix-demo'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, area = EXCLUDED.area, updated_at = NOW();

INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) 
SELECT 
    'a3333333-3333-3333-3333-333333333333'::uuid,
    t.id,
    'analyst@stratix-platform.com',
    'Analyst Stratix',
    'Analyst'::user_role,
    'Operations',
    true,
    NOW(),
    NOW()
FROM public.tenants t WHERE t.subdomain = 'stratix-demo'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, area = EXCLUDED.area, updated_at = NOW();

-- FEMA users
INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) 
SELECT 
    'b1111111-1111-1111-1111-111111111111'::uuid,
    t.id,
    'admin@fema-electricidad.com',
    'Admin FEMA',
    'CEO'::user_role,
    'Administración',
    true,
    NOW(),
    NOW()
FROM public.tenants t WHERE t.subdomain = 'fema-electricidad'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, area = EXCLUDED.area, updated_at = NOW();

INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) 
SELECT 
    'b2222222-2222-2222-2222-222222222222'::uuid,
    t.id,
    'manager@fema-electricidad.com',
    'Gerente División Industrial',
    'Manager'::user_role,
    'División Industria',
    true,
    NOW(),
    NOW()
FROM public.tenants t WHERE t.subdomain = 'fema-electricidad'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, area = EXCLUDED.area, updated_at = NOW();

INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) 
SELECT 
    'b3333333-3333-3333-3333-333333333333'::uuid,
    t.id,
    'analyst@fema-electricidad.com',
    'Analista Comercial',
    'Analyst'::user_role,
    'E-commerce',
    true,
    NOW(),
    NOW()
FROM public.tenants t WHERE t.subdomain = 'fema-electricidad'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, area = EXCLUDED.area, updated_at = NOW();

-- SIGA users
INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) 
SELECT 
    'c1111111-1111-1111-1111-111111111111'::uuid,
    t.id,
    'admin@siga-turismo.com',
    'Admin SIGA',
    'CEO'::user_role,
    'Administración',
    true,
    NOW(),
    NOW()
FROM public.tenants t WHERE t.subdomain = 'siga-turismo'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, area = EXCLUDED.area, updated_at = NOW();

INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) 
SELECT 
    'c2222222-2222-2222-2222-222222222222'::uuid,
    t.id,
    'manager@siga-turismo.com',
    'Director de Desarrollo',
    'Manager'::user_role,
    'Desarrollo Turístico',
    true,
    NOW(),
    NOW()
FROM public.tenants t WHERE t.subdomain = 'siga-turismo'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, area = EXCLUDED.area, updated_at = NOW();

INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) 
SELECT 
    'c3333333-3333-3333-3333-333333333333'::uuid,
    t.id,
    'analyst@siga-turismo.com',
    'Analista de Marketing',
    'Analyst'::user_role,
    'Marketing y Promoción',
    true,
    NOW(),
    NOW()
FROM public.tenants t WHERE t.subdomain = 'siga-turismo'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, area = EXCLUDED.area, updated_at = NOW();

-- Superadmin (no tenant)
INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) 
VALUES (
    'd1111111-1111-1111-1111-111111111111'::uuid,
    NULL,
    'superadmin@stratix-platform.com',
    'Platform Superadmin',
    'superadmin'::user_role,
    NULL,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, area = EXCLUDED.area, updated_at = NOW();

-- Final verification
SELECT 
    'USER CREATION COMPLETE' as status,
    (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@stratix-platform.com' OR email LIKE '%@fema-electricidad.com' OR email LIKE '%@siga-turismo.com') as auth_users,
    (SELECT COUNT(*) FROM public.user_profiles) as user_profiles,
    (SELECT COUNT(*) FROM public.tenants) as tenants;