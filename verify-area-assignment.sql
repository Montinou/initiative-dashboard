-- Verify Area Assignment Process for SIGA
-- This script checks that areas are properly set up for file processing
-- Based on schema at @public/schema-public.sql

-- SIGA Tenant ID
DO $$
DECLARE
    siga_tenant_id UUID := 'd1a3408c-a3d0-487e-a355-a321a07b5ae2';
    area_count INTEGER := 0;
    manager_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== SIGA AREA ASSIGNMENT VERIFICATION ===';
    RAISE NOTICE 'Tenant ID: %', siga_tenant_id;
    RAISE NOTICE '';
    
    -- Check areas count
    SELECT COUNT(*) INTO area_count
    FROM public.areas 
    WHERE tenant_id = siga_tenant_id AND is_active = true;
    
    RAISE NOTICE 'Active areas found: %', area_count;
    
    -- Check managers count  
    SELECT COUNT(*) INTO manager_count
    FROM public.areas a
    JOIN public.user_profiles up ON a.manager_id = up.id
    WHERE a.tenant_id = siga_tenant_id 
    AND a.is_active = true 
    AND up.role = 'Manager';
    
    RAISE NOTICE 'Areas with managers: %', manager_count;
    RAISE NOTICE '';
    
    IF area_count = 4 AND manager_count = 4 THEN
        RAISE NOTICE '✅ AREA SETUP IS CORRECT!';
    ELSE
        RAISE NOTICE '❌ AREA SETUP NEEDS ATTENTION!';
        RAISE NOTICE 'Expected: 4 areas with 4 managers';
        RAISE NOTICE 'Found: % areas with % managers', area_count, manager_count;
    END IF;
    
END $$;

-- Detailed area information
SELECT 
    '=== AREA DETAILS ===' as section,
    NULL as id,
    NULL as name,
    NULL as description,
    NULL as manager_name,
    NULL as manager_email,
    NULL as expected_excel_tab

UNION ALL

SELECT 
    'Area Info' as section,
    a.id::text,
    a.name,
    a.description,
    COALESCE(up.full_name, 'NO MANAGER') as manager_name,
    COALESCE(up.email, 'NO EMAIL') as manager_email,
    CASE 
        WHEN a.name = 'Administración' THEN 'Administración'
        WHEN a.name = 'Producto' THEN 'Producto'  
        WHEN a.name = 'Capital Humano' THEN 'Capital Humano'
        WHEN a.name = 'Comercial' THEN 'Comercial'
        ELSE '⚠️ UNEXPECTED AREA'
    END as expected_excel_tab
FROM public.areas a
LEFT JOIN public.user_profiles up ON a.manager_id = up.id
WHERE a.tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'
ORDER BY 
    CASE 
        WHEN section = '=== AREA DETAILS ===' THEN 0
        ELSE 1
    END,
    a.name;

-- Test area matching simulation
SELECT 
    '=== EXCEL TAB MAPPING TEST ===' as section,
    NULL as excel_tab,
    NULL as matches_area,
    NULL as area_id,
    NULL as confidence

UNION ALL

SELECT 
    'Mapping Test' as section,
    tab_name as excel_tab,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.areas 
            WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' 
            AND name = tab_name
        ) THEN '✅ EXACT MATCH'
        ELSE '❌ NO MATCH'
    END as matches_area,
    (SELECT id FROM public.areas 
     WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' 
     AND name = tab_name
     LIMIT 1)::text as area_id,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.areas 
            WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' 
            AND name = tab_name
        ) THEN '100%'
        ELSE '0%'
    END as confidence
FROM (
    VALUES 
        ('Administración'),
        ('Producto'), 
        ('Capital Humano'),
        ('Comercial'),
        ('Test Invalid Tab')  -- This should not match
) AS tabs(tab_name)
ORDER BY 
    CASE 
        WHEN section = '=== EXCEL TAB MAPPING TEST ===' THEN 0
        ELSE 1
    END,
    excel_tab;

-- Final validation checklist
SELECT 
    '=== VALIDATION CHECKLIST ===' as check_item,
    NULL as status,
    NULL as details

UNION ALL

SELECT 
    'Total Areas' as check_item,
    CASE WHEN COUNT(*) = 4 THEN '✅ CORRECT' ELSE '❌ WRONG' END as status,
    COUNT(*)::text || ' areas found (expected: 4)' as details
FROM public.areas 
WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' AND is_active = true

UNION ALL

SELECT 
    'Area Names' as check_item,
    CASE 
        WHEN COUNT(*) = 4 AND 
             SUM(CASE WHEN name IN ('Administración', 'Producto', 'Capital Humano', 'Comercial') THEN 1 ELSE 0 END) = 4 
        THEN '✅ CORRECT' 
        ELSE '❌ WRONG' 
    END as status,
    'Required: Administración, Producto, Capital Humano, Comercial' as details
FROM public.areas 
WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' AND is_active = true

UNION ALL

SELECT 
    'Managers Assigned' as check_item,
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ CORRECT' 
        ELSE '❌ INCOMPLETE' 
    END as status,
    COUNT(*)::text || ' managers assigned (expected: 4)' as details
FROM public.areas a
JOIN public.user_profiles up ON a.manager_id = up.id
WHERE a.tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' 
AND a.is_active = true 
AND up.role = 'Manager'

ORDER BY 
    CASE 
        WHEN check_item = '=== VALIDATION CHECKLIST ===' THEN 0
        ELSE 1
    END,
    check_item;

-- INSTRUCTIONS:
-- =============
-- 1. Run this script after setting up areas and managers
-- 2. All checks should show ✅ CORRECT status
-- 3. Excel tab mapping test should show exact matches for all 4 SIGA areas
-- 4. If any checks fail, run the setup scripts first:
--    - node scripts/clean-siga-areas.js
--    - Run create-managers.sql (after creating auth users)
--    - Run fix-rls-policy.sql