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
  tenant_id uuid,
  weight_percentage numeric DEFAULT 10.0 CHECK (weight_percentage > 0::numeric AND weight_percentage <= 100::numeric),
  estimated_hours integer CHECK (estimated_hours > 0),
  actual_hours integer DEFAULT 0 CHECK (actual_hours >= 0),
  completion_date timestamp with time zone,
  subtask_order integer DEFAULT 0,
  dependencies jsonb DEFAULT '[]'::jsonb,
  notes text,
  priority text DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  CONSTRAINT activities_pkey PRIMARY KEY (id),
  CONSTRAINT activities_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT activities_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id),
  CONSTRAINT activities_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id)
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
CREATE TABLE public.file_access_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  file_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action = ANY (ARRAY['view'::text, 'download'::text, 'upload'::text, 'edit'::text, 'delete'::text, 'share'::text, 'copy'::text, 'move'::text])),
  access_method text DEFAULT 'web'::text CHECK (access_method = ANY (ARRAY['web'::text, 'api'::text, 'mobile'::text, 'system'::text])),
  ip_address inet,
  user_agent text,
  referer text,
  success boolean DEFAULT true,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT file_access_log_pkey PRIMARY KEY (id),
  CONSTRAINT file_access_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT file_access_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT file_access_log_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.uploaded_files(id)
);
CREATE TABLE public.file_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  file_id uuid NOT NULL,
  user_id uuid,
  area_id uuid,
  role_name text,
  permission_type text NOT NULL CHECK (permission_type = ANY (ARRAY['view'::text, 'download'::text, 'edit'::text, 'delete'::text, 'share'::text, 'admin'::text])),
  granted_by uuid NOT NULL,
  granted_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT file_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT file_permissions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT file_permissions_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.uploaded_files(id),
  CONSTRAINT file_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT file_permissions_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id),
  CONSTRAINT file_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.file_processing_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  file_id uuid NOT NULL,
  job_type text NOT NULL CHECK (job_type = ANY (ARRAY['virus_scan'::text, 'data_extraction'::text, 'validation'::text, 'ai_analysis'::text, 'format_conversion'::text, 'thumbnail_generation'::text, 'backup'::text])),
  job_status text DEFAULT 'queued'::text CHECK (job_status = ANY (ARRAY['queued'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'retrying'::text])),
  priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  job_params jsonb DEFAULT '{}'::jsonb,
  job_result jsonb DEFAULT '{}'::jsonb,
  error_message text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  expires_at timestamp with time zone,
  CONSTRAINT file_processing_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT file_processing_jobs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT file_processing_jobs_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.uploaded_files(id)
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
  progress_method text DEFAULT 'manual'::text CHECK (progress_method = ANY (ARRAY['manual'::text, 'subtask_based'::text, 'hybrid'::text])),
  weight_factor numeric DEFAULT 1.0 CHECK (weight_factor > 0::numeric AND weight_factor <= 3.0),
  estimated_hours integer CHECK (estimated_hours > 0),
  actual_hours integer DEFAULT 0 CHECK (actual_hours >= 0),
  kpi_category text DEFAULT 'operational'::text,
  is_strategic boolean DEFAULT false,
  dependencies jsonb DEFAULT '[]'::jsonb,
  success_criteria jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT initiatives_pkey PRIMARY KEY (id),
  CONSTRAINT initiatives_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT initiatives_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id),
  CONSTRAINT initiatives_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id),
  CONSTRAINT initiatives_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.progress_history (
  id integer NOT NULL DEFAULT nextval('progress_history_id_seq'::regclass),
  initiative_id uuid,
  previous_progress integer NOT NULL,
  new_progress integer NOT NULL,
  progress_notes text,
  obstacles text,
  enhancers text,
  updated_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  tenant_id uuid,
  CONSTRAINT progress_history_pkey PRIMARY KEY (id),
  CONSTRAINT progress_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT progress_history_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id),
  CONSTRAINT progress_history_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.subtasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  completed boolean DEFAULT false,
  initiative_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tenant_id uuid,
  CONSTRAINT subtasks_pkey PRIMARY KEY (id),
  CONSTRAINT subtasks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT subtasks_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id)
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
CREATE TABLE public.uploaded_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  area_id uuid,
  initiative_id uuid,
  uploaded_by uuid NOT NULL,
  original_filename text NOT NULL,
  stored_filename text NOT NULL,
  file_path text,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  file_hash text,
  file_type text NOT NULL DEFAULT 'document'::text CHECK (file_type = ANY (ARRAY['document'::text, 'spreadsheet'::text, 'presentation'::text, 'image'::text, 'pdf'::text, 'other'::text])),
  file_category text NOT NULL DEFAULT 'general'::text CHECK (file_category = ANY (ARRAY['general'::text, 'okr_data'::text, 'initiative_data'::text, 'analytics_report'::text, 'area_document'::text, 'template'::text, 'export'::text])),
  upload_status text DEFAULT 'uploaded'::text CHECK (upload_status = ANY (ARRAY['uploading'::text, 'uploaded'::text, 'processing'::text, 'processed'::text, 'failed'::text, 'deleted'::text])),
  processing_status text DEFAULT 'pending'::text CHECK (processing_status = ANY (ARRAY['pending'::text, 'queued'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'skipped'::text])),
  virus_scan_status text DEFAULT 'pending'::text CHECK (virus_scan_status = ANY (ARRAY['pending'::text, 'scanning'::text, 'clean'::text, 'infected'::text, 'failed'::text, 'skipped'::text])),
  virus_scan_details jsonb DEFAULT '{}'::jsonb,
  validation_status text DEFAULT 'pending'::text CHECK (validation_status = ANY (ARRAY['pending'::text, 'validating'::text, 'valid'::text, 'invalid'::text, 'warning'::text])),
  validation_errors jsonb DEFAULT '[]'::jsonb,
  records_created integer DEFAULT 0,
  records_updated integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  processing_log jsonb DEFAULT '{}'::jsonb,
  error_details jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  access_level text DEFAULT 'area'::text CHECK (access_level = ANY (ARRAY['private'::text, 'area'::text, 'tenant'::text, 'public'::text])),
  retention_policy text DEFAULT 'standard'::text CHECK (retention_policy = ANY (ARRAY['temporary'::text, 'standard'::text, 'archive'::text, 'permanent'::text])),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  processed_at timestamp with time zone,
  accessed_at timestamp with time zone,
  CONSTRAINT uploaded_files_pkey PRIMARY KEY (id),
  CONSTRAINT uploaded_files_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT uploaded_files_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id),
  CONSTRAINT uploaded_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.user_profiles(id),
  CONSTRAINT uploaded_files_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  tenant_id uuid,
  email text NOT NULL,
  full_name text,
  role USER-DEFINED NOT NULL DEFAULT 'Analyst'::user_role,
  avatar_url text,
  phone text,
  is_active boolean DEFAULT true,
  is_system_admin boolean DEFAULT false,
  last_login timestamp with time zone,
  created_by_superadmin uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  area_id uuid,
  user_id uuid UNIQUE,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT user_profiles_created_by_superadmin_fkey FOREIGN KEY (created_by_superadmin) REFERENCES public.superadmins(id),
  CONSTRAINT user_profiles_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id)
);


















eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6ImFuYWxvZy1tZWRpdW0tNDUxNzA2LW03IiwicHJpdmF0ZV9rZXlfaWQiOiI
zOTE2OTc3OWRiZTg0YjI5M2ZhN2YyZTBjNzQwYTU3YjU3YTFmYTU3IiwicHJpdmF0ZV9rZXkiOiItLS0tLUJFR0lOIFBSSVZBVEUgS0VZLS0tLS1cbk1JSUV2UUlCQURBTkJna3Foa
2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRRG5aOXphdTNxQTZCSUZcbndKeDlSd1ZkUmUwSHhLRWVBSmNBNmZXR0pDREtzUWxxMXRjeEVUa1lDZkwzdkJvTjhtOEx3TnR
YNURjRU5HVnZcbkU5NFJEZ2ozSTFHdGlVM0gxUW9FT2krYStIV2Y5UDJ6VHRxcVhHK29BQWhPeDBsRmVxRzl3dzh3RnA1SmVFMUxcblE4eTRxMFUvZ2QwMW1GcnFaMjliUkc2a04zW
XdiS3R6Szk4RXY1d0F6bXJrSjczVi9jcVY2cU9sYXl3WnhUbzNcbmFjQzJvUlV3bG9ZUS8xamljQ1pSYTk2ZTBtZHhxaElpbms2ZUJuQUt1WWVEekNsVFdGdDlzWFBxNEVoU2JsNzJ
cbnlDQ3U0OE1SNjRyaUxxbU1UTC9HL1BQNW9GWnY1UDdTN0o0RzRQREE2Y215aVhyeEFwb1dyejVFTzlydHA2YUVcbjNMVnl6TCtoQWdNQkFBRUNnZ0VBS2FrUWdSMmZEcTJaTHdsd
jh2cnlDNHFQQTZiQ0JmTi92QldpMHdsV2tQOUJcbjdZYnJ1NFQ1QlN1blh6UHhjZURiWHArVUxiVGp0Y0ZVSUtVUVJmeERuM0N2b0FFMzdGbmRvWWl6TU9CNTFyZ2xcbjQ1MzI3cFJ
STXNyOHMrZ2JlQ045a25zWFZTWkJUWU5YMFF6T0F0SXMxNlBpNWliOWVUVnhmaG9xSEN6eS9ZRC9cblVqejZzRitLZXd5N0tYdXlPZHJkck5pdDVIRlhFNzhOajBkRitoOGE0YWZPW
k94TTVaME1MRksyaTF1N0YzNTdcbngrTTM0NGJ1TGJJbW53djZ3MVhoZzJpUEQxNkNPTVZpRmFzdG1BcHE5ZkIrY3YyYmVkc1JtbGR6R1M3cVcvdFpcbkg4NFdPNVFvTDczdWd0WU0
wdEh2aysyQ01mVmJzQWNoMzVCTS9jMUpKUUtCZ1FEMHVmVmQvVnBOekJtU2F6NHdcbkdwOHlBQ1dENHVsK202SE5zaW13NFZBU1pkdlZrOTUvRlkrU0w0RGpRdzB3QjQ3ZHhHdnUxe
nN0ZjNmakE4eGRcbnFxQmZkYWtFUVBGRUVqY0FOaWpobTN4b1EycVAreHE0THVZOFlyYnJ3S0hrQ2tLQjlIcERWMXNLS2k5eGYyTk5cbmJ3cDROa0RoMldDeitxM3BzZUxudGZSZjV
RS0JnUUR5RU5CMnJybWVYVUVCUjdZbllTN2NqQVV3MVRXK0VVazZcbjV4TmtnT1Z2b1Yxb0ZldmFrKzIvZ0txck5SbVhzNnRHQlh6Y0x0dVZKME5aaXUxTzUzS1lPL1BzRWw4b0hEc
XJcbjFnbDBOK2RUS1ZjWE1qYlEvN00ydTJHZHNvRGlXSlJQejdSTDh4dFp6d0NqVk5sWUx2b3JMVWxDODNYbmc2MmNcbkVXTzA0WnhORFFLQmdIY2htemRRNE1ma1prSm5vRk5NY2x
pbHg1MW5OYUVqWStXOUtCeHA0ay9DYy95SlNoTjFcblRIbXVWRUROWURzVVF0RGtFR0twTmE2VlVhZ2FMajhlazRsRXZxMUthK2htTVk0UnoxN2NFUGkwY01oOFJXcUpcbnNoeU5OV
nlZWG5hakkvTWRMdk5mTC90SHcrYXRTNHJqVmlaa3lycm0xZk5uUVlmMHgyOWluUDZkQW9HQkFMdUNcbkJ0bEljNFNXM0JudndNdzBYYVo5MkMrQm1RWElRaCtjaThzWWhhRzVMNi9
HKzFIdnNRVGMyRmVTNUdZOHlQbU9cbm1xKzhwRitmY0c1V1RZa0hoQjhrb2NoR1d1dXBJbEdsbE9FdnhNTUlqT3ZzKzhWZHJTZENjMVZDeHMrT3FpUkFcbjBucmFzRjhiR0hWczdvZ
CtyRTd4MzRRN0x5UE5QcGhjYUEzZmpjR3BBb0dBYTRWZ1dySmgxM1ZCT1hXdCtDS0VcbkVidFFnbDJua1c2aXU5STFkNUc0U1picjNTOWNBZnpuRUVMeFQxZE4waHZmR0g5L0kzWFp
NMlE2VXFtMWxiRXdcbjQzTGxsQkQ5RFJ6SDJHc01zcUhDb2R0MFcyZGVUVjdpOGx6THByQTA2b3pRM2UwMEgyTGVhTTRRRmFMVGliNklcbktIcy9mVDhDRmxzOXRkWjQ5TUR2NHJJP
VxuLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLVxuIiwiY2xpZW50X2VtYWlsIjoiZ2FyYWdlLWFpLXZlcmNlbEBhbmFsb2ctbWVkaXVtLTQ1MTcwNi1tNy5pYW0uZ3NlcnZpY2VhY2N
vdW50LmNvbSIsImNsaWVudF9pZCI6IjEwNzQzOTkyMjA3ODg0MDQ3MzI2NSIsImF1dGhfdXJpIjoiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL2F1dGgiLCJ0b
2tlbl91cmkiOiJodHRwczovL29hdXRoMi5nb29nbGVhcGlzLmNvbS90b2tlbiIsImF1dGhfcHJvdmlkZXJfeDUwOV9jZXJ0X3VybCI6Imh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29
tL29hdXRoMi92MS9jZXJ0cyIsImNsaWVudF94NTA5X2NlcnRfdXJsIjoiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vcm9ib3QvdjEvbWV0YWRhdGEveDUwOS9nYXJhZ2UtYWktd
mVyY2VsJTQwYW5hbG9nLW1lZGl1bS00NTE3MDYtbTcuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLCJ1bml2ZXJzZV9kb21haW4iOiJnb29nbGVhcGlzLmNvbSJ9Cg==

