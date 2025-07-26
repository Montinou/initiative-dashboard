-- FIX CURRENT SCHEMA RLS POLICIES
-- Based on the existing schema.sql structure

-- ============================================================================
-- PART 1: ENSURE RLS IS ENABLED ON ALL TABLES
-- ============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: DROP ALL EXISTING POLICIES TO RECREATE THEM
-- ============================================================================

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Service role can manage tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins and CEOs can manage user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view areas in their tenant" ON public.areas;
DROP POLICY IF EXISTS "Admins and CEOs can manage areas" ON public.areas;
DROP POLICY IF EXISTS "Users can view initiatives in their tenant" ON public.initiatives;
DROP POLICY IF EXISTS "Managers can manage initiatives in their area" ON public.initiatives;
DROP POLICY IF EXISTS "CEOs and Admins can manage all initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can view audit log in their tenant" ON public.audit_log;
DROP POLICY IF EXISTS "Service role can manage superadmins" ON public.superadmins;
DROP POLICY IF EXISTS "Service role can manage superadmin sessions" ON public.superadmin_sessions;
DROP POLICY IF EXISTS "Service role can manage superadmin audit log" ON public.superadmin_audit_log;

-- ============================================================================
-- PART 3: CREATE COMPREHENSIVE RLS POLICIES
-- ============================================================================

-- TENANTS TABLE
CREATE POLICY "service_role_tenants_all" ON public.tenants
    FOR ALL TO service_role USING (true);

CREATE POLICY "authenticated_tenants_select" ON public.tenants
    FOR SELECT TO authenticated USING (true);

-- USER_PROFILES TABLE
CREATE POLICY "service_role_user_profiles_all" ON public.user_profiles
    FOR ALL TO service_role USING (true);

CREATE POLICY "users_own_profile_select" ON public.user_profiles
    FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "users_own_profile_update" ON public.user_profiles
    FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "users_tenant_profiles_select" ON public.user_profiles
    FOR SELECT TO authenticated USING (
        tenant_id = (
            SELECT tenant_id FROM public.user_profiles 
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "ceo_admin_manage_profiles" ON public.user_profiles
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() 
            AND up.tenant_id = user_profiles.tenant_id 
            AND up.role::text IN ('CEO', 'Admin')
            AND up.is_active = true
        )
    );

-- AREAS TABLE
CREATE POLICY "service_role_areas_all" ON public.areas
    FOR ALL TO service_role USING (true);

CREATE POLICY "users_tenant_areas_select" ON public.areas
    FOR SELECT TO authenticated USING (
        tenant_id = (
            SELECT tenant_id FROM public.user_profiles 
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "ceo_admin_manage_areas" ON public.areas
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() 
            AND up.tenant_id = areas.tenant_id 
            AND up.role::text IN ('CEO', 'Admin')
            AND up.is_active = true
        )
    );

-- INITIATIVES TABLE
CREATE POLICY "service_role_initiatives_all" ON public.initiatives
    FOR ALL TO service_role USING (true);

CREATE POLICY "users_tenant_initiatives_select" ON public.initiatives
    FOR SELECT TO authenticated USING (
        tenant_id = (
            SELECT tenant_id FROM public.user_profiles 
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "ceo_admin_manage_initiatives" ON public.initiatives
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() 
            AND up.tenant_id = initiatives.tenant_id 
            AND up.role::text IN ('CEO', 'Admin')
            AND up.is_active = true
        )
    );

CREATE POLICY "managers_area_initiatives" ON public.initiatives
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.areas a ON a.name = up.area
            WHERE up.id = auth.uid() 
            AND up.tenant_id = initiatives.tenant_id 
            AND a.id = initiatives.area_id 
            AND up.role::text = 'Manager'
            AND up.is_active = true
            AND a.is_active = true
        )
    );

-- ACTIVITIES TABLE
CREATE POLICY "service_role_activities_all" ON public.activities
    FOR ALL TO service_role USING (true);

CREATE POLICY "users_tenant_activities_select" ON public.activities
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.initiatives i
            JOIN public.user_profiles up ON up.tenant_id = i.tenant_id
            WHERE i.id = activities.initiative_id
            AND up.id = auth.uid()
            AND up.is_active = true
        )
    );

CREATE POLICY "assigned_users_manage_activities" ON public.activities
    FOR ALL TO authenticated USING (
        assigned_to = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.initiatives i
            JOIN public.user_profiles up ON up.tenant_id = i.tenant_id
            WHERE i.id = activities.initiative_id
            AND up.id = auth.uid()
            AND up.role::text IN ('CEO', 'Admin', 'Manager')
            AND up.is_active = true
        )
    );

-- AUDIT_LOG TABLE
CREATE POLICY "service_role_audit_log_all" ON public.audit_log
    FOR ALL TO service_role USING (true);

CREATE POLICY "users_tenant_audit_select" ON public.audit_log
    FOR SELECT TO authenticated USING (
        tenant_id = (
            SELECT tenant_id FROM public.user_profiles 
            WHERE id = auth.uid() AND is_active = true
        )
    );

-- PROGRESS_HISTORY TABLE
CREATE POLICY "service_role_progress_all" ON public.progress_history
    FOR ALL TO service_role USING (true);

CREATE POLICY "users_tenant_progress_select" ON public.progress_history
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.initiatives i
            JOIN public.user_profiles up ON up.tenant_id = i.tenant_id
            WHERE i.id = progress_history.initiative_id
            AND up.id = auth.uid()
            AND up.is_active = true
        )
    );

-- TENANT_DOMAINS TABLE
CREATE POLICY "service_role_tenant_domains_all" ON public.tenant_domains
    FOR ALL TO service_role USING (true);

CREATE POLICY "users_tenant_domains_select" ON public.tenant_domains
    FOR SELECT TO authenticated USING (
        tenant_id = (
            SELECT tenant_id FROM public.user_profiles 
            WHERE id = auth.uid() AND is_active = true
        )
    );

-- TENANT_SETTINGS TABLE
CREATE POLICY "service_role_tenant_settings_all" ON public.tenant_settings
    FOR ALL TO service_role USING (true);

CREATE POLICY "ceo_admin_tenant_settings" ON public.tenant_settings
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() 
            AND up.tenant_id = tenant_settings.tenant_id 
            AND up.role::text IN ('CEO', 'Admin')
            AND up.is_active = true
        )
    );

-- SUPERADMIN TABLES (Most Restrictive - Service Role Only)
CREATE POLICY "service_role_superadmins_all" ON public.superadmins
    FOR ALL TO service_role USING (true);

CREATE POLICY "block_authenticated_superadmins" ON public.superadmins
    FOR ALL TO authenticated USING (false);

CREATE POLICY "service_role_superadmin_sessions_all" ON public.superadmin_sessions
    FOR ALL TO service_role USING (true);

CREATE POLICY "block_authenticated_sessions" ON public.superadmin_sessions
    FOR ALL TO authenticated USING (false);

CREATE POLICY "service_role_superadmin_audit_all" ON public.superadmin_audit_log
    FOR ALL TO service_role USING (true);

CREATE POLICY "block_authenticated_audit" ON public.superadmin_audit_log
    FOR ALL TO authenticated USING (false);

CREATE POLICY "service_role_area_templates_all" ON public.area_templates
    FOR ALL TO service_role USING (true);

CREATE POLICY "block_authenticated_templates" ON public.area_templates
    FOR ALL TO authenticated USING (false);

-- ============================================================================
-- PART 4: CREATE ESSENTIAL FUNCTIONS (if missing)
-- ============================================================================

-- Updated function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Create triggers for updated_at (if they don't exist)
DROP TRIGGER IF EXISTS handle_tenants_updated_at ON public.tenants;
CREATE TRIGGER handle_tenants_updated_at 
    BEFORE UPDATE ON public.tenants 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER handle_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_areas_updated_at ON public.areas;
CREATE TRIGGER handle_areas_updated_at 
    BEFORE UPDATE ON public.areas 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_initiatives_updated_at ON public.initiatives;
CREATE TRIGGER handle_initiatives_updated_at 
    BEFORE UPDATE ON public.initiatives 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_superadmins_updated_at ON public.superadmins;
CREATE TRIGGER handle_superadmins_updated_at 
    BEFORE UPDATE ON public.superadmins 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- PART 5: CREATE SUPERADMIN USER WITH CORRECT CREDENTIALS
-- ============================================================================

-- Create the superadmin user
INSERT INTO public.superadmins (email, name, password_hash, is_active) VALUES (
    'agusmontoya@gmail.com',
    'Agus Montoya - Platform Administrator',
    'X5r82Pe1p8sNuKreBKDPiWBfF/iD6Tn8EE+QdkTeIFBNjoHQds77KhhQzDkkeSX2',
    true
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());

-- ============================================================================
-- PART 6: VERIFICATION
-- ============================================================================

-- Check RLS status
SELECT 
    'RLS Status Check' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check superadmin user
SELECT 
    'Superadmin User Check' as check_type,
    email,
    name,
    is_active,
    LENGTH(password_hash) as hash_length,
    created_at
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com';

-- Final status
SELECT 'SCHEMA RLS FIX COMPLETE' as status, 
       'Login ready at /superadmin/login with agusmontoya@gmail.com / btcStn60' as message;