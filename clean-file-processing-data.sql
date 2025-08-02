-- Clean File Processing Data for SIGA Tenant
-- This script removes all data created by file uploads to allow fresh testing
-- Based on schema at @public/schema-public.sql

-- SIGA Tenant ID
-- Replace with actual tenant ID if different
DO $$
DECLARE
    siga_tenant_id UUID := 'd1a3408c-a3d0-487e-a355-a321a07b5ae2';
    deleted_subtasks INTEGER := 0;
    deleted_initiatives INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting cleanup for SIGA tenant: %', siga_tenant_id;
    
    -- Step 0: Temporarily disable triggers to avoid auth.uid() issues during cleanup
    SET session_replication_role = replica;
    
    -- Step 1: Delete subtasks (must be first due to foreign key constraints)
    RAISE NOTICE 'Deleting subtasks...';
    DELETE FROM public.subtasks 
    WHERE tenant_id = siga_tenant_id;
    
    GET DIAGNOSTICS deleted_subtasks = ROW_COUNT;
    RAISE NOTICE 'Deleted % subtasks', deleted_subtasks;
    
    -- Step 2: Delete initiatives (main data from file processing)
    RAISE NOTICE 'Deleting initiatives...';
    DELETE FROM public.initiatives 
    WHERE tenant_id = siga_tenant_id;
    
    GET DIAGNOSTICS deleted_initiatives = ROW_COUNT;
    RAISE NOTICE 'Deleted % initiatives', deleted_initiatives;
    
    -- Step 3: Clean up any progress history (if exists)
    RAISE NOTICE 'Deleting progress history...';
    DELETE FROM public.progress_history 
    WHERE tenant_id = siga_tenant_id;
    
    -- Step 4: Clean up any activities (if exists)
    RAISE NOTICE 'Deleting activities...';
    DELETE FROM public.activities 
    WHERE tenant_id = siga_tenant_id;
    
    -- Step 5: Clean up audit log entries related to file processing
    RAISE NOTICE 'Deleting audit log entries...';
    DELETE FROM public.audit_log 
    WHERE tenant_id = siga_tenant_id 
    AND resource_type IN ('initiatives', 'subtasks', 'activities');
    
    -- Step 6: Re-enable triggers
    SET session_replication_role = DEFAULT;
    
    RAISE NOTICE 'Cleanup completed successfully!';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '- Initiatives deleted: %', deleted_initiatives;
    RAISE NOTICE '- Subtasks deleted: %', deleted_subtasks;
    
END $$;

-- Verify cleanup - check remaining data
SELECT 
    'initiatives' as table_name,
    COUNT(*) as remaining_count
FROM public.initiatives 
WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'

UNION ALL

SELECT 
    'subtasks' as table_name,
    COUNT(*) as remaining_count
FROM public.subtasks 
WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'

UNION ALL

SELECT 
    'progress_history' as table_name,
    COUNT(*) as remaining_count
FROM public.progress_history 
WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'

UNION ALL

SELECT 
    'activities' as table_name,
    COUNT(*) as remaining_count
FROM public.activities 
WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2';

-- Show current areas to verify they're still intact
SELECT 
    'areas' as table_name,
    id,
    name,
    description,
    manager_id IS NOT NULL as has_manager
FROM public.areas 
WHERE tenant_id = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'
ORDER BY name;

-- IMPORTANT NOTES:
-- =================
-- 
-- Tables cleaned by file processing:
-- 1. initiatives - Main data from Excel files
-- 2. subtasks - Created from "resultado" column in Excel
-- 3. progress_history - Any progress updates (if applicable)
-- 4. activities - Any activities created (if applicable) 
-- 5. audit_log - Cleanup related audit entries
--
-- Tables NOT touched:
-- - areas (preserved - needed for area assignment)
-- - user_profiles (preserved - needed for managers)
-- - tenants (preserved - needed for tenant context)
--
-- After running this script:
-- 1. All file-uploaded data will be removed
-- 2. Areas and managers will remain intact
-- 3. You can test file upload process fresh
-- 4. Excel tabs should map correctly to area IDs