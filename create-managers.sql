-- Create 4 managers for SIGA areas (based on OKRFull.xlsx tabs)
-- Based on schema at @public/schema-public.sql and @public/schema-auth.sql
-- Areas: Administración, Producto, Capital Humano, Comercial

-- This script creates users in auth.users first, then creates corresponding user_profiles

DO $$
DECLARE
    siga_tenant_id UUID := 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'; -- SIGA tenant ID
    admin_area_id UUID;
    producto_area_id UUID;
    capital_humano_area_id UUID;
    comercial_area_id UUID;
    
    -- Manager UUIDs - these will be generated randomly
    admin_manager_id UUID := gen_random_uuid();
    producto_manager_id UUID := gen_random_uuid();
    rrhh_manager_id UUID := gen_random_uuid();
    comercial_manager_id UUID := gen_random_uuid();
BEGIN
    -- Get area IDs for SIGA tenant (based on clean-siga-areas.js)
    SELECT id INTO admin_area_id FROM public.areas WHERE tenant_id = siga_tenant_id AND name = 'Administración';
    SELECT id INTO producto_area_id FROM public.areas WHERE tenant_id = siga_tenant_id AND name = 'Producto';
    SELECT id INTO capital_humano_area_id FROM public.areas WHERE tenant_id = siga_tenant_id AND name = 'Capital Humano';
    SELECT id INTO comercial_area_id FROM public.areas WHERE tenant_id = siga_tenant_id AND name = 'Comercial';

    -- Step 1: Create auth.users entries for managers
    RAISE NOTICE 'Creating auth.users entries for managers...';
    
    -- Admin Manager
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role
    ) VALUES (
        admin_manager_id,
        'manager.admin@siga-turismo.com',
        crypt('SigaManager2024!', gen_salt('bf')), -- You should change this password
        now(),
        now(),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "María González - Jefa Administración"}',
        'authenticated',
        'authenticated'
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = now(),
        raw_user_meta_data = EXCLUDED.raw_user_meta_data;

    -- Producto Manager  
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role
    ) VALUES (
        producto_manager_id,
        'manager.producto@siga-turismo.com',
        crypt('SigaManager2024!', gen_salt('bf')), -- You should change this password
        now(),
        now(),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Carlos Martínez - Jefe Producto"}',
        'authenticated',
        'authenticated'
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = now(),
        raw_user_meta_data = EXCLUDED.raw_user_meta_data;

    -- Capital Humano Manager
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role
    ) VALUES (
        rrhh_manager_id,
        'manager.rrhh@siga-turismo.com',
        crypt('SigaManager2024!', gen_salt('bf')), -- You should change this password
        now(),
        now(),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Ana López - Jefa Capital Humano"}',
        'authenticated',
        'authenticated'
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = now(),
        raw_user_meta_data = EXCLUDED.raw_user_meta_data;

    -- Comercial Manager
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role
    ) VALUES (
        comercial_manager_id,
        'manager.comercial@siga-turismo.com',
        crypt('SigaManager2024!', gen_salt('bf')), -- You should change this password
        now(),
        now(),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Roberto Silva - Jefe Comercial"}',
        'authenticated',
        'authenticated'
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = now(),
        raw_user_meta_data = EXCLUDED.raw_user_meta_data;

    -- Step 2: Create corresponding identities in auth.identities
    RAISE NOTICE 'Creating auth.identities entries...';
    
    -- Delete existing identities for these users first to avoid conflicts
    DELETE FROM auth.identities WHERE user_id IN (admin_manager_id, producto_manager_id, rrhh_manager_id, comercial_manager_id);
    
    INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at) VALUES
    (gen_random_uuid(), admin_manager_id, admin_manager_id::text, 'email', ('{"sub": "' || admin_manager_id || '", "email": "manager.admin@siga-turismo.com", "email_verified": true}')::jsonb, now(), now()),
    (gen_random_uuid(), producto_manager_id, producto_manager_id::text, 'email', ('{"sub": "' || producto_manager_id || '", "email": "manager.producto@siga-turismo.com", "email_verified": true}')::jsonb, now(), now()),
    (gen_random_uuid(), rrhh_manager_id, rrhh_manager_id::text, 'email', ('{"sub": "' || rrhh_manager_id || '", "email": "manager.rrhh@siga-turismo.com", "email_verified": true}')::jsonb, now(), now()),
    (gen_random_uuid(), comercial_manager_id, comercial_manager_id::text, 'email', ('{"sub": "' || comercial_manager_id || '", "email": "manager.comercial@siga-turismo.com", "email_verified": true}')::jsonb, now(), now());

    -- Step 3: Create public.user_profiles entries that reference auth.users
    RAISE NOTICE 'Creating user_profiles entries...';
    
    -- Manager for Administración
    INSERT INTO public.user_profiles (
        id,
        tenant_id,
        email,
        full_name,
        role,
        area_id,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        admin_manager_id,
        siga_tenant_id,
        'manager.admin@siga-turismo.com',
        'María González - Jefa Administración',
        'Manager'::user_role,
        admin_area_id,
        true,
        now(),
        now()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        area_id = EXCLUDED.area_id,
        updated_at = now();

    -- Manager for Producto
    INSERT INTO public.user_profiles (
        id,
        tenant_id,
        email,
        full_name,
        role,
        area_id,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        producto_manager_id,
        siga_tenant_id,
        'manager.producto@siga-turismo.com',
        'Carlos Martínez - Jefe Producto',
        'Manager'::user_role,
        producto_area_id,
        true,
        now(),
        now()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        area_id = EXCLUDED.area_id,
        updated_at = now();

    -- Manager for Capital Humano
    INSERT INTO public.user_profiles (
        id,
        tenant_id,
        email,
        full_name,
        role,
        area_id,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        rrhh_manager_id,
        siga_tenant_id,
        'manager.rrhh@siga-turismo.com',
        'Ana López - Jefa Capital Humano',
        'Manager'::user_role,
        capital_humano_area_id,
        true,
        now(),
        now()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        area_id = EXCLUDED.area_id,
        updated_at = now();

    -- Manager for Comercial
    INSERT INTO public.user_profiles (
        id,
        tenant_id,
        email,
        full_name,
        role,
        area_id,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        comercial_manager_id,
        siga_tenant_id,
        'manager.comercial@siga-turismo.com',
        'Roberto Silva - Jefe Comercial',
        'Manager'::user_role,
        comercial_area_id,
        true,
        now(),
        now()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        area_id = EXCLUDED.area_id,
        updated_at = now();

    -- Step 4: Update areas to assign these managers as area managers
    RAISE NOTICE 'Assigning managers to areas...';
    
    UPDATE public.areas 
    SET manager_id = admin_manager_id, updated_at = now()
    WHERE id = admin_area_id;
    
    UPDATE public.areas 
    SET manager_id = producto_manager_id, updated_at = now()
    WHERE id = producto_area_id;
    
    UPDATE public.areas 
    SET manager_id = rrhh_manager_id, updated_at = now()
    WHERE id = capital_humano_area_id;
    
    UPDATE public.areas 
    SET manager_id = comercial_manager_id, updated_at = now()
    WHERE id = comercial_area_id;

    RAISE NOTICE 'Managers creation completed successfully!';
    
END $$;

-- Verify the managers were created in auth.users
SELECT 
    'auth.users' as table_name,
    email,
    created_at,
    email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users 
WHERE email LIKE '%@siga-turismo.com' AND email LIKE 'manager%'
ORDER BY email;

-- Verify the managers were created in user_profiles
SELECT 
    'user_profiles' as table_name,
    up.full_name,
    up.email,
    up.role,
    a.name as area_name,
    'Assigned to area' as relationship_type
FROM public.user_profiles up
JOIN public.areas a ON up.area_id = a.id
WHERE up.role = 'Manager' AND up.tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'
ORDER BY up.email;

-- Verify area managers were assigned correctly
SELECT 
    'areas_with_managers' as table_name,
    a.name as area_name,
    up.full_name as manager_name,
    up.email as manager_email,
    'Managing area' as relationship_type
FROM public.areas a
JOIN public.user_profiles up ON a.manager_id = up.id
WHERE a.tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' AND a.manager_id IS NOT NULL
ORDER BY a.name;

-- USAGE INSTRUCTIONS:
-- ===================
-- 1. First run the clean-siga-areas.js script to ensure the correct 4 areas exist:
--    node scripts/clean-siga-areas.js
--
-- 2. Run this SQL script directly in Supabase SQL Editor:
--    - This creates auth.users, auth.identities, and user_profiles all in one go
--    - No need to create users manually through Auth UI
--
-- 3. Default password for all managers: "SigaManager2024!" 
--    - You should change these passwords after creation
--    - Users can reset their passwords via the login interface
--
-- 4. Manager accounts created:
--    - manager.admin@siga-turismo.com (Administración - María González)
--    - manager.producto@siga-turismo.com (Producto - Carlos Martínez)  
--    - manager.rrhh@siga-turismo.com (Capital Humano - Ana López)
--    - manager.comercial@siga-turismo.com (Comercial - Roberto Silva)
--
-- 5. Each manager is:
--    - Created in auth.users with proper authentication setup
--    - Assigned to their specific area via user_profiles.area_id
--    - Set as the manager of their area via areas.manager_id
--    - Given the 'Manager' role which allows area-specific permissions
--
-- Areas correspond to Excel tabs in OKRFull.xlsx:
-- - Administración, Producto, Capital Humano, Comercial
--
-- The managers can now log in and will have access to manage initiatives 
-- in their respective areas while CEOs and Admins maintain global access.