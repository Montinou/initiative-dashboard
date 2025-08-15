-- =====================================================
-- PRODUCTION DATABASE CLEANUP SCRIPT
-- =====================================================
-- Purpose: Remove all data not belonging to core areas:
--   - Producto
--   - Capital Humano
--   - Administración
--   - Comercial
-- 
-- WARNING: This script will DELETE production data!
-- Please backup your database before running.
-- =====================================================

-- Start transaction for safety
BEGIN;

-- =====================================================
-- STEP 1: Identify areas to keep and areas to delete
-- =====================================================

-- Create temporary table with areas to KEEP
CREATE TEMP TABLE areas_to_keep AS
SELECT DISTINCT a.id, a.name, a.tenant_id
FROM areas a
WHERE LOWER(TRIM(a.name)) IN (
    'producto',
    'capital humano',
    'administración',
    'administracion',  -- Alternative spelling without accent
    'comercial'
)
AND a.tenant_id IS NOT NULL;

-- Show areas that will be KEPT (for verification)
SELECT 'AREAS TO KEEP:' as action, COUNT(*) as count FROM areas_to_keep;
SELECT * FROM areas_to_keep ORDER BY name;

-- Create temporary table with areas to DELETE
CREATE TEMP TABLE areas_to_delete AS
SELECT a.id, a.name, a.tenant_id
FROM areas a
WHERE a.id NOT IN (SELECT id FROM areas_to_keep);

-- Show areas that will be DELETED (for verification)
SELECT 'AREAS TO DELETE:' as action, COUNT(*) as count FROM areas_to_delete;
SELECT * FROM areas_to_delete ORDER BY name;

-- =====================================================
-- STEP 2: Identify all related data to delete
-- =====================================================

-- Initiatives to delete (from deleted areas)
CREATE TEMP TABLE initiatives_to_delete AS
SELECT DISTINCT i.id, i.title, i.area_id
FROM initiatives i
WHERE i.area_id IN (SELECT id FROM areas_to_delete);

SELECT 'INITIATIVES TO DELETE:' as action, COUNT(*) as count FROM initiatives_to_delete;

-- Objectives to delete (from deleted areas)
CREATE TEMP TABLE objectives_to_delete AS
SELECT DISTINCT o.id, o.title, o.area_id
FROM objectives o
WHERE o.area_id IN (SELECT id FROM areas_to_delete);

SELECT 'OBJECTIVES TO DELETE:' as action, COUNT(*) as count FROM objectives_to_delete;

-- Activities to delete (from deleted initiatives)
CREATE TEMP TABLE activities_to_delete AS
SELECT DISTINCT a.id, a.title, a.initiative_id
FROM activities a
WHERE a.initiative_id IN (SELECT id FROM initiatives_to_delete);

SELECT 'ACTIVITIES TO DELETE:' as action, COUNT(*) as count FROM activities_to_delete;

-- =====================================================
-- STEP 3: Delete data in correct order (respecting FK constraints)
-- =====================================================

-- Delete webhook audit logs related to deleted entities
DELETE FROM webhook_audit_log
WHERE (
    (table_name = 'activities' AND record_id::uuid IN (SELECT id FROM activities_to_delete))
    OR (table_name = 'initiatives' AND record_id::uuid IN (SELECT id FROM initiatives_to_delete))
    OR (table_name = 'objectives' AND record_id::uuid IN (SELECT id FROM objectives_to_delete))
    OR (table_name = 'areas' AND record_id::uuid IN (SELECT id FROM areas_to_delete))
);

-- Delete audit log entries
DELETE FROM audit_log
WHERE (
    (table_name = 'activities' AND record_id IN (SELECT id FROM activities_to_delete))
    OR (table_name = 'initiatives' AND record_id IN (SELECT id FROM initiatives_to_delete))
    OR (table_name = 'objectives' AND record_id IN (SELECT id FROM objectives_to_delete))
    OR (table_name = 'areas' AND record_id IN (SELECT id FROM areas_to_delete))
);

-- Delete file associations
DELETE FROM file_areas
WHERE area_id IN (SELECT id FROM areas_to_delete);

DELETE FROM file_initiatives
WHERE initiative_id IN (SELECT id FROM initiatives_to_delete);

-- Delete OKR import job items
DELETE FROM okr_import_job_items
WHERE entity_id IN (
    SELECT id FROM activities_to_delete
    UNION SELECT id FROM initiatives_to_delete
    UNION SELECT id FROM objectives_to_delete
);

-- Delete progress history
DELETE FROM progress_history
WHERE initiative_id IN (SELECT id FROM initiatives_to_delete);

-- Delete activities
DELETE FROM activities
WHERE id IN (SELECT id FROM activities_to_delete);
SELECT 'DELETED ACTIVITIES:' as action, COUNT(*) as deleted_count FROM activities_to_delete;

-- Delete objective-initiative links
DELETE FROM objective_initiatives
WHERE initiative_id IN (SELECT id FROM initiatives_to_delete)
   OR objective_id IN (SELECT id FROM objectives_to_delete);

-- Delete objective-quarter links
DELETE FROM objective_quarters
WHERE objective_id IN (SELECT id FROM objectives_to_delete);

-- Delete initiatives
DELETE FROM initiatives
WHERE id IN (SELECT id FROM initiatives_to_delete);
SELECT 'DELETED INITIATIVES:' as action, COUNT(*) as deleted_count FROM initiatives_to_delete;

-- Delete objectives
DELETE FROM objectives
WHERE id IN (SELECT id FROM objectives_to_delete);
SELECT 'DELETED OBJECTIVES:' as action, COUNT(*) as deleted_count FROM objectives_to_delete;

-- Update user profiles to remove area assignments for deleted areas
UPDATE user_profiles
SET area_id = NULL
WHERE area_id IN (SELECT id FROM areas_to_delete);
SELECT 'UPDATED USER PROFILES:' as action, COUNT(*) as updated_count 
FROM user_profiles 
WHERE area_id IN (SELECT id FROM areas_to_delete);

-- Delete invitations for deleted areas
DELETE FROM invitations
WHERE area_id IN (SELECT id FROM areas_to_delete);

-- Delete OKR import jobs for deleted areas
DELETE FROM okr_import_jobs
WHERE area_id IN (SELECT id FROM areas_to_delete);

-- Finally, delete the areas themselves
DELETE FROM areas
WHERE id IN (SELECT id FROM areas_to_delete);
SELECT 'DELETED AREAS:' as action, COUNT(*) as deleted_count FROM areas_to_delete;

-- =====================================================
-- STEP 4: Verification queries
-- =====================================================

-- Show remaining areas (should only be the 4 core areas)
SELECT 'REMAINING AREAS AFTER CLEANUP:' as status;
SELECT id, name, tenant_id, is_active
FROM areas
ORDER BY name;

-- Show count of remaining data
SELECT 'DATA SUMMARY AFTER CLEANUP:' as status;
SELECT 
    (SELECT COUNT(*) FROM areas) as total_areas,
    (SELECT COUNT(*) FROM objectives) as total_objectives,
    (SELECT COUNT(*) FROM initiatives) as total_initiatives,
    (SELECT COUNT(*) FROM activities) as total_activities;

-- Show initiatives by area
SELECT 'INITIATIVES BY REMAINING AREAS:' as status;
SELECT 
    a.name as area_name,
    COUNT(i.id) as initiative_count
FROM areas a
LEFT JOIN initiatives i ON i.area_id = a.id
GROUP BY a.id, a.name
ORDER BY a.name;

-- =====================================================
-- STEP 5: Clean temporary tables
-- =====================================================

DROP TABLE IF EXISTS areas_to_keep;
DROP TABLE IF EXISTS areas_to_delete;
DROP TABLE IF EXISTS initiatives_to_delete;
DROP TABLE IF EXISTS objectives_to_delete;
DROP TABLE IF EXISTS activities_to_delete;

-- =====================================================
-- FINAL STEP: Commit or Rollback
-- =====================================================

-- IMPORTANT: Review the output above before committing!
-- If everything looks correct, uncomment the COMMIT line.
-- If something looks wrong, uncomment the ROLLBACK line.

-- COMMIT;  -- Uncomment to apply changes
-- ROLLBACK;  -- Uncomment to cancel changes

-- =====================================================
-- END OF CLEANUP SCRIPT
-- =====================================================

/*
USAGE INSTRUCTIONS:
==================

1. BACKUP YOUR DATABASE FIRST!
   pg_dump -h your-host -U your-user -d your-database > backup_before_cleanup.sql

2. Connect to your production database:
   psql -h your-host -U your-user -d your-database

3. Run this script:
   \i cleanup-non-core-areas.sql

4. Review the output carefully:
   - Check the areas being kept vs deleted
   - Review the counts of data being deleted
   - Verify the remaining areas are correct

5. If everything looks good, run:
   COMMIT;
   
   If something looks wrong, run:
   ROLLBACK;

6. After commit, verify the data:
   SELECT * FROM areas ORDER BY name;
   SELECT COUNT(*) FROM initiatives;
   SELECT COUNT(*) FROM objectives;
   SELECT COUNT(*) FROM activities;

ALTERNATIVE: Run with auto-commit (USE WITH EXTREME CAUTION):
=============================================================

To run with auto-commit, replace the BEGIN at the start with:
-- BEGIN;

And uncomment the COMMIT at the end.

Then run:
psql -h your-host -U your-user -d your-database -f cleanup-non-core-areas.sql

*/