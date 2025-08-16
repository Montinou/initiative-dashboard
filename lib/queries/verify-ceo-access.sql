-- Verify CEO Access with RLS Policies
-- This query verifies that CEO users can access all tenant data correctly
-- RLS automatically filters by tenant_id using get_current_user_tenant()

-- 1. Check current user's tenant context
SELECT 
  auth.uid() as user_id,
  get_current_user_tenant() as tenant_id,
  up.role,
  up.full_name,
  up.email
FROM user_profiles up
WHERE up.user_id = auth.uid();

-- 2. CEO should see all initiatives in their tenant (RLS filtered)
SELECT 
  COUNT(*) as total_initiatives,
  COUNT(DISTINCT area_id) as unique_areas,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
  AVG(progress)::INT as avg_progress
FROM initiatives;
-- Note: No WHERE clause needed - RLS handles tenant filtering

-- 3. CEO should see all objectives in their tenant
SELECT 
  COUNT(*) as total_objectives,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN progress >= 75 THEN 1 END) as on_track
FROM objectives;
-- RLS automatically filters to current tenant

-- 4. CEO should see all areas and their teams
SELECT 
  a.name as area_name,
  COUNT(DISTINCT up.id) as team_members,
  COUNT(DISTINCT i.id) as initiatives,
  AVG(i.progress)::INT as avg_progress
FROM areas a
LEFT JOIN user_profiles up ON up.area_id = a.id
LEFT JOIN initiatives i ON i.area_id = a.id
WHERE a.is_active = true
GROUP BY a.id, a.name;
-- RLS ensures only current tenant's areas are visible

-- 5. CEO should see all user profiles in tenant
SELECT 
  role,
  COUNT(*) as count
FROM user_profiles
WHERE is_active = true
GROUP BY role;
-- RLS filters to current tenant automatically

-- 6. Verify audit log access (CEO should see all)
SELECT 
  COUNT(*) as total_audit_entries,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT table_name) as tables_modified
FROM audit_log
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
-- CEO/Admin can see all audit logs in their tenant