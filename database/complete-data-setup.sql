-- Complete Data Setup Script for Stratix Platform
-- This script creates tenants, users, areas, and sample data using VALID existing domains
-- Execute after running the superadmin-auth-migration.sql script

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. CREATE TENANTS (Using valid domains from theme-config.ts)
-- =============================================================================

INSERT INTO public.tenants (id, name, subdomain, description, industry, is_active, settings, created_at, updated_at)
VALUES 
  (
    uuid_generate_v4(),
    'Stratix Platform',
    'stratix-demo',
    'Enterprise Management Platform - Transform your organization with our comprehensive management suite',
    'Enterprise Management Platform',
    true,
    '{
      "theme": {
        "primary_color": "#6366f1",
        "secondary_color": "#ec4899",
        "accent_color": "#14b8a6",
        "background_color": "#0f172a",
        "logo_url": null
      },
      "features": {
        "okr_management": true,
        "analytics": true,
        "reporting": true,
        "user_management": true,
        "demo_mode": true
      },
      "domain": "stratix-platform.vercel.app",
      "language": "en",
      "timezone": "America/New_York"
    }'::jsonb,
    NOW(),
    NOW()
  ),
  (
    uuid_generate_v4(),
    'FEMA Electricidad',
    'fema-electricidad',
    'Soluciones eléctricas integrales para el sector industrial y doméstico',
    'Electricidad y Energía',
    true,
    '{
      "theme": {
        "primary_color": "#00539F",
        "secondary_color": "#FFC72C",
        "accent_color": "#F0F2F5",
        "background_color": "#212529",
        "logo_url": null
      },
      "features": {
        "okr_management": true,
        "analytics": true,
        "reporting": true,
        "user_management": true,
        "industry_specific": true
      },
      "domain": "fema-electricidad.vercel.app",
      "language": "es",
      "timezone": "America/Santo_Domingo"
    }'::jsonb,
    NOW(),
    NOW()
  ),
  (
    uuid_generate_v4(),
    'SIGA Turismo',
    'siga-turismo',
    'Gestión integral de servicios turísticos y experiencias de viaje',
    'Turismo y Viajes',
    true,
    '{
      "theme": {
        "primary_color": "#00A651",
        "secondary_color": "#FDC300",
        "accent_color": "#F8F9FA",
        "background_color": "#212529",
        "logo_url": null
      },
      "features": {
        "okr_management": true,
        "analytics": true,
        "reporting": true,
        "user_management": true,
        "tourism_specific": true
      },
      "domain": "siga-turismo.vercel.app",
      "language": "es",
      "timezone": "America/Santo_Domingo"
    }'::jsonb,
    NOW(),
    NOW()
  )
ON CONFLICT (subdomain) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  settings = EXCLUDED.settings,
  updated_at = NOW();

-- =============================================================================
-- 2. CREATE AREAS FOR EACH TENANT
-- =============================================================================

-- Get tenant IDs for reference
DO $$
DECLARE
    stratix_tenant_id UUID;
    fema_tenant_id UUID;
    siga_tenant_id UUID;
BEGIN
    -- Get the actual tenant IDs
    SELECT id INTO stratix_tenant_id FROM public.tenants WHERE subdomain = 'stratix-demo';
    SELECT id INTO fema_tenant_id FROM public.tenants WHERE subdomain = 'fema-electricidad';
    SELECT id INTO siga_tenant_id FROM public.tenants WHERE subdomain = 'siga-turismo';

    -- Areas for Stratix Platform (Demo)
    INSERT INTO public.areas (tenant_id, name, description, is_active, created_at, updated_at) VALUES
        (stratix_tenant_id, 'Technology', 'Innovation and development initiatives', true, NOW(), NOW()),
        (stratix_tenant_id, 'Sales', 'Customer acquisition and revenue growth', true, NOW(), NOW()),
        (stratix_tenant_id, 'Operations', 'Operational efficiency and process improvement', true, NOW(), NOW()),
        (stratix_tenant_id, 'Human Resources', 'Talent management and organizational development', true, NOW(), NOW()),
        (stratix_tenant_id, 'Finance', 'Financial planning and budget management', true, NOW(), NOW()),
        (stratix_tenant_id, 'Marketing', 'Brand development and market expansion', true, NOW(), NOW())
    ON CONFLICT (tenant_id, name) DO NOTHING;

    -- Areas for FEMA Electricidad
    INSERT INTO public.areas (tenant_id, name, description, is_active, created_at, updated_at) VALUES
        (fema_tenant_id, 'División Iluminación', 'División especializada en sistemas de iluminación', true, NOW(), NOW()),
        (fema_tenant_id, 'División Electricidad', 'División de instalaciones eléctricas generales', true, NOW(), NOW()),
        (fema_tenant_id, 'División Industria', 'División de automatización industrial', true, NOW(), NOW()),
        (fema_tenant_id, 'Administración', 'Área administrativa y financiera', true, NOW(), NOW()),
        (fema_tenant_id, 'E-commerce', 'Plataforma de ventas online', true, NOW(), NOW()),
        (fema_tenant_id, 'Logística', 'Gestión de almacén y distribución', true, NOW(), NOW())
    ON CONFLICT (tenant_id, name) DO NOTHING;

    -- Areas for SIGA Turismo
    INSERT INTO public.areas (tenant_id, name, description, is_active, created_at, updated_at) VALUES
        (siga_tenant_id, 'Desarrollo Turístico', 'Promoción y desarrollo de destinos turísticos', true, NOW(), NOW()),
        (siga_tenant_id, 'Operaciones', 'Gestión operativa de servicios turísticos', true, NOW(), NOW()),
        (siga_tenant_id, 'Marketing y Promoción', 'Promoción de destinos y experiencias', true, NOW(), NOW()),
        (siga_tenant_id, 'Regulación y Calidad', 'Supervisión y control de calidad turística', true, NOW(), NOW()),
        (siga_tenant_id, 'Tecnología', 'Desarrollo de plataformas digitales', true, NOW(), NOW()),
        (siga_tenant_id, 'Administración', 'Gestión administrativa y financiera', true, NOW(), NOW())
    ON CONFLICT (tenant_id, name) DO NOTHING;
END $$;

-- =============================================================================
-- 3. CREATE SAMPLE USERS (auth.users + user_profiles)
-- =============================================================================

-- Note: In production, users should be created via Supabase Auth API
-- This creates sample users for demo/testing purposes only

-- NOTE: Before running this script, execute the create-users-supabase.ps1 or create-users-supabase.sh script
-- to create users via Supabase CLI. This script will then create the corresponding user profiles.

DO $$
DECLARE
    stratix_tenant_id UUID;
    fema_tenant_id UUID;
    siga_tenant_id UUID;
    user_id UUID;
BEGIN
    -- Get tenant IDs
    SELECT id INTO stratix_tenant_id FROM public.tenants WHERE subdomain = 'stratix-demo';
    SELECT id INTO fema_tenant_id FROM public.tenants WHERE subdomain = 'fema-electricidad';
    SELECT id INTO siga_tenant_id FROM public.tenants WHERE subdomain = 'siga-turismo';

    -- Create user profiles for existing auth.users (created via Supabase CLI)
    -- These will link to the users created by the Supabase CLI scripts
    
    -- Stratix Platform users
    SELECT id INTO user_id FROM auth.users WHERE email = 'admin@stratix-platform.com';
    IF user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) VALUES
            (user_id, stratix_tenant_id, 'admin@stratix-platform.com', 'Admin Stratix', 'CEO', 'Technology', true, NOW(), NOW())
        ON CONFLICT (tenant_id, email) DO UPDATE SET 
            id = EXCLUDED.id,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            area = EXCLUDED.area,
            updated_at = NOW();
    ELSE
        RAISE WARNING 'User admin@stratix-platform.com not found in auth.users. Please run the create-users script first.';
    END IF;

    SELECT id INTO user_id FROM auth.users WHERE email = 'manager@stratix-platform.com';
    IF user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) VALUES
            (user_id, stratix_tenant_id, 'manager@stratix-platform.com', 'Manager Stratix', 'Manager', 'Sales', true, NOW(), NOW())
        ON CONFLICT (tenant_id, email) DO UPDATE SET 
            id = EXCLUDED.id,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            area = EXCLUDED.area,
            updated_at = NOW();
    ELSE
        RAISE WARNING 'User manager@stratix-platform.com not found in auth.users. Please run the create-users script first.';
    END IF;

    SELECT id INTO user_id FROM auth.users WHERE email = 'analyst@stratix-platform.com';
    IF user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) VALUES
            (user_id, stratix_tenant_id, 'analyst@stratix-platform.com', 'Analyst Stratix', 'Analyst', 'Operations', true, NOW(), NOW())
        ON CONFLICT (tenant_id, email) DO UPDATE SET 
            id = EXCLUDED.id,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            area = EXCLUDED.area,
            updated_at = NOW();
    ELSE
        RAISE WARNING 'User analyst@stratix-platform.com not found in auth.users. Please run the create-users script first.';
    END IF;

    -- FEMA Electricidad users
    SELECT id INTO user_id FROM auth.users WHERE email = 'admin@fema-electricidad.com';
    IF user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) VALUES
            (user_id, fema_tenant_id, 'admin@fema-electricidad.com', 'Admin FEMA', 'CEO', 'Administración', true, NOW(), NOW())
        ON CONFLICT (tenant_id, email) DO UPDATE SET 
            id = EXCLUDED.id,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            area = EXCLUDED.area,
            updated_at = NOW();
    ELSE
        RAISE WARNING 'User admin@fema-electricidad.com not found in auth.users. Please run the create-users script first.';
    END IF;

    SELECT id INTO user_id FROM auth.users WHERE email = 'manager@fema-electricidad.com';
    IF user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) VALUES
            (user_id, fema_tenant_id, 'manager@fema-electricidad.com', 'Gerente División Industrial', 'Manager', 'División Industria', true, NOW(), NOW())
        ON CONFLICT (tenant_id, email) DO UPDATE SET 
            id = EXCLUDED.id,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            area = EXCLUDED.area,
            updated_at = NOW();
    ELSE
        RAISE WARNING 'User manager@fema-electricidad.com not found in auth.users. Please run the create-users script first.';
    END IF;

    SELECT id INTO user_id FROM auth.users WHERE email = 'analyst@fema-electricidad.com';
    IF user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) VALUES
            (user_id, fema_tenant_id, 'analyst@fema-electricidad.com', 'Analista Comercial', 'Analyst', 'E-commerce', true, NOW(), NOW())
        ON CONFLICT (tenant_id, email) DO UPDATE SET 
            id = EXCLUDED.id,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            area = EXCLUDED.area,
            updated_at = NOW();
    ELSE
        RAISE WARNING 'User analyst@fema-electricidad.com not found in auth.users. Please run the create-users script first.';
    END IF;

    -- SIGA Turismo users
    SELECT id INTO user_id FROM auth.users WHERE email = 'admin@siga-turismo.com';
    IF user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) VALUES
            (user_id, siga_tenant_id, 'admin@siga-turismo.com', 'Admin SIGA', 'CEO', 'Administración', true, NOW(), NOW())
        ON CONFLICT (tenant_id, email) DO UPDATE SET 
            id = EXCLUDED.id,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            area = EXCLUDED.area,
            updated_at = NOW();
    ELSE
        RAISE WARNING 'User admin@siga-turismo.com not found in auth.users. Please run the create-users script first.';
    END IF;

    SELECT id INTO user_id FROM auth.users WHERE email = 'manager@siga-turismo.com';
    IF user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) VALUES
            (user_id, siga_tenant_id, 'manager@siga-turismo.com', 'Director de Desarrollo', 'Manager', 'Desarrollo Turístico', true, NOW(), NOW())
        ON CONFLICT (tenant_id, email) DO UPDATE SET 
            id = EXCLUDED.id,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            area = EXCLUDED.area,
            updated_at = NOW();
    ELSE
        RAISE WARNING 'User manager@siga-turismo.com not found in auth.users. Please run the create-users script first.';
    END IF;

    SELECT id INTO user_id FROM auth.users WHERE email = 'analyst@siga-turismo.com';
    IF user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) VALUES
            (user_id, siga_tenant_id, 'analyst@siga-turismo.com', 'Analista de Marketing', 'Analyst', 'Marketing y Promoción', true, NOW(), NOW())
        ON CONFLICT (tenant_id, email) DO UPDATE SET 
            id = EXCLUDED.id,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            area = EXCLUDED.area,
            updated_at = NOW();
    ELSE
        RAISE WARNING 'User analyst@siga-turismo.com not found in auth.users. Please run the create-users script first.';
    END IF;
END $$;

-- =============================================================================
-- 4. CREATE SUPERADMIN USERS (user_profiles.role = 'superadmin')
-- =============================================================================

DO $$
DECLARE
    superadmin_user_id UUID;
BEGIN
    -- Create superadmin user profile for platform management
    -- Link to user created via Supabase CLI
    SELECT id INTO superadmin_user_id FROM auth.users WHERE email = 'superadmin@stratix-platform.com';
    
    IF superadmin_user_id IS NOT NULL THEN
        -- Create user_profile with 'superadmin' role (this requires the migration to add 'superadmin' to user_role enum)
        -- Note: This will fail if superadmin-auth-migration.sql hasn't been run first
        INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) VALUES
            (superadmin_user_id, NULL, 'superadmin@stratix-platform.com', 'Platform Superadmin', 'superadmin', NULL, true, NOW(), NOW())
        ON CONFLICT (tenant_id, email) DO UPDATE SET 
            id = EXCLUDED.id,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            updated_at = NOW();
        
        RAISE NOTICE 'Created superadmin user profile: superadmin@stratix-platform.com';
    ELSE
        RAISE WARNING 'Superadmin user superadmin@stratix-platform.com not found in auth.users. Please run the create-users script first.';
    END IF;
END $$;

-- =============================================================================
-- 5. CREATE SAMPLE INITIATIVES
-- =============================================================================

DO $$
DECLARE
    stratix_tenant_id UUID;
    fema_tenant_id UUID;
    siga_tenant_id UUID;
    area_record RECORD;
    user_record RECORD;
BEGIN
    -- Get tenant IDs
    SELECT id INTO stratix_tenant_id FROM public.tenants WHERE subdomain = 'stratix-demo';
    SELECT id INTO fema_tenant_id FROM public.tenants WHERE subdomain = 'fema-electricidad';
    SELECT id INTO siga_tenant_id FROM public.tenants WHERE subdomain = 'siga-turismo';

    -- Sample initiatives for Stratix Platform
    FOR area_record IN SELECT id, name FROM public.areas WHERE tenant_id = stratix_tenant_id LIMIT 3 LOOP
        SELECT id INTO user_record FROM public.user_profiles WHERE tenant_id = stratix_tenant_id LIMIT 1;
        
        INSERT INTO public.initiatives (tenant_id, area_id, created_by, title, description, status, priority, progress, target_date, budget, created_at, updated_at) VALUES
            (stratix_tenant_id, area_record.id, user_record, 
             'Digital Transformation Initiative', 
             'Modernize core business processes with digital solutions', 
             'in_progress', 'high', 65, 
             (CURRENT_DATE + INTERVAL '6 months')::DATE, 250000.00, NOW(), NOW()),
            (stratix_tenant_id, area_record.id, user_record, 
             'Customer Experience Enhancement', 
             'Improve customer satisfaction through better service delivery', 
             'planning', 'medium', 25, 
             (CURRENT_DATE + INTERVAL '4 months')::DATE, 150000.00, NOW(), NOW());
    END LOOP;

    -- Sample initiatives for FEMA Electricidad
    FOR area_record IN SELECT id, name FROM public.areas WHERE tenant_id = fema_tenant_id LIMIT 3 LOOP
        SELECT id INTO user_record FROM public.user_profiles WHERE tenant_id = fema_tenant_id LIMIT 1;
        
        INSERT INTO public.initiatives (tenant_id, area_id, created_by, title, description, status, priority, progress, target_date, budget, created_at, updated_at) VALUES
            (fema_tenant_id, area_record.id, user_record, 
             'Expansión de Red Eléctrica', 
             'Ampliación de la infraestructura eléctrica en nuevas zonas', 
             'in_progress', 'high', 45, 
             (CURRENT_DATE + INTERVAL '8 months')::DATE, 500000.00, NOW(), NOW()),
            (fema_tenant_id, area_record.id, user_record, 
             'Modernización de Sistemas', 
             'Actualización de equipos y sistemas de control', 
             'planning', 'medium', 15, 
             (CURRENT_DATE + INTERVAL '5 months')::DATE, 300000.00, NOW(), NOW());
    END LOOP;

    -- Sample initiatives for SIGA Turismo
    FOR area_record IN SELECT id, name FROM public.areas WHERE tenant_id = siga_tenant_id LIMIT 3 LOOP
        SELECT id INTO user_record FROM public.user_profiles WHERE tenant_id = siga_tenant_id LIMIT 1;
        
        INSERT INTO public.initiatives (tenant_id, area_id, created_by, title, description, status, priority, progress, target_date, budget, created_at, updated_at) VALUES
            (siga_tenant_id, area_record.id, user_record, 
             'Promoción Turística Digital', 
             'Desarrollo de campaña digital para atraer turistas internacionales', 
             'in_progress', 'high', 70, 
             (CURRENT_DATE + INTERVAL '3 months')::DATE, 200000.00, NOW(), NOW()),
            (siga_tenant_id, area_record.id, user_record, 
             'Certificación de Calidad', 
             'Implementación de estándares de calidad en servicios turísticos', 
             'planning', 'medium', 30, 
             (CURRENT_DATE + INTERVAL '6 months')::DATE, 180000.00, NOW(), NOW());
    END LOOP;
END $$;

-- =============================================================================
-- 6. CREATE AUDIT LOG SAMPLE DATA
-- =============================================================================

DO $$
DECLARE
    tenant_record RECORD;
    user_record RECORD;
BEGIN
    -- Create sample audit entries for each tenant
    FOR tenant_record IN SELECT id FROM public.tenants LOOP
        FOR user_record IN SELECT id FROM public.user_profiles WHERE tenant_id = tenant_record.id LIMIT 2 LOOP
            INSERT INTO public.audit_log (tenant_id, user_id, action, resource_type, resource_id, new_values, ip_address, created_at) VALUES
                (tenant_record.id, user_record.id, 'CREATE', 'initiative', uuid_generate_v4(), 
                 '{"title": "Sample Initiative", "status": "planning"}'::jsonb, 
                 '192.168.1.100'::inet, NOW() - INTERVAL '1 day'),
                (tenant_record.id, user_record.id, 'UPDATE', 'initiative', uuid_generate_v4(), 
                 '{"progress": 50, "status": "in_progress"}'::jsonb, 
                 '192.168.1.100'::inet, NOW() - INTERVAL '2 hours');
        END LOOP;
    END LOOP;
END $$;

-- =============================================================================
-- 7. VERIFICATION QUERIES
-- =============================================================================

-- Verify setup
SELECT 
    'SETUP VERIFICATION' as status,
    (SELECT COUNT(*) FROM public.tenants) as tenants_created,
    (SELECT COUNT(*) FROM public.areas) as areas_created,
    (SELECT COUNT(*) FROM public.user_profiles) as user_profiles_created,
    (SELECT COUNT(*) FROM public.initiatives) as initiatives_created,
    (SELECT COUNT(*) FROM public.audit_log) as audit_entries_created;

-- Show tenant summary
SELECT 
    t.name as tenant_name,
    t.subdomain,
    t.industry,
    (t.settings->>'domain') as domain,
    COUNT(DISTINCT a.id) as areas_count,
    COUNT(DISTINCT up.id) as users_count,
    COUNT(DISTINCT i.id) as initiatives_count
FROM public.tenants t
LEFT JOIN public.areas a ON a.tenant_id = t.id
LEFT JOIN public.user_profiles up ON up.tenant_id = t.id
LEFT JOIN public.initiatives i ON i.tenant_id = t.id
GROUP BY t.id, t.name, t.subdomain, t.industry, t.settings
ORDER BY t.name;

-- Show domain mappings
SELECT 
    subdomain as tenant_id,
    name as company_name,
    (settings->>'domain') as domain,
    industry
FROM public.tenants
ORDER BY subdomain;

COMMIT;