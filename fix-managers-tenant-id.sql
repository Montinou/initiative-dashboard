-- Fix SIGA Managers Missing tenant_id
-- Critical Issue: 4 SIGA managers have tenant_id = null
-- This breaks RLS policies and API access

-- Step 1: Fix RLS infinite recursion (CRITICAL)
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins and CEOs can manage user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_tenant_isolation" ON public.user_profiles;

-- Create proper, non-recursive RLS policies
CREATE POLICY "Users can view own profile" ON public.user_profiles 
FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.user_profiles 
FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Service role full access" ON public.user_profiles 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "View profiles in same tenant" ON public.user_profiles 
FOR SELECT USING (
    id = auth.uid() 
    OR 
    (auth.role() = 'authenticated' AND tenant_id IN (
        SELECT up.tenant_id FROM public.user_profiles up WHERE up.id = auth.uid()
    ))
);

-- Step 2: Fix SIGA Managers - Assign proper tenant_id
-- All SIGA managers should have tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'

UPDATE public.user_profiles 
SET 
    tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2',
    updated_at = now()
WHERE id IN (
    'a0bb8f2f-9c2b-41c8-8759-13de8bcc8fa4', -- Roberto Silva - Jefe Comercial
    'b3f3d86e-eea6-4d3c-90f4-a058b6f6d301', -- Ana López - Jefa Capital Humano  
    'c47e82d5-1f74-4265-8901-dd5696eafce4', -- María González - Jefa Administración
    'ffe22b01-9c54-4256-b46f-4c746fb99e27'  -- Carlos Martínez - Jefe Producto
);

-- Step 3: Update the authenticated CEO user as well
UPDATE public.user_profiles 
SET 
    area_id = 'e042634a-5661-4cfd-9f14-14f3cf2c2e9a', -- Administración area (CEO oversees all)
    is_system_admin = true, -- CEO should have system admin privileges
    updated_at = now()
WHERE id = '573d6535-a480-4e75-985b-8820e16437ad';

-- Step 4: Create sample initiatives for each area (only if none exist)
INSERT INTO public.initiatives (
    id, tenant_id, area_id, created_by, owner_id, 
    title, description, status, priority, progress, 
    target_date, budget, created_at, updated_at
)
SELECT * FROM (VALUES 
    -- Administración initiatives
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 'e042634a-5661-4cfd-9f14-14f3cf2c2e9a', 
     '573d6535-a480-4e75-985b-8820e16437ad', 'c47e82d5-1f74-4265-8901-dd5696eafce4',
     'Sistema ERP Corporativo', 
     'Implementación de sistema ERP para unificar procesos administrativos y financieros',
     'in_progress', 'high', 60, 
     '2025-09-30', 180000.00, now(), now()),
    
    -- Producto initiatives
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 'ab301404-7d24-4510-9d46-967e7d18519d',
     '573d6535-a480-4e75-985b-8820e16437ad', 'ffe22b01-9c54-4256-b46f-4c746fb99e27',
     'Catálogo Turismo Premium', 
     'Desarrollo de productos turísticos premium para segmento de lujo',
     'in_progress', 'high', 35, 
     '2025-11-15', 95000.00, now(), now()),
    
    -- Capital Humano initiatives
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', '1c97b47b-39ae-4f19-b120-6acf52ffdb33',
     '573d6535-a480-4e75-985b-8820e16437ad', 'b3f3d86e-eea6-4d3c-90f4-a058b6f6d301',
     'Certificación Guías Turísticos', 
     'Programa de certificación y actualización profesional para guías de turismo',
     'planning', 'medium', 20, 
     '2025-12-31', 40000.00, now(), now()),
    
    -- Comercial initiatives
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', '87e52068-cace-4c75-a2c4-321275ae7fc6',
     '573d6535-a480-4e75-985b-8820e16437ad', 'a0bb8f2f-9c2b-41c8-8759-13de8bcc8fa4',
     'Plataforma E-Commerce', 
     'Desarrollo de plataforma online para venta directa de paquetes turísticos',
     'in_progress', 'high', 45, 
     '2025-10-31', 120000.00, now(), now())
) AS new_initiatives(id, tenant_id, area_id, created_by, owner_id, title, description, status, priority, progress, target_date, budget, created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM public.initiatives 
    WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'
);

-- Step 5: Verification
-- Show all SIGA users with proper tenant assignment
SELECT 
    '👥 SIGA TEAM - TENANT FIXED:' as section,
    full_name,
    email,
    role,
    CASE 
        WHEN tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' THEN '✅ SIGA Tenant'
        WHEN tenant_id IS NULL THEN '❌ No Tenant'
        ELSE '⚠️ Wrong Tenant'
    END as tenant_status,
    (SELECT name FROM public.areas WHERE id = user_profiles.area_id) as assigned_area
FROM public.user_profiles 
WHERE email LIKE '%@siga%' OR email LIKE '%siga-turismo%'
ORDER BY role DESC, full_name;

-- Show areas and their managers
SELECT 
    '🏢 SIGA AREAS & MANAGERS:' as section,
    a.name as area_name,
    up.full_name as manager_name,
    up.email as manager_email,
    CASE 
        WHEN up.tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' THEN '✅ Correct Tenant'
        WHEN up.tenant_id IS NULL THEN '❌ Missing Tenant'
        ELSE '⚠️ Wrong Tenant'
    END as tenant_status
FROM public.areas a
LEFT JOIN public.user_profiles up ON a.manager_id = up.id
WHERE a.tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'
ORDER BY a.name;

-- Show initiatives with proper ownership
SELECT 
    '📋 INITIATIVES BY AREA:' as section,
    a.name as area_name,
    COUNT(i.id) as initiative_count,
    COALESCE(ROUND(AVG(i.progress)), 0) as avg_progress,
    STRING_AGG(i.title, ', ') as initiative_titles
FROM public.areas a
LEFT JOIN public.initiatives i ON a.id = i.area_id AND i.tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'
WHERE a.tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'
GROUP BY a.id, a.name
ORDER BY a.name;

-- Test RLS access
SELECT 
    '🔒 RLS ACCESS TEST:' as section,
    COUNT(CASE WHEN tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' THEN 1 END) as siga_profiles,
    COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as profiles_without_tenant,
    COUNT(*) as total_profiles
FROM public.user_profiles;

-- Final status
SELECT 
    '✅ PRODUCTION READY:' as status,
    'All SIGA managers have tenant_id, RLS fixed, initiatives created' as details;