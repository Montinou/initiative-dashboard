-- COMPLETE DATABASE RESET AND SETUP
-- This script wipes everything and creates a clean setup with demo data

-- ============================================================================
-- STEP 1: DROP EVERYTHING (NUCLEAR OPTION)
-- ============================================================================

-- Drop all triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
DROP TRIGGER IF EXISTS on_profile_updated ON public.user_profiles;
DROP TRIGGER IF EXISTS handle_tenants_updated_at ON public.tenants;
DROP TRIGGER IF EXISTS handle_user_profiles_updated_at ON public.user_profiles;
DROP TRIGGER IF EXISTS handle_areas_updated_at ON public.areas;
DROP TRIGGER IF EXISTS handle_initiatives_updated_at ON public.initiatives;
DROP TRIGGER IF EXISTS handle_superadmins_updated_at ON public.superadmins;

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_update() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_delete() CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_to_auth() CASCADE;
DROP FUNCTION IF EXISTS public.assign_user_to_tenant(UUID, UUID, user_role) CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- Drop all tables (order matters due to foreign keys)
DROP TABLE IF EXISTS public.progress_history CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.initiatives CASCADE;
DROP TABLE IF EXISTS public.areas CASCADE;
DROP TABLE IF EXISTS public.superadmin_audit_log CASCADE;
DROP TABLE IF EXISTS public.superadmin_sessions CASCADE;
DROP TABLE IF EXISTS public.area_templates CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.tenant_domains CASCADE;
DROP TABLE IF EXISTS public.tenant_settings CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.superadmins CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS tenant_status CASCADE;

-- Clean auth tables (be careful here) - disable triggers first
ALTER TABLE auth.identities DISABLE TRIGGER ALL;
ALTER TABLE auth.users DISABLE TRIGGER ALL;

-- Clear in correct order (identities first due to foreign key)
TRUNCATE auth.identities RESTART IDENTITY CASCADE;
TRUNCATE auth.users RESTART IDENTITY CASCADE;

-- Re-enable triggers
ALTER TABLE auth.identities ENABLE TRIGGER ALL;
ALTER TABLE auth.users ENABLE TRIGGER ALL;

-- ============================================================================
-- STEP 2: CREATE TYPES AND EXTENSIONS
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('CEO', 'Admin', 'Manager', 'Analyst');
CREATE TYPE tenant_status AS ENUM ('active', 'inactive', 'suspended');

-- ============================================================================
-- STEP 3: CREATE TABLES
-- ============================================================================

-- Create superadmins table (independent system)
CREATE TABLE public.superadmins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create superadmin sessions table
CREATE TABLE public.superadmin_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    superadmin_id UUID REFERENCES public.superadmins(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create superadmin audit log table
CREATE TABLE public.superadmin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    superadmin_id UUID REFERENCES public.superadmins(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create tenants table
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    description TEXT,
    industry TEXT,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_by_superadmin UUID REFERENCES public.superadmins(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user profiles table (extends auth.users)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'Analyst',
    area TEXT,
    avatar_url TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    is_system_admin BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_by_superadmin UUID REFERENCES public.superadmins(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, email)
);

-- Create areas table
CREATE TABLE public.areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    manager_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, name)
);

-- Create area templates table
CREATE TABLE public.area_templates (
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

-- Create initiatives table
CREATE TABLE public.initiatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold')),
    priority TEXT DEFAULT 'medium',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    target_date DATE,
    completion_date DATE,
    budget DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create activities table
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiative_id UUID REFERENCES public.initiatives(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status TEXT DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'En Progreso', 'Completado', 'Cancelado')),
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create progress history table
CREATE TABLE public.progress_history (
    id SERIAL PRIMARY KEY,
    initiative_id UUID REFERENCES public.initiatives(id) ON DELETE CASCADE,
    previous_progress INTEGER NOT NULL,
    new_progress INTEGER NOT NULL,
    progress_notes TEXT,
    obstacles TEXT,
    enhancers TEXT,
    updated_by INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tenant domains table
CREATE TABLE public.tenant_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    domain TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create tenant settings table
CREATE TABLE public.tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audit log table
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- STEP 4: CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_user_profiles_tenant_id ON public.user_profiles(tenant_id);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_user_profiles_area ON public.user_profiles(area);
CREATE INDEX idx_areas_tenant_id ON public.areas(tenant_id);
CREATE INDEX idx_areas_manager_id ON public.areas(manager_id);
CREATE INDEX idx_initiatives_tenant_id ON public.initiatives(tenant_id);
CREATE INDEX idx_initiatives_area_id ON public.initiatives(area_id);
CREATE INDEX idx_initiatives_created_by ON public.initiatives(created_by);
CREATE INDEX idx_audit_log_tenant_id ON public.audit_log(tenant_id);
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_superadmin_sessions_token ON public.superadmin_sessions(session_token);
CREATE INDEX idx_superadmin_sessions_expires ON public.superadmin_sessions(expires_at);

-- ============================================================================
-- STEP 5: ENABLE RLS
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
-- STEP 6: CREATE RLS POLICIES
-- ============================================================================

-- Service role policies (full access)
CREATE POLICY "service_role_all_tenants" ON public.tenants FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_user_profiles" ON public.user_profiles FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_areas" ON public.areas FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_initiatives" ON public.initiatives FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_activities" ON public.activities FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_audit_log" ON public.audit_log FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_superadmins" ON public.superadmins FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_superadmin_sessions" ON public.superadmin_sessions FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_superadmin_audit_log" ON public.superadmin_audit_log FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_area_templates" ON public.area_templates FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_tenant_domains" ON public.tenant_domains FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_tenant_settings" ON public.tenant_settings FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_progress_history" ON public.progress_history FOR ALL TO service_role USING (true);

-- Authenticated user policies
CREATE POLICY "users_view_own_tenant" ON public.tenants FOR SELECT TO authenticated USING (
    id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
);

CREATE POLICY "users_view_own_profile" ON public.user_profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "users_update_own_profile" ON public.user_profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "users_view_tenant_areas" ON public.areas FOR SELECT TO authenticated USING (
    tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
);

CREATE POLICY "users_view_tenant_initiatives" ON public.initiatives FOR SELECT TO authenticated USING (
    tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
);

-- Block authenticated users from superadmin tables
CREATE POLICY "block_auth_superadmins" ON public.superadmins FOR ALL TO authenticated USING (false);
CREATE POLICY "block_auth_superadmin_sessions" ON public.superadmin_sessions FOR ALL TO authenticated USING (false);
CREATE POLICY "block_auth_superadmin_audit" ON public.superadmin_audit_log FOR ALL TO authenticated USING (false);
CREATE POLICY "block_auth_area_templates" ON public.area_templates FOR ALL TO authenticated USING (false);

-- ============================================================================
-- STEP 7: CREATE FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Updated timestamp function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER handle_tenants_updated_at 
    BEFORE UPDATE ON public.tenants 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_areas_updated_at 
    BEFORE UPDATE ON public.areas 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_initiatives_updated_at 
    BEFORE UPDATE ON public.initiatives 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_superadmins_updated_at 
    BEFORE UPDATE ON public.superadmins 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Success message
SELECT 'DATABASE SCHEMA CREATED' as status, 'Ready for data insertion' as message;