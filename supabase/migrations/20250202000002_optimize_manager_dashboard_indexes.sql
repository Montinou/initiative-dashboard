-- Manager Dashboard Query Optimization: Additional Indexes
-- This migration adds comprehensive indexing for manager dashboard performance optimization

-- 1. INITIATIVES TABLE OPTIMIZATION
-- Most common query patterns for initiatives:
-- - Filter by tenant_id + area_id (most common)
-- - Filter by status
-- - Filter by priority
-- - Order by created_at DESC (for pagination)
-- - Filter by target_date (for deadline queries)
-- - Search by title/description

-- Composite index for tenant + area filtering (most important)
CREATE INDEX IF NOT EXISTS idx_initiatives_tenant_area_status 
ON public.initiatives(tenant_id, area_id, status);

-- Index for pagination with created_at ordering
CREATE INDEX IF NOT EXISTS idx_initiatives_tenant_area_created_at 
ON public.initiatives(tenant_id, area_id, created_at DESC);

-- Index for priority filtering
CREATE INDEX IF NOT EXISTS idx_initiatives_tenant_area_priority 
ON public.initiatives(tenant_id, area_id, priority);

-- Index for deadline queries (upcoming deadlines)
CREATE INDEX IF NOT EXISTS idx_initiatives_tenant_area_target_date 
ON public.initiatives(tenant_id, area_id, target_date) 
WHERE target_date IS NOT NULL;

-- Full text search index for title and description
CREATE INDEX IF NOT EXISTS idx_initiatives_text_search 
ON public.initiatives USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')));

-- Index for progress tracking queries
CREATE INDEX IF NOT EXISTS idx_initiatives_tenant_area_progress 
ON public.initiatives(tenant_id, area_id, progress);

-- Index for owner-based queries
CREATE INDEX IF NOT EXISTS idx_initiatives_tenant_area_owner 
ON public.initiatives(tenant_id, area_id, owner_id);

-- Covering index for common SELECT queries (includes frequently accessed columns)
CREATE INDEX IF NOT EXISTS idx_initiatives_summary_covering 
ON public.initiatives(tenant_id, area_id) 
INCLUDE (title, status, priority, progress, target_date, created_at);

-- 2. SUBTASKS TABLE OPTIMIZATION
-- Common patterns:
-- - Filter by initiative_id
-- - Filter by completed status
-- - Filter by tenant_id for security

-- Composite index for subtask queries
CREATE INDEX  IF NOT EXISTS idx_subtasks_tenant_initiative 
ON public.subtasks(tenant_id, initiative_id);

-- Index for completion status queries
CREATE INDEX  IF NOT EXISTS idx_subtasks_tenant_initiative_completed 
ON public.subtasks(tenant_id, initiative_id, completed);

-- Index for subtask counting (used in initiatives_with_subtasks_summary view)
CREATE INDEX  IF NOT EXISTS idx_subtasks_initiative_completed_count 
ON public.subtasks(initiative_id, completed);

-- 3. AREAS TABLE OPTIMIZATION
-- Common patterns:
-- - Filter by tenant_id
-- - Filter by manager_id
-- - Filter by is_active

-- Composite index for manager area lookup
CREATE INDEX  IF NOT EXISTS idx_areas_tenant_manager 
ON public.areas(tenant_id, manager_id) 
WHERE is_active = true;

-- Index for active areas
CREATE INDEX  IF NOT EXISTS idx_areas_tenant_active 
ON public.areas(tenant_id, is_active);

-- 4. USER_PROFILES TABLE OPTIMIZATION
-- Common patterns:
-- - Filter by tenant_id + area_id
-- - Filter by role
-- - Filter by is_active

-- Composite index for role-based queries
CREATE INDEX  IF NOT EXISTS idx_user_profiles_tenant_area_role 
ON public.user_profiles(tenant_id, area_id, role) 
WHERE is_active = true;

-- Index for manager lookups
CREATE INDEX  IF NOT EXISTS idx_user_profiles_tenant_manager 
ON public.user_profiles(tenant_id, area_id) 
WHERE role = 'Manager' AND is_active = true;

-- 5. AUDIT_LOG TABLE OPTIMIZATION
-- Common patterns:
-- - Filter by tenant_id
-- - Order by created_at DESC
-- - Filter by resource_type

-- Composite index for audit log queries
CREATE INDEX  IF NOT EXISTS idx_audit_log_tenant_created_at 
ON public.audit_log(tenant_id, created_at DESC);

-- Index for resource type filtering
CREATE INDEX  IF NOT EXISTS idx_audit_log_tenant_resource_type 
ON public.audit_log(tenant_id, resource_type, created_at DESC);

-- Partial index for recent audit entries removed due to CURRENT_DATE immutability issue
-- Alternative: Use application-level filtering for recent entries or create index without WHERE clause
CREATE INDEX IF NOT EXISTS idx_audit_log_recent 
ON public.audit_log(tenant_id, created_at DESC);

-- 6. PROGRESS_HISTORY TABLE OPTIMIZATION
-- Common patterns:
-- - Filter by initiative_id
-- - Order by created_at DESC

-- Composite index for progress history
CREATE INDEX  IF NOT EXISTS idx_progress_history_tenant_initiative 
ON public.progress_history(tenant_id, initiative_id, created_at DESC);

-- 7. SPECIALIZED INDEXES FOR VIEWS AND COMPLEX QUERIES

-- Index to optimize initiatives_with_subtasks_summary view
-- This supports the most common manager dashboard query
CREATE INDEX  IF NOT EXISTS idx_initiatives_summary_optimization 
ON public.initiatives(tenant_id, area_id, status, priority) 
INCLUDE (title, description, progress, target_date, created_at, updated_at);

-- 8. FILE_UPLOADS TABLE ADDITIONAL INDEXES
-- NOTE: file_uploads becomes a view in later migration 20250203000001_comprehensive_file_management.sql
-- These indexes will be created on the underlying uploaded_files table instead

-- 9. PERFORMANCE MONITORING INDEXES

-- Index for identifying slow queries on initiatives
CREATE INDEX  IF NOT EXISTS idx_initiatives_complex_queries 
ON public.initiatives(tenant_id, area_id, status, priority, target_date) 
WHERE status IN ('planning', 'in_progress');

-- Index for initiative counting by area
CREATE INDEX  IF NOT EXISTS idx_initiatives_area_count 
ON public.initiatives(area_id) 
WHERE status != 'completed';

-- 10. JSONB INDEXES FOR METADATA QUERIES

-- GIN index for initiatives metadata (if used for filtering)
CREATE INDEX  IF NOT EXISTS idx_initiatives_metadata_gin 
ON public.initiatives USING GIN(metadata);

-- GIN index for file upload processing log - REMOVED (file_uploads becomes a view)

-- 11. UNIQUE CONSTRAINTS AND PERFORMANCE INDEXES

-- Ensure unique area manager per tenant (if business rule requires it)
-- Note: This might already exist, adding IF NOT EXISTS for safety
CREATE UNIQUE INDEX  IF NOT EXISTS idx_areas_unique_manager_per_tenant 
ON public.areas(tenant_id, manager_id) 
WHERE is_active = true AND manager_id IS NOT NULL;

-- 12. STATISTICS AND MAINTENANCE

-- Update table statistics to help query planner
ANALYZE public.initiatives;
ANALYZE public.subtasks;
ANALYZE public.areas;
ANALYZE public.user_profiles;
ANALYZE public.audit_log;
-- ANALYZE public.file_uploads; -- REMOVED (file_uploads becomes a view)
ANALYZE public.progress_history;

-- Comments for documentation
COMMENT ON INDEX idx_initiatives_tenant_area_status IS 'Optimizes most common manager dashboard initiative queries';
COMMENT ON INDEX idx_initiatives_tenant_area_created_at IS 'Optimizes pagination queries ordered by creation date';
COMMENT ON INDEX idx_initiatives_text_search IS 'Enables full-text search on initiative titles and descriptions';
COMMENT ON INDEX idx_subtasks_tenant_initiative_completed IS 'Optimizes subtask completion status queries';
COMMENT ON INDEX idx_areas_tenant_manager IS 'Optimizes manager area lookup queries';
COMMENT ON INDEX idx_audit_log_tenant_created_at IS 'Optimizes audit log queries for activity feeds';
-- COMMENT ON INDEX idx_file_uploads_tenant_area_status_date IS 'Optimizes file upload history queries'; -- REMOVED

-- Create maintenance function for index monitoring
CREATE OR REPLACE FUNCTION monitor_manager_dashboard_indexes()
RETURNS TABLE(
    table_name TEXT,
    index_name TEXT,
    index_size TEXT,
    index_usage_count BIGINT,
    table_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname || '.' || tablename as table_name,
        indexname as index_name,
        pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size,
        idx_scan as index_usage_count,
        pg_size_pretty(pg_relation_size(tablename::regclass)) as table_size
    FROM pg_stat_user_indexes 
    WHERE schemaname = 'public' 
    AND tablename IN ('initiatives', 'subtasks', 'areas', 'user_profiles', 'audit_log', 'progress_history')
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on monitoring function
GRANT EXECUTE ON FUNCTION monitor_manager_dashboard_indexes() TO authenticated;

COMMENT ON FUNCTION monitor_manager_dashboard_indexes() IS 'Monitors index usage and performance for manager dashboard tables';

-- Create function to identify missing indexes based on query patterns
CREATE OR REPLACE FUNCTION suggest_missing_indexes()
RETURNS TABLE(
    suggestion TEXT,
    table_name TEXT,
    estimated_benefit TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Consider adding index on (' || string_agg(column_name, ', ') || ')' as suggestion,
        table_name::TEXT,
        'High' as estimated_benefit
    FROM (
        -- This is a simplified example - in production you'd analyze pg_stat_statements
        VALUES 
            ('initiatives', 'tenant_id, area_id, status, created_at'),
            ('subtasks', 'initiative_id, completed'),
            ('audit_log', 'tenant_id, resource_type, created_at')
    ) AS missing_indexes(table_name, column_name)
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = missing_indexes.table_name 
        AND indexdef LIKE '%' || missing_indexes.column_name || '%'
    )
    GROUP BY table_name, column_name;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION suggest_missing_indexes() TO authenticated;

COMMENT ON FUNCTION suggest_missing_indexes() IS 'Suggests missing indexes based on common query patterns';