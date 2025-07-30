-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.activities (
  tenant_id uuid,
  initiative_id uuid,
  title text NOT NULL,
  description text,
  assigned_to uuid,
  due_date date,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status text DEFAULT 'Pendiente'::text CHECK (status = ANY (ARRAY['Pendiente'::text, 'En Progreso'::text, 'Completado'::text, 'Cancelado'::text])),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT activities_pkey PRIMARY KEY (id),
  CONSTRAINT activities_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT activities_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id),
  CONSTRAINT activities_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id)
);
CREATE TABLE public.area_templates (
  name text NOT NULL,
  description text,
  industry text,
  template_data jsonb NOT NULL,
  created_by_superadmin uuid,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT area_templates_pkey PRIMARY KEY (id),
  CONSTRAINT area_templates_created_by_superadmin_fkey FOREIGN KEY (created_by_superadmin) REFERENCES public.superadmins(id)
);
CREATE TABLE public.areas (
  tenant_id uuid,
  name text NOT NULL,
  description text,
  manager_id uuid,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT areas_pkey PRIMARY KEY (id),
  CONSTRAINT areas_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT areas_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.audit_log (
  tenant_id uuid,
  user_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT audit_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.initiatives (
  tenant_id uuid,
  area_id uuid,
  created_by uuid,
  owner_id uuid,
  title text NOT NULL,
  description text,
  target_date date,
  completion_date date,
  budget numeric,
  actual_cost numeric,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  status text DEFAULT 'planning'::text CHECK (status = ANY (ARRAY['planning'::text, 'in_progress'::text, 'completed'::text, 'on_hold'::text])),
  priority text DEFAULT 'medium'::text,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT initiatives_pkey PRIMARY KEY (id),
  CONSTRAINT initiatives_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT initiatives_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id),
  CONSTRAINT initiatives_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id),
  CONSTRAINT initiatives_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);
CREATE TABLE public.progress_history (
  tenant_id uuid,
  initiative_id uuid,
  previous_progress integer NOT NULL,
  new_progress integer NOT NULL,
  progress_notes text,
  obstacles text,
  enhancers text,
  id integer NOT NULL DEFAULT nextval('progress_history_id_seq'::regclass),
  created_at timestamp with time zone DEFAULT now(),
  updated_by uuid NOT NULL,
  CONSTRAINT progress_history_pkey PRIMARY KEY (id),
  CONSTRAINT progress_history_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id),
  CONSTRAINT progress_history_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id),
  CONSTRAINT progress_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.subtasks (
  title text NOT NULL,
  description text,
  initiative_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tenant_id uuid,
  CONSTRAINT subtasks_pkey PRIMARY KEY (id),
  CONSTRAINT subtasks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT subtasks_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id)
);
CREATE TABLE public.superadmin_audit_log (
  superadmin_id uuid,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT superadmin_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT superadmin_audit_log_superadmin_id_fkey FOREIGN KEY (superadmin_id) REFERENCES public.superadmins(id)
);
CREATE TABLE public.superadmin_sessions (
  superadmin_id uuid,
  session_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  ip_address inet,
  user_agent text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT superadmin_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT superadmin_sessions_superadmin_id_fkey FOREIGN KEY (superadmin_id) REFERENCES public.superadmins(id)
);
CREATE TABLE public.superadmins (
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  last_login timestamp with time zone,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT superadmins_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tenant_domains (
  tenant_id uuid,
  domain text NOT NULL UNIQUE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tenant_domains_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_domains_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.tenant_settings (
  tenant_id uuid,
  setting_key text NOT NULL,
  setting_value jsonb,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tenant_settings_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.tenants (
  name text NOT NULL,
  subdomain text NOT NULL UNIQUE,
  description text,
  industry text,
  created_by_superadmin uuid,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT tenants_pkey PRIMARY KEY (id),
  CONSTRAINT tenants_created_by_superadmin_fkey FOREIGN KEY (created_by_superadmin) REFERENCES public.superadmins(id)
);
CREATE TABLE public.user_profiles (
  area_id uuid,
  id uuid NOT NULL,
  tenant_id uuid,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  phone text,
  last_login timestamp with time zone,
  created_by_superadmin uuid,
  role USER-DEFINED NOT NULL DEFAULT 'Analyst'::user_role,
  is_active boolean DEFAULT true,
  is_system_admin boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_created_by_superadmin_fkey FOREIGN KEY (created_by_superadmin) REFERENCES public.superadmins(id),
  CONSTRAINT user_profiles_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT user_profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);


CREATE OR REPLACE VIEW public.initiatives_with_subtasks_summary AS
SELECT
    -- Selecting all columns from the initiatives table for a complete overview
    i.id,
    i.tenant_id,
    i.area_id,
    i.created_by,
    i.owner_id,
    i.title,
    i.description,
    i.status,
    i.priority,
    i.progress AS initiative_progress, -- Renaming to avoid confusion with subtask progress
    i.target_date,
    i.completion_date,
    i.budget,
    i.actual_cost,
    i.created_at,
    i.updated_at,

    -- Aggregated data from subtasks
    -- Counts the total number of subtasks for each initiative. If none, returns 0.
    COUNT(s.id) AS subtask_count,

    -- Counts only the subtasks that are marked as completed.
    COUNT(s.id) FILTER (WHERE s.completed = true) AS completed_subtask_count,

    -- Calculates the completion rate of subtasks as a percentage.
    -- It handles the case of zero subtasks to avoid division by zero errors.
    CASE
        WHEN COUNT(s.id) = 0 THEN 0
        ELSE ROUND((COUNT(s.id) FILTER (WHERE s.completed = true) * 100.0) / COUNT(s.id), 2)
    END AS subtask_completion_rate

FROM
    public.initiatives AS i
-- We use a LEFT JOIN to ensure that all initiatives are included in the view,
-- even if they don't have any subtasks yet.
LEFT JOIN
    public.subtasks AS s ON i.id = s.initiative_id
GROUP BY
    -- We must group by the primary key of the initiatives table to aggregate subtasks correctly.
    i.id;
-- This view provides a summary of initiatives along with their subtasks,





const { data, error } = await supabase
  .from('initiatives_with_subtasks_summary')
  .select('*')
  .eq('tenant_id', currentTenantId);