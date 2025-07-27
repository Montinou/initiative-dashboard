-- Simplified approach: Create user profiles without auth.users
-- This approach creates user profiles that can be linked to users created via Supabase Dashboard

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
-- 3. CREATE USER PROFILES WITH PLACEHOLDER IDs
-- =============================================================================
-- NOTE: You'll need to update these with actual auth.users UUIDs after creating users in Supabase Dashboard

DO $$
DECLARE
    stratix_tenant_id UUID;
    fema_tenant_id UUID;
    siga_tenant_id UUID;
BEGIN
    -- Get tenant IDs
    SELECT id INTO stratix_tenant_id FROM public.tenants WHERE subdomain = 'stratix-demo';
    SELECT id INTO fema_tenant_id FROM public.tenants WHERE subdomain = 'fema-electricidad';
    SELECT id INTO siga_tenant_id FROM public.tenants WHERE subdomain = 'siga-turismo';

    -- Create user profiles with placeholder UUIDs
    -- IMPORTANT: Replace these UUIDs with actual auth.users IDs after creating users in Supabase Dashboard
    
    -- Stratix Platform users
    INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) VALUES
        ('11111111-1111-1111-1111-111111111111'::uuid, stratix_tenant_id, 'admin@stratix-platform.com', 'Admin Stratix', 'CEO', 'Technology', true, NOW(), NOW()),
        ('22222222-2222-2222-2222-222222222222'::uuid, stratix_tenant_id, 'manager@stratix-platform.com', 'Manager Stratix', 'Manager', 'Sales', true, NOW(), NOW()),
        ('33333333-3333-3333-3333-333333333333'::uuid, stratix_tenant_id, 'analyst@stratix-platform.com', 'Analyst Stratix', 'Analyst', 'Operations', true, NOW(), NOW())
    ON CONFLICT (tenant_id, email) DO UPDATE SET 
        id = EXCLUDED.id,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        area = EXCLUDED.area,
        updated_at = NOW();

    -- FEMA Electricidad users
    INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) VALUES
        ('44444444-4444-4444-4444-444444444444'::uuid, fema_tenant_id, 'admin@fema-electricidad.com', 'Admin FEMA', 'CEO', 'Administración', true, NOW(), NOW()),
        ('55555555-5555-5555-5555-555555555555'::uuid, fema_tenant_id, 'manager@fema-electricidad.com', 'Gerente División Industrial', 'Manager', 'División Industria', true, NOW(), NOW()),
        ('66666666-6666-6666-6666-666666666666'::uuid, fema_tenant_id, 'analyst@fema-electricidad.com', 'Analista Comercial', 'Analyst', 'E-commerce', true, NOW(), NOW())
    ON CONFLICT (tenant_id, email) DO UPDATE SET 
        id = EXCLUDED.id,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        area = EXCLUDED.area,
        updated_at = NOW();

    -- SIGA Turismo users
    INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) VALUES
        ('77777777-7777-7777-7777-777777777777'::uuid, siga_tenant_id, 'admin@siga-turismo.com', 'Admin SIGA', 'CEO', 'Administración', true, NOW(), NOW()),
        ('88888888-8888-8888-8888-888888888888'::uuid, siga_tenant_id, 'manager@siga-turismo.com', 'Director de Desarrollo', 'Manager', 'Desarrollo Turístico', true, NOW(), NOW()),
        ('99999999-9999-9999-9999-999999999999'::uuid, siga_tenant_id, 'analyst@siga-turismo.com', 'Analista de Marketing', 'Analyst', 'Marketing y Promoción', true, NOW(), NOW())
    ON CONFLICT (tenant_id, email) DO UPDATE SET 
        id = EXCLUDED.id,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        area = EXCLUDED.area,
        updated_at = NOW();

    -- Superadmin user
    INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area, is_active, created_at, updated_at) VALUES
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, NULL, 'superadmin@stratix-platform.com', 'Platform Superadmin', 'superadmin', NULL, true, NOW(), NOW())
    ON CONFLICT (tenant_id, email) DO UPDATE SET 
        id = EXCLUDED.id,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        updated_at = NOW();
END $$;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify setup
SELECT 
    'SETUP VERIFICATION' as status,
    (SELECT COUNT(*) FROM public.tenants) as tenants_created,
    (SELECT COUNT(*) FROM public.areas) as areas_created,
    (SELECT COUNT(*) FROM public.user_profiles) as user_profiles_created;

-- Show user profiles with placeholder IDs
SELECT 
    email,
    full_name,
    role,
    area,
    id as placeholder_uuid,
    'REPLACE WITH ACTUAL AUTH.USERS ID' as note
FROM public.user_profiles 
ORDER BY email;

COMMIT;
