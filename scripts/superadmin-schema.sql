-- Superadmin Database Schema Extensions
-- This script adds superadmin functionality to the existing Mariana platform
-- Run this after the main database setup

-- Enable necessary extensions for security
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create superadmins table
CREATE TABLE superadmins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL, -- bcrypt hashed password
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create superadmin sessions table
CREATE TABLE superadmin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    superadmin_id UUID NOT NULL REFERENCES superadmins(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create superadmin audit log table
CREATE TABLE superadmin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    superadmin_id UUID NOT NULL REFERENCES superadmins(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- e.g., 'CREATE_TENANT', 'DELETE_USER', 'UPDATE_SETTINGS'
    target_type TEXT NOT NULL, -- e.g., 'tenant', 'user', 'area', 'domain'
    target_id UUID, -- ID of affected entity
    details JSONB, -- Additional context and changes
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create area templates table for reusable structures
CREATE TABLE area_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    industry TEXT, -- Optional industry categorization
    template_data JSONB NOT NULL, -- JSON structure of areas
    created_by_superadmin UUID NOT NULL REFERENCES superadmins(id),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extend existing tables for superadmin functionality
ALTER TABLE tenants ADD COLUMN created_by_superadmin UUID REFERENCES superadmins(id);
ALTER TABLE tenants ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE tenants ADD COLUMN settings JSONB DEFAULT '{}';

ALTER TABLE users ADD COLUMN is_system_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN created_by_superadmin UUID REFERENCES superadmins(id);

-- Create indexes for performance
CREATE INDEX idx_superadmin_sessions_token ON superadmin_sessions(session_token);
CREATE INDEX idx_superadmin_sessions_expires ON superadmin_sessions(expires_at);
CREATE INDEX idx_superadmin_audit_superadmin_id ON superadmin_audit_log(superadmin_id);
CREATE INDEX idx_superadmin_audit_created_at ON superadmin_audit_log(created_at);
CREATE INDEX idx_superadmin_audit_action ON superadmin_audit_log(action);
CREATE INDEX idx_area_templates_industry ON area_templates(industry);
CREATE INDEX idx_tenants_created_by_superadmin ON tenants(created_by_superadmin);
CREATE INDEX idx_users_is_system_admin ON users(is_system_admin);

-- Enable Row Level Security (disable for superadmin tables - they need special handling)
ALTER TABLE superadmins ENABLE ROW LEVEL SECURITY;
ALTER TABLE superadmin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE superadmin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE area_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for superadmin tables (very restrictive)
-- Only allow access through dedicated superadmin functions
CREATE POLICY "Superadmin access only through functions" ON superadmins
    FOR ALL USING (false); -- Block all direct access

CREATE POLICY "Superadmin sessions access only through functions" ON superadmin_sessions
    FOR ALL USING (false); -- Block all direct access

CREATE POLICY "Superadmin audit access only through functions" ON superadmin_audit_log
    FOR ALL USING (false); -- Block all direct access

CREATE POLICY "Area templates access only through functions" ON area_templates
    FOR ALL USING (false); -- Block all direct access

-- Superadmin authentication and session management functions
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
    IF v_superadmin_id IS NULL OR NOT crypt(p_password, v_password_hash) = v_password_hash THEN
        -- Log failed attempt
        INSERT INTO superadmin_audit_log (superadmin_id, action, target_type, details, ip_address, user_agent)
        VALUES (COALESCE(v_superadmin_id, '00000000-0000-0000-0000-000000000000'::UUID), 
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
    INSERT INTO tenants (name, industry, description, created_by_superadmin, settings)
    VALUES (p_name, p_industry, p_description, p_superadmin_id, p_settings)
    RETURNING id INTO v_tenant_id;
    
    -- Log action
    INSERT INTO superadmin_audit_log (superadmin_id, action, target_type, target_id, details)
    VALUES (p_superadmin_id, 'CREATE_TENANT', 'tenant', v_tenant_id,
            jsonb_build_object('name', p_name, 'industry', p_industry));
    
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- User management across tenants
CREATE OR REPLACE FUNCTION superadmin_create_user(
    p_superadmin_id UUID,
    p_tenant_id UUID,
    p_email TEXT,
    p_name TEXT,
    p_role TEXT,
    p_area_id UUID DEFAULT NULL
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
    
    -- Create user
    INSERT INTO users (tenant_id, email, name, role, area_id, is_system_admin, created_by_superadmin)
    VALUES (p_tenant_id, p_email, p_name, p_role, p_area_id, true, p_superadmin_id)
    RETURNING id INTO v_user_id;
    
    -- Log action
    INSERT INTO superadmin_audit_log (superadmin_id, action, target_type, target_id, details)
    VALUES (p_superadmin_id, 'CREATE_USER', 'user', v_user_id,
            jsonb_build_object('email', p_email, tenant_id, p_tenant_id, 'role', p_role));
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Get all tenants for superadmin
CREATE OR REPLACE FUNCTION superadmin_get_tenants(
    p_superadmin_id UUID
) RETURNS TABLE (
    id UUID,
    name TEXT,
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
    SELECT t.id, t.name, t.industry, t.description, t.is_active,
           COUNT(u.id) as user_count, t.created_at
    FROM tenants t
    LEFT JOIN users u ON t.id = u.tenant_id
    GROUP BY t.id, t.name, t.industry, t.description, t.is_active, t.created_at
    ORDER BY t.created_at DESC;
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

-- Grant necessary permissions to authenticated users (for function execution)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create initial superadmin (change password immediately after setup)
-- Password: 'TempPassword123!' (MUST be changed on first login)
INSERT INTO superadmins (email, name, password_hash) VALUES 
('admin@stratix-platform.com', 'Platform Administrator', 
 crypt('TempPassword123!', gen_salt('bf', 12)));

COMMIT;