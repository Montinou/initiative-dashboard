-- =============================================
-- Migration 004: Enable RLS and Security Policies
-- =============================================
-- This migration implements Row-Level Security (RLS) to ensure
-- data access is properly controlled based on user roles:
-- - CEO/Admin: Full access to all data
-- - Manager: Access only to their assigned area's data

-- ============================================================
-- Enable Row-Level Security on Business Tables
-- ============================================================

-- Enable RLS on tables that require access control
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper Function to Get Current User's Role
-- ============================================================

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
DECLARE
  user_role_value user_role;
BEGIN
  SELECT role INTO user_role_value
  FROM public.user_profiles
  WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid
  LIMIT 1;
  
  RETURN user_role_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user's profile ID
CREATE OR REPLACE FUNCTION get_current_user_profile_id()
RETURNS uuid AS $$
DECLARE
  profile_id uuid;
BEGIN
  SELECT id INTO profile_id
  FROM public.user_profiles
  WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid
  LIMIT 1;
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user's area ID
CREATE OR REPLACE FUNCTION get_current_user_area_id()
RETURNS uuid AS $$
DECLARE
  user_area_id uuid;
BEGIN
  SELECT area_id INTO user_area_id
  FROM public.user_profiles
  WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid
  LIMIT 1;
  
  RETURN user_area_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS Policies for: tenants
-- ============================================================

-- Tenants: CEO/Admin can see all
CREATE POLICY "Tenants: CEO/Admin can view all"
ON public.tenants
FOR SELECT
USING (
  get_current_user_role() IN ('CEO', 'Admin')
);

-- Tenants: Managers can see their own tenant
CREATE POLICY "Tenants: Managers can view their tenant"
ON public.tenants
FOR SELECT
USING (
  id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid
  )
);

-- Tenants: Only CEO/Admin can modify
CREATE POLICY "Tenants: CEO/Admin can modify"
ON public.tenants
FOR ALL
USING (
  get_current_user_role() IN ('CEO', 'Admin')
)
WITH CHECK (
  get_current_user_role() IN ('CEO', 'Admin')
);

-- ============================================================
-- RLS Policies for: areas
-- ============================================================

-- Areas: CEO/Admin can see all, Manager can see their own
CREATE POLICY "Areas: CEO/Admin can see all, Manager can see their own"
ON public.areas
FOR SELECT
USING (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  id = get_current_user_area_id()
);

-- Areas: CEO/Admin can insert and update
CREATE POLICY "Areas: CEO/Admin can insert and update"
ON public.areas
FOR INSERT
WITH CHECK (
  get_current_user_role() IN ('CEO', 'Admin')
);

CREATE POLICY "Areas: CEO/Admin can update"
ON public.areas
FOR UPDATE
USING (
  get_current_user_role() IN ('CEO', 'Admin')
)
WITH CHECK (
  get_current_user_role() IN ('CEO', 'Admin')
);

CREATE POLICY "Areas: CEO/Admin can delete"
ON public.areas
FOR DELETE
USING (
  get_current_user_role() IN ('CEO', 'Admin')
);

-- ============================================================
-- RLS Policies for: user_profiles
-- ============================================================

-- Profiles: Manager can view all, CEO/Admin can see all
CREATE POLICY "Profiles: All authenticated users can view profiles"
ON public.user_profiles
FOR SELECT
USING (
  get_current_user_role() IN ('CEO', 'Admin', 'Manager')
);

-- Profiles: CEO/Admin can insert
CREATE POLICY "Profiles: CEO/Admin can insert"
ON public.user_profiles
FOR INSERT
WITH CHECK (
  get_current_user_role() IN ('CEO', 'Admin')
);

-- Profiles: CEO/Admin can update
CREATE POLICY "Profiles: CEO/Admin can update"
ON public.user_profiles
FOR UPDATE
USING (
  get_current_user_role() IN ('CEO', 'Admin')
)
WITH CHECK (
  get_current_user_role() IN ('CEO', 'Admin')
);

-- Profiles: CEO/Admin can delete
CREATE POLICY "Profiles: CEO/Admin can delete"
ON public.user_profiles
FOR DELETE
USING (
  get_current_user_role() IN ('CEO', 'Admin')
);

-- ============================================================
-- RLS Policies for: quarters
-- ============================================================

-- Quarters: Everyone can view
CREATE POLICY "Quarters: All authenticated users can view"
ON public.quarters
FOR SELECT
USING (
  get_current_user_role() IS NOT NULL
);

-- Quarters: Only CEO/Admin can modify
CREATE POLICY "Quarters: CEO/Admin can modify"
ON public.quarters
FOR ALL
USING (
  get_current_user_role() IN ('CEO', 'Admin')
)
WITH CHECK (
  get_current_user_role() IN ('CEO', 'Admin')
);

-- ============================================================
-- RLS Policies for: objectives
-- ============================================================

-- Objectives: CEO/Admin can see all, Manager can see their area's
CREATE POLICY "Objectives: CEO/Admin can see all, Manager can see their area's"
ON public.objectives
FOR SELECT
USING (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  area_id = get_current_user_area_id()
);

-- Objectives: CEO/Admin can create for any area
CREATE POLICY "Objectives: CEO/Admin can create"
ON public.objectives
FOR INSERT
WITH CHECK (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  (get_current_user_role() = 'Manager' AND area_id = get_current_user_area_id())
);

-- Objectives: CEO/Admin can update all, Manager can update their area's
CREATE POLICY "Objectives: CEO/Admin and area Manager can update"
ON public.objectives
FOR UPDATE
USING (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  (get_current_user_role() = 'Manager' AND area_id = get_current_user_area_id())
)
WITH CHECK (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  (get_current_user_role() = 'Manager' AND area_id = get_current_user_area_id())
);

-- Objectives: CEO/Admin can delete all, Manager can delete their area's
CREATE POLICY "Objectives: CEO/Admin and area Manager can delete"
ON public.objectives
FOR DELETE
USING (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  (get_current_user_role() = 'Manager' AND area_id = get_current_user_area_id())
);

-- ============================================================
-- RLS Policies for: initiatives
-- ============================================================

-- Initiatives: CEO/Admin can see all, Manager can see their area's
CREATE POLICY "Initiatives: CEO/Admin can see all, Manager can see their area's"
ON public.initiatives
FOR SELECT
USING (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  area_id = get_current_user_area_id()
);

-- Initiatives: CEO/Admin can create for any area, Manager for their area
CREATE POLICY "Initiatives: CEO/Admin and area Manager can create"
ON public.initiatives
FOR INSERT
WITH CHECK (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  (get_current_user_role() = 'Manager' AND area_id = get_current_user_area_id())
);

-- Initiatives: CEO/Admin can update all, Manager can update their area's
CREATE POLICY "Initiatives: CEO/Admin and area Manager can update"
ON public.initiatives
FOR UPDATE
USING (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  (get_current_user_role() = 'Manager' AND area_id = get_current_user_area_id())
)
WITH CHECK (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  (get_current_user_role() = 'Manager' AND area_id = get_current_user_area_id())
);

-- Initiatives: CEO/Admin can delete all, Manager can delete their area's
CREATE POLICY "Initiatives: CEO/Admin and area Manager can delete"
ON public.initiatives
FOR DELETE
USING (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  (get_current_user_role() = 'Manager' AND area_id = get_current_user_area_id())
);

-- ============================================================
-- RLS Policies for: activities
-- ============================================================

-- Activities: CEO/Admin can see all, Manager can see their area's initiatives' activities
CREATE POLICY "Activities: CEO/Admin can see all, Manager can see their area's"
ON public.activities
FOR SELECT
USING (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  initiative_id IN (
    SELECT id
    FROM public.initiatives
    WHERE area_id = get_current_user_area_id()
  )
);

-- Activities: CEO/Admin can create for any initiative, Manager for their area's initiatives
CREATE POLICY "Activities: CEO/Admin and area Manager can create"
ON public.activities
FOR INSERT
WITH CHECK (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  (
    get_current_user_role() = 'Manager' 
    AND 
    initiative_id IN (
      SELECT id
      FROM public.initiatives
      WHERE area_id = get_current_user_area_id()
    )
  )
);

-- Activities: CEO/Admin can update all, Manager can update their area's initiatives' activities
CREATE POLICY "Activities: CEO/Admin and area Manager can update"
ON public.activities
FOR UPDATE
USING (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  (
    get_current_user_role() = 'Manager' 
    AND 
    initiative_id IN (
      SELECT id
      FROM public.initiatives
      WHERE area_id = get_current_user_area_id()
    )
  )
)
WITH CHECK (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  (
    get_current_user_role() = 'Manager' 
    AND 
    initiative_id IN (
      SELECT id
      FROM public.initiatives
      WHERE area_id = get_current_user_area_id()
    )
  )
);

-- Activities: CEO/Admin can delete all, Manager can delete their area's initiatives' activities
CREATE POLICY "Activities: CEO/Admin and area Manager can delete"
ON public.activities
FOR DELETE
USING (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  (
    get_current_user_role() = 'Manager' 
    AND 
    initiative_id IN (
      SELECT id
      FROM public.initiatives
      WHERE area_id = get_current_user_area_id()
    )
  )
);

-- ============================================================
-- RLS Policies for: progress_history
-- ============================================================

-- Progress history: View policies match initiative policies
CREATE POLICY "Progress history: View based on initiative access"
ON public.progress_history
FOR SELECT
USING (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  initiative_id IN (
    SELECT id
    FROM public.initiatives
    WHERE area_id = get_current_user_area_id()
  )
);

-- Progress history: Modification policies match initiative policies
CREATE POLICY "Progress history: Modify based on initiative access"
ON public.progress_history
FOR ALL
USING (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  (
    get_current_user_role() = 'Manager' 
    AND 
    initiative_id IN (
      SELECT id
      FROM public.initiatives
      WHERE area_id = get_current_user_area_id()
    )
  )
)
WITH CHECK (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  (
    get_current_user_role() = 'Manager' 
    AND 
    initiative_id IN (
      SELECT id
      FROM public.initiatives
      WHERE area_id = get_current_user_area_id()
    )
  )
);

-- ============================================================
-- RLS Policies for: uploaded_files
-- ============================================================

-- Uploaded files: View own tenant's files
CREATE POLICY "Uploaded files: View own tenant's files"
ON public.uploaded_files
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid
  )
);

-- Uploaded files: Create for own tenant
CREATE POLICY "Uploaded files: Create for own tenant"
ON public.uploaded_files
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid
  )
);

-- Uploaded files: Modify based on role
CREATE POLICY "Uploaded files: Modify based on role"
ON public.uploaded_files
FOR UPDATE
USING (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  uploaded_by = get_current_user_profile_id()
)
WITH CHECK (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  uploaded_by = get_current_user_profile_id()
);

CREATE POLICY "Uploaded files: Delete based on role"
ON public.uploaded_files
FOR DELETE
USING (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  uploaded_by = get_current_user_profile_id()
);

-- ============================================================
-- RLS Policies for: file_areas and file_initiatives
-- ============================================================

-- File areas: View based on area access
CREATE POLICY "File areas: View based on area access"
ON public.file_areas
FOR SELECT
USING (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  area_id = get_current_user_area_id()
);

-- File areas: Modify based on role
CREATE POLICY "File areas: CEO/Admin can modify"
ON public.file_areas
FOR ALL
USING (
  get_current_user_role() IN ('CEO', 'Admin')
)
WITH CHECK (
  get_current_user_role() IN ('CEO', 'Admin')
);

-- File initiatives: View based on initiative access
CREATE POLICY "File initiatives: View based on initiative access"
ON public.file_initiatives
FOR SELECT
USING (
  get_current_user_role() IN ('CEO', 'Admin')
  OR
  initiative_id IN (
    SELECT id
    FROM public.initiatives
    WHERE area_id = get_current_user_area_id()
  )
);

-- File initiatives: Modify based on role
CREATE POLICY "File initiatives: CEO/Admin can modify"
ON public.file_initiatives
FOR ALL
USING (
  get_current_user_role() IN ('CEO', 'Admin')
)
WITH CHECK (
  get_current_user_role() IN ('CEO', 'Admin')
);

-- ============================================================
-- RLS Policies for: audit_log
-- ============================================================

-- Audit log: CEO/Admin can view all
CREATE POLICY "Audit log: CEO/Admin can view all"
ON public.audit_log
FOR SELECT
USING (
  get_current_user_role() IN ('CEO', 'Admin')
);

-- Audit log: No one can manually modify (only triggers can insert)
-- The audit_trigger_function uses SECURITY DEFINER to bypass RLS