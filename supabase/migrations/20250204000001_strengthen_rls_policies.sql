-- ============================================================================
-- STRENGTHEN RLS POLICIES FOR CORE TABLES
-- ============================================================================
-- This migration fixes security vulnerabilities by adding proper tenant
-- isolation and role-based access control to core tables

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to read company areas" ON public.areas;
DROP POLICY IF EXISTS "Allow authenticated users to insert company areas" ON public.areas;
DROP POLICY IF EXISTS "Allow authenticated users to update company areas" ON public.areas;
DROP POLICY IF EXISTS "Allow authenticated users to delete company areas" ON public.areas;

DROP POLICY IF EXISTS "Allow authenticated users to read initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Allow authenticated users to insert initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Allow authenticated users to update initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Allow authenticated users to delete initiatives" ON public.initiatives;

DROP POLICY IF EXISTS "Allow authenticated users to read subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Allow authenticated users to insert subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Allow authenticated users to update subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Allow authenticated users to delete subtasks" ON public.subtasks;

-- Ensure RLS is enabled on core tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TENANTS TABLE POLICIES
-- ============================================================================

-- Allow users to see only their own tenant
CREATE POLICY "users_can_view_own_tenant" ON public.tenants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = tenants.id
        )
    );

-- Only system admins can manage tenants
CREATE POLICY "system_admins_can_manage_tenants" ON public.tenants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.is_system_admin = true
        )
    );

-- ============================================================================
-- USER_PROFILES TABLE POLICIES
-- ============================================================================

-- Users can view profiles in their tenant based on role
CREATE POLICY "user_profiles_tenant_access" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles viewer
            WHERE viewer.id = auth.uid()
            AND viewer.tenant_id = user_profiles.tenant_id
            AND (
                -- Users can always see their own profile
                viewer.id = user_profiles.id
                -- System admins can see all profiles
                OR viewer.is_system_admin = true
                -- CEOs and Admins can see all profiles in their tenant
                OR viewer.role IN ('CEO', 'Admin')
                -- Managers can see profiles in their area
                OR (viewer.role = 'Manager' AND viewer.area_id = user_profiles.area_id)
                -- Analysts can see other profiles in their area
                OR (viewer.role = 'Analyst' AND viewer.area_id = user_profiles.area_id)
            )
        )
    );

-- Users can update their own profile; admins can update tenant profiles
CREATE POLICY "user_profiles_update_policy" ON public.user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles updater
            WHERE updater.id = auth.uid()
            AND (
                -- Users can update their own profile
                updater.id = user_profiles.id
                -- System admins can update any profile
                OR updater.is_system_admin = true
                -- Admins can update profiles in their tenant
                OR (updater.role = 'Admin' AND updater.tenant_id = user_profiles.tenant_id)
            )
        )
    );

-- Only admins can insert new user profiles
CREATE POLICY "user_profiles_insert_policy" ON public.user_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles inserter
            WHERE inserter.id = auth.uid()
            AND (
                -- System admins can create any profile
                inserter.is_system_admin = true
                -- Admins can create profiles in their tenant
                OR (inserter.role = 'Admin' AND inserter.tenant_id = user_profiles.tenant_id)
            )
        )
    );

-- ============================================================================
-- AREAS TABLE POLICIES
-- ============================================================================

-- Users can view areas in their tenant based on role
CREATE POLICY "areas_tenant_access" ON public.areas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = areas.tenant_id
            AND (
                -- System admins can see all areas
                up.is_system_admin = true
                -- CEOs and Admins can see all areas in their tenant
                OR up.role IN ('CEO', 'Admin')
                -- Managers can see their own area
                OR (up.role = 'Manager' AND up.area_id = areas.id)
                -- Analysts can see their own area
                OR (up.role = 'Analyst' AND up.area_id = areas.id)
            )
        )
    );

-- Only CEOs and Admins can manage areas
CREATE POLICY "areas_manage_policy" ON public.areas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = areas.tenant_id
            AND (
                -- System admins can manage all areas
                up.is_system_admin = true
                -- CEOs and Admins can manage areas in their tenant
                OR up.role IN ('CEO', 'Admin')
            )
        )
    );

-- ============================================================================
-- INITIATIVES TABLE POLICIES
-- ============================================================================

-- Users can view initiatives based on role and area
CREATE POLICY "initiatives_access_policy" ON public.initiatives
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = initiatives.tenant_id
            AND (
                -- System admins can see all initiatives
                up.is_system_admin = true
                -- CEOs and Admins can see all initiatives in their tenant
                OR up.role IN ('CEO', 'Admin')
                -- Managers can see initiatives in their area
                OR (up.role = 'Manager' AND up.area_id = initiatives.area_id)
                -- Analysts can see initiatives in their area
                OR (up.role = 'Analyst' AND up.area_id = initiatives.area_id)
                -- Users can see initiatives they created or own
                OR up.id = initiatives.created_by
                OR up.id = initiatives.owner_id
            )
        )
    );

-- Initiative creation and modification policies
CREATE POLICY "initiatives_insert_policy" ON public.initiatives
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = initiatives.tenant_id
            AND (
                -- System admins can create initiatives anywhere
                up.is_system_admin = true
                -- CEOs and Admins can create initiatives in their tenant
                OR up.role IN ('CEO', 'Admin')
                -- Managers can create initiatives in their area
                OR (up.role = 'Manager' AND up.area_id = initiatives.area_id)
            )
        )
    );

CREATE POLICY "initiatives_update_policy" ON public.initiatives
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = initiatives.tenant_id
            AND (
                -- System admins can update any initiative
                up.is_system_admin = true
                -- CEOs and Admins can update initiatives in their tenant
                OR up.role IN ('CEO', 'Admin')
                -- Managers can update initiatives in their area
                OR (up.role = 'Manager' AND up.area_id = initiatives.area_id)
                -- Initiative owner can update their initiative
                OR up.id = initiatives.owner_id
            )
        )
    );

CREATE POLICY "initiatives_delete_policy" ON public.initiatives
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = initiatives.tenant_id
            AND (
                -- System admins can delete any initiative
                up.is_system_admin = true
                -- CEOs and Admins can delete initiatives in their tenant
                OR up.role IN ('CEO', 'Admin')
                -- Managers can delete initiatives in their area
                OR (up.role = 'Manager' AND up.area_id = initiatives.area_id)
            )
        )
    );

-- ============================================================================
-- SUBTASKS TABLE POLICIES
-- ============================================================================

-- Subtask access follows initiative access
CREATE POLICY "subtasks_access_policy" ON public.subtasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.initiatives i ON i.id = subtasks.initiative_id
            WHERE up.id = auth.uid()
            AND up.tenant_id = subtasks.tenant_id
            AND (
                -- System admins can see all subtasks
                up.is_system_admin = true
                -- CEOs and Admins can see all subtasks in their tenant
                OR up.role IN ('CEO', 'Admin')
                -- Managers can see subtasks for initiatives in their area
                OR (up.role = 'Manager' AND up.area_id = i.area_id)
                -- Analysts can see subtasks for initiatives in their area
                OR (up.role = 'Analyst' AND up.area_id = i.area_id)
                -- Users can see subtasks for initiatives they created or own
                OR up.id = i.created_by
                OR up.id = i.owner_id
            )
        )
    );

-- Subtask modification policies
CREATE POLICY "subtasks_modify_policy" ON public.subtasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.initiatives i ON i.id = subtasks.initiative_id
            WHERE up.id = auth.uid()
            AND up.tenant_id = subtasks.tenant_id
            AND (
                -- System admins can modify any subtask
                up.is_system_admin = true
                -- CEOs and Admins can modify subtasks in their tenant
                OR up.role IN ('CEO', 'Admin')
                -- Managers can modify subtasks for initiatives in their area
                OR (up.role = 'Manager' AND up.area_id = i.area_id)
                -- Initiative owner can modify subtasks
                OR up.id = i.owner_id
            )
        )
    );

-- ============================================================================
-- ACTIVITIES TABLE POLICIES
-- ============================================================================

-- Activity access follows initiative access
CREATE POLICY "activities_access_policy" ON public.activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.initiatives i ON i.id = activities.initiative_id
            WHERE up.id = auth.uid()
            AND up.tenant_id = activities.tenant_id
            AND (
                -- System admins can see all activities
                up.is_system_admin = true
                -- CEOs and Admins can see all activities in their tenant
                OR up.role IN ('CEO', 'Admin')
                -- Managers can see activities for initiatives in their area
                OR (up.role = 'Manager' AND up.area_id = i.area_id)
                -- Analysts can see activities for initiatives in their area
                OR (up.role = 'Analyst' AND up.area_id = i.area_id)
                -- Users can see activities for initiatives they created or own
                OR up.id = i.created_by
                OR up.id = i.owner_id
                -- Assigned users can see their activities
                OR up.id = activities.assigned_to
            )
        )
    );

-- Activity modification policies
CREATE POLICY "activities_modify_policy" ON public.activities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.initiatives i ON i.id = activities.initiative_id
            WHERE up.id = auth.uid()
            AND up.tenant_id = activities.tenant_id
            AND (
                -- System admins can modify any activity
                up.is_system_admin = true
                -- CEOs and Admins can modify activities in their tenant
                OR up.role IN ('CEO', 'Admin')
                -- Managers can modify activities for initiatives in their area
                OR (up.role = 'Manager' AND up.area_id = i.area_id)
                -- Initiative owner can modify activities
                OR up.id = i.owner_id
                -- Assigned user can update their activity status
                OR up.id = activities.assigned_to
            )
        )
    );

-- ============================================================================
-- PROGRESS_HISTORY TABLE POLICIES
-- ============================================================================

-- Progress history access follows initiative access
CREATE POLICY "progress_history_access_policy" ON public.progress_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.initiatives i ON i.id = progress_history.initiative_id
            WHERE up.id = auth.uid()
            AND up.tenant_id = progress_history.tenant_id
            AND (
                -- System admins can see all progress history
                up.is_system_admin = true
                -- CEOs and Admins can see all progress history in their tenant
                OR up.role IN ('CEO', 'Admin')
                -- Managers can see progress history for initiatives in their area
                OR (up.role = 'Manager' AND up.area_id = i.area_id)
                -- Analysts can see progress history for initiatives in their area
                OR (up.role = 'Analyst' AND up.area_id = i.area_id)
                -- Users can see progress history for initiatives they created or own
                OR up.id = i.created_by
                OR up.id = i.owner_id
            )
        )
    );

-- Only managers and above can create progress history
CREATE POLICY "progress_history_insert_policy" ON public.progress_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.initiatives i ON i.id = progress_history.initiative_id
            WHERE up.id = auth.uid()
            AND up.tenant_id = progress_history.tenant_id
            AND (
                -- System admins can create progress history
                up.is_system_admin = true
                -- CEOs and Admins can create progress history in their tenant
                OR up.role IN ('CEO', 'Admin')
                -- Managers can create progress history for initiatives in their area
                OR (up.role = 'Manager' AND up.area_id = i.area_id)
                -- Initiative owner can create progress history
                OR up.id = i.owner_id
            )
        )
    );

-- ============================================================================
-- AUDIT_LOG TABLE POLICIES
-- ============================================================================

-- Audit log access for transparency and security
CREATE POLICY "audit_log_access_policy" ON public.audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = audit_log.tenant_id
            AND (
                -- System admins can see all audit logs
                up.is_system_admin = true
                -- CEOs and Admins can see audit logs in their tenant
                OR up.role IN ('CEO', 'Admin')
                -- Users can see their own audit entries
                OR up.id = audit_log.user_id
            )
        )
    );

-- All authenticated users can insert audit logs
CREATE POLICY "audit_log_insert_policy" ON public.audit_log
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = audit_log.tenant_id
        )
    );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.areas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.initiatives TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT SELECT, INSERT ON public.progress_history TO authenticated;
GRANT SELECT, INSERT ON public.audit_log TO authenticated;

-- ============================================================================
-- VALIDATION FUNCTIONS
-- ============================================================================

-- Function to validate user has access to tenant
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(user_id UUID, tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = user_id
        AND up.tenant_id = tenant_id
        AND up.is_active = true
    );
END;
$$;

-- Function to validate user has access to area
CREATE OR REPLACE FUNCTION public.user_has_area_access(user_id UUID, area_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles up
        JOIN public.areas a ON a.tenant_id = up.tenant_id
        WHERE up.id = user_id
        AND a.id = area_id
        AND up.is_active = true
        AND (
            -- System admins have access to all areas
            up.is_system_admin = true
            -- CEOs and Admins have access to all areas in their tenant
            OR up.role IN ('CEO', 'Admin')
            -- Managers and Analysts have access to their area
            OR up.area_id = area_id
        )
    );
END;
$$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create indexes for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_role ON public.user_profiles(tenant_id, role, is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_area_role ON public.user_profiles(area_id, role, is_active);
CREATE INDEX IF NOT EXISTS idx_initiatives_tenant_area ON public.initiatives(tenant_id, area_id);
CREATE INDEX IF NOT EXISTS idx_activities_tenant_initiative ON public.activities(tenant_id, initiative_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_tenant_initiative ON public.subtasks(tenant_id, initiative_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_user ON public.audit_log(tenant_id, user_id);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "users_can_view_own_tenant" ON public.tenants IS 'Users can only see their own tenant information';
COMMENT ON POLICY "user_profiles_tenant_access" ON public.user_profiles IS 'Role-based access to user profiles within tenant boundaries';
COMMENT ON POLICY "areas_tenant_access" ON public.areas IS 'Area access based on user role and assigned area';
COMMENT ON POLICY "initiatives_access_policy" ON public.initiatives IS 'Initiative access based on role, area assignment, and ownership';
COMMENT ON POLICY "subtasks_access_policy" ON public.subtasks IS 'Subtask access follows parent initiative access rules';
COMMENT ON POLICY "activities_access_policy" ON public.activities IS 'Activity access based on initiative access and assignment';
COMMENT ON POLICY "audit_log_access_policy" ON public.audit_log IS 'Audit log access for transparency and compliance';

-- ============================================================================
-- TESTING QUERIES (for validation)
-- ============================================================================

-- Test queries to validate RLS policies work correctly
-- These should be run with different user contexts to verify security

/*
-- Test as different user roles:
-- SELECT set_config('request.jwt.claims', '{"sub":"user-uuid"}', true);
-- SELECT * FROM public.initiatives; -- Should only show accessible initiatives
-- SELECT * FROM public.areas; -- Should only show accessible areas
-- SELECT * FROM public.user_profiles; -- Should only show accessible profiles
*/