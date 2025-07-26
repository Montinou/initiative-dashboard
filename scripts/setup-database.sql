-- Script to set up Supabase database schema manually
-- Run this in the Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('CEO', 'Admin', 'Manager', 'Analyst');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    description TEXT,
    industry TEXT,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'Analyst',
    area TEXT, -- For managers, specifies their department
    avatar_url TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, email)
);

-- Create areas/departments table
CREATE TABLE IF NOT EXISTS public.areas (
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

-- Create superadmins table
CREATE TABLE IF NOT EXISTS public.superadmins (
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
CREATE TABLE IF NOT EXISTS public.superadmin_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    superadmin_id UUID REFERENCES public.superadmins(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create superadmin audit log table
CREATE TABLE IF NOT EXISTS public.superadmin_audit_log (
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

-- Create initiatives table
CREATE TABLE IF NOT EXISTS public.initiatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'planning',
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

-- Create audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_area ON public.user_profiles(area);
CREATE INDEX IF NOT EXISTS idx_areas_tenant_id ON public.areas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_areas_manager_id ON public.areas(manager_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_tenant_id ON public.initiatives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_area_id ON public.initiatives(area_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_created_by ON public.initiatives(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON public.audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_superadmin_sessions_token ON public.superadmin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_superadmin_sessions_expires ON public.superadmin_sessions(expires_at);

-- Insert default tenant and admin user (for development)
INSERT INTO public.tenants (id, name, subdomain, description, industry) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'FEMA Electricidad',
    'fema-electricidad',
    'Empresa eléctrica con múltiples divisiones',
    'Electricidad'
) ON CONFLICT (subdomain) DO NOTHING;

-- Insert FEMA divisions as areas
INSERT INTO public.areas (tenant_id, name, description) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'División Iluminación', 'División especializada en sistemas de iluminación'),
    ('550e8400-e29b-41d4-a716-446655440000', 'División Electricidad', 'División de instalaciones eléctricas generales'),
    ('550e8400-e29b-41d4-a716-446655440000', 'División Industria', 'División de automatización industrial'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Administración', 'Área administrativa y financiera'),
    ('550e8400-e29b-41d4-a716-446655440000', 'E-commerce', 'Plataforma de ventas online'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Logística', 'Gestión de almacén y distribución')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Create RLS policies (Enable RLS first)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmin_audit_log ENABLE ROW LEVEL SECURITY;

-- Tenants policies (only accessible by service role)
CREATE POLICY "Service role can manage tenants" ON public.tenants
    FOR ALL USING (auth.role() = 'service_role');

-- User profiles policies
CREATE POLICY "Users can view profiles in their tenant" ON public.user_profiles
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM public.user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins and CEOs can manage user profiles" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = user_profiles.tenant_id
            AND up.role IN ('CEO', 'Admin')
        )
    );

-- Areas policies
CREATE POLICY "Users can view areas in their tenant" ON public.areas
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM public.user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins and CEOs can manage areas" ON public.areas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = areas.tenant_id
            AND up.role IN ('CEO', 'Admin')
        )
    );

-- Initiatives policies
CREATE POLICY "Users can view initiatives in their tenant" ON public.initiatives
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM public.user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage initiatives in their area" ON public.initiatives
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.areas a ON a.name = up.area
            WHERE up.id = auth.uid()
            AND up.tenant_id = initiatives.tenant_id
            AND a.id = initiatives.area_id
            AND up.role = 'Manager'
        )
    );

CREATE POLICY "CEOs and Admins can manage all initiatives" ON public.initiatives
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = initiatives.tenant_id
            AND up.role IN ('CEO', 'Admin')
        )
    );

-- Audit log policies
CREATE POLICY "Users can view audit log in their tenant" ON public.audit_log
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM public.user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Superadmin policies (only service role access)
CREATE POLICY "Service role can manage superadmins" ON public.superadmins
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage superadmin sessions" ON public.superadmin_sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage superadmin audit log" ON public.superadmin_audit_log
    FOR ALL USING (auth.role() = 'service_role');

-- Functions for common operations

-- Function to get user role and tenant
CREATE OR REPLACE FUNCTION public.get_user_context()
RETURNS TABLE (
    user_id UUID,
    tenant_id UUID,
    role user_role,
    area TEXT
) LANGUAGE sql SECURITY DEFINER AS $$
    SELECT 
        up.id,
        up.tenant_id,
        up.role,
        up.area
    FROM public.user_profiles up
    WHERE up.id = auth.uid();
$$;

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
    action_name TEXT,
    resource_type TEXT,
    resource_id UUID DEFAULT NULL,
    old_values JSONB DEFAULT NULL,
    new_values JSONB DEFAULT NULL,
    ip_address INET DEFAULT NULL,
    user_agent TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    audit_id UUID;
    user_tenant_id UUID;
BEGIN
    -- Get user's tenant
    SELECT tenant_id INTO user_tenant_id
    FROM public.user_profiles
    WHERE id = auth.uid();
    
    -- Insert audit log entry
    INSERT INTO public.audit_log (
        tenant_id,
        user_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        ip_address,
        user_agent
    ) VALUES (
        user_tenant_id,
        auth.uid(),
        action_name,
        resource_type,
        resource_id,
        old_values,
        new_values,
        ip_address,
        user_agent
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Create triggers
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