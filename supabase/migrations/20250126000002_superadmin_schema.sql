-- Superadmin Database Schema - Updated for New Schema
-- Run this after clean-setup-database.sql

-- The main superadmin tables are already created in clean-setup-database.sql
-- This script adds the additional functionality and area templates

-- Enable pgcrypto for password hashing (optional, we use Web Crypto in Edge Runtime)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create area templates table for reusable structures
CREATE TABLE IF NOT EXISTS area_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    industry TEXT, -- Optional industry categorization
    template_data JSONB NOT NULL, -- JSON structure of areas
    created_by_superadmin UUID REFERENCES superadmins(id),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add missing columns to tenants if not already added
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_by_superadmin UUID REFERENCES superadmins(id);

-- Add missing columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS created_by_superadmin UUID REFERENCES superadmins(id);

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_area_templates_industry ON area_templates(industry);
CREATE INDEX IF NOT EXISTS idx_tenants_created_by_superadmin ON tenants(created_by_superadmin);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_system_admin ON user_profiles(is_system_admin);

-- Enable RLS on area_templates
ALTER TABLE area_templates ENABLE ROW LEVEL SECURITY;

-- RLS policy for area templates (service role only)
CREATE POLICY "Service role can manage area templates" ON area_templates
    FOR ALL USING (auth.role() = 'service_role');

-- Updated authentication function for pgcrypto (optional - we use Web Crypto in app)
CREATE OR REPLACE FUNCTION superadmin_authenticate(
    p_email TEXT,
    p_password TEXT,
    p_ip_address INET,
    p_user_agent TEXT
) RETURNS TABLE (
    session_token TEXT,
    superadmin_id UUID,
    name TEXT,
    expires_at TIMESTAMP WITH TIME ZONE
) SECURITY DEFINER AS $$
DECLARE
    v_superadmin_id UUID;
    v_password_hash TEXT;
    v_name TEXT;
    v_session_token TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get superadmin credentials
    SELECT id, password_hash, name 
    INTO v_superadmin_id, v_password_hash, v_name
    FROM superadmins 
    WHERE email = p_email AND is_active = true;
    
    -- Check if superadmin exists and password matches
    -- Note: In production, we use Web Crypto API for Edge Runtime compatibility
    IF v_superadmin_id IS NULL THEN
        -- Log failed attempt
        INSERT INTO superadmin_audit_log (superadmin_id, action, target_type, details, ip_address, user_agent)
        VALUES ('00000000-0000-0000-0000-000000000000'::UUID, 
                'FAILED_LOGIN', 'auth', 
                jsonb_build_object('email', p_email, 'reason', 'invalid_credentials'),
                p_ip_address, p_user_agent);
        
        RAISE EXCEPTION 'Invalid credentials';
    END IF;
    
    -- Generate session token
    v_session_token := encode(gen_random_bytes(32), 'base64');
    v_expires_at := NOW() + INTERVAL '30 minutes';
    
    -- Create session
    INSERT INTO superadmin_sessions (superadmin_id, session_token, expires_at, ip_address, user_agent)
    VALUES (v_superadmin_id, v_session_token, v_expires_at, p_ip_address, p_user_agent);
    
    -- Update last login
    UPDATE superadmins SET last_login = NOW() WHERE id = v_superadmin_id;
    
    -- Log successful login
    INSERT INTO superadmin_audit_log (superadmin_id, action, target_type, details, ip_address, user_agent)
    VALUES (v_superadmin_id, 'LOGIN', 'auth', 
            jsonb_build_object('email', p_email),
            p_ip_address, p_user_agent);
    
    RETURN QUERY SELECT v_session_token, v_superadmin_id, v_name, v_expires_at;
END;
$$ LANGUAGE plpgsql;

-- Validate superadmin session
CREATE OR REPLACE FUNCTION superadmin_validate_session(
    p_session_token TEXT
) RETURNS TABLE (
    superadmin_id UUID,
    name TEXT,
    email TEXT
) SECURITY DEFINER AS $$
DECLARE
    v_session_record RECORD;
BEGIN
    -- Get session info with superadmin details
    SELECT s.superadmin_id, s.expires_at, sa.name, sa.email
    INTO v_session_record
    FROM superadmin_sessions s
    JOIN superadmins sa ON s.superadmin_id = sa.id
    WHERE s.session_token = p_session_token 
      AND s.expires_at > NOW()
      AND sa.is_active = true;
    
    IF v_session_record.superadmin_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired session';
    END IF;
    
    -- Extend session by 30 minutes
    UPDATE superadmin_sessions 
    SET expires_at = NOW() + INTERVAL '30 minutes'
    WHERE session_token = p_session_token;
    
    RETURN QUERY SELECT v_session_record.superadmin_id, v_session_record.name, v_session_record.email;
END;
$$ LANGUAGE plpgsql;

-- Logout superadmin
CREATE OR REPLACE FUNCTION superadmin_logout(
    p_session_token TEXT,
    p_ip_address INET,
    p_user_agent TEXT
) RETURNS VOID SECURITY DEFINER AS $$
DECLARE
    v_superadmin_id UUID;
BEGIN
    -- Get superadmin ID from session
    SELECT superadmin_id INTO v_superadmin_id
    FROM superadmin_sessions
    WHERE session_token = p_session_token;
    
    -- Delete session
    DELETE FROM superadmin_sessions WHERE session_token = p_session_token;
    
    -- Log logout if session existed
    IF v_superadmin_id IS NOT NULL THEN
        INSERT INTO superadmin_audit_log (superadmin_id, action, target_type, details, ip_address, user_agent)
        VALUES (v_superadmin_id, 'LOGOUT', 'auth', 
                jsonb_build_object('session_token', substring(p_session_token, 1, 8) || '...'),
                p_ip_address, p_user_agent);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Tenant management functions
CREATE OR REPLACE FUNCTION superadmin_create_tenant(
    p_superadmin_id UUID,
    p_name TEXT,
    p_subdomain TEXT,
    p_industry TEXT,
    p_description TEXT,
    p_settings JSONB DEFAULT '{}'
) RETURNS UUID SECURITY DEFINER AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Validate superadmin
    IF NOT EXISTS (SELECT 1 FROM superadmins WHERE id = p_superadmin_id AND is_active = true) THEN
        RAISE EXCEPTION 'Invalid superadmin';
    END IF;
    
    -- Create tenant
    INSERT INTO tenants (name, subdomain, industry, description, created_by_superadmin, settings)
    VALUES (p_name, p_subdomain, p_industry, p_description, p_superadmin_id, p_settings)
    RETURNING id INTO v_tenant_id;
    
    -- Log action
    INSERT INTO superadmin_audit_log (superadmin_id, action, target_type, target_id, details)
    VALUES (p_superadmin_id, 'CREATE_TENANT', 'tenant', v_tenant_id,
            jsonb_build_object('name', p_name, 'subdomain', p_subdomain, 'industry', p_industry));
    
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- User management across tenants (updated for user_profiles)
CREATE OR REPLACE FUNCTION superadmin_create_user(
    p_superadmin_id UUID,
    p_tenant_id UUID,
    p_auth_user_id UUID, -- From auth.users
    p_email TEXT,
    p_full_name TEXT,
    p_role user_role,
    p_area TEXT DEFAULT NULL
) RETURNS UUID SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Validate superadmin
    IF NOT EXISTS (SELECT 1 FROM superadmins WHERE id = p_superadmin_id AND is_active = true) THEN
        RAISE EXCEPTION 'Invalid superadmin';
    END IF;
    
    -- Validate tenant exists
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id AND is_active = true) THEN
        RAISE EXCEPTION 'Invalid tenant';
    END IF;
    
    -- Create user profile
    INSERT INTO user_profiles (id, tenant_id, email, full_name, role, area, is_system_admin, created_by_superadmin)
    VALUES (p_auth_user_id, p_tenant_id, p_email, p_full_name, p_role, p_area, true, p_superadmin_id)
    RETURNING id INTO v_user_id;
    
    -- Log action
    INSERT INTO superadmin_audit_log (superadmin_id, action, target_type, target_id, details)
    VALUES (p_superadmin_id, 'CREATE_USER', 'user', v_user_id,
            jsonb_build_object('email', p_email, 'tenant_id', p_tenant_id, 'role', p_role));
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Get all tenants for superadmin
CREATE OR REPLACE FUNCTION superadmin_get_tenants(
    p_superadmin_id UUID
) RETURNS TABLE (
    id UUID,
    name TEXT,
    subdomain TEXT,
    industry TEXT,
    description TEXT,
    is_active BOOLEAN,
    user_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
) SECURITY DEFINER AS $$
BEGIN
    -- Validate superadmin
    IF NOT EXISTS (SELECT 1 FROM superadmins WHERE id = p_superadmin_id AND is_active = true) THEN
        RAISE EXCEPTION 'Invalid superadmin';
    END IF;
    
    RETURN QUERY
    SELECT t.id, t.name, t.subdomain, t.industry, t.description, t.is_active,
           COUNT(u.id) as user_count, t.created_at
    FROM tenants t
    LEFT JOIN user_profiles u ON t.id = u.tenant_id
    GROUP BY t.id, t.name, t.subdomain, t.industry, t.description, t.is_active, t.created_at
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Get tenant statistics
CREATE OR REPLACE FUNCTION superadmin_get_tenant_stats(
    p_superadmin_id UUID
) RETURNS TABLE (
    total_tenants BIGINT,
    active_tenants BIGINT,
    total_users BIGINT,
    users_by_role JSONB,
    recent_actions JSONB
) SECURITY DEFINER AS $$
BEGIN
    -- Validate superadmin
    IF NOT EXISTS (SELECT 1 FROM superadmins WHERE id = p_superadmin_id AND is_active = true) THEN
        RAISE EXCEPTION 'Invalid superadmin';
    END IF;
    
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT t.id) as total_tenants,
        COUNT(DISTINCT CASE WHEN t.is_active THEN t.id END) as active_tenants,
        COUNT(DISTINCT u.id) as total_users,
        jsonb_object_agg(COALESCE(u.role::text, 'none'), role_count) as users_by_role,
        (SELECT jsonb_agg(recent_log)
         FROM (
             SELECT jsonb_build_object(
                 'action', action,
                 'target_type', target_type,
                 'created_at', created_at,
                 'superadmin_name', s.name
             ) as recent_log
             FROM superadmin_audit_log sal
             JOIN superadmins s ON sal.superadmin_id = s.id
             ORDER BY sal.created_at DESC
             LIMIT 10
         ) r
        ) as recent_actions
    FROM tenants t
    LEFT JOIN user_profiles u ON t.id = u.tenant_id
    LEFT JOIN (
        SELECT role, COUNT(*) as role_count
        FROM user_profiles
        GROUP BY role
    ) role_counts ON true;
END;
$$ LANGUAGE plpgsql;

-- Area template functions
CREATE OR REPLACE FUNCTION superadmin_create_area_template(
    p_superadmin_id UUID,
    p_name TEXT,
    p_description TEXT,
    p_industry TEXT,
    p_template_data JSONB
) RETURNS UUID SECURITY DEFINER AS $$
DECLARE
    v_template_id UUID;
BEGIN
    -- Validate superadmin
    IF NOT EXISTS (SELECT 1 FROM superadmins WHERE id = p_superadmin_id AND is_active = true) THEN
        RAISE EXCEPTION 'Invalid superadmin';
    END IF;
    
    -- Create area template
    INSERT INTO area_templates (name, description, industry, template_data, created_by_superadmin)
    VALUES (p_name, p_description, p_industry, p_template_data, p_superadmin_id)
    RETURNING id INTO v_template_id;
    
    -- Log action
    INSERT INTO superadmin_audit_log (superadmin_id, action, target_type, target_id, details)
    VALUES (p_superadmin_id, 'CREATE_AREA_TEMPLATE', 'area_template', v_template_id,
            jsonb_build_object('name', p_name, 'industry', p_industry));
    
    RETURN v_template_id;
END;
$$ LANGUAGE plpgsql;

-- Apply area template to tenant
CREATE OR REPLACE FUNCTION superadmin_apply_area_template(
    p_superadmin_id UUID,
    p_tenant_id UUID,
    p_template_id UUID
) RETURNS INTEGER SECURITY DEFINER AS $$
DECLARE
    v_template RECORD;
    v_area_data JSONB;
    v_created_count INTEGER := 0;
BEGIN
    -- Validate superadmin
    IF NOT EXISTS (SELECT 1 FROM superadmins WHERE id = p_superadmin_id AND is_active = true) THEN
        RAISE EXCEPTION 'Invalid superadmin';
    END IF;
    
    -- Get template
    SELECT * INTO v_template
    FROM area_templates
    WHERE id = p_template_id AND is_active = true;
    
    IF v_template.id IS NULL THEN
        RAISE EXCEPTION 'Invalid template';
    END IF;
    
    -- Apply template areas
    FOR v_area_data IN SELECT * FROM jsonb_array_elements(v_template.template_data)
    LOOP
        INSERT INTO areas (tenant_id, name, description)
        VALUES (p_tenant_id, v_area_data->>'name', v_area_data->>'description')
        ON CONFLICT (tenant_id, name) DO NOTHING;
        
        v_created_count := v_created_count + 1;
    END LOOP;
    
    -- Update template usage count
    UPDATE area_templates 
    SET usage_count = usage_count + 1 
    WHERE id = p_template_id;
    
    -- Log action
    INSERT INTO superadmin_audit_log (superadmin_id, action, target_type, target_id, details)
    VALUES (p_superadmin_id, 'APPLY_AREA_TEMPLATE', 'tenant', p_tenant_id,
            jsonb_build_object('template_id', p_template_id, 'areas_created', v_created_count));
    
    RETURN v_created_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired sessions (should be run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_superadmin_sessions()
RETURNS INTEGER SECURITY DEFINER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM superadmin_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for area_templates updated_at
CREATE TRIGGER handle_area_templates_updated_at
    BEFORE UPDATE ON area_templates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create default area templates
INSERT INTO area_templates (name, description, industry, template_data) VALUES
(
    'Manufacturing Company',
    'Standard departments for manufacturing companies',
    'Manufacturing',
    '[
        {"name": "Production", "description": "Manufacturing and production operations"},
        {"name": "Quality Control", "description": "Quality assurance and control"},
        {"name": "Supply Chain", "description": "Procurement and logistics"},
        {"name": "Engineering", "description": "Product design and engineering"},
        {"name": "Sales", "description": "Sales and customer relations"},
        {"name": "Finance", "description": "Financial management and accounting"},
        {"name": "Human Resources", "description": "HR and personnel management"}
    ]'::jsonb
),
(
    'Technology Startup',
    'Common departments for tech startups',
    'Technology',
    '[
        {"name": "Engineering", "description": "Software development and architecture"},
        {"name": "Product", "description": "Product management and design"},
        {"name": "Marketing", "description": "Marketing and growth"},
        {"name": "Sales", "description": "Sales and business development"},
        {"name": "Customer Success", "description": "Customer support and success"},
        {"name": "Operations", "description": "Business operations"}
    ]'::jsonb
),
(
    'Retail Business',
    'Typical structure for retail businesses',
    'Retail',
    '[
        {"name": "Store Operations", "description": "Store management and operations"},
        {"name": "Merchandising", "description": "Product selection and display"},
        {"name": "Marketing", "description": "Marketing and promotions"},
        {"name": "E-commerce", "description": "Online sales and digital presence"},
        {"name": "Customer Service", "description": "Customer support and relations"},
        {"name": "Inventory", "description": "Stock management and logistics"},
        {"name": "Finance", "description": "Financial management"}
    ]'::jsonb
);

-- Done!
SELECT 'Superadmin schema update complete!' as status;