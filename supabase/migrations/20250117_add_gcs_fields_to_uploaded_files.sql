-- Add GCS fields to uploaded_files table
ALTER TABLE public.uploaded_files 
ADD COLUMN IF NOT EXISTS gcs_url text,
ADD COLUMN IF NOT EXISTS file_size bigint,
ADD COLUMN IF NOT EXISTS file_type text,
ADD COLUMN IF NOT EXISTS entity_type text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_uploaded_files_entity_type ON public.uploaded_files(entity_type);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_tenant_uploaded ON public.uploaded_files(tenant_id, uploaded_by, created_at DESC);

-- Update existing rows with default values if needed
UPDATE public.uploaded_files 
SET metadata = '{}'::jsonb 
WHERE metadata IS NULL;