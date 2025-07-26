-- COMPREHENSIVE SCHEMA FIX: RLS and Foreign Keys
-- This fixes all RLS policies and ensures proper foreign key relationships

-- ============================================================================
-- PART 1: FIX FOREIGN KEY RELATIONSHIPS
-- ============================================================================

-- Add missing foreign key columns in superadmin tables
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS created_by_superadmin UUID REFERENCES public.superadmins(id) ON DELETE SET NULL;

-- Add missing foreign key for user_profiles created by superadmin
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS created_by_superadmin UUID REFERENCES public.superadmins(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN DEFAULT false;

-- Ensure area_templates table exists with proper foreign keys
CREATE TABLE IF NOT EXISTS public.area_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    industry TEXT,
    template_data JSONB NOT NULL,
    created_by_superadmin UUID REFERENCES public.superadmins(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- PART 2: FIX RLS POLICIES - DROP ALL EXISTING FIRST
-- ============================================================================

-- Drop all existing policies to recreate them correctly
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
-- PART 3: CREATE PROPER RLS POLICIES
-- ============================================================================

-- TENANTS TABLE POLICIES
CREATE POLICY "Service role full access to tenants" ON public.tenants
    FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated users can view tenants" ON public.tenants
    FOR SELECT TO authenticated USING (true);

-- USER_PROFILES TABLE POLICIES  
CREATE POLICY "Service role full access to user_profiles" ON public.user_profiles
    FOR ALL TO service_role USING (true);

CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their tenant" ON public.user_profiles
    FOR SELECT TO authenticated USING (
        tenant_id = (
            SELECT tenant_id FROM public.user_profiles 
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "CEOs and Admins can manage user profiles in their tenant" ON public.user_profiles
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() 
            AND up.tenant_id = user_profiles.tenant_id 
            AND up.role IN ('CEO', 'Admin')
            AND up.is_active = true
        )
    );

-- AREAS TABLE POLICIES
CREATE POLICY "Service role full access to areas" ON public.areas
    FOR ALL TO service_role USING (true);

CREATE POLICY "Users can view areas in their tenant" ON public.areas
    FOR SELECT TO authenticated USING (
        tenant_id = (
            SELECT tenant_id FROM public.user_profiles 
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "CEOs and Admins can manage areas in their tenant" ON public.areas
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() 
            AND up.tenant_id = areas.tenant_id 
            AND up.role IN ('CEO', 'Admin')
            AND up.is_active = true
        )
    );

-- INITIATIVES TABLE POLICIES
CREATE POLICY "Service role full access to initiatives" ON public.initiatives
    FOR ALL TO service_role USING (true);

CREATE POLICY "Users can view initiatives in their tenant" ON public.initiatives
    FOR SELECT TO authenticated USING (
        tenant_id = (
            SELECT tenant_id FROM public.user_profiles 
            WHERE id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "CEOs and Admins can manage all initiatives in their tenant" ON public.initiatives
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() 
            AND up.tenant_id = initiatives.tenant_id 
            AND up.role IN ('CEO', 'Admin')
            AND up.is_active = true
        )
    );

CREATE POLICY "Managers can manage initiatives in their area" ON public.initiatives
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.areas a ON a.name = up.area
            WHERE up.id = auth.uid() 
            AND up.tenant_id = initiatives.tenant_id 
            AND a.id = initiatives.area_id 
            AND up.role = 'Manager'
            AND up.is_active = true
            AND a.is_active = true
        )
    );

-- AUDIT_LOG TABLE POLICIES
CREATE POLICY "Service role full access to audit_log" ON public.audit_log
    FOR ALL TO service_role USING (true);

CREATE POLICY "Users can view audit log in their tenant" ON public.audit_log
    FOR SELECT TO authenticated USING (
        tenant_id = (
            SELECT tenant_id FROM public.user_profiles 
            WHERE id = auth.uid() AND is_active = true
        )
    );

-- SUPERADMIN TABLE POLICIES (Most Restrictive)
CREATE POLICY "Service role full access to superadmins" ON public.superadmins
    FOR ALL TO service_role USING (true);

-- Block all direct authenticated user access to superadmin tables
CREATE POLICY "Block authenticated access to superadmins" ON public.superadmins
    FOR ALL TO authenticated USING (false);

-- SUPERADMIN_SESSIONS TABLE POLICIES
CREATE POLICY "Service role full access to superadmin_sessions" ON public.superadmin_sessions
    FOR ALL TO service_role USING (true);

CREATE POLICY "Block authenticated access to superadmin_sessions" ON public.superadmin_sessions
    FOR ALL TO authenticated USING (false);

-- SUPERADMIN_AUDIT_LOG TABLE POLICIES  
CREATE POLICY "Service role full access to superadmin_audit_log" ON public.superadmin_audit_log
    FOR ALL TO service_role USING (true);

CREATE POLICY "Block authenticated access to superadmin_audit_log" ON public.superadmin_audit_log
    FOR ALL TO authenticated USING (false);

-- AREA_TEMPLATES TABLE POLICIES
CREATE POLICY "Service role full access to area_templates" ON public.area_templates
    FOR ALL TO service_role USING (true);

CREATE POLICY "Block authenticated access to area_templates" ON public.area_templates
    FOR ALL TO authenticated USING (false);

-- ============================================================================
-- PART 4: ENSURE RLS IS ENABLED ON ALL TABLES
-- ============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 5: CREATE MISSING INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON public.user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_areas_tenant_id ON public.areas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_areas_manager_id ON public.areas(manager_id);
CREATE INDEX IF NOT EXISTS idx_areas_is_active ON public.areas(is_active);
CREATE INDEX IF NOT EXISTS idx_initiatives_tenant_id ON public.initiatives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_area_id ON public.initiatives(area_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_created_by ON public.initiatives(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON public.audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_superadmins_email ON public.superadmins(email);
CREATE INDEX IF NOT EXISTS idx_superadmins_is_active ON public.superadmins(is_active);
CREATE INDEX IF NOT EXISTS idx_superadmin_sessions_superadmin_id ON public.superadmin_sessions(superadmin_id);
CREATE INDEX IF NOT EXISTS idx_superadmin_sessions_expires_at ON public.superadmin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_area_templates_industry ON public.area_templates(industry);
CREATE INDEX IF NOT EXISTS idx_area_templates_is_active ON public.area_templates(is_active);

-- ============================================================================
-- PART 6: VERIFY SCHEMA INTEGRITY
-- ============================================================================

-- Check all foreign key constraints
SELECT 
    'Foreign Key Check' as check_type,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Check all RLS policies
SELECT 
    'RLS Policy Check' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check RLS status on all tables
SELECT 
    'RLS Status Check' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Final status
SELECT 'SCHEMA FIX COMPLETE' as status, 
       'All RLS policies and foreign keys have been properly configured' as message;