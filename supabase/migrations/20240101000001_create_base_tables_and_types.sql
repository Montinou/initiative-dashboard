-- ============================================================
-- Migration 1: Create base tables and types
-- ============================================================
-- This migration creates the foundational structure of the database:
-- - Custom types (user_role, initiative_quarter)
-- - All base tables WITHOUT foreign key constraints
-- - Primary keys and basic constraints
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Custom Types
-- ============================================================

-- User roles enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('CEO', 'Admin', 'Manager');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Initiative quarter enum
DO $$ BEGIN
    CREATE TYPE initiative_quarter AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Base Tables (without foreign key constraints)
-- ============================================================

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);

-- Tenants table (multi-tenancy support)
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  subdomain text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT tenants_pkey PRIMARY KEY (id)
);

-- Quarters table
CREATE TABLE IF NOT EXISTS public.quarters (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  quarter_name initiative_quarter NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  CONSTRAINT quarters_pkey PRIMARY KEY (id),
  CONSTRAINT unique_quarter_per_year UNIQUE (tenant_id, quarter_name),
  CONSTRAINT quarters_date_check CHECK (end_date > start_date)
);

-- Users sync table (syncs with auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Areas table
CREATE TABLE IF NOT EXISTS public.areas (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  manager_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT areas_pkey PRIMARY KEY (id)
);

-- User profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  role user_role NOT NULL,
  area_id uuid,
  user_id uuid UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id)
);

-- Objectives table
CREATE TABLE IF NOT EXISTS public.objectives (
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

-- Objective quarters junction table
CREATE TABLE IF NOT EXISTS public.objective_quarters (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  objective_id uuid NOT NULL,
  quarter_id uuid NOT NULL,
  CONSTRAINT objective_quarters_pkey PRIMARY KEY (id),
  CONSTRAINT unique_objective_quarter UNIQUE (objective_id, quarter_id)
);

-- Initiatives table
CREATE TABLE IF NOT EXISTS public.initiatives (
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

-- Objective initiatives junction table
CREATE TABLE IF NOT EXISTS public.objective_initiatives (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  objective_id uuid NOT NULL,
  initiative_id uuid NOT NULL,
  CONSTRAINT objective_initiatives_pkey PRIMARY KEY (id),
  CONSTRAINT unique_objective_initiative UNIQUE (objective_id, initiative_id)
);

-- Activities table
CREATE TABLE IF NOT EXISTS public.activities (
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

-- Progress history table
CREATE TABLE IF NOT EXISTS public.progress_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  initiative_id uuid NOT NULL,
  completed_activities_count integer NOT NULL,
  total_activities_count integer NOT NULL,
  notes text,
  updated_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT progress_history_pkey PRIMARY KEY (id)
);

-- Uploaded files table
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  original_filename text NOT NULL,
  stored_filename text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uploaded_files_pkey PRIMARY KEY (id)
);

-- File areas junction table
CREATE TABLE IF NOT EXISTS public.file_areas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL,
  area_id uuid NOT NULL,
  CONSTRAINT file_areas_pkey PRIMARY KEY (id),
  CONSTRAINT unique_file_area UNIQUE (file_id, area_id)
);

-- File initiatives junction table
CREATE TABLE IF NOT EXISTS public.file_initiatives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL,
  initiative_id uuid NOT NULL,
  CONSTRAINT file_initiatives_pkey PRIMARY KEY (id),
  CONSTRAINT unique_file_initiative UNIQUE (file_id, initiative_id)
);

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
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

-- Add comments to tables for documentation
COMMENT ON TABLE public.organizations IS 'Root organization entities in the multi-tenant system';
COMMENT ON TABLE public.tenants IS 'Tenant instances for multi-tenancy support';
COMMENT ON TABLE public.quarters IS 'Quarterly periods for planning and tracking';
COMMENT ON TABLE public.users IS 'Synchronized user data from auth.users';
COMMENT ON TABLE public.areas IS 'Organizational areas or departments';
COMMENT ON TABLE public.user_profiles IS 'Extended user profile information including role and area assignment';
COMMENT ON TABLE public.objectives IS 'Strategic objectives for areas';
COMMENT ON TABLE public.initiatives IS 'Tactical initiatives to achieve objectives';
COMMENT ON TABLE public.activities IS 'Granular activities within initiatives';
COMMENT ON TABLE public.progress_history IS 'Historical tracking of initiative progress';
COMMENT ON TABLE public.uploaded_files IS 'Metadata for uploaded files';
COMMENT ON TABLE public.audit_log IS 'Audit trail for data changes';