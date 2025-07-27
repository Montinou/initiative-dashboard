-- Create superadmin in the superadmins table
-- This script creates a superadmin user that can log in through the /superadmin route

-- First, ensure the superadmins table exists
-- (it should already exist from your schema)

-- Delete existing superadmin if exists (for clean setup)
DELETE FROM public.superadmin_sessions WHERE superadmin_id IN (
  SELECT id FROM public.superadmins WHERE email = 'superadmin@stratix-platform.com'
);
DELETE FROM public.superadmins WHERE email = 'superadmin@stratix-platform.com';

-- Insert new superadmin
-- Password: password123
-- The password hash below is created using the same algorithm as edge-compatible-auth.ts
-- This is a base64 encoded string containing salt + PBKDF2 hash
INSERT INTO public.superadmins (
  email,
  name,
  password_hash,
  is_active,
  created_at,
  updated_at
) VALUES (
  'superadmin@stratix-platform.com',
  'Platform Superadmin',
  -- This hash is for 'password123' - you should change it in production
  'lDFQb4GhtAX1TPY+d9NvFAHWKWDOte3w1eIY7+JOmSo2L+5VVkngl8sRHTRJH8CX',
  true,
  NOW(),
  NOW()
);

-- Also ensure the user exists in auth.users for consistency
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
) VALUES (
  'd1111111-1111-1111-1111-111111111111'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'superadmin@stratix-platform.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash for password123
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Platform Superadmin"}'::jsonb,
  true,
  NOW(),
  NOW(),
  false
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  is_super_admin = true,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = NOW();

-- Create identity for auth.users
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
) VALUES (
  gen_random_uuid(),
  'd1111111-1111-1111-1111-111111111111'::uuid,
  'd1111111-1111-1111-1111-111111111111'::text,
  'email',
  jsonb_build_object(
    'sub', 'd1111111-1111-1111-1111-111111111111'::text,
    'email', 'superadmin@stratix-platform.com',
    'email_verified', true,
    'phone_verified', false
  ),
  NULL,
  NOW(),
  NOW(),
  'superadmin@stratix-platform.com'
) ON CONFLICT (provider, provider_id) DO NOTHING;

-- Create user profile
INSERT INTO public.user_profiles (
  id,
  tenant_id,
  email,
  full_name,
  role,
  area,
  is_active,
  created_at,
  updated_at
) VALUES (
  'd1111111-1111-1111-1111-111111111111'::uuid,
  NULL, -- Superadmin has no tenant
  'superadmin@stratix-platform.com',
  'Platform Superadmin',
  'superadmin'::user_role,
  NULL,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  role = 'superadmin'::user_role,
  tenant_id = NULL,
  updated_at = NOW();

-- Verify the setup
SELECT 
  'Superadmin Setup Complete' as status,
  (SELECT COUNT(*) FROM public.superadmins WHERE email = 'superadmin@stratix-platform.com') as superadmin_count,
  (SELECT COUNT(*) FROM auth.users WHERE email = 'superadmin@stratix-platform.com' AND is_super_admin = true) as auth_user_count,
  (SELECT COUNT(*) FROM public.user_profiles WHERE email = 'superadmin@stratix-platform.com' AND role = 'superadmin') as profile_count;

-- Display login credentials
SELECT 
  'Login Credentials' as info,
  'Email: superadmin@stratix-platform.com' as email,
  'Password: password123' as password,
  'Login URL: /superadmin' as url;