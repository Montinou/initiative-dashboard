-- Manager Dashboard: Create file_uploads table for Excel OKR uploads
-- This table tracks file uploads by managers for their specific areas

CREATE TABLE IF NOT EXISTS public.file_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    area_id UUID NOT NULL,
    uploaded_by UUID NOT NULL,
    original_filename TEXT NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    mime_type TEXT,
    upload_status TEXT DEFAULT 'processing' CHECK (upload_status IN ('processing', 'completed', 'failed', 'cancelled')),
    processing_log JSONB DEFAULT '{}',
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_details JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign key constraints
    CONSTRAINT file_uploads_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT file_uploads_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE CASCADE,
    CONSTRAINT file_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_file_uploads_tenant_id ON public.file_uploads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_area_id ON public.file_uploads(area_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_by ON public.file_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_uploads_upload_status ON public.file_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at ON public.file_uploads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_uploads_tenant_area ON public.file_uploads(tenant_id, area_id);

-- Create updated_at trigger
CREATE TRIGGER update_file_uploads_updated_at 
    BEFORE UPDATE ON public.file_uploads 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Managers can only see uploads from their area
CREATE POLICY "file_uploads_area_access" ON public.file_uploads
    FOR ALL USING (
        -- Allow access if user is in the same tenant and area
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = file_uploads.tenant_id
            AND (
                -- Manager can access their own area
                (up.role = 'Manager' AND up.area_id = file_uploads.area_id)
                -- CEO and Admin can access all areas within tenant
                OR up.role IN ('CEO', 'Admin')
                -- System admins have full access
                OR up.is_system_admin = true
            )
        )
    );

-- RLS Policy: Only managers can insert file uploads for their area
CREATE POLICY "file_uploads_insert_policy" ON public.file_uploads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = file_uploads.tenant_id
            AND (
                -- Manager can upload to their own area
                (up.role = 'Manager' AND up.area_id = file_uploads.area_id AND up.id = file_uploads.uploaded_by)
                -- CEO and Admin can upload to any area
                OR up.role IN ('CEO', 'Admin')
                -- System admins have full access
                OR up.is_system_admin = true
            )
        )
    );

-- Audit log trigger for file uploads
CREATE OR REPLACE FUNCTION log_file_upload_audit()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the file upload action
    INSERT INTO public.audit_log (
        tenant_id,
        user_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        created_at
    ) VALUES (
        COALESCE(NEW.tenant_id, OLD.tenant_id),
        COALESCE(NEW.uploaded_by, OLD.uploaded_by),
        TG_OP,
        'file_upload',
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger
CREATE TRIGGER file_uploads_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.file_uploads
    FOR EACH ROW
    EXECUTE PROCEDURE log_file_upload_audit();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_uploads TO authenticated;
GRANT USAGE ON SEQUENCE file_uploads_id_seq TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.file_uploads IS 'Tracks Excel file uploads by managers for OKR data processing';
COMMENT ON COLUMN public.file_uploads.tenant_id IS 'Tenant isolation - which organization this upload belongs to';
COMMENT ON COLUMN public.file_uploads.area_id IS 'Area isolation - which department/area this upload is for';
COMMENT ON COLUMN public.file_uploads.uploaded_by IS 'Manager who uploaded the file';
COMMENT ON COLUMN public.file_uploads.upload_status IS 'Current processing status of the file';
COMMENT ON COLUMN public.file_uploads.processing_log IS 'Detailed log of file processing steps';
COMMENT ON COLUMN public.file_uploads.records_created IS 'Number of initiatives/subtasks created from this upload';
COMMENT ON COLUMN public.file_uploads.records_updated IS 'Number of existing records updated from this upload';
COMMENT ON COLUMN public.file_uploads.records_failed IS 'Number of records that failed to process';