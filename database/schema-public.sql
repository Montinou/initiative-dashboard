-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  initiative_id uuid,
  title text NOT NULL,
  description text,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status text DEFAULT 'Pendiente'::text CHECK (status = ANY (ARRAY['Pendiente'::text, 'En Progreso'::text, 'Completado'::text, 'Cancelado'::text])),
  assigned_to uuid,
  due_date date,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT activities_pkey PRIMARY KEY (id),
  CONSTRAINT activities_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id),
  CONSTRAINT activities_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id)
);
CREATE TABLE public.area_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  industry text,
  template_data jsonb NOT NULL,
  created_by_superadmin uuid,
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT area_templates_pkey PRIMARY KEY (id),
  CONSTRAINT area_templates_created_by_superadmin_fkey FOREIGN KEY (created_by_superadmin) REFERENCES public.superadmins(id)
);
CREATE TABLE public.areas (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid,
  name text NOT NULL,
  description text,
  manager_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT areas_pkey PRIMARY KEY (id),
  CONSTRAINT areas_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT areas_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid,
  user_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT audit_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.initiatives (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid,
  area_id uuid,
  created_by uuid,
  owner_id uuid,
  title text NOT NULL,
  description text,
  status text DEFAULT 'planning'::text CHECK (status = ANY (ARRAY['planning'::text, 'in_progress'::text, 'completed'::text, 'on_hold'::text])),
  priority text DEFAULT 'medium'::text,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  target_date date,
  completion_date date,
  budget numeric,
  actual_cost numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT initiatives_pkey PRIMARY KEY (id),
  CONSTRAINT initiatives_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT initiatives_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT initiatives_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id),
  CONSTRAINT initiatives_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id)
);
CREATE TABLE public.progress_history (
  id integer NOT NULL DEFAULT nextval('progress_history_id_seq'::regclass),
  initiative_id uuid,
  previous_progress integer NOT NULL,
  new_progress integer NOT NULL,
  progress_notes text,
  obstacles text,
  enhancers text,
  updated_by integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT progress_history_pkey PRIMARY KEY (id),
  CONSTRAINT progress_history_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id)
);
CREATE TABLE public.superadmin_audit_log (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  superadmin_id uuid,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT superadmin_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT superadmin_audit_log_superadmin_id_fkey FOREIGN KEY (superadmin_id) REFERENCES public.superadmins(id)
);
CREATE TABLE public.superadmin_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  superadmin_id uuid,
  session_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT superadmin_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT superadmin_sessions_superadmin_id_fkey FOREIGN KEY (superadmin_id) REFERENCES public.superadmins(id)
);
CREATE TABLE public.superadmins (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  is_active boolean DEFAULT true,
  last_login timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT superadmins_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tenant_domains (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  domain text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tenant_domains_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_domains_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.tenant_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  setting_key text NOT NULL,
  setting_value jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tenant_settings_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  subdomain text NOT NULL UNIQUE,
  description text,
  industry text,
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{}'::jsonb,
  created_by_superadmin uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT tenants_pkey PRIMARY KEY (id),
  CONSTRAINT tenants_created_by_superadmin_fkey FOREIGN KEY (created_by_superadmin) REFERENCES public.superadmins(id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  tenant_id uuid,
  email text NOT NULL,
  full_name text,
  role USER-DEFINED NOT NULL DEFAULT 'Analyst'::user_role,
  area text,
  avatar_url text,
  phone text,
  is_active boolean DEFAULT true,
  is_system_admin boolean DEFAULT false,
  last_login timestamp with time zone,
  created_by_superadmin uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_created_by_superadmin_fkey FOREIGN KEY (created_by_superadmin) REFERENCES public.superadmins(id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT user_profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);