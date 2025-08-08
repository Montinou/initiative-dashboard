-- ============================================================
-- Migration 7: Create performance indexes
-- ============================================================
-- This migration adds indexes to improve query performance
-- Indexes are created on foreign keys, commonly filtered columns,
-- and columns used in JOIN operations
-- ============================================================

-- ============================================================
-- Organizations indexes
-- ============================================================
CREATE INDEX idx_organizations_name ON public.organizations (name);
CREATE INDEX idx_organizations_created_at ON public.organizations (created_at DESC);

-- ============================================================
-- Tenants indexes
-- ============================================================
CREATE INDEX idx_tenants_organization_id ON public.tenants (organization_id);
CREATE INDEX idx_tenants_subdomain ON public.tenants (subdomain);

-- ============================================================
-- Quarters indexes
-- ============================================================
CREATE INDEX idx_quarters_tenant_id ON public.quarters (tenant_id);
CREATE INDEX idx_quarters_dates ON public.quarters (start_date, end_date);
CREATE INDEX idx_quarters_tenant_quarter ON public.quarters (tenant_id, quarter_name);

-- ============================================================
-- Users indexes
-- ============================================================
CREATE INDEX idx_users_email ON public.users (email);
CREATE INDEX idx_users_created_at ON public.users (created_at DESC);

-- ============================================================
-- Areas indexes
-- ============================================================
CREATE INDEX idx_areas_tenant_id ON public.areas (tenant_id);
CREATE INDEX idx_areas_manager_id ON public.areas (manager_id);
CREATE INDEX idx_areas_name ON public.areas (name);
CREATE INDEX idx_areas_tenant_name ON public.areas (tenant_id, name);

-- ============================================================
-- User profiles indexes
-- ============================================================
CREATE INDEX idx_user_profiles_tenant_id ON public.user_profiles (tenant_id);
CREATE INDEX idx_user_profiles_area_id ON public.user_profiles (area_id);
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles (user_id);
CREATE INDEX idx_user_profiles_role ON public.user_profiles (role);
CREATE INDEX idx_user_profiles_email ON public.user_profiles (email);
CREATE INDEX idx_user_profiles_tenant_role ON public.user_profiles (tenant_id, role);
CREATE INDEX idx_user_profiles_tenant_area ON public.user_profiles (tenant_id, area_id);

-- ============================================================
-- Objectives indexes
-- ============================================================
CREATE INDEX idx_objectives_tenant_id ON public.objectives (tenant_id);
CREATE INDEX idx_objectives_area_id ON public.objectives (area_id);
CREATE INDEX idx_objectives_created_by ON public.objectives (created_by);
CREATE INDEX idx_objectives_created_at ON public.objectives (created_at DESC);
CREATE INDEX idx_objectives_tenant_area ON public.objectives (tenant_id, area_id);

-- ============================================================
-- Objective quarters indexes
-- ============================================================
CREATE INDEX idx_objective_quarters_objective_id ON public.objective_quarters (objective_id);
CREATE INDEX idx_objective_quarters_quarter_id ON public.objective_quarters (quarter_id);

-- ============================================================
-- Initiatives indexes
-- ============================================================
CREATE INDEX idx_initiatives_tenant_id ON public.initiatives (tenant_id);
CREATE INDEX idx_initiatives_area_id ON public.initiatives (area_id);
CREATE INDEX idx_initiatives_created_by ON public.initiatives (created_by);
CREATE INDEX idx_initiatives_progress ON public.initiatives (progress);
CREATE INDEX idx_initiatives_due_date ON public.initiatives (due_date);
CREATE INDEX idx_initiatives_start_date ON public.initiatives (start_date);
CREATE INDEX idx_initiatives_completion_date ON public.initiatives (completion_date);
CREATE INDEX idx_initiatives_created_at ON public.initiatives (created_at DESC);
CREATE INDEX idx_initiatives_tenant_area ON public.initiatives (tenant_id, area_id);
CREATE INDEX idx_initiatives_tenant_progress ON public.initiatives (tenant_id, progress);
-- Index for overdue initiatives (simplified without CURRENT_DATE)
CREATE INDEX idx_initiatives_overdue ON public.initiatives (due_date, progress) 
  WHERE progress < 100;

-- ============================================================
-- Objective initiatives indexes
-- ============================================================
CREATE INDEX idx_objective_initiatives_objective_id ON public.objective_initiatives (objective_id);
CREATE INDEX idx_objective_initiatives_initiative_id ON public.objective_initiatives (initiative_id);

-- ============================================================
-- Activities indexes
-- ============================================================
CREATE INDEX idx_activities_initiative_id ON public.activities (initiative_id);
CREATE INDEX idx_activities_assigned_to ON public.activities (assigned_to);
CREATE INDEX idx_activities_is_completed ON public.activities (is_completed);
CREATE INDEX idx_activities_created_at ON public.activities (created_at DESC);
CREATE INDEX idx_activities_initiative_completed ON public.activities (initiative_id, is_completed);
CREATE INDEX idx_activities_assigned_completed ON public.activities (assigned_to, is_completed);

-- ============================================================
-- Progress history indexes
-- ============================================================
CREATE INDEX idx_progress_history_initiative_id ON public.progress_history (initiative_id);
CREATE INDEX idx_progress_history_updated_by ON public.progress_history (updated_by);
CREATE INDEX idx_progress_history_created_at ON public.progress_history (created_at DESC);
CREATE INDEX idx_progress_history_initiative_date ON public.progress_history (initiative_id, created_at DESC);

-- ============================================================
-- Uploaded files indexes
-- ============================================================
CREATE INDEX idx_uploaded_files_tenant_id ON public.uploaded_files (tenant_id);
CREATE INDEX idx_uploaded_files_uploaded_by ON public.uploaded_files (uploaded_by);
CREATE INDEX idx_uploaded_files_created_at ON public.uploaded_files (created_at DESC);
CREATE INDEX idx_uploaded_files_tenant_user ON public.uploaded_files (tenant_id, uploaded_by);

-- ============================================================
-- File areas indexes
-- ============================================================
CREATE INDEX idx_file_areas_file_id ON public.file_areas (file_id);
CREATE INDEX idx_file_areas_area_id ON public.file_areas (area_id);

-- ============================================================
-- File initiatives indexes
-- ============================================================
CREATE INDEX idx_file_initiatives_file_id ON public.file_initiatives (file_id);
CREATE INDEX idx_file_initiatives_initiative_id ON public.file_initiatives (initiative_id);

-- ============================================================
-- Audit log indexes
-- ============================================================
CREATE INDEX idx_audit_log_user_id ON public.audit_log (user_id);
CREATE INDEX idx_audit_log_table_name ON public.audit_log (table_name);
CREATE INDEX idx_audit_log_record_id ON public.audit_log (record_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_table_record ON public.audit_log (table_name, record_id);
CREATE INDEX idx_audit_log_user_date ON public.audit_log (user_id, created_at DESC);

-- ============================================================
-- Text search indexes (for common search operations)
-- ============================================================
-- These use GIN indexes for full-text search capabilities
CREATE INDEX idx_areas_search ON public.areas USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_objectives_search ON public.objectives USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_initiatives_search ON public.initiatives USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_activities_search ON public.activities USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Add comments for documentation
COMMENT ON INDEX idx_initiatives_overdue IS 'Partial index for finding overdue initiatives';
COMMENT ON INDEX idx_areas_search IS 'Full-text search index for areas';
COMMENT ON INDEX idx_objectives_search IS 'Full-text search index for objectives';
COMMENT ON INDEX idx_initiatives_search IS 'Full-text search index for initiatives';
COMMENT ON INDEX idx_activities_search IS 'Full-text search index for activities';