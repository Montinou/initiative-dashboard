-- Check all users in the system

-- 1. Check superadmin
SELECT 
  'SUPERADMIN' as user_type,
  s.email,
  s.name as full_name,
  s.is_active,
  'superadmins table' as source
FROM public.superadmins s
WHERE s.email = 'superadmin@stratix-platform.com';

-- 2. Check demo users in user_profiles
SELECT 
  'DEMO USERS' as user_type,
  up.email,
  up.full_name,
  up.role,
  t.name as tenant_name,
  t.subdomain,
  up.is_active
FROM public.user_profiles up
LEFT JOIN public.tenants t ON up.tenant_id = t.id
WHERE up.email IN (
  'ceo@stratix-demo.com',
  'admin@stratix-demo.com',
  'ceo@fema-electricidad.com',
  'admin@fema-electricidad.com',
  'ceo@siga-turismo.com',
  'admin@siga-turismo.com'
)
ORDER BY t.name, up.role;

-- 3. Check if users exist in auth.users
SELECT 
  'AUTH.USERS' as table_name,
  COUNT(*) as total_users,
  COUNT(CASE WHEN email = 'superadmin@stratix-platform.com' THEN 1 END) as superadmin_count,
  COUNT(CASE WHEN email LIKE '%@stratix-demo.com' THEN 1 END) as stratix_users,
  COUNT(CASE WHEN email LIKE '%@fema-electricidad.com' THEN 1 END) as fema_users,
  COUNT(CASE WHEN email LIKE '%@siga-turismo.com' THEN 1 END) as siga_users
FROM auth.users
WHERE email IN (
  'superadmin@stratix-platform.com',
  'ceo@stratix-demo.com',
  'admin@stratix-demo.com',
  'ceo@fema-electricidad.com',
  'admin@fema-electricidad.com',
  'ceo@siga-turismo.com',
  'admin@siga-turismo.com'
);

-- 4. Show missing users (need to be created)
SELECT 
  'MISSING IN AUTH.USERS' as status,
  email
FROM (
  VALUES 
    ('ceo@stratix-demo.com'),
    ('admin@stratix-demo.com'),
    ('ceo@fema-electricidad.com'),
    ('admin@fema-electricidad.com'),
    ('ceo@siga-turismo.com'),
    ('admin@siga-turismo.com')
) AS required_users(email)
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.email = required_users.email
);