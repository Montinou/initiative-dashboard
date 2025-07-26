-- INSERT DEMO DATA
-- This script creates the superadmin, demo tenants, and demo users

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
);

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
);

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
);

-- ============================================================================
-- STEP 3: CREATE DEMO TENANTS
-- ============================================================================

INSERT INTO public.tenants (id, name, subdomain, description, industry, is_active, created_by_superadmin) VALUES
    ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'FEMA Electricidad', 'fema-electricidad', 'Empresa eléctrica con múltiples divisiones', 'Electricidad', true, '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid),
    ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'SIGA Turismo', 'siga-turismo', 'Agencia de turismo y viajes', 'Turismo', true, '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid),
    ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'TechCorp Solutions', 'techcorp-solutions', 'Empresa de soluciones tecnológicas', 'Tecnología', true, '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid);

-- ============================================================================
-- STEP 4: CREATE DEMO USERS IN AUTH.USERS
-- ============================================================================

-- FEMA Users
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES
    ('00000000-0000-0000-0000-000000000000', 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'authenticated', 'authenticated', 'carlos.mendez@fema.com', crypt('demo123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Carlos Méndez","role":"ceo"}', NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', 'f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid, 'authenticated', 'authenticated', 'maria.rodriguez@fema.com', crypt('demo123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"María Rodríguez","role":"admin"}', NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', 'f47ac10b-58cc-4372-a567-0e02b2c3d481'::uuid, 'authenticated', 'authenticated', 'jose.garcia@fema.com', crypt('demo123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"José García","role":"manager"}', NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', 'f47ac10b-58cc-4372-a567-0e02b2c3d482'::uuid, 'authenticated', 'authenticated', 'ana.lopez@fema.com', crypt('demo123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ana López","role":"analyst"}', NOW(), NOW(), '', '', '', '');

-- SIGA Users  
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES
    ('00000000-0000-0000-0000-000000000000', 'f47ac10b-58cc-4372-a567-0e02b2c3d483'::uuid, 'authenticated', 'authenticated', 'laura.martinez@siga.com', crypt('demo123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Laura Martínez","role":"ceo"}', NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', 'f47ac10b-58cc-4372-a567-0e02b2c3d484'::uuid, 'authenticated', 'authenticated', 'pedro.sanchez@siga.com', crypt('demo123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Pedro Sánchez","role":"manager"}', NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', 'f47ac10b-58cc-4372-a567-0e02b2c3d485'::uuid, 'authenticated', 'authenticated', 'sofia.torres@siga.com', crypt('demo123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sofía Torres","role":"analyst"}', NOW(), NOW(), '', '', '', '');

-- TechCorp Users
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES
    ('00000000-0000-0000-0000-000000000000', 'f47ac10b-58cc-4372-a567-0e02b2c3d486'::uuid, 'authenticated', 'authenticated', 'david.kim@techcorp.com', crypt('demo123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"David Kim","role":"ceo"}', NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', 'f47ac10b-58cc-4372-a567-0e02b2c3d487'::uuid, 'authenticated', 'authenticated', 'jennifer.wong@techcorp.com', crypt('demo123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Jennifer Wong","role":"admin"}', NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', 'f47ac10b-58cc-4372-a567-0e02b2c3d488'::uuid, 'authenticated', 'authenticated', 'michael.brown@techcorp.com', crypt('demo123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Michael Brown","role":"manager"}', NOW(), NOW(), '', '', '', '');

-- ============================================================================
-- STEP 5: CREATE IDENTITIES FOR ALL USERS
-- ============================================================================

-- FEMA identities
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, email) VALUES
    ('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, '{"sub":"f47ac10b-58cc-4372-a567-0e02b2c3d479","email":"carlos.mendez@fema.com"}', 'email', NOW(), NOW(), NOW(), 'carlos.mendez@fema.com'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid, 'f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid, '{"sub":"f47ac10b-58cc-4372-a567-0e02b2c3d480","email":"maria.rodriguez@fema.com"}', 'email', NOW(), NOW(), NOW(), 'maria.rodriguez@fema.com'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d481'::uuid, 'f47ac10b-58cc-4372-a567-0e02b2c3d481'::uuid, '{"sub":"f47ac10b-58cc-4372-a567-0e02b2c3d481","email":"jose.garcia@fema.com"}', 'email', NOW(), NOW(), NOW(), 'jose.garcia@fema.com'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d482'::uuid, 'f47ac10b-58cc-4372-a567-0e02b2c3d482'::uuid, '{"sub":"f47ac10b-58cc-4372-a567-0e02b2c3d482","email":"ana.lopez@fema.com"}', 'email', NOW(), NOW(), NOW(), 'ana.lopez@fema.com');

-- SIGA identities
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, email) VALUES
    ('f47ac10b-58cc-4372-a567-0e02b2c3d483'::uuid, 'f47ac10b-58cc-4372-a567-0e02b2c3d483'::uuid, '{"sub":"f47ac10b-58cc-4372-a567-0e02b2c3d483","email":"laura.martinez@siga.com"}', 'email', NOW(), NOW(), NOW(), 'laura.martinez@siga.com'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d484'::uuid, 'f47ac10b-58cc-4372-a567-0e02b2c3d484'::uuid, '{"sub":"f47ac10b-58cc-4372-a567-0e02b2c3d484","email":"pedro.sanchez@siga.com"}', 'email', NOW(), NOW(), NOW(), 'pedro.sanchez@siga.com'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d485'::uuid, 'f47ac10b-58cc-4372-a567-0e02b2c3d485'::uuid, '{"sub":"f47ac10b-58cc-4372-a567-0e02b2c3d485","email":"sofia.torres@siga.com"}', 'email', NOW(), NOW(), NOW(), 'sofia.torres@siga.com');

-- TechCorp identities
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, email) VALUES
    ('f47ac10b-58cc-4372-a567-0e02b2c3d486'::uuid, 'f47ac10b-58cc-4372-a567-0e02b2c3d486'::uuid, '{"sub":"f47ac10b-58cc-4372-a567-0e02b2c3d486","email":"david.kim@techcorp.com"}', 'email', NOW(), NOW(), NOW(), 'david.kim@techcorp.com'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d487'::uuid, 'f47ac10b-58cc-4372-a567-0e02b2c3d487'::uuid, '{"sub":"f47ac10b-58cc-4372-a567-0e02b2c3d487","email":"jennifer.wong@techcorp.com"}', 'email', NOW(), NOW(), NOW(), 'jennifer.wong@techcorp.com'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d488'::uuid, 'f47ac10b-58cc-4372-a567-0e02b2c3d488'::uuid, '{"sub":"f47ac10b-58cc-4372-a567-0e02b2c3d488","email":"michael.brown@techcorp.com"}', 'email', NOW(), NOW(), NOW(), 'michael.brown@techcorp.com');

-- ============================================================================
-- STEP 6: CREATE USER PROFILES
-- ============================================================================

-- Superadmin profile
INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, is_system_admin, created_by_superadmin) VALUES
    ('93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'agusmontoya@gmail.com', 'Agus Montoya - Platform Administrator', 'CEO', 'Administration', true, true, '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid);

-- FEMA profiles
INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_by_superadmin) VALUES
    ('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'carlos.mendez@fema.com', 'Carlos Méndez', 'CEO', 'Dirección General', true, '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'maria.rodriguez@fema.com', 'María Rodríguez', 'Admin', 'Administración', true, '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d481'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'jose.garcia@fema.com', 'José García', 'Manager', 'División Iluminación', true, '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d482'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'ana.lopez@fema.com', 'Ana López', 'Analyst', 'División Electricidad', true, '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid);

-- SIGA profiles
INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_by_superadmin) VALUES
    ('f47ac10b-58cc-4372-a567-0e02b2c3d483'::uuid, '550e8400-e29b-41d4-a716-446655440001'::uuid, 'laura.martinez@siga.com', 'Laura Martínez', 'CEO', 'Dirección General', true, '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d484'::uuid, '550e8400-e29b-41d4-a716-446655440001'::uuid, 'pedro.sanchez@siga.com', 'Pedro Sánchez', 'Manager', 'Operaciones Turísticas', true, '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d485'::uuid, '550e8400-e29b-41d4-a716-446655440001'::uuid, 'sofia.torres@siga.com', 'Sofía Torres', 'Analyst', 'Marketing y Ventas', true, '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid);

-- TechCorp profiles
INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_by_superadmin) VALUES
    ('f47ac10b-58cc-4372-a567-0e02b2c3d486'::uuid, '550e8400-e29b-41d4-a716-446655440002'::uuid, 'david.kim@techcorp.com', 'David Kim', 'CEO', 'Executive', true, '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d487'::uuid, '550e8400-e29b-41d4-a716-446655440002'::uuid, 'jennifer.wong@techcorp.com', 'Jennifer Wong', 'Admin', 'Operations', true, '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d488'::uuid, '550e8400-e29b-41d4-a716-446655440002'::uuid, 'michael.brown@techcorp.com', 'Michael Brown', 'Manager', 'Development', true, '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid);

-- ============================================================================
-- STEP 7: CREATE AREAS
-- ============================================================================

-- FEMA areas
INSERT INTO public.areas (tenant_id, name, description, manager_id, is_active) VALUES
    ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Dirección General', 'Dirección ejecutiva de la empresa', 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid, true),
    ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'División Iluminación', 'División especializada en sistemas de iluminación', 'f47ac10b-58cc-4372-a567-0e02b2c3d481'::uuid, true),
    ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'División Electricidad', 'División de instalaciones eléctricas generales', NULL, true),
    ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'División Industria', 'División de automatización industrial', NULL, true),
    ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Administración', 'Área administrativa y financiera', 'f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid, true),
    ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'E-commerce', 'Plataforma de ventas online', NULL, true),
    ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Logística', 'Gestión de almacén y distribución', NULL, true);

-- SIGA areas
INSERT INTO public.areas (tenant_id, name, description, manager_id, is_active) VALUES
    ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'Dirección General', 'Dirección ejecutiva de la agencia', 'f47ac10b-58cc-4372-a567-0e02b2c3d483'::uuid, true),
    ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'Operaciones Turísticas', 'Gestión de paquetes y servicios turísticos', 'f47ac10b-58cc-4372-a567-0e02b2c3d484'::uuid, true),
    ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'Marketing y Ventas', 'Promoción y venta de servicios', NULL, true),
    ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'Atención al Cliente', 'Servicio y soporte al cliente', NULL, true);

-- TechCorp areas
INSERT INTO public.areas (tenant_id, name, description, manager_id, is_active) VALUES
    ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'Executive', 'Executive leadership', 'f47ac10b-58cc-4372-a567-0e02b2c3d486'::uuid, true),
    ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'Development', 'Software development team', 'f47ac10b-58cc-4372-a567-0e02b2c3d488'::uuid, true),
    ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'Operations', 'IT operations and infrastructure', 'f47ac10b-58cc-4372-a567-0e02b2c3d487'::uuid, true),
    ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'Sales', 'Sales and business development', NULL, true);

-- ============================================================================
-- STEP 8: VERIFICATION
-- ============================================================================

SELECT 'SUPERADMIN CHECK' as check_type, COUNT(*) as count FROM public.superadmins;
SELECT 'AUTH USERS CHECK' as check_type, COUNT(*) as count FROM auth.users;
SELECT 'TENANTS CHECK' as check_type, COUNT(*) as count FROM public.tenants;
SELECT 'USER PROFILES CHECK' as check_type, COUNT(*) as count FROM public.user_profiles;
SELECT 'AREAS CHECK' as check_type, COUNT(*) as count FROM public.areas;

-- List all demo users
SELECT 'DEMO USERS LIST' as info, t.name as tenant, up.email, up.full_name, up.role, up.area
FROM public.user_profiles up
JOIN public.tenants t ON up.tenant_id = t.id
ORDER BY t.name, up.role, up.full_name;

SELECT 'SETUP COMPLETE' as status, 
       'Database reset with superadmin and demo data' as message,
       'Superadmin: agusmontoya@gmail.com / btcStn60' as superadmin_login,
       'Demo users: password demo123' as demo_login;