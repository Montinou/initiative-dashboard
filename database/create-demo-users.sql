-- Create demo users for each tenant
-- Password for all users: password123

-- First, ensure we have the required tenants
INSERT INTO public.tenants (id, name, subdomain, description, industry, is_active, created_at, updated_at)
VALUES 
  ('4f644c1f-0d57-4980-8eba-ecc9ed7b661e'::uuid, 'Stratix Platform', 'stratix-demo', 'Demo tenant for Stratix Platform', 'Technology', true, NOW(), NOW()),
  ('c5a4dd96-6058-42b3-8268-997728a529bb'::uuid, 'FEMA Electricidad', 'fema-electricidad', 'Empresa de materiales eléctricos', 'Electrical', true, NOW(), NOW()),
  ('d1a3408c-a3d0-487e-a355-a321a07b5ae2'::uuid, 'SIGA Turismo', 'siga-turismo', 'Sistema de gestión turística', 'Tourism', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  subdomain = EXCLUDED.subdomain,
  updated_at = NOW();

-- Create auth.users entries for demo accounts
-- Using gen_random_uuid() for each user
DO $$
DECLARE
  ceo_stratix_id uuid := gen_random_uuid();
  admin_stratix_id uuid := gen_random_uuid();
  ceo_fema_id uuid := gen_random_uuid();
  admin_fema_id uuid := gen_random_uuid();
  ceo_siga_id uuid := gen_random_uuid();
  admin_siga_id uuid := gen_random_uuid();
BEGIN
  -- Check if users already exist before inserting
  -- First, disable the trigger temporarily to avoid conflicts
  ALTER TABLE auth.users DISABLE TRIGGER ALL;

  -- CEO Stratix
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ceo@stratix-demo.com') THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, is_sso_user)
    VALUES (ceo_stratix_id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'ceo@stratix-demo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "CEO Stratix", "role": "CEO", "tenant_id": "4f644c1f-0d57-4980-8eba-ecc9ed7b661e"}', false, NOW(), NOW(), false);
  ELSE
    SELECT id INTO ceo_stratix_id FROM auth.users WHERE email = 'ceo@stratix-demo.com';
  END IF;

  -- Admin Stratix
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@stratix-demo.com') THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, is_sso_user)
    VALUES (admin_stratix_id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'admin@stratix-demo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Admin Stratix", "role": "Admin", "tenant_id": "4f644c1f-0d57-4980-8eba-ecc9ed7b661e"}', false, NOW(), NOW(), false);
  ELSE
    SELECT id INTO admin_stratix_id FROM auth.users WHERE email = 'admin@stratix-demo.com';
  END IF;

  -- CEO FEMA
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ceo@fema-electricidad.com') THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, is_sso_user)
    VALUES (ceo_fema_id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'ceo@fema-electricidad.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "CEO FEMA", "role": "CEO", "tenant_id": "c5a4dd96-6058-42b3-8268-997728a529bb"}', false, NOW(), NOW(), false);
  ELSE
    SELECT id INTO ceo_fema_id FROM auth.users WHERE email = 'ceo@fema-electricidad.com';
  END IF;

  -- Admin FEMA
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@fema-electricidad.com') THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, is_sso_user)
    VALUES (admin_fema_id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'admin@fema-electricidad.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Admin FEMA", "role": "Admin", "tenant_id": "c5a4dd96-6058-42b3-8268-997728a529bb"}', false, NOW(), NOW(), false);
  ELSE
    SELECT id INTO admin_fema_id FROM auth.users WHERE email = 'admin@fema-electricidad.com';
  END IF;

  -- CEO SIGA
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ceo@siga-turismo.com') THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, is_sso_user)
    VALUES (ceo_siga_id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'ceo@siga-turismo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "CEO SIGA", "role": "CEO", "tenant_id": "d1a3408c-a3d0-487e-a355-a321a07b5ae2"}', false, NOW(), NOW(), false);
  ELSE
    SELECT id INTO ceo_siga_id FROM auth.users WHERE email = 'ceo@siga-turismo.com';
  END IF;

  -- Admin SIGA
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@siga-turismo.com') THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, is_sso_user)
    VALUES (admin_siga_id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'admin@siga-turismo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Admin SIGA", "role": "Admin", "tenant_id": "d1a3408c-a3d0-487e-a355-a321a07b5ae2"}', false, NOW(), NOW(), false);
  ELSE
    SELECT id INTO admin_siga_id FROM auth.users WHERE email = 'admin@siga-turismo.com';
  END IF;

  -- Re-enable the trigger
  ALTER TABLE auth.users ENABLE TRIGGER ALL;

  -- Create identities for auth.users
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
    'ceo@stratix-demo.com',
    'admin@stratix-demo.com',
    'ceo@fema-electricidad.com',
    'admin@fema-electricidad.com',
    'ceo@siga-turismo.com',
    'admin@siga-turismo.com'
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Create user profiles with the same IDs
  -- Stratix Platform
  INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at)
  SELECT 
    u.id,
    '4f644c1f-0d57-4980-8eba-ecc9ed7b661e'::uuid,
    u.email,
    CASE 
      WHEN u.email = 'ceo@stratix-demo.com' THEN 'CEO Stratix'
      WHEN u.email = 'admin@stratix-demo.com' THEN 'Admin Stratix'
    END,
    CASE 
      WHEN u.email LIKE 'ceo@%' THEN 'CEO'::user_role
      WHEN u.email LIKE 'admin@%' THEN 'Admin'::user_role
    END,
    CASE 
      WHEN u.email LIKE 'ceo@%' THEN 'Executive'
      WHEN u.email LIKE 'admin@%' THEN 'Administration'
    END,
    true,
    NOW(),
    NOW()
  FROM auth.users u
  WHERE u.email IN ('ceo@stratix-demo.com', 'admin@stratix-demo.com')
  ON CONFLICT (id) DO UPDATE SET 
    tenant_id = EXCLUDED.tenant_id,
    role = EXCLUDED.role,
    updated_at = NOW();

  -- FEMA Electricidad
  INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at)
  SELECT 
    u.id,
    'c5a4dd96-6058-42b3-8268-997728a529bb'::uuid,
    u.email,
    CASE 
      WHEN u.email = 'ceo@fema-electricidad.com' THEN 'CEO FEMA'
      WHEN u.email = 'admin@fema-electricidad.com' THEN 'Admin FEMA'
    END,
    CASE 
      WHEN u.email LIKE 'ceo@%' THEN 'CEO'::user_role
      WHEN u.email LIKE 'admin@%' THEN 'Admin'::user_role
    END,
    CASE 
      WHEN u.email LIKE 'ceo@%' THEN 'Executive'
      WHEN u.email LIKE 'admin@%' THEN 'Administration'
    END,
    true,
    NOW(),
    NOW()
  FROM auth.users u
  WHERE u.email IN ('ceo@fema-electricidad.com', 'admin@fema-electricidad.com')
  ON CONFLICT (id) DO UPDATE SET 
    tenant_id = EXCLUDED.tenant_id,
    role = EXCLUDED.role,
    updated_at = NOW();

  -- SIGA Turismo
  INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at)
  SELECT 
    u.id,
    'd1a3408c-a3d0-487e-a355-a321a07b5ae2'::uuid,
    u.email,
    CASE 
      WHEN u.email = 'ceo@siga-turismo.com' THEN 'CEO SIGA'
      WHEN u.email = 'admin@siga-turismo.com' THEN 'Admin SIGA'
    END,
    CASE 
      WHEN u.email LIKE 'ceo@%' THEN 'CEO'::user_role
      WHEN u.email LIKE 'admin@%' THEN 'Admin'::user_role
    END,
    CASE 
      WHEN u.email LIKE 'ceo@%' THEN 'Executive'
      WHEN u.email LIKE 'admin@%' THEN 'Administration'
    END,
    true,
    NOW(),
    NOW()
  FROM auth.users u
  WHERE u.email IN ('ceo@siga-turismo.com', 'admin@siga-turismo.com')
  ON CONFLICT (id) DO UPDATE SET 
    tenant_id = EXCLUDED.tenant_id,
    role = EXCLUDED.role,
    updated_at = NOW();
END $$;

-- Verify the setup
SELECT 
  'Demo User Setup Complete' as status,
  (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@stratix-demo.com' OR email LIKE '%@fema-electricidad.com' OR email LIKE '%@siga-turismo.com') as auth_users_count,
  (SELECT COUNT(*) FROM public.user_profiles WHERE email LIKE '%@stratix-demo.com' OR email LIKE '%@fema-electricidad.com' OR email LIKE '%@siga-turismo.com') as user_profiles_count;

-- Display all demo accounts
SELECT 
  up.email,
  up.full_name,
  up.role,
  t.name as tenant_name,
  t.subdomain,
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