-- =============================================
-- Migration 006: Create Performance Indexes
-- =============================================
-- This migration creates database indexes to optimize query performance.
-- Indexes are added on foreign keys, commonly filtered columns, and
-- columns used in JOIN operations and RLS policies.

-- ============================================================
-- Indexes for: tenants
-- ============================================================

-- Index on subdomain for quick tenant lookup
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain 
ON public.tenants (subdomain);

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_tenants_created_at 
ON public.tenants (created_at DESC);

-- ============================================================
-- Indexes for: areas
-- ============================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_areas_tenant_id 
ON public.areas (tenant_id);

CREATE INDEX IF NOT EXISTS idx_areas_manager_id 
ON public.areas (manager_id);

-- Composite index for tenant-based queries
CREATE INDEX IF NOT EXISTS idx_areas_tenant_name 
ON public.areas (tenant_id, name);

-- ============================================================
-- Indexes for: user_profiles
-- ============================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id 
ON public.user_profiles (tenant_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_area_id 
ON public.user_profiles (area_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id 
ON public.user_profiles (user_id);

-- Index on role for RLS policies
CREATE INDEX IF NOT EXISTS idx_user_profiles_role 
ON public.user_profiles (role);

-- Composite index for authentication lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_role 
ON public.user_profiles (user_id, role);

-- Index on email for user searches
CREATE INDEX IF NOT EXISTS idx_user_profiles_email 
ON public.user_profiles (email);

-- Composite index for tenant user lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_email 
ON public.user_profiles (tenant_id, email);

-- ============================================================
-- Indexes for: quarters
-- ============================================================

-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_quarters_tenant_id 
ON public.quarters (tenant_id);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_quarters_date_range 
ON public.quarters (start_date, end_date);

-- Composite index for quarter lookups
CREATE INDEX IF NOT EXISTS idx_quarters_tenant_quarter 
ON public.quarters (tenant_id, quarter_name);

-- ============================================================
-- Indexes for: objectives
-- ============================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_objectives_tenant_id 
ON public.objectives (tenant_id);

CREATE INDEX IF NOT EXISTS idx_objectives_area_id 
ON public.objectives (area_id);

CREATE INDEX IF NOT EXISTS idx_objectives_created_by 
ON public.objectives (created_by);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_objectives_created_at 
ON public.objectives (created_at DESC);

-- Composite index for area-based queries
CREATE INDEX IF NOT EXISTS idx_objectives_area_created 
ON public.objectives (area_id, created_at DESC);

-- ============================================================
-- Indexes for: objective_quarters
-- ============================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_objective_quarters_objective_id 
ON public.objective_quarters (objective_id);

CREATE INDEX IF NOT EXISTS idx_objective_quarters_quarter_id 
ON public.objective_quarters (quarter_id);

-- ============================================================
-- Indexes for: initiatives
-- ============================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_initiatives_tenant_id 
ON public.initiatives (tenant_id);

CREATE INDEX IF NOT EXISTS idx_initiatives_area_id 
ON public.initiatives (area_id);

CREATE INDEX IF NOT EXISTS idx_initiatives_created_by 
ON public.initiatives (created_by);

-- Index on progress for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_initiatives_progress 
ON public.initiatives (progress);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_initiatives_due_date 
ON public.initiatives (due_date) 
WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_initiatives_start_date 
ON public.initiatives (start_date) 
WHERE start_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_initiatives_completion_date 
ON public.initiatives (completion_date) 
WHERE completion_date IS NOT NULL;

-- Composite index for area dashboard queries
CREATE INDEX IF NOT EXISTS idx_initiatives_area_progress 
ON public.initiatives (area_id, progress);

-- Composite index for timeline queries
CREATE INDEX IF NOT EXISTS idx_initiatives_area_dates 
ON public.initiatives (area_id, start_date, due_date);

-- Index for incomplete initiatives
CREATE INDEX IF NOT EXISTS idx_initiatives_incomplete 
ON public.initiatives (area_id, due_date) 
WHERE progress < 100;

-- ============================================================
-- Indexes for: objective_initiatives
-- ============================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_objective_initiatives_objective_id 
ON public.objective_initiatives (objective_id);

CREATE INDEX IF NOT EXISTS idx_objective_initiatives_initiative_id 
ON public.objective_initiatives (initiative_id);

-- ============================================================
-- Indexes for: activities
-- ============================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_activities_initiative_id 
ON public.activities (initiative_id);

CREATE INDEX IF NOT EXISTS idx_activities_assigned_to 
ON public.activities (assigned_to);

-- Index on completion status
CREATE INDEX IF NOT EXISTS idx_activities_is_completed 
ON public.activities (is_completed);

-- Composite index for initiative activity queries
CREATE INDEX IF NOT EXISTS idx_activities_initiative_completed 
ON public.activities (initiative_id, is_completed);

-- Composite index for user task queries
CREATE INDEX IF NOT EXISTS idx_activities_assigned_completed 
ON public.activities (assigned_to, is_completed) 
WHERE assigned_to IS NOT NULL;

-- Index for pending activities
CREATE INDEX IF NOT EXISTS idx_activities_pending 
ON public.activities (assigned_to, created_at DESC) 
WHERE is_completed = false;

-- ============================================================
-- Indexes for: progress_history
-- ============================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_progress_history_initiative_id 
ON public.progress_history (initiative_id);

CREATE INDEX IF NOT EXISTS idx_progress_history_updated_by 
ON public.progress_history (updated_by);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_progress_history_created_at 
ON public.progress_history (created_at DESC);

-- Composite index for initiative history queries
CREATE INDEX IF NOT EXISTS idx_progress_history_initiative_time 
ON public.progress_history (initiative_id, created_at DESC);

-- ============================================================
-- Indexes for: uploaded_files
-- ============================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_uploaded_files_tenant_id 
ON public.uploaded_files (tenant_id);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_by 
ON public.uploaded_files (uploaded_by);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_uploaded_files_created_at 
ON public.uploaded_files (created_at DESC);

-- Composite index for user file queries
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_time 
ON public.uploaded_files (uploaded_by, created_at DESC);

-- ============================================================
-- Indexes for: file_areas
-- ============================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_file_areas_file_id 
ON public.file_areas (file_id);

CREATE INDEX IF NOT EXISTS idx_file_areas_area_id 
ON public.file_areas (area_id);

-- ============================================================
-- Indexes for: file_initiatives
-- ============================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_file_initiatives_file_id 
ON public.file_initiatives (file_id);

CREATE INDEX IF NOT EXISTS idx_file_initiatives_initiative_id 
ON public.file_initiatives (initiative_id);

-- ============================================================
-- Indexes for: audit_log
-- ============================================================

-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id 
ON public.audit_log (user_id);

-- Composite index for table-specific queries
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record 
ON public.audit_log (table_name, record_id);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at 
ON public.audit_log (created_at DESC);

-- Composite index for user activity queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_time 
ON public.audit_log (user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

-- Index for action-based queries
CREATE INDEX IF NOT EXISTS idx_audit_log_action 
ON public.audit_log (action, created_at DESC);

-- ============================================================
-- Text Search Indexes (for full-text search capabilities)
-- ============================================================

-- Create text search configuration if needed
-- Note: This uses the default 'english' configuration
-- Adjust based on your language requirements

-- Full-text search index on initiatives
CREATE INDEX IF NOT EXISTS idx_initiatives_search 
ON public.initiatives 
USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Full-text search index on objectives
CREATE INDEX IF NOT EXISTS idx_objectives_search 
ON public.objectives 
USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Full-text search index on activities
CREATE INDEX IF NOT EXISTS idx_activities_search 
ON public.activities 
USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- ============================================================
-- Statistics Update
-- ============================================================

-- Update table statistics for query planner optimization
-- This helps PostgreSQL make better decisions about query execution plans
ANALYZE public.tenants;
ANALYZE public.areas;
ANALYZE public.user_profiles;
ANALYZE public.quarters;
ANALYZE public.objectives;
ANALYZE public.objective_quarters;
ANALYZE public.initiatives;
ANALYZE public.objective_initiatives;
ANALYZE public.activities;
ANALYZE public.progress_history;
ANALYZE public.uploaded_files;
ANALYZE public.file_areas;
ANALYZE public.file_initiatives;
ANALYZE public.audit_log;