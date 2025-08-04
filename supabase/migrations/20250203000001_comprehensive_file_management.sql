-- Comprehensive File Management System
-- Extends existing file_uploads table with comprehensive file management capabilities
-- Includes file processing, permissions, and audit logging

-- ============================================================================
-- TABLE 1: Enhanced uploaded_files (extends existing file_uploads)
-- ============================================================================

-- First, let's create a comprehensive uploaded_files table to replace/extend file_uploads
CREATE TABLE IF NOT EXISTS public.uploaded_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    area_id UUID, -- Optional - files can be tenant-wide or area-specific
    initiative_id UUID, -- Optional - files can be linked to specific initiatives
    uploaded_by UUID NOT NULL,
    
    -- File metadata
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL, -- Actual filename in storage (UUID-based)
    file_path TEXT, -- Storage path/URL
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    file_hash TEXT, -- SHA-256 hash for deduplication and integrity
    
    -- File categorization
    file_type TEXT NOT NULL DEFAULT 'document' CHECK (file_type IN (
        'document', 'spreadsheet', 'presentation', 'image', 'pdf', 'other'
    )),
    file_category TEXT NOT NULL DEFAULT 'general' CHECK (file_category IN (
        'general', 'okr_data', 'initiative_data', 'analytics_report', 
        'area_document', 'template', 'export'
    )),
    
    -- Processing status
    upload_status TEXT DEFAULT 'uploaded' CHECK (upload_status IN (
        'uploading', 'uploaded', 'processing', 'processed', 'failed', 'deleted'
    )),
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN (
        'pending', 'queued', 'processing', 'completed', 'failed', 'skipped'
    )),
    
    -- Security and validation
    virus_scan_status TEXT DEFAULT 'pending' CHECK (virus_scan_status IN (
        'pending', 'scanning', 'clean', 'infected', 'failed', 'skipped'
    )),
    virus_scan_details JSONB DEFAULT '{}',
    validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN (
        'pending', 'validating', 'valid', 'invalid', 'warning'
    )),
    validation_errors JSONB DEFAULT '[]',
    
    -- Processing results
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    processing_log JSONB DEFAULT '{}',
    error_details JSONB DEFAULT '{}',
    
    -- Metadata and settings
    metadata JSONB DEFAULT '{}', -- Stores additional file information
    access_level TEXT DEFAULT 'area' CHECK (access_level IN (
        'private', 'area', 'tenant', 'public'
    )),
    retention_policy TEXT DEFAULT 'standard' CHECK (retention_policy IN (
        'temporary', 'standard', 'archive', 'permanent'
    )),
    expires_at TIMESTAMP WITH TIME ZONE, -- For temporary files
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    processed_at TIMESTAMP WITH TIME ZONE,
    accessed_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign key constraints
    CONSTRAINT uploaded_files_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT uploaded_files_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE SET NULL,
    CONSTRAINT uploaded_files_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id) ON DELETE SET NULL,
    CONSTRAINT uploaded_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);

-- ============================================================================
-- TABLE 2: File Processing Jobs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.file_processing_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    file_id UUID NOT NULL,
    job_type TEXT NOT NULL CHECK (job_type IN (
        'virus_scan', 'data_extraction', 'validation', 'ai_analysis', 
        'format_conversion', 'thumbnail_generation', 'backup'
    )),
    job_status TEXT DEFAULT 'queued' CHECK (job_status IN (
        'queued', 'running', 'completed', 'failed', 'cancelled', 'retrying'
    )),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- 1=highest, 10=lowest
    
    -- Job details
    job_params JSONB DEFAULT '{}',
    job_result JSONB DEFAULT '{}',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- Job expiration for cleanup
    
    -- Foreign key constraints
    CONSTRAINT file_processing_jobs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT file_processing_jobs_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.uploaded_files(id) ON DELETE CASCADE
);

-- ============================================================================
-- TABLE 3: File Permissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.file_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    file_id UUID NOT NULL,
    
    -- Permission target (who has access)
    user_id UUID, -- Specific user access
    area_id UUID, -- Area-wide access
    role_name TEXT, -- Role-based access (Manager, Analyst, etc.)
    
    -- Permission type
    permission_type TEXT NOT NULL CHECK (permission_type IN (
        'view', 'download', 'edit', 'delete', 'share', 'admin'
    )),
    
    -- Permission settings
    granted_by UUID NOT NULL, -- Who granted this permission
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Foreign key constraints
    CONSTRAINT file_permissions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT file_permissions_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
    CONSTRAINT file_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    CONSTRAINT file_permissions_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE CASCADE,
    CONSTRAINT file_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Ensure at least one target is specified
    CONSTRAINT file_permissions_target_check CHECK (
        user_id IS NOT NULL OR area_id IS NOT NULL OR role_name IS NOT NULL
    )
);

-- ============================================================================
-- TABLE 4: File Access Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.file_access_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    file_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Access details
    action TEXT NOT NULL CHECK (action IN (
        'view', 'download', 'upload', 'edit', 'delete', 'share', 'copy', 'move'
    )),
    access_method TEXT DEFAULT 'web' CHECK (access_method IN (
        'web', 'api', 'mobile', 'system'
    )),
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    
    -- Result
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Foreign key constraints
    CONSTRAINT file_access_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT file_access_log_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
    CONSTRAINT file_access_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- uploaded_files indexes
CREATE INDEX IF NOT EXISTS idx_uploaded_files_tenant_id ON public.uploaded_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_area_id ON public.uploaded_files(area_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_initiative_id ON public.uploaded_files(initiative_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_by ON public.uploaded_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_upload_status ON public.uploaded_files(upload_status);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_file_type ON public.uploaded_files(file_type);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_file_category ON public.uploaded_files(file_category);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_created_at ON public.uploaded_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_file_hash ON public.uploaded_files(file_hash);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_expires_at ON public.uploaded_files(expires_at) WHERE expires_at IS NOT NULL;

-- file_processing_jobs indexes
CREATE INDEX IF NOT EXISTS idx_file_processing_jobs_tenant_id ON public.file_processing_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_file_processing_jobs_file_id ON public.file_processing_jobs(file_id);
CREATE INDEX IF NOT EXISTS idx_file_processing_jobs_status ON public.file_processing_jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_file_processing_jobs_type ON public.file_processing_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_file_processing_jobs_priority ON public.file_processing_jobs(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_file_processing_jobs_queue ON public.file_processing_jobs(job_status, priority, created_at) WHERE job_status IN ('queued', 'retrying');

-- file_permissions indexes
CREATE INDEX IF NOT EXISTS idx_file_permissions_tenant_id ON public.file_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_file_id ON public.file_permissions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_user_id ON public.file_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_area_id ON public.file_permissions(area_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_role ON public.file_permissions(role_name);
CREATE INDEX IF NOT EXISTS idx_file_permissions_active ON public.file_permissions(is_active, expires_at);

-- file_access_log indexes
CREATE INDEX IF NOT EXISTS idx_file_access_log_tenant_id ON public.file_access_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_file_access_log_file_id ON public.file_access_log(file_id);
CREATE INDEX IF NOT EXISTS idx_file_access_log_user_id ON public.file_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_file_access_log_action ON public.file_access_log(action);
CREATE INDEX IF NOT EXISTS idx_file_access_log_created_at ON public.file_access_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_access_log_success ON public.file_access_log(success);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated at trigger for uploaded_files
CREATE TRIGGER update_uploaded_files_updated_at 
    BEFORE UPDATE ON public.uploaded_files 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Accessed at trigger for uploaded_files (updates on view/download)
CREATE OR REPLACE FUNCTION update_file_accessed_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Update accessed_at when file is viewed or downloaded
    IF TG_OP = 'UPDATE' AND (
        OLD.upload_status != NEW.upload_status OR
        OLD.processing_status != NEW.processing_status
    ) THEN
        NEW.accessed_at = timezone('utc'::text, now());
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_uploaded_files_accessed_at 
    BEFORE UPDATE ON public.uploaded_files 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_file_accessed_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_access_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: uploaded_files
-- ============================================================================

-- Policy: Users can see files based on access level and permissions
CREATE POLICY "uploaded_files_access_policy" ON public.uploaded_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = uploaded_files.tenant_id
            AND (
                -- System admin has full access
                up.is_system_admin = true
                -- CEO and Admin can see all tenant files
                OR up.role IN ('CEO', 'Admin')
                -- File uploader can always see their own files
                OR up.id = uploaded_files.uploaded_by
                -- Area-based access: Manager can see area files
                OR (up.role = 'Manager' AND up.area_id = uploaded_files.area_id)
                -- Area-based access: Analyst can see their area files if access_level allows
                OR (up.role = 'Analyst' AND up.area_id = uploaded_files.area_id AND uploaded_files.access_level IN ('area', 'tenant'))
                -- Tenant-wide files for all users
                OR uploaded_files.access_level = 'tenant'
                -- Check explicit file permissions
                OR EXISTS (
                    SELECT 1 FROM public.file_permissions fp
                    WHERE fp.file_id = uploaded_files.id
                    AND fp.is_active = true
                    AND (fp.expires_at IS NULL OR fp.expires_at > now())
                    AND (
                        fp.user_id = up.id
                        OR fp.area_id = up.area_id
                        OR fp.role_name = up.role::text
                    )
                    AND fp.permission_type IN ('view', 'download', 'edit', 'admin')
                )
            )
        )
    );

-- Policy: Users can insert files based on role and area
CREATE POLICY "uploaded_files_insert_policy" ON public.uploaded_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = uploaded_files.tenant_id
            AND up.id = uploaded_files.uploaded_by
            AND (
                -- System admin can upload anywhere
                up.is_system_admin = true
                -- CEO and Admin can upload to any area
                OR up.role IN ('CEO', 'Admin')
                -- Manager can upload to their area (or no specific area)
                OR (up.role = 'Manager' AND (uploaded_files.area_id IS NULL OR up.area_id = uploaded_files.area_id))
                -- Analyst can upload to their area with appropriate access level
                OR (up.role = 'Analyst' AND up.area_id = uploaded_files.area_id AND uploaded_files.access_level IN ('private', 'area'))
            )
        )
    );

-- Policy: Users can update files they have permission to edit
CREATE POLICY "uploaded_files_update_policy" ON public.uploaded_files
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = uploaded_files.tenant_id
            AND (
                -- System admin has full access
                up.is_system_admin = true
                -- CEO and Admin can edit all tenant files
                OR up.role IN ('CEO', 'Admin')
                -- File uploader can edit their own files
                OR up.id = uploaded_files.uploaded_by
                -- Check explicit edit permissions
                OR EXISTS (
                    SELECT 1 FROM public.file_permissions fp
                    WHERE fp.file_id = uploaded_files.id
                    AND fp.is_active = true
                    AND (fp.expires_at IS NULL OR fp.expires_at > now())
                    AND (
                        fp.user_id = up.id
                        OR fp.area_id = up.area_id
                        OR fp.role_name = up.role::text
                    )
                    AND fp.permission_type IN ('edit', 'admin')
                )
            )
        )
    );

-- Policy: Users can delete files they have permission to delete
CREATE POLICY "uploaded_files_delete_policy" ON public.uploaded_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = uploaded_files.tenant_id
            AND (
                -- System admin has full access
                up.is_system_admin = true
                -- CEO and Admin can delete all tenant files
                OR up.role IN ('CEO', 'Admin')
                -- File uploader can delete their own files
                OR up.id = uploaded_files.uploaded_by
                -- Check explicit delete permissions
                OR EXISTS (
                    SELECT 1 FROM public.file_permissions fp
                    WHERE fp.file_id = uploaded_files.id
                    AND fp.is_active = true
                    AND (fp.expires_at IS NULL OR fp.expires_at > now())
                    AND (
                        fp.user_id = up.id
                        OR fp.area_id = up.area_id
                        OR fp.role_name = up.role::text
                    )
                    AND fp.permission_type IN ('delete', 'admin')
                )
            )
        )
    );

-- ============================================================================
-- RLS POLICIES: file_processing_jobs
-- ============================================================================

-- Policy: Users can see processing jobs for files they have access to
CREATE POLICY "file_processing_jobs_access_policy" ON public.file_processing_jobs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = file_processing_jobs.tenant_id
            AND (
                -- System admin has full access
                up.is_system_admin = true
                -- CEO and Admin can see all jobs
                OR up.role IN ('CEO', 'Admin')
                -- Check if user has access to the associated file
                OR EXISTS (
                    SELECT 1 FROM public.uploaded_files uf
                    WHERE uf.id = file_processing_jobs.file_id
                    AND (
                        uf.uploaded_by = up.id
                        OR (up.role = 'Manager' AND up.area_id = uf.area_id)
                        OR uf.access_level = 'tenant'
                    )
                )
            )
        )
    );

-- ============================================================================
-- RLS POLICIES: file_permissions
-- ============================================================================

-- Policy: Users can see permissions for files they have admin access to
CREATE POLICY "file_permissions_access_policy" ON public.file_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = file_permissions.tenant_id
            AND (
                -- System admin has full access
                up.is_system_admin = true
                -- CEO and Admin can see all permissions
                OR up.role IN ('CEO', 'Admin')
                -- File owner can see permissions for their files
                OR EXISTS (
                    SELECT 1 FROM public.uploaded_files uf
                    WHERE uf.id = file_permissions.file_id
                    AND uf.uploaded_by = up.id
                )
                -- Users can see permissions that directly affect them
                OR file_permissions.user_id = up.id
                OR file_permissions.area_id = up.area_id
                OR file_permissions.role_name = up.role::text
            )
        )
    );

-- Policy: Users can manage permissions for files they own or have admin access to
CREATE POLICY "file_permissions_manage_policy" ON public.file_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = file_permissions.tenant_id
            AND (
                -- System admin has full access
                up.is_system_admin = true
                -- CEO and Admin can manage all permissions
                OR up.role IN ('CEO', 'Admin')
                -- File owner can manage permissions for their files
                OR EXISTS (
                    SELECT 1 FROM public.uploaded_files uf
                    WHERE uf.id = file_permissions.file_id
                    AND uf.uploaded_by = up.id
                )
                -- Users with admin permission on the file
                OR EXISTS (
                    SELECT 1 FROM public.file_permissions fp
                    WHERE fp.file_id = file_permissions.file_id
                    AND fp.is_active = true
                    AND (fp.expires_at IS NULL OR fp.expires_at > now())
                    AND (
                        fp.user_id = up.id
                        OR fp.area_id = up.area_id
                        OR fp.role_name = up.role::text
                    )
                    AND fp.permission_type = 'admin'
                )
            )
        )
    );

-- ============================================================================
-- RLS POLICIES: file_access_log
-- ============================================================================

-- Policy: Users can see access logs for files they have admin access to
CREATE POLICY "file_access_log_access_policy" ON public.file_access_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.tenant_id = file_access_log.tenant_id
            AND (
                -- System admin has full access
                up.is_system_admin = true
                -- CEO and Admin can see all access logs
                OR up.role IN ('CEO', 'Admin')
                -- Users can see their own access logs
                OR file_access_log.user_id = up.id
                -- File owner can see access logs for their files
                OR EXISTS (
                    SELECT 1 FROM public.uploaded_files uf
                    WHERE uf.id = file_access_log.file_id
                    AND uf.uploaded_by = up.id
                )
                -- Area managers can see access logs for their area files
                OR (up.role = 'Manager' AND EXISTS (
                    SELECT 1 FROM public.uploaded_files uf
                    WHERE uf.id = file_access_log.file_id
                    AND uf.area_id = up.area_id
                ))
            )
        )
    );

-- Policy: System can insert access logs (no user restrictions)
CREATE POLICY "file_access_log_insert_policy" ON public.file_access_log
    FOR INSERT WITH CHECK (true); -- Allow system to log all access

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploaded_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_processing_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_permissions TO authenticated;
GRANT SELECT, INSERT ON public.file_access_log TO authenticated;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has specific permission on a file
CREATE OR REPLACE FUNCTION public.user_has_file_permission(
    p_file_id UUID,
    p_user_id UUID,
    p_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
    user_profile RECORD;
    file_record RECORD;
BEGIN
    -- Get user profile
    SELECT * INTO user_profile
    FROM public.user_profiles
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Get file record
    SELECT * INTO file_record
    FROM public.uploaded_files
    WHERE id = p_file_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check tenant isolation
    IF user_profile.tenant_id != file_record.tenant_id THEN
        RETURN false;
    END IF;
    
    -- System admin has all permissions
    IF user_profile.is_system_admin THEN
        RETURN true;
    END IF;
    
    -- CEO and Admin have all permissions
    IF user_profile.role IN ('CEO', 'Admin') THEN
        RETURN true;
    END IF;
    
    -- File owner has all permissions
    IF user_profile.id = file_record.uploaded_by THEN
        RETURN true;
    END IF;
    
    -- Check explicit permissions
    SELECT true INTO has_permission
    FROM public.file_permissions fp
    WHERE fp.file_id = p_file_id
    AND fp.is_active = true
    AND (fp.expires_at IS NULL OR fp.expires_at > now())
    AND (
        fp.user_id = p_user_id
        OR fp.area_id = user_profile.area_id
        OR fp.role_name = user_profile.role::text
    )
    AND (
        fp.permission_type = p_permission
        OR fp.permission_type = 'admin'
        OR (p_permission = 'view' AND fp.permission_type IN ('download', 'edit', 'delete', 'share'))
    )
    LIMIT 1;
    
    -- If no explicit permission found, check area-based access
    IF NOT has_permission AND file_record.area_id IS NOT NULL THEN
        IF user_profile.role = 'Manager' AND user_profile.area_id = file_record.area_id THEN
            has_permission := true;
        ELSIF user_profile.role = 'Analyst' AND user_profile.area_id = file_record.area_id 
              AND p_permission IN ('view', 'download') 
              AND file_record.access_level IN ('area', 'tenant') THEN
            has_permission := true;
        END IF;
    END IF;
    
    -- Check tenant-wide access for view/download
    IF NOT has_permission AND p_permission IN ('view', 'download') 
       AND file_record.access_level = 'tenant' THEN
        has_permission := true;
    END IF;
    
    RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log file access
CREATE OR REPLACE FUNCTION public.log_file_access(
    p_file_id UUID,
    p_user_id UUID,
    p_action TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
    file_tenant_id UUID;
BEGIN
    -- Get file tenant_id
    SELECT tenant_id INTO file_tenant_id
    FROM public.uploaded_files
    WHERE id = p_file_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'File not found: %', p_file_id;
    END IF;
    
    -- Insert access log
    INSERT INTO public.file_access_log (
        tenant_id,
        file_id,
        user_id,
        action,
        ip_address,
        user_agent,
        success,
        error_message
    ) VALUES (
        file_tenant_id,
        p_file_id,
        p_user_id,
        p_action,
        p_ip_address,
        p_user_agent,
        p_success,
        p_error_message
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.uploaded_files IS 'Comprehensive file management system with security, processing, and permissions';
COMMENT ON TABLE public.file_processing_jobs IS 'Background job queue for file processing tasks';
COMMENT ON TABLE public.file_permissions IS 'Granular permission system for file access control';
COMMENT ON TABLE public.file_access_log IS 'Audit trail for all file access activities';

COMMENT ON COLUMN public.uploaded_files.file_hash IS 'SHA-256 hash for deduplication and integrity verification';
COMMENT ON COLUMN public.uploaded_files.access_level IS 'Controls default access scope for the file';
COMMENT ON COLUMN public.uploaded_files.retention_policy IS 'Defines how long the file should be retained';
COMMENT ON COLUMN public.file_processing_jobs.priority IS 'Job priority (1=highest, 10=lowest)';
COMMENT ON COLUMN public.file_permissions.permission_type IS 'Type of permission granted (view, download, edit, delete, share, admin)';
COMMENT ON COLUMN public.file_access_log.action IS 'Action performed on the file';

-- ============================================================================
-- MIGRATION DATA FROM EXISTING file_uploads TABLE
-- ============================================================================

-- TODO: Add migration script to move data from file_uploads to uploaded_files
-- This will be handled in a separate migration to avoid conflicts

-- Create a view to maintain compatibility with existing code
CREATE OR REPLACE VIEW public.file_uploads AS
SELECT 
    id,
    tenant_id,
    area_id,
    uploaded_by,
    original_filename,
    file_path,
    file_size,
    mime_type,
    upload_status,
    processing_log,
    records_created,
    records_updated,
    records_failed,
    error_details,
    metadata,
    created_at,
    updated_at,
    processed_at
FROM public.uploaded_files
WHERE upload_status != 'deleted';

COMMENT ON VIEW public.file_uploads IS 'Compatibility view for existing file_uploads table structure';