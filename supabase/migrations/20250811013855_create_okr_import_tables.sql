-- Create enum for import job status
CREATE TYPE import_job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'partial');

-- Create enum for import item status
CREATE TYPE import_item_status AS ENUM ('pending', 'success', 'error', 'skipped');

-- Create enum for entity types
CREATE TYPE import_entity_type AS ENUM ('objective', 'initiative', 'activity');

-- Main job tracking table
CREATE TABLE public.okr_import_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  area_id uuid,
  object_path text NOT NULL,
  original_filename text NOT NULL,
  file_checksum text NOT NULL,
  file_size_bytes bigint,
  content_type text,
  status import_job_status DEFAULT 'pending',
  total_rows integer DEFAULT 0,
  processed_rows integer DEFAULT 0,
  success_rows integer DEFAULT 0,
  error_rows integer DEFAULT 0,
  job_metadata jsonb DEFAULT '{}',
  error_summary text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT okr_import_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT okr_import_jobs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT okr_import_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT okr_import_jobs_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id)
);

-- Per-row processing results
CREATE TABLE public.okr_import_job_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  row_number integer NOT NULL,
  entity_type import_entity_type NOT NULL,
  entity_key text NOT NULL,
  entity_id uuid,
  action text CHECK (action IN ('create', 'update', 'skip')),
  status import_item_status DEFAULT 'pending',
  error_message text,
  row_data jsonb,
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT okr_import_job_items_pkey PRIMARY KEY (id),
  CONSTRAINT okr_import_job_items_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.okr_import_jobs(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_okr_import_jobs_tenant_status ON public.okr_import_jobs(tenant_id, status);
CREATE INDEX idx_okr_import_jobs_user ON public.okr_import_jobs(user_id);
CREATE INDEX idx_okr_import_jobs_checksum ON public.okr_import_jobs(file_checksum);
CREATE INDEX idx_okr_import_job_items_job ON public.okr_import_job_items(job_id);
CREATE INDEX idx_okr_import_job_items_entity ON public.okr_import_job_items(entity_type, entity_key);

-- Add comment on tables
COMMENT ON TABLE public.okr_import_jobs IS 'Tracks OKR file import jobs from GCS uploads';
COMMENT ON TABLE public.okr_import_job_items IS 'Stores per-row processing results for OKR import jobs';