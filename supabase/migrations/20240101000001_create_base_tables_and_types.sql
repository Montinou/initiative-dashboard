-- =============================================
-- Migration 001: Create Base Tables and Types
-- =============================================
-- This migration creates the foundational database structure
-- including custom types and base tables without foreign key constraints
-- to avoid circular dependencies.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Custom Data Types
-- ============================================================

-- User role enumeration for role-based access control
CREATE TYPE user_role AS ENUM ('CEO', 'Admin', 'Manager');

-- Quarter enumeration for tracking initiatives by quarters
CREATE TYPE initiative_quarter AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');

-- ============================================================
-- Base Tables (without foreign key constraints)
-- ============================================================

-- Tenants table: Multi-tenant support
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  subdomain text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT tenants_pkey PRIMARY KEY (id),
  CONSTRAINT tenants_subdomain_key UNIQUE (subdomain)
);

-- Add comment for documentation
COMMENT ON TABLE public.tenants IS 'Multi-tenant organizations';
COMMENT ON COLUMN public.tenants.subdomain IS 'Unique subdomain for tenant identification';

-- Quarters table: Track quarterly periods
CREATE TABLE public.quarters (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  quarter_name initiative_quarter NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  CONSTRAINT quarters_pkey PRIMARY KEY (id)
);

-- Add comment for documentation
COMMENT ON TABLE public.quarters IS 'Quarterly periods for tracking objectives and initiatives';

-- Areas table: Business units or departments
CREATE TABLE public.areas (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  manager_id uuid, -- Will be constrained after user_profiles is created
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT areas_pkey PRIMARY KEY (id)
);

-- Add comment for documentation
COMMENT ON TABLE public.areas IS 'Business areas or departments within the organization';
COMMENT ON COLUMN public.areas.manager_id IS 'Reference to the manager of this area';

-- User profiles table: Extended user information
CREATE TABLE public.user_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  role user_role NOT NULL,
  area_id uuid,
  user_id uuid, -- Reference to auth.users
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_user_id_key UNIQUE (user_id)
);

-- Add comment for documentation
COMMENT ON TABLE public.user_profiles IS 'Extended user profile information';
COMMENT ON COLUMN public.user_profiles.user_id IS 'Reference to Supabase auth.users table';

-- Objectives table: Strategic objectives
CREATE TABLE public.objectives (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  area_id uuid,
  title text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT objectives_pkey PRIMARY KEY (id)
);

-- Add comment for documentation
COMMENT ON TABLE public.objectives IS 'Strategic objectives for areas';

-- Objective quarters junction table
CREATE TABLE public.objective_quarters (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  objective_id uuid NOT NULL,
  quarter_id uuid NOT NULL,
  CONSTRAINT objective_quarters_pkey PRIMARY KEY (id)
);

-- Add comment for documentation
COMMENT ON TABLE public.objective_quarters IS 'Junction table linking objectives to quarters';

-- Initiatives table: Tactical initiatives
CREATE TABLE public.initiatives (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  area_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  progress integer DEFAULT 0,
  created_by uuid NOT NULL,
  due_date date,
  start_date date,
  completion_date date,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT initiatives_pkey PRIMARY KEY (id),
  CONSTRAINT initiatives_progress_check CHECK (progress >= 0 AND progress <= 100)
);

-- Add comment for documentation
COMMENT ON TABLE public.initiatives IS 'Tactical initiatives to achieve objectives';
COMMENT ON COLUMN public.initiatives.progress IS 'Progress percentage (0-100)';

-- Objective initiatives junction table
CREATE TABLE public.objective_initiatives (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  objective_id uuid NOT NULL,
  initiative_id uuid NOT NULL,
  CONSTRAINT objective_initiatives_pkey PRIMARY KEY (id)
);

-- Add comment for documentation
COMMENT ON TABLE public.objective_initiatives IS 'Junction table linking objectives to initiatives';

-- Activities table: Granular tasks
CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  is_completed boolean DEFAULT false,
  assigned_to uuid,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT activities_pkey PRIMARY KEY (id)
);

-- Add comment for documentation
COMMENT ON TABLE public.activities IS 'Granular tasks within initiatives';

-- Progress history table: Track progress changes
CREATE TABLE public.progress_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  initiative_id uuid NOT NULL,
  completed_activities_count integer NOT NULL,
  total_activities_count integer NOT NULL,
  notes text,
  updated_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT progress_history_pkey PRIMARY KEY (id)
);

-- Add comment for documentation
COMMENT ON TABLE public.progress_history IS 'Historical tracking of initiative progress';

-- Uploaded files table: File management
CREATE TABLE public.uploaded_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  original_filename text NOT NULL,
  stored_filename text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uploaded_files_pkey PRIMARY KEY (id)
);

-- Add comment for documentation
COMMENT ON TABLE public.uploaded_files IS 'Metadata for uploaded files';

-- File areas junction table
CREATE TABLE public.file_areas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL,
  area_id uuid NOT NULL,
  CONSTRAINT file_areas_pkey PRIMARY KEY (id)
);

-- Add comment for documentation
COMMENT ON TABLE public.file_areas IS 'Junction table linking files to areas';

-- File initiatives junction table
CREATE TABLE public.file_initiatives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL,
  initiative_id uuid NOT NULL,
  CONSTRAINT file_initiatives_pkey PRIMARY KEY (id)
);

-- Add comment for documentation
COMMENT ON TABLE public.file_initiatives IS 'Junction table linking files to initiatives';

-- Audit log table: Track all changes
CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);

-- Add comment for documentation
COMMENT ON TABLE public.audit_log IS 'Audit trail for all database changes';
COMMENT ON COLUMN public.audit_log.action IS 'Type of action: INSERT, UPDATE, or DELETE';

-- Create unique constraints that will be needed
ALTER TABLE public.quarters 
  ADD CONSTRAINT unique_quarter_per_year UNIQUE (tenant_id, quarter_name);

ALTER TABLE public.objective_quarters 
  ADD CONSTRAINT unique_objective_quarter UNIQUE (objective_id, quarter_id);