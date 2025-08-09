-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  is_completed boolean DEFAULT false,
  assigned_to uuid,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT activities_pkey PRIMARY KEY (id),
  CONSTRAINT activities_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id),
  CONSTRAINT activities_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.areas (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  manager_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  is_active boolean DEFAULT true,
  CONSTRAINT areas_pkey PRIMARY KEY (id),
  CONSTRAINT areas_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT areas_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.file_areas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL,
  area_id uuid NOT NULL,
  CONSTRAINT file_areas_pkey PRIMARY KEY (id),
  CONSTRAINT file_areas_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.uploaded_files(id),
  CONSTRAINT file_areas_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id)
);
CREATE TABLE public.file_initiatives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL,
  initiative_id uuid NOT NULL,
  CONSTRAINT file_initiatives_pkey PRIMARY KEY (id),
  CONSTRAINT file_initiatives_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id),
  CONSTRAINT file_initiatives_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.uploaded_files(id)
);
CREATE TABLE public.initiatives (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  area_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_by uuid NOT NULL,
  due_date date,
  start_date date,
  completion_date date,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  status text DEFAULT 'in_progress'::text CHECK (status = ANY (ARRAY['planning'::text, 'in_progress'::text, 'completed'::text, 'on_hold'::text])),
  CONSTRAINT initiatives_pkey PRIMARY KEY (id),
  CONSTRAINT initiatives_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id),
  CONSTRAINT initiatives_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id),
  CONSTRAINT initiatives_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.invitations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  email text NOT NULL CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'::text),
  role USER-DEFINED NOT NULL,
  area_id uuid,
  status USER-DEFINED NOT NULL DEFAULT 'sent'::invitation_status,
  custom_message text,
  sent_by uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  accepted_by uuid,
  last_reminder_sent timestamp with time zone,
  reminder_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT invitations_pkey PRIMARY KEY (id),
  CONSTRAINT invitations_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id),
  CONSTRAINT invitations_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.user_profiles(id),
  CONSTRAINT invitations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT invitations_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.objective_initiatives (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  objective_id uuid NOT NULL,
  initiative_id uuid NOT NULL,
  CONSTRAINT objective_initiatives_pkey PRIMARY KEY (id),
  CONSTRAINT objective_initiatives_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id),
  CONSTRAINT objective_initiatives_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id)
);
CREATE TABLE public.objective_quarters (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  objective_id uuid NOT NULL,
  quarter_id uuid NOT NULL,
  CONSTRAINT objective_quarters_pkey PRIMARY KEY (id),
  CONSTRAINT objective_quarters_quarter_id_fkey FOREIGN KEY (quarter_id) REFERENCES public.quarters(id),
  CONSTRAINT objective_quarters_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id)
);
CREATE TABLE public.objectives (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  area_id uuid,
  title text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  quarter text,
  priority text DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])),
  status text DEFAULT 'planning'::text CHECK (status = ANY (ARRAY['planning'::text, 'in_progress'::text, 'completed'::text, 'overdue'::text])),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  target_date date,
  metrics jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT objectives_pkey PRIMARY KEY (id),
  CONSTRAINT objectives_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id),
  CONSTRAINT objectives_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id),
  CONSTRAINT objectives_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.organization_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  settings_type text NOT NULL,
  settings_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT organization_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  website text,
  subdomain text,
  industry text,
  company_size text,
  timezone text DEFAULT 'UTC'::text,
  logo_url text,
  primary_color text DEFAULT '#3B82F6'::text,
  secondary_color text DEFAULT '#8B5CF6'::text,
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.progress_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  initiative_id uuid NOT NULL,
  completed_activities_count integer NOT NULL,
  total_activities_count integer NOT NULL,
  notes text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT progress_history_pkey PRIMARY KEY (id),
  CONSTRAINT progress_history_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id),
  CONSTRAINT progress_history_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.quarters (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  quarter_name USER-DEFINED NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  CONSTRAINT quarters_pkey PRIMARY KEY (id),
  CONSTRAINT quarters_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  subdomain text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT tenants_pkey PRIMARY KEY (id),
  CONSTRAINT tenants_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.uploaded_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  original_filename text NOT NULL,
  stored_filename text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uploaded_files_pkey PRIMARY KEY (id),
  CONSTRAINT uploaded_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.user_profiles(id),
  CONSTRAINT uploaded_files_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  role USER-DEFINED NOT NULL,
  area_id uuid,
  user_id uuid UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  avatar_url text,
  phone text,
  is_active boolean DEFAULT true,
  is_system_admin boolean DEFAULT false,
  last_login timestamp with time zone,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_profiles_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id),
  CONSTRAINT user_profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.webhook_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL,
  record_id text,
  webhook_url text,
  request_id integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT webhook_audit_log_pkey PRIMARY KEY (id)
);
CREATE TABLE public.wrappers_fdw_stats (
  fdw_name text NOT NULL,
  create_times bigint,
  rows_in bigint,
  rows_out bigint,
  bytes_in bigint,
  bytes_out bigint,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT wrappers_fdw_stats_pkey PRIMARY KEY (fdw_name)
);