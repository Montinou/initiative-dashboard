-- ============================================================
-- Migration 10: Add Organization Admin Panel Tables
-- ============================================================
-- This migration adds tables required for the organization admin panel:
-- - organization_settings for branding and configuration
-- - invitations for user invitation tracking
-- - Additional columns for existing tables
-- ============================================================

-- ============================================================
-- Add branding columns to organizations table
-- ============================================================
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS subdomain text,
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS company_size text,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#8B5CF6';

-- ============================================================
-- Organization Settings table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  settings_type text NOT NULL, -- 'branding', 'notifications', 'security', 'advanced'
  settings_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT organization_settings_pkey PRIMARY KEY (id),
  CONSTRAINT unique_tenant_settings_type UNIQUE (tenant_id, settings_type)
);

-- ============================================================
-- Invitations table
-- ============================================================
-- Custom invitation status enum
DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('sent', 'accepted', 'expired', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  email text NOT NULL,
  role user_role NOT NULL,
  area_id uuid, -- Optional area assignment
  status invitation_status NOT NULL DEFAULT 'sent',
  custom_message text,
  sent_by uuid NOT NULL, -- User who sent the invitation
  token text NOT NULL UNIQUE, -- Invitation token for verification
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  last_reminder_sent timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT invitations_pkey PRIMARY KEY (id),
  CONSTRAINT check_expiration CHECK (expires_at > created_at)
);

-- ============================================================
-- Update areas table to add is_active column
-- ============================================================
ALTER TABLE public.areas 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- ============================================================
-- Update objectives table to add missing columns
-- ============================================================
ALTER TABLE public.objectives 
ADD COLUMN IF NOT EXISTS quarter text, -- Q1-2024, Q2-2024, etc.
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'overdue')),
ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
ADD COLUMN IF NOT EXISTS target_date date,
ADD COLUMN IF NOT EXISTS metrics jsonb DEFAULT '[]'; -- Array of success metrics

-- ============================================================
-- Indexes for better performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_invitations_tenant_id ON public.invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.invitations(expires_at);

CREATE INDEX IF NOT EXISTS idx_organization_settings_tenant_id ON public.organization_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_organization_settings_type ON public.organization_settings(settings_type);

CREATE INDEX IF NOT EXISTS idx_areas_tenant_id ON public.areas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_areas_manager_id ON public.areas(manager_id);
CREATE INDEX IF NOT EXISTS idx_areas_is_active ON public.areas(is_active);

CREATE INDEX IF NOT EXISTS idx_objectives_area_id ON public.objectives(area_id);
CREATE INDEX IF NOT EXISTS idx_objectives_quarter ON public.objectives(quarter);
CREATE INDEX IF NOT EXISTS idx_objectives_status ON public.objectives(status);
CREATE INDEX IF NOT EXISTS idx_objectives_priority ON public.objectives(priority);

CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_area_id ON public.user_profiles(area_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON public.user_profiles(is_active);

-- ============================================================
-- Add comments for documentation
-- ============================================================
COMMENT ON TABLE public.organization_settings IS 'Configuration settings for organizations with JSON storage for flexibility';
COMMENT ON TABLE public.invitations IS 'User invitation tracking with email delivery and expiration management';
COMMENT ON COLUMN public.invitations.token IS 'Secure token for invitation verification and acceptance';
COMMENT ON COLUMN public.invitations.custom_message IS 'Personalized message included in invitation email';
COMMENT ON COLUMN public.organization_settings.settings_data IS 'JSON data containing configuration values for the specific settings type';