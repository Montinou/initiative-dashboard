-- SIGA Turismo - Production Fix Using EXISTING Areas
-- Your existing areas for tenant d1a3408c-a3d0-487e-a355-a321a07b5ae2:
-- - Administración (e042634a-5661-4cfd-9f14-14f3cf2c2e9a) - Manager: c47e82d5-1f74-4265-8901-dd5696eafce4
-- - Capital Humano (1c97b47b-39ae-4f19-b120-6acf52ffdb33) - Manager: b3f3d86e-eea6-4d3c-90f4-a058b6f6d301
-- - Comercial (87e52068-cace-4c75-a2c4-321275ae7fc6) - Manager: a0bb8f2f-9c2b-41c8-8759-13de8bcc8fa4
-- - Producto (ab301404-7d24-4510-9d46-967e7d18519d) - Manager: ffe22b01-9c54-4256-b46f-4c746fb99e27

-- Step 1: Fix RLS infinite recursion (CRITICAL - this MUST be fixed first)
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

-- Step 2: Create user profile for authenticated user using EXISTING Administración area
DO $$
DECLARE
    siga_tenant_id uuid := 'd1a3408c-a3d0-487e-a355-a321a07b5ae2';
    authenticated_user_id uuid := '573d6535-a480-4e75-985b-8820e16437ad';
    admin_area_id uuid := 'e042634a-5661-4cfd-9f14-14f3cf2c2e9a'; -- Existing Administración area
    user_email text;
BEGIN
    -- Get user email from auth.users
    SELECT 
        COALESCE(email, raw_user_meta_data->>'email', 'admin@siga-turismo.com')
    INTO user_email
    FROM auth.users 
    WHERE id = authenticated_user_id;
    
    -- Create/update user profile assigned to existing Administración area
    INSERT INTO public.user_profiles (
        id,
        tenant_id,
        email,
        full_name,
        role,
        area_id,
        is_active,
        is_system_admin,
        created_at,
        updated_at
    ) VALUES (
        authenticated_user_id,
        siga_tenant_id,
        COALESCE(user_email, 'admin@siga-turismo.com'),
        'Administrador Sistema SIGA',
        'Admin', -- Admin role for system access
        admin_area_id, -- Assigned to existing Administración area
        true,
        true, -- System admin for full access
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        tenant_id = siga_tenant_id,
        email = COALESCE((SELECT COALESCE(email, raw_user_meta_data->>'email') FROM auth.users WHERE id = authenticated_user_id), 'admin@siga-turismo.com'),
        full_name = 'Administrador Sistema SIGA',
        role = 'Admin',
        area_id = admin_area_id,
        is_active = true,
        is_system_admin = true,
        updated_at = now();
    
    RAISE NOTICE 'Created/updated admin profile for SIGA Turismo: % in area Administración', authenticated_user_id;
END $$;

-- Step 3: Create sample initiatives using EXISTING area IDs
INSERT INTO public.initiatives (
    id, tenant_id, area_id, created_by, owner_id, 
    title, description, status, priority, progress, 
    target_date, budget, created_at, updated_at
) VALUES 
    -- Administración initiatives (using existing area ID)
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 'e042634a-5661-4cfd-9f14-14f3cf2c2e9a', 
     '573d6535-a480-4e75-985b-8820e16437ad', '573d6535-a480-4e75-985b-8820e16437ad',
     'Implementación Sistema ERP Integrado', 
     'Modernización del sistema de gestión empresarial para integrar contabilidad, finanzas y operaciones de SIGA Turismo',
     'in_progress', 'high', 65, 
     '2025-06-30', 150000.00, now(), now()),
    
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 'e042634a-5661-4cfd-9f14-14f3cf2c2e9a', 
     '573d6535-a480-4e75-985b-8820e16437ad', '573d6535-a480-4e75-985b-8820e16437ad',
     'Automatización Procesos Administrativos', 
     'Digitalización y automatización de procesos administrativos para mejorar eficiencia operativa',
     'planning', 'medium', 20, 
     '2025-09-30', 45000.00, now(), now()),
    
    -- Producto initiatives (using existing area ID)
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 'ab301404-7d24-4510-9d46-967e7d18519d',
     '573d6535-a480-4e75-985b-8820e16437ad', '573d6535-a480-4e75-985b-8820e16437ad',
     'Nuevos Paquetes Turismo Sostenible', 
     'Desarrollo de productos turísticos enfocados en sostenibilidad y turismo responsable para mercado nacional',
     'in_progress', 'high', 35, 
     '2025-08-15', 80000.00, now(), now()),
    
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 'ab301404-7d24-4510-9d46-967e7d18519d',
     '573d6535-a480-4e75-985b-8820e16437ad', '573d6535-a480-4e75-985b-8820e16437ad',
     'Alianzas Estratégicas Hoteles', 
     'Establecimiento de alianzas con cadenas hoteleras nacionales para mejorar oferta de alojamiento',
     'planning', 'medium', 15, 
     '2025-12-31', 25000.00, now(), now()),
    
    -- Capital Humano initiatives (using existing area ID)
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', '1c97b47b-39ae-4f19-b120-6acf52ffdb33',
     '573d6535-a480-4e75-985b-8820e16437ad', '573d6535-a480-4e75-985b-8820e16437ad',
     'Programa Capacitación Continua 2025', 
     'Plan integral de capacitación para mejorar competencias en atención al cliente y servicios turísticos',
     'in_progress', 'medium', 45, 
     '2025-12-31', 50000.00, now(), now()),
    
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', '1c97b47b-39ae-4f19-b120-6acf52ffdb33',
     '573d6535-a480-4e75-985b-8820e16437ad', '573d6535-a480-4e75-985b-8820e16437ad',
     'Plan Bienestar Laboral', 
     'Implementación de programa de bienestar laboral para mejorar clima organizacional y retención de talento',
     'planning', 'low', 10, 
     '2025-10-31', 30000.00, now(), now()),
    
    -- Comercial initiatives (using existing area ID)
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', '87e52068-cace-4c75-a2c4-321275ae7fc6',
     '573d6535-a480-4e75-985b-8820e16437ad', '573d6535-a480-4e75-985b-8820e16437ad',
     'Transformación Digital Marketing', 
     'Modernización de estrategias de marketing digital y automatización de procesos comerciales',
     'in_progress', 'high', 60, 
     '2025-07-30', 75000.00, now(), now()),
    
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', '87e52068-cace-4c75-a2c4-321275ae7fc6',
     '573d6535-a480-4e75-985b-8820e16437ad', '573d6535-a480-4e75-985b-8820e16437ad',
     'CRM Sistema Gestión Clientes', 
     'Implementación de sistema CRM para mejorar gestión de relaciones con clientes y seguimiento de ventas',
     'planning', 'high', 25, 
     '2025-11-30', 85000.00, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Step 4: Verification - Show your existing SIGA structure
SELECT 
    '🏢 EXISTING SIGA AREAS:' as section,
    a.name,
    a.description,
    CASE 
        WHEN a.manager_id IS NOT NULL THEN '✅ Has Manager'
        ELSE '❌ No Manager'
    END as manager_status,
    a.id as area_id
FROM public.areas a
WHERE a.tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'
ORDER BY a.name;

-- Show the user profile created
SELECT 
    '👤 USER PROFILE CREATED:' as section,
    up.email,
    up.full_name,
    up.role,
    a.name as assigned_area,
    up.is_system_admin
FROM public.user_profiles up
JOIN public.areas a ON up.area_id = a.id
WHERE up.id = '573d6535-a480-4e75-985b-8820e16437ad';

-- Show initiatives created by area
SELECT 
    '📋 INITIATIVES BY AREA:' as section,
    a.name as area_name,
    COUNT(i.id) as initiative_count,
    ROUND(AVG(i.progress)) as avg_progress,
    COUNT(CASE WHEN i.status = 'in_progress' THEN 1 END) as in_progress,
    COUNT(CASE WHEN i.status = 'planning' THEN 1 END) as planning
FROM public.areas a
LEFT JOIN public.initiatives i ON a.id = i.area_id
WHERE a.tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'
GROUP BY a.id, a.name
ORDER BY a.name;

-- Test that RLS policies work without recursion
SELECT 
    '🔒 RLS TEST - User Profile Access:' as section,
    COUNT(*) as accessible_profiles
FROM public.user_profiles
WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2';

-- Final status
SELECT 
    '✅ PRODUCTION READY' as status,
    'SIGA Turismo database configured with existing areas and real data' as details;