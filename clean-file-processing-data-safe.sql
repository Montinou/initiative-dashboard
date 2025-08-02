-- Safe Clean File Processing Data for SIGA Tenant
-- This script removes all data created by file uploads using a safer approach
-- Handles database triggers that require auth context

-- SIGA Tenant ID
DO $$
DECLARE
    siga_tenant_id UUID := 'd1a3408c-a3d0-487e-a355-a321a07b5ae2';
    deleted_subtasks INTEGER := 0;
    deleted_initiatives INTEGER := 0;
    deleted_progress INTEGER := 0;
    deleted_activities INTEGER := 0;
    deleted_audit INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting SAFE cleanup for SIGA tenant: %', siga_tenant_id;
    
    -- Step 1: Delete progress_history first (to avoid cascade issues)
    RAISE NOTICE 'Deleting progress history...';
    DELETE FROM public.progress_history 
    WHERE tenant_id = siga_tenant_id;
    
    GET DIAGNOSTICS deleted_progress = ROW_COUNT;
    RAISE NOTICE 'Deleted % progress history records', deleted_progress;
    
    -- Step 2: Delete subtasks (must be before initiatives due to FK)
    RAISE NOTICE 'Deleting subtasks...';
    DELETE FROM public.subtasks 
    WHERE tenant_id = siga_tenant_id;
    
    GET DIAGNOSTICS deleted_subtasks = ROW_COUNT;
    RAISE NOTICE 'Deleted % subtasks', deleted_subtasks;
    
    -- Step 3: Delete activities (if any exist)
    RAISE NOTICE 'Deleting activities...';
    DELETE FROM public.activities 
    WHERE tenant_id = siga_tenant_id;
    
    GET DIAGNOSTICS deleted_activities = ROW_COUNT;
    RAISE NOTICE 'Deleted % activities', deleted_activities;
    
    -- Step 4: Delete initiatives (main file processing data)
    -- Note: This may trigger progress_history creation, but we already cleaned it
    RAISE NOTICE 'Deleting initiatives...';
    DELETE FROM public.initiatives 
    WHERE tenant_id = siga_tenant_id;
    
    GET DIAGNOSTICS deleted_initiatives = ROW_COUNT;
    RAISE NOTICE 'Deleted % initiatives', deleted_initiatives;
    
    -- Step 5: Clean up any remaining progress history created by triggers
    RAISE NOTICE 'Cleaning up any remaining progress history...';
    DELETE FROM public.progress_history 
    WHERE tenant_id = siga_tenant_id;
    
    -- Step 6: Clean up audit log entries related to file processing
    RAISE NOTICE 'Deleting audit log entries...';
    DELETE FROM public.audit_log 
    WHERE tenant_id = siga_tenant_id 
    AND resource_type IN ('initiatives', 'subtasks', 'activities', 'progress_history');
    
    GET DIAGNOSTICS deleted_audit = ROW_COUNT;
    RAISE NOTICE 'Deleted % audit log entries', deleted_audit;
    
    RAISE NOTICE 'SAFE cleanup completed successfully!';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '- Initiatives deleted: %', deleted_initiatives;
    RAISE NOTICE '- Subtasks deleted: %', deleted_subtasks;
    RAISE NOTICE '- Progress history deleted: %', deleted_progress;
    RAISE NOTICE '- Activities deleted: %', deleted_activities;
    RAISE NOTICE '- Audit entries deleted: %', deleted_audit;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during cleanup: %', SQLERRM;
        RAISE NOTICE 'You may need to run this script with SUPERUSER privileges';
        RAISE NOTICE 'Or manually delete records in this order:';
        RAISE NOTICE '1. progress_history WHERE tenant_id = %', siga_tenant_id;
        RAISE NOTICE '2. subtasks WHERE tenant_id = %', siga_tenant_id;
        RAISE NOTICE '3. activities WHERE tenant_id = %', siga_tenant_id;
        RAISE NOTICE '4. initiatives WHERE tenant_id = %', siga_tenant_id;
        RAISE NOTICE '5. audit_log WHERE tenant_id = % AND resource_type IN (initiatives, subtasks, etc.)', siga_tenant_id;
        RAISE;
    
END $$;

-- Verify cleanup - check remaining data
SELECT 
    'POST-CLEANUP VERIFICATION' as status,
    NULL as table_name,
    NULL as remaining_count

UNION ALL

SELECT 
    'Data Check' as status,
    'initiatives' as table_name,
    COUNT(*)::text as remaining_count
FROM public.initiatives 
WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'

UNION ALL

SELECT 
    'Data Check' as status,
    'subtasks' as table_name,
    COUNT(*)::text as remaining_count
FROM public.subtasks 
WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'

UNION ALL

SELECT 
    'Data Check' as status,
    'progress_history' as table_name,
    COUNT(*)::text as remaining_count
FROM public.progress_history 
WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'

UNION ALL

SELECT 
    'Data Check' as status,
    'activities' as table_name,
    COUNT(*)::text as remaining_count
FROM public.activities 
WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'

ORDER BY 
    CASE 
        WHEN status = 'POST-CLEANUP VERIFICATION' THEN 0
        ELSE 1
    END,
    table_name;

-- Show areas are still intact
SELECT 
    'AREA VERIFICATION' as status,
    a.name as area_name,
    a.id::text as area_id,
    CASE WHEN up.full_name IS NOT NULL THEN '✅ Has Manager' ELSE '❌ No Manager' END as manager_status
FROM public.areas a
LEFT JOIN public.user_profiles up ON a.manager_id = up.id
WHERE a.tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'
ORDER BY a.name;

-- USAGE INSTRUCTIONS:
-- ===================
-- 1. Try running this script first (safer approach)
-- 2. If it fails, you may need superuser privileges
-- 3. Alternatively, run the individual DELETE statements manually in the order shown
-- 4. After cleanup, run verify-area-assignment.sql to confirm setup is correct
-- 5. The areas and managers should remain intact and ready for file processing

-- TROUBLESHOOTING:
-- ================
-- If you get auth.uid() errors:
-- 1. The progress_history table has a trigger that requires user context
-- 2. This script deletes progress_history FIRST to avoid the trigger
-- 3. If issues persist, you may need to temporarily disable the trigger:
--    ALTER TABLE progress_history DISABLE TRIGGER ALL;
--    -- Run cleanup
--    ALTER TABLE progress_history ENABLE TRIGGER ALL;