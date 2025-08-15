-- =====================================================
-- RECREATE CORPORATIVO AREA AND ASSIGN SIGA CEOs/ADMINS
-- =====================================================
-- Purpose: 
--   1. Create "Corporativo" area for SIGA tenant
--   2. Assign all CEO and Admin users from SIGA to this area
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Get SIGA tenant ID
-- =====================================================

-- Find SIGA tenant (might be by subdomain or organization name)
WITH siga_tenant AS (
    SELECT t.id, t.subdomain, o.name as org_name
    FROM tenants t
    JOIN organizations o ON t.organization_id = o.id
    WHERE LOWER(t.subdomain) = 'siga' 
       OR LOWER(o.name) LIKE '%siga%'
    LIMIT 1
)
SELECT 'SIGA TENANT:' as info, id, subdomain, org_name FROM siga_tenant;

-- Store SIGA tenant ID in a temporary table for use in subsequent queries
CREATE TEMP TABLE siga_info AS
SELECT t.id as tenant_id, t.subdomain, o.name as org_name
FROM tenants t
JOIN organizations o ON t.organization_id = o.id
WHERE LOWER(t.subdomain) = 'siga' 
   OR LOWER(o.name) LIKE '%siga%'
LIMIT 1;

-- =====================================================
-- STEP 2: Check if Corporativo area already exists
-- =====================================================

SELECT 'EXISTING CORPORATIVO AREAS:' as status;
SELECT a.id, a.name, a.tenant_id, t.subdomain
FROM areas a
JOIN tenants t ON a.tenant_id = t.id
WHERE LOWER(a.name) = 'corporativo';

-- =====================================================
-- STEP 3: Create Corporativo area for SIGA
-- =====================================================

-- Delete existing Corporativo area for SIGA if it exists
DELETE FROM areas 
WHERE LOWER(name) = 'corporativo' 
  AND tenant_id = (SELECT tenant_id FROM siga_info);

-- Create new Corporativo area
INSERT INTO areas (
    id,
    tenant_id,
    name,
    description,
    is_active,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    tenant_id,
    'Corporativo',
    'Área corporativa para gestión estratégica y administrativa de alto nivel',
    true,
    NOW(),
    NOW()
FROM siga_info;

-- Get the newly created area ID
CREATE TEMP TABLE corporativo_area AS
SELECT id, name, tenant_id
FROM areas
WHERE LOWER(name) = 'corporativo'
  AND tenant_id = (SELECT tenant_id FROM siga_info);

SELECT 'CREATED CORPORATIVO AREA:' as status;
SELECT * FROM corporativo_area;

-- =====================================================
-- STEP 4: Find all CEO and Admin users from SIGA
-- =====================================================

SELECT 'SIGA CEO AND ADMIN USERS TO UPDATE:' as status;
SELECT 
    up.id,
    up.full_name,
    up.email,
    up.role,
    up.area_id as current_area_id,
    a.name as current_area_name
FROM user_profiles up
LEFT JOIN areas a ON up.area_id = a.id
WHERE up.tenant_id = (SELECT tenant_id FROM siga_info)
  AND up.role IN ('CEO', 'Admin')
ORDER BY up.role, up.full_name;

-- Count users to be updated
SELECT 
    'USERS TO UPDATE:' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'CEO' THEN 1 END) as ceo_count,
    COUNT(CASE WHEN role = 'Admin' THEN 1 END) as admin_count
FROM user_profiles
WHERE tenant_id = (SELECT tenant_id FROM siga_info)
  AND role IN ('CEO', 'Admin');

-- =====================================================
-- STEP 5: Assign CEO and Admin users to Corporativo area
-- =====================================================

UPDATE user_profiles
SET 
    area_id = (SELECT id FROM corporativo_area),
    updated_at = NOW()
WHERE tenant_id = (SELECT tenant_id FROM siga_info)
  AND role IN ('CEO', 'Admin');

-- =====================================================
-- STEP 6: Verification
-- =====================================================

SELECT 'VERIFICATION - UPDATED USERS:' as status;
SELECT 
    up.id,
    up.full_name,
    up.email,
    up.role,
    up.area_id,
    a.name as area_name,
    up.updated_at
FROM user_profiles up
LEFT JOIN areas a ON up.area_id = a.id
WHERE up.tenant_id = (SELECT tenant_id FROM siga_info)
  AND up.role IN ('CEO', 'Admin')
ORDER BY up.role, up.full_name;

-- Show all areas for SIGA tenant
SELECT 'ALL SIGA AREAS AFTER UPDATE:' as status;
SELECT 
    a.id,
    a.name,
    a.description,
    COUNT(DISTINCT up.id) as user_count,
    COUNT(DISTINCT CASE WHEN up.role = 'CEO' THEN up.id END) as ceo_count,
    COUNT(DISTINCT CASE WHEN up.role = 'Admin' THEN up.id END) as admin_count,
    COUNT(DISTINCT CASE WHEN up.role = 'Manager' THEN up.id END) as manager_count
FROM areas a
LEFT JOIN user_profiles up ON a.id = up.area_id
WHERE a.tenant_id = (SELECT tenant_id FROM siga_info)
GROUP BY a.id, a.name, a.description
ORDER BY a.name;

-- =====================================================
-- STEP 7: Clean up temporary tables
-- =====================================================

DROP TABLE IF EXISTS siga_info;
DROP TABLE IF EXISTS corporativo_area;

-- =====================================================
-- FINAL STEP: Commit or Rollback
-- =====================================================

-- Review the output above before committing!
-- If everything looks correct, uncomment the COMMIT line.
-- If something looks wrong, uncomment the ROLLBACK line.

-- COMMIT;  -- Uncomment to apply changes
-- ROLLBACK;  -- Uncomment to cancel changes

-- =====================================================
-- END OF SCRIPT
-- =====================================================

/*
USAGE INSTRUCTIONS:
==================

1. Connect to your production database:
   psql -h your-host -U your-user -d your-database

2. Run this script:
   \i recreate-corporativo-area.sql

3. Review the output carefully:
   - Check that SIGA tenant was found
   - Verify the Corporativo area was created
   - Review the list of users being updated
   - Confirm the final verification shows correct assignments

4. If everything looks good, run:
   COMMIT;
   
   If something looks wrong, run:
   ROLLBACK;

5. After commit, verify in your application that:
   - CEO and Admin users can see the Corporativo area
   - They can access all necessary data
   - The area appears correctly in the UI
*/