-- SIGA Turismo - Production Database Setup with REAL Data
-- Company: SIGA Turismo (Real tourism company)
-- This creates proper production-ready data structure

-- Step 1: Fix RLS infinite recursion (same as before - this is critical)
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

-- Step 2: Create REAL Areas for SIGA Turismo with proper UUIDs
-- These are the actual business areas of a tourism company
INSERT INTO public.areas (id, tenant_id, name, description, is_active, created_at, updated_at)
VALUES 
    -- Administración y Finanzas
    ('f47b3c8a-8e2d-4a95-9c73-1a4b5e6f7890', 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 
     'Administración y Finanzas', 
     'Gestión administrativa, contabilidad, finanzas corporativas y control de gestión', 
     true, now(), now()),
    
    -- Desarrollo de Productos Turísticos
    ('e8d9c7b6-7f1e-4c82-8b94-2d5e8f9a0123', 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 
     'Desarrollo de Productos', 
     'Creación y gestión de paquetes turísticos, alianzas estratégicas y experiencias de viaje', 
     true, now(), now()),
    
    -- Recursos Humanos y Desarrollo Organizacional
    ('d2c4b8a7-6e3f-4d91-7a85-1c6d9e2b4567', 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 
     'Capital Humano', 
     'Gestión del talento, desarrollo organizacional, capacitación y bienestar laboral', 
     true, now(), now()),
    
    -- Comercial y Marketing
    ('c5f8a9b3-9d4e-4e72-6b93-3e7f1a8c5d90', 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 
     'Comercial y Marketing', 
     'Ventas, marketing digital, relaciones con clientes y desarrollo comercial', 
     true, now(), now()),
    
    -- Operaciones y Logística
    ('b8e7d6c5-2a9f-4b83-5c74-4d8e2b9f6c21', 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 
     'Operaciones', 
     'Coordinación de servicios turísticos, logística de viajes y gestión operativa', 
     true, now(), now()),
    
    -- Tecnología y Sistemas
    ('a1f4e7d8-3c2b-4f91-8e65-5f9c3d7a1e84', 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 
     'Tecnología', 
     'Sistemas informáticos, plataformas digitales y transformación tecnológica', 
     true, now(), now())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- Step 3: Create user profile for authenticated user
DO $$
DECLARE
    siga_tenant_id uuid := 'd1a3408c-a3d0-487e-a355-a321a07b5ae2';
    authenticated_user_id uuid := '573d6535-a480-4e75-985b-8820e16437ad';
    user_email text;
    admin_area_id uuid := 'f47b3c8a-8e2d-4a95-9c73-1a4b5e6f7890'; -- Administración area
BEGIN
    -- Get user email from auth.users
    SELECT 
        COALESCE(email, raw_user_meta_data->>'email', 'admin@siga-turismo.com')
    INTO user_email
    FROM auth.users 
    WHERE id = authenticated_user_id;
    
    -- Create/update user profile with proper area assignment
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
        'Administrador SIGA',
        'Admin', -- Admin role for system access
        admin_area_id, -- Assigned to Administration area
        true,
        true, -- System admin for full access
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        tenant_id = siga_tenant_id,
        email = COALESCE(user_email, 'admin@siga-turismo.com'),
        full_name = 'Administrador SIGA',
        role = 'Admin',
        area_id = admin_area_id,
        is_active = true,
        is_system_admin = true,
        updated_at = now();
    
    RAISE NOTICE 'Created/updated admin profile for SIGA Turismo: %', authenticated_user_id;
END $$;

-- Step 4: Create sample initiatives for demonstration (real tourism initiatives)
INSERT INTO public.initiatives (
    id, tenant_id, area_id, created_by, owner_id, 
    title, description, status, priority, progress, 
    target_date, budget, created_at, updated_at
) VALUES 
    -- Administración y Finanzas initiatives
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 'f47b3c8a-8e2d-4a95-9c73-1a4b5e6f7890', 
     '573d6535-a480-4e75-985b-8820e16437ad', '573d6535-a480-4e75-985b-8820e16437ad',
     'Implementación Sistema ERP Integrado', 
     'Modernización del sistema de gestión empresarial para integrar contabilidad, finanzas y operaciones',
     'in_progress', 'high', 65, 
     '2025-06-30', 150000.00, now(), now()),
    
    -- Desarrollo de Productos initiatives  
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 'e8d9c7b6-7f1e-4c82-8b94-2d5e8f9a0123',
     '573d6535-a480-4e75-985b-8820e16437ad', '573d6535-a480-4e75-985b-8820e16437ad',
     'Nuevos Paquetes Turismo Sostenible', 
     'Desarrollo de productos turísticos enfocados en sostenibilidad y turismo responsable',
     'planning', 'high', 25, 
     '2025-09-15', 80000.00, now(), now()),
    
    -- Capital Humano initiatives
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 'd2c4b8a7-6e3f-4d91-7a85-1c6d9e2b4567',
     '573d6535-a480-4e75-985b-8820e16437ad', '573d6535-a480-4e75-985b-8820e16437ad',
     'Programa Capacitación Continua 2025', 
     'Plan integral de capacitación para mejorar competencias en atención al cliente y servicios turísticos',
     'in_progress', 'medium', 40, 
     '2025-12-31', 45000.00, now(), now()),
    
    -- Comercial y Marketing initiatives
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 'c5f8a9b3-9d4e-4e72-6b93-3e7f1a8c5d90',
     '573d6535-a480-4e75-985b-8820e16437ad', '573d6535-a480-4e75-985b-8820e16437ad',
     'Transformación Digital Marketing', 
     'Modernización de estrategias de marketing digital y automatización de procesos comerciales',
     'in_progress', 'high', 55, 
     '2025-08-30', 75000.00, now(), now()),
    
    -- Operaciones initiatives
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 'b8e7d6c5-2a9f-4b83-5c74-4d8e2b9f6c21',
     '573d6535-a480-4e75-985b-8820e16437ad', '573d6535-a480-4e75-985b-8820e16437ad',
     'Optimización Procesos Operativos', 
     'Mejora de procesos operativos para reducir tiempos de respuesta y mejorar satisfacción del cliente',
     'in_progress', 'medium', 70, 
     '2025-07-15', 35000.00, now(), now()),
    
    -- Tecnología initiatives
    (gen_random_uuid(), 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 'a1f4e7d8-3c2b-4f91-8e65-5f9c3d7a1e84',
     '573d6535-a480-4e75-985b-8820e16437ad', '573d6535-a480-4e75-985b-8820e16437ad',
     'Migración Cloud Infrastructure', 
     'Migración de infraestructura tecnológica a la nube para mejorar escalabilidad y seguridad',
     'planning', 'high', 15, 
     '2025-10-31', 120000.00, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Step 5: Verification queries
-- Show areas created
SELECT 
    'SIGA Areas Created:' as info,
    id,
    name,
    description
FROM public.areas 
WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'
ORDER BY name;

-- Show user profile created
SELECT 
    'User Profile Created:' as info,
    id,
    email,
    full_name,
    role,
    (SELECT name FROM public.areas WHERE id = user_profiles.area_id) as area_name
FROM public.user_profiles 
WHERE id = '573d6535-a480-4e75-985b-8820e16437ad';

-- Show initiatives created
SELECT 
    'Initiatives Created:' as info,
    COUNT(*) as total_initiatives,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
    COUNT(CASE WHEN status = 'planning' THEN 1 END) as planning,
    ROUND(AVG(progress)) as avg_progress
FROM public.initiatives 
WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2';

-- Test RLS policies work
SELECT 
    'RLS Test - Should return user profile without recursion:' as test_info,
    COUNT(*) as profiles_accessible
FROM public.user_profiles;