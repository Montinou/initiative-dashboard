-- Manual creation of auth.users (run this in Supabase Dashboard)
-- This bypasses any API constraints and creates users directly in the database
DO $$
-- Insert demo users into auth.users
DECLARE
    stratix_ceo UUID;
    stratix_admin UUID;
    fema_ceo UUID;
    fema_admin UUID;
    siga_ceo UUID;
    siga_admin UUID;
BEGIN
    stratix_ceo := gen_random_uuid();
    stratix_admin := gen_random_uuid();
    fema_ceo := gen_random_uuid();
    fema_admin := gen_random_uuid();
    siga_ceo := gen_random_uuid();
    siga_admin := gen_random_uuid();

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
(stratix_ceo, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'ceo@stratix-demo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "CEO Stratix", "role": "CEO", "tenant_id": "4f644c1f-0d57-4980-8eba-ecc9ed7b661e"}', false, NOW(), NOW(), false),
(stratix_admin, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'admin@stratix-demo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Admin Stratix", "role": "Admin", "tenant_id": "4f644c1f-0d57-4980-8eba-ecc9ed7b661e"}', false, NOW(), NOW(), false),
-- FEMA Electricidad users
(fema_ceo, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'ceo@fema-electricidad.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "CEO FEMA", "role": "CEO", "tenant_id": "c5a4dd96-6058-42b3-8268-997728a529bb"}', false, NOW(), NOW(), false),
(fema_admin, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'admin@fema-electricidad.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Admin FEMA", "role": "Admin", "tenant_id": "c5a4dd96-6058-42b3-8268-997728a529bb"}', false, NOW(), NOW(), false),
-- SIGA Turismo users
(siga_ceo, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'ceo@siga-turismo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "CEO SIGA", "role": "CEO", "tenant_id": "d1a3408c-a3d0-487e-a355-a321a07b5ae2"}', false, NOW(), NOW(), false),
(siga_admin, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'admin@siga-turismo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Admin SIGA", "role": "Admin", "tenant_id": "d1a3408c-a3d0-487e-a355-a321a07b5ae2"}', false, NOW(), NOW(), false)
ON CONFLICT (email) DO NOTHING;

-- Create identities for each user
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
) VALUES
(gen_random_uuid(), stratix_ceo, stratix_ceo::text, 'email', '{"sub": "' || stratix_ceo || '", "email": "ceo@stratix-demo.com", "email_verified": true, "phone_verified": false}', NULL, NOW(), NOW(), 'ceo@stratix-demo.com'),
(gen_random_uuid(), stratix_admin, stratix_admin::text, 'email', '{"sub": "' || stratix_admin || '", "email": "admin@stratix-demo.com", "email_verified": true, "phone_verified": false}', NULL, NOW(), NOW(), 'admin@stratix-demo.com'),
(gen_random_uuid(), fema_ceo, fema_ceo::text, 'email', '{"sub": "' || fema_ceo || '", "email": "ceo@fema-electricidad.com", "email_verified": true, "phone_verified": false}', NULL, NOW(), NOW(), 'ceo@fema-electricidad.com'),
(gen_random_uuid(), fema_admin, fema_admin::text, 'email', '{"sub": "' || fema_admin || '", "email": "admin@fema-electricidad.com", "email_verified": true, "phone_verified": false}', NULL, NOW(), NOW(), 'admin@fema-electricidad.com'),
(gen_random_uuid(), siga_ceo, siga_ceo::text, 'email', '{"sub": "' || siga_ceo || '", "email": "ceo@siga-turismo.com", "email_verified": true, "phone_verified": false}', NULL, NOW(), NOW(), 'ceo@siga-turismo.com'),
(gen_random_uuid(), siga_admin, siga_admin::text, 'email', '{"sub": "' || siga_admin || '", "email": "admin@siga-turismo.com", "email_verified": true, "phone_verified": false}', NULL, NOW(), NOW(), 'admin@siga-turismo.com')
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Create user profiles
INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) VALUES
-- Stratix Platform
(stratix_ceo, '4f644c1f-0d57-4980-8eba-ecc9ed7b661e'::uuid, 'ceo@stratix-demo.com', 'CEO Stratix', 'CEO'::user_role, 'Executive', true, NOW(), NOW()),
(stratix_admin, '4f644c1f-0d57-4980-8eba-ecc9ed7b661e'::uuid, 'admin@stratix-demo.com', 'Admin Stratix', 'Admin'::user_role, 'Administration', true, NOW(), NOW()),
-- FEMA Electricidad
(fema_ceo, 'c5a4dd96-6058-42b3-8268-997728a529bb'::uuid, 'ceo@fema-electricidad.com', 'CEO FEMA', 'CEO'::user_role, 'Executive', true, NOW(), NOW()),
(fema_admin, 'c5a4dd96-6058-42b3-8268-997728a529bb'::uuid, 'admin@fema-electricidad.com', 'Admin FEMA', 'Admin'::user_role, 'Administration', true, NOW(), NOW()),
-- SIGA Turismo
(siga_ceo, 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'::uuid, 'ceo@siga-turismo.com', 'CEO SIGA', 'CEO'::user_role, 'Executive', true, NOW(), NOW()),
(siga_admin, 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'::uuid, 'admin@siga-turismo.com', 'Admin SIGA', 'Admin'::user_role, 'Administration', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
  tenant_id = EXCLUDED.tenant_id,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Verify the creation
SELECT 
  'Demo Users Created Successfully' as status,
  (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@stratix-demo.com' OR email LIKE '%@fema-electricidad.com' OR email LIKE '%@siga-turismo.com') as auth_users,
  (SELECT COUNT(*) FROM public.user_profiles WHERE email LIKE '%@stratix-demo.com' OR email LIKE '%@fema-electricidad.com' OR email LIKE '%@siga-turismo.com') as user_profiles;

-- Show all created demo accounts
SELECT 
  up.email,
  up.full_name,
  up.role,
  t.name as tenant_name,
  'password123' as password
FROM public.user_profiles up
JOIN public.tenants t ON up.tenant_id = t.id
WHERE up.email IN (
  'ceo@stratix-demo.com',
  'admin@stratix-demo.com',
  'ceo@fema-electricidad.com',
  'admin@fema-electricidad.com',
  'ceo@siga-turismo.com',
  'admin@siga-turismo.com'
)
ORDER BY t.name, up.role;

END $$;

