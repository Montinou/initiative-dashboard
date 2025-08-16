-- ============================================================
-- Migration 5: Enable RLS and create security policies
-- ============================================================
-- Scope: Multi‑tenant isolation by tenant_id and area‑scoped access
-- Rule:
--   - Managers: only data of their own area within their tenant
--   - CEO/Admin: all areas within their tenant
-- Notes:
--   - Use FORCE RLS to ensure policies always apply
--   - Avoid duplicating Invitations RLS (handled by 2025-01-08 migration)
--   - Views inherit RLS from base tables
-- ============================================================

-- Enable and force RLS
ALTER TABLE public.organizations      ENABLE ROW LEVEL SECURITY; ALTER TABLE public.organizations      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tenants            ENABLE ROW LEVEL SECURITY; ALTER TABLE public.tenants            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.areas              ENABLE ROW LEVEL SECURITY; ALTER TABLE public.areas              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles      ENABLE ROW LEVEL SECURITY; ALTER TABLE public.user_profiles      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.objectives         ENABLE ROW LEVEL SECURITY; ALTER TABLE public.objectives         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives        ENABLE ROW LEVEL SECURITY; ALTER TABLE public.initiatives        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.activities         ENABLE ROW LEVEL SECURITY; ALTER TABLE public.activities         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.quarters           ENABLE ROW LEVEL SECURITY; ALTER TABLE public.quarters           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.progress_history   ENABLE ROW LEVEL SECURITY; ALTER TABLE public.progress_history   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files     ENABLE ROW LEVEL SECURITY; ALTER TABLE public.uploaded_files     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.file_areas         ENABLE ROW LEVEL SECURITY; ALTER TABLE public.file_areas         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.file_initiatives   ENABLE ROW LEVEL SECURITY; ALTER TABLE public.file_initiatives   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.objective_initiatives ENABLE ROW LEVEL SECURITY; ALTER TABLE public.objective_initiatives FORCE ROW LEVEL SECURITY;
ALTER TABLE public.objective_quarters    ENABLE ROW LEVEL SECURITY; ALTER TABLE public.objective_quarters    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log          ENABLE ROW LEVEL SECURITY; ALTER TABLE public.audit_log          FORCE ROW LEVEL SECURITY;

-- ============================================================
-- Organizations policies
-- ============================================================
DROP POLICY IF EXISTS "Organizations: Users can view their organization" ON public.organizations;
CREATE POLICY "Organizations: Users can view their organization"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT t.organization_id
      FROM public.tenants t
      JOIN public.user_profiles up ON up.tenant_id = t.id
      WHERE up.user_id = auth.uid()
    )
  );

-- Only service role can mutate organizations (deny all for client roles)
DROP POLICY IF EXISTS "Organizations: Only super admins can modify" ON public.organizations;
CREATE POLICY "Organizations: Only super admins can modify"
  ON public.organizations FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================
-- Tenants policies
-- ============================================================
DROP POLICY IF EXISTS "Tenants: Users can view their tenant" ON public.tenants;
CREATE POLICY "Tenants: Users can view their tenant"
  ON public.tenants FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Tenants: Only super admins can modify" ON public.tenants;
CREATE POLICY "Tenants: Only super admins can modify"
  ON public.tenants FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================
-- Areas policies
-- ============================================================
DROP POLICY IF EXISTS "Areas: CEO/Admin can see all, Manager can see their own" ON public.areas;
CREATE POLICY "Areas: CEO/Admin can see all, Manager can see their own"
  ON public.areas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = areas.tenant_id
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = areas.id)
        )
    )
  );

DROP POLICY IF EXISTS "Areas: CEO/Admin can insert" ON public.areas;
CREATE POLICY "Areas: CEO/Admin can insert"
  ON public.areas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = areas.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  );

DROP POLICY IF EXISTS "Areas: CEO/Admin can update" ON public.areas;
CREATE POLICY "Areas: CEO/Admin can update"
  ON public.areas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = areas.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = areas.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  );

DROP POLICY IF EXISTS "Areas: CEO/Admin can delete" ON public.areas;
CREATE POLICY "Areas: CEO/Admin can delete"
  ON public.areas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = areas.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  );

-- ============================================================
-- User profiles policies
-- ============================================================
DROP POLICY IF EXISTS "Profiles: CEO/Admin view tenant profiles" ON public.user_profiles;
CREATE POLICY "Profiles: CEO/Admin view tenant profiles"
  ON public.user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = user_profiles.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  );

DROP POLICY IF EXISTS "Profiles: Manager view profiles in their area" ON public.user_profiles;
CREATE POLICY "Profiles: Manager view profiles in their area"
  ON public.user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role = 'Manager'
        AND up.tenant_id = user_profiles.tenant_id
        AND up.area_id = user_profiles.area_id
    )
  );

DROP POLICY IF EXISTS "Profiles: CEO/Admin can insert" ON public.user_profiles;
CREATE POLICY "Profiles: CEO/Admin can insert"
  ON public.user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = user_profiles.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  );

DROP POLICY IF EXISTS "Profiles: CEO/Admin can update" ON public.user_profiles;
CREATE POLICY "Profiles: CEO/Admin can update"
  ON public.user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = user_profiles.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = user_profiles.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  );

DROP POLICY IF EXISTS "Profiles: CEO/Admin can delete" ON public.user_profiles;
CREATE POLICY "Profiles: CEO/Admin can delete"
  ON public.user_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = user_profiles.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  );

-- ============================================================
-- Objectives policies
-- ============================================================
DROP POLICY IF EXISTS "Objectives: CEO/Admin see all, Manager see their area" ON public.objectives;
CREATE POLICY "Objectives: CEO/Admin see all, Manager see their area"
  ON public.objectives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = objectives.tenant_id
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = objectives.area_id)
        )
    )
  );

DROP POLICY IF EXISTS "Objectives: CEO/Admin and area Manager can insert" ON public.objectives;
CREATE POLICY "Objectives: CEO/Admin and area Manager can insert"
  ON public.objectives FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = objectives.tenant_id
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = objectives.area_id)
        )
    )
  );

DROP POLICY IF EXISTS "Objectives: CEO/Admin and area Manager can update" ON public.objectives;
CREATE POLICY "Objectives: CEO/Admin and area Manager can update"
  ON public.objectives FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = objectives.tenant_id
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = objectives.area_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = objectives.tenant_id
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = objectives.area_id)
        )
    )
  );

DROP POLICY IF EXISTS "Objectives: CEO/Admin and area Manager can delete" ON public.objectives;
CREATE POLICY "Objectives: CEO/Admin and area Manager can delete"
  ON public.objectives FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = objectives.tenant_id
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = objectives.area_id)
        )
    )
  );

-- ============================================================
-- Initiatives policies
-- ============================================================
DROP POLICY IF EXISTS "Initiatives: CEO/Admin see all, Manager see their area" ON public.initiatives;
CREATE POLICY "Initiatives: CEO/Admin see all, Manager see their area"
  ON public.initiatives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = initiatives.tenant_id
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = initiatives.area_id)
        )
    )
  );

DROP POLICY IF EXISTS "Initiatives: CEO/Admin and area Manager can insert" ON public.initiatives;
CREATE POLICY "Initiatives: CEO/Admin and area Manager can insert"
  ON public.initiatives FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = initiatives.tenant_id
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = initiatives.area_id)
        )
    )
  );

DROP POLICY IF EXISTS "Initiatives: CEO/Admin and area Manager can update" ON public.initiatives;
CREATE POLICY "Initiatives: CEO/Admin and area Manager can update"
  ON public.initiatives FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = initiatives.tenant_id
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = initiatives.area_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = initiatives.tenant_id
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = initiatives.area_id)
        )
    )
  );

DROP POLICY IF EXISTS "Initiatives: CEO/Admin and area Manager can delete" ON public.initiatives;
CREATE POLICY "Initiatives: CEO/Admin and area Manager can delete"
  ON public.initiatives FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = initiatives.tenant_id
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = initiatives.area_id)
        )
    )
  );

-- ============================================================
-- Activities policies
-- ============================================================
DROP POLICY IF EXISTS "Activities: CEO/Admin see all, Manager see their area initiatives" ON public.activities;
CREATE POLICY "Activities: CEO/Admin see all, Manager see their area initiatives"
  ON public.activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.initiatives i ON i.id = activities.initiative_id
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = i.tenant_id
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = i.area_id)
        )
    )
  );

DROP POLICY IF EXISTS "Activities: CEO/Admin and area Manager can insert" ON public.activities;
CREATE POLICY "Activities: CEO/Admin and area Manager can insert"
  ON public.activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.initiatives i ON i.id = activities.initiative_id
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = i.tenant_id
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = i.area_id)
        )
    )
  );

DROP POLICY IF EXISTS "Activities: CEO/Admin and area Manager can update" ON public.activities;
CREATE POLICY "Activities: CEO/Admin and area Manager can update"
  ON public.activities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.initiatives i ON i.id = activities.initiative_id
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = i.tenant_id
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = i.area_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.initiatives i ON i.id = activities.initiative_id
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = i.tenant_id
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = i.area_id)
        )
    )
  );

DROP POLICY IF EXISTS "Activities: CEO/Admin and area Manager can delete" ON public.activities;
CREATE POLICY "Activities: CEO/Admin and area Manager can delete"
  ON public.activities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.initiatives i ON i.id = activities.initiative_id
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = i.tenant_id
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = i.area_id)
        )
    )
  );

-- ============================================================
-- Quarters policies
-- ============================================================
DROP POLICY IF EXISTS "Quarters: Users can view their tenant quarters" ON public.quarters;
CREATE POLICY "Quarters: Users can view their tenant quarters"
  ON public.quarters FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Quarters: CEO/Admin can manage" ON public.quarters;
CREATE POLICY "Quarters: CEO/Admin can manage"
  ON public.quarters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = quarters.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = quarters.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  );

-- ============================================================
-- Progress history policies (read-only)
-- ============================================================
DROP POLICY IF EXISTS "Progress: Users can view based on initiative access" ON public.progress_history;
CREATE POLICY "Progress: Users can view based on initiative access"
  ON public.progress_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.initiatives i
      JOIN public.user_profiles up ON up.tenant_id = i.tenant_id
      WHERE i.id = progress_history.initiative_id
        AND up.user_id = auth.uid()
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = i.area_id)
        )
    )
  );

-- ============================================================
-- Uploaded files policies
-- ============================================================
DROP POLICY IF EXISTS "Files: Tenant access with area scoping for Managers" ON public.uploaded_files;
CREATE POLICY "Files: Tenant access with area scoping for Managers"
  ON public.uploaded_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = uploaded_files.tenant_id
        AND (
          -- CEO/Admin: access all files in tenant
          up.role IN ('CEO','Admin')
          OR (
            -- Manager: access files linked to their area or initiatives in their area
            up.role = 'Manager' AND (
              EXISTS (
                SELECT 1 FROM public.file_areas fa
                JOIN public.areas a ON a.id = fa.area_id
                WHERE fa.file_id = uploaded_files.id
                  AND a.id = up.area_id
              )
              OR EXISTS (
                SELECT 1 FROM public.file_initiatives fi
                JOIN public.initiatives i ON i.id = fi.initiative_id
                WHERE fi.file_id = uploaded_files.id
                  AND i.area_id = up.area_id
              )
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Files: Users in tenant can upload" ON public.uploaded_files;
CREATE POLICY "Files: Users in tenant can upload"
  ON public.uploaded_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = uploaded_files.tenant_id
    )
  );

DROP POLICY IF EXISTS "Files: CEO/Admin can update/delete" ON public.uploaded_files;
CREATE POLICY "Files: CEO/Admin can update/delete"
  ON public.uploaded_files FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = uploaded_files.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = uploaded_files.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  );

CREATE POLICY "Files: CEO/Admin can delete (compat)" ON public.uploaded_files FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = uploaded_files.tenant_id
      AND up.role IN ('CEO','Admin')
  )
);

-- ============================================================
-- File areas policies
-- ============================================================
DROP POLICY IF EXISTS "File areas: Based on file and area access" ON public.file_areas;
CREATE POLICY "File areas: Based on file and area access"
  ON public.file_areas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.uploaded_files f
      JOIN public.areas a ON a.id = file_areas.area_id
      JOIN public.user_profiles up ON up.tenant_id = f.tenant_id
      WHERE f.id = file_areas.file_id
        AND up.user_id = auth.uid()
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = a.id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.uploaded_files f
      JOIN public.areas a ON a.id = file_areas.area_id
      JOIN public.user_profiles up ON up.tenant_id = f.tenant_id
      WHERE f.id = file_areas.file_id
        AND up.user_id = auth.uid()
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = a.id)
        )
    )
  );

-- ============================================================
-- File initiatives policies
-- ============================================================
DROP POLICY IF EXISTS "File initiatives: Based on file and initiative access" ON public.file_initiatives;
CREATE POLICY "File initiatives: Based on file and initiative access"
  ON public.file_initiatives FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.uploaded_files f
      JOIN public.initiatives i ON i.id = file_initiatives.initiative_id
      JOIN public.user_profiles up ON up.tenant_id = f.tenant_id
      WHERE f.id = file_initiatives.file_id
        AND up.user_id = auth.uid()
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = i.area_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.uploaded_files f
      JOIN public.initiatives i ON i.id = file_initiatives.initiative_id
      JOIN public.user_profiles up ON up.tenant_id = f.tenant_id
      WHERE f.id = file_initiatives.file_id
        AND up.user_id = auth.uid()
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = i.area_id)
        )
    )
  );

-- ============================================================
-- Objective initiatives policies
-- ============================================================
DROP POLICY IF EXISTS "Objective initiatives: access via initiative/objective" ON public.objective_initiatives;
CREATE POLICY "Objective initiatives: access via initiative/objective"
  ON public.objective_initiatives FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.initiatives i
      JOIN public.objectives o ON o.id = objective_initiatives.objective_id
      JOIN public.user_profiles up ON up.tenant_id = i.tenant_id
      WHERE i.id = objective_initiatives.initiative_id
        AND up.user_id = auth.uid()
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = i.area_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.initiatives i
      JOIN public.objectives o ON o.id = objective_initiatives.objective_id
      JOIN public.user_profiles up ON up.tenant_id = i.tenant_id
      WHERE i.id = objective_initiatives.initiative_id
        AND up.user_id = auth.uid()
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = i.area_id)
        )
    )
  );

-- ============================================================
-- Objective quarters policies
-- ============================================================
DROP POLICY IF EXISTS "Objective quarters: access via objective" ON public.objective_quarters;
CREATE POLICY "Objective quarters: access via objective"
  ON public.objective_quarters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.objectives o
      JOIN public.user_profiles up ON up.tenant_id = o.tenant_id
      WHERE o.id = objective_quarters.objective_id
        AND up.user_id = auth.uid()
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = o.area_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.objectives o
      JOIN public.user_profiles up ON up.tenant_id = o.tenant_id
      WHERE o.id = objective_quarters.objective_id
        AND up.user_id = auth.uid()
        AND (
          up.role IN ('CEO','Admin') OR (up.role = 'Manager' AND up.area_id = o.area_id)
        )
    )
  );

-- ============================================================
-- Audit log policies (read‑only for Admin/CEO within tenant)
-- ============================================================
DROP POLICY IF EXISTS "Audit: CEO/Admin can view all tenant logs" ON public.audit_log;
CREATE POLICY "Audit: CEO/Admin can view all tenant logs"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role IN ('CEO','Admin')
        AND (
          audit_log.user_id IS NULL OR audit_log.user_id IN (
            SELECT id FROM public.user_profiles WHERE tenant_id = up.tenant_id
          )
        )
    )
  );

-- End of migration
