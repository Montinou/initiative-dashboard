-- ============================================================
-- Migration: Add Filter Optimization Indexes
-- Project: FILTER-IMPL-2025
-- Purpose: Optimize database queries for dashboard filtering functionality
-- Author: Database Architect Agent
-- Date: 2025-08-14
-- ============================================================

-- This migration adds specialized indexes to optimize filter queries across
-- the dashboard. These indexes are designed to support:
-- 1. Date range filtering (start_date/end_date)
-- 2. Status and priority filtering
-- 3. Multi-column composite indexes for common filter combinations
-- 4. Enhanced search capabilities
-- 5. Tenant-aware filtering performance

-- ============================================================
-- INITIATIVES TABLE INDEXES
-- ============================================================

-- Date range filtering (frequently used together)
CREATE INDEX IF NOT EXISTS idx_initiatives_date_range 
ON public.initiatives (start_date, due_date, tenant_id)
WHERE start_date IS NOT NULL OR due_date IS NOT NULL;
COMMENT ON INDEX idx_initiatives_date_range IS 'Optimizes date range filtering for initiatives with tenant isolation';

-- Status filtering with tenant isolation
CREATE INDEX IF NOT EXISTS idx_initiatives_status_tenant 
ON public.initiatives (status, tenant_id, area_id);
COMMENT ON INDEX idx_initiatives_status_tenant IS 'Optimizes status filtering with tenant and area isolation';

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_initiatives_filter_composite 
ON public.initiatives (tenant_id, status, progress, start_date, due_date);
COMMENT ON INDEX idx_initiatives_filter_composite IS 'Composite index for common filter combinations';

-- Progress range filtering
CREATE INDEX IF NOT EXISTS idx_initiatives_progress_range 
ON public.initiatives (tenant_id, progress)
WHERE progress IS NOT NULL;
COMMENT ON INDEX idx_initiatives_progress_range IS 'Optimizes progress range queries';

-- Active initiatives (not completed)
CREATE INDEX IF NOT EXISTS idx_initiatives_active 
ON public.initiatives (tenant_id, area_id, status, due_date)
WHERE status != 'completed';
COMMENT ON INDEX idx_initiatives_active IS 'Optimizes queries for active initiatives';

-- ============================================================
-- OBJECTIVES TABLE INDEXES
-- ============================================================

-- Date range filtering for objectives
CREATE INDEX IF NOT EXISTS idx_objectives_date_range 
ON public.objectives (start_date, end_date, tenant_id)
WHERE start_date IS NOT NULL OR end_date IS NOT NULL;
COMMENT ON INDEX idx_objectives_date_range IS 'Optimizes date range filtering for objectives';

-- Priority filtering with tenant isolation
CREATE INDEX IF NOT EXISTS idx_objectives_priority_tenant 
ON public.objectives (priority, tenant_id, area_id);
COMMENT ON INDEX idx_objectives_priority_tenant IS 'Optimizes priority filtering with tenant isolation';

-- Status filtering for objectives
CREATE INDEX IF NOT EXISTS idx_objectives_status_tenant 
ON public.objectives (status, tenant_id, progress);
COMMENT ON INDEX idx_objectives_status_tenant IS 'Optimizes status filtering for objectives';

-- Composite index for objectives filtering
CREATE INDEX IF NOT EXISTS idx_objectives_filter_composite 
ON public.objectives (tenant_id, status, priority, start_date, end_date);
COMMENT ON INDEX idx_objectives_filter_composite IS 'Composite index for common objective filter combinations';

-- Target date index (legacy support)
CREATE INDEX IF NOT EXISTS idx_objectives_target_date 
ON public.objectives (target_date, tenant_id)
WHERE target_date IS NOT NULL;
COMMENT ON INDEX idx_objectives_target_date IS 'Index for target_date filtering (legacy support)';

-- ============================================================
-- ACTIVITIES TABLE INDEXES
-- ============================================================

-- Completion status with assignment
CREATE INDEX IF NOT EXISTS idx_activities_completion_assignment 
ON public.activities (is_completed, assigned_to, initiative_id);
COMMENT ON INDEX idx_activities_completion_assignment IS 'Optimizes filtering by completion status and assignment';

-- Date-based activity filtering
CREATE INDEX IF NOT EXISTS idx_activities_date_filter 
ON public.activities (created_at DESC, is_completed, assigned_to);
COMMENT ON INDEX idx_activities_date_filter IS 'Optimizes date-based activity filtering';

-- ============================================================
-- ENHANCED SEARCH INDEXES
-- ============================================================

-- Trigram indexes for fuzzy search (requires pg_trgm extension)
-- First ensure the extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fuzzy search on initiative titles
CREATE INDEX IF NOT EXISTS idx_initiatives_title_trgm 
ON public.initiatives USING gin (title gin_trgm_ops);
COMMENT ON INDEX idx_initiatives_title_trgm IS 'Enables fuzzy search on initiative titles';

-- Fuzzy search on objective titles
CREATE INDEX IF NOT EXISTS idx_objectives_title_trgm 
ON public.objectives USING gin (title gin_trgm_ops);
COMMENT ON INDEX idx_objectives_title_trgm IS 'Enables fuzzy search on objective titles';

-- Fuzzy search on activity titles
CREATE INDEX IF NOT EXISTS idx_activities_title_trgm 
ON public.activities USING gin (title gin_trgm_ops);
COMMENT ON INDEX idx_activities_title_trgm IS 'Enables fuzzy search on activity titles';

-- Combined text search indexes (enhanced from existing)
-- These replace the existing search indexes with better performance
DROP INDEX IF EXISTS idx_initiatives_search;
CREATE INDEX idx_initiatives_search_enhanced 
ON public.initiatives 
USING gin((
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B')
));
COMMENT ON INDEX idx_initiatives_search_enhanced IS 'Enhanced full-text search with weighted terms for initiatives';

DROP INDEX IF EXISTS idx_objectives_search;
CREATE INDEX idx_objectives_search_enhanced 
ON public.objectives 
USING gin((
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B')
));
COMMENT ON INDEX idx_objectives_search_enhanced IS 'Enhanced full-text search with weighted terms for objectives';

-- ============================================================
-- CROSS-TABLE JOIN OPTIMIZATION INDEXES
-- ============================================================

-- Optimize joins between objectives and initiatives
CREATE INDEX IF NOT EXISTS idx_objective_initiatives_composite 
ON public.objective_initiatives (objective_id, initiative_id);
COMMENT ON INDEX idx_objective_initiatives_composite IS 'Optimizes joins between objectives and initiatives';

-- Optimize filtering by multiple objectives
CREATE INDEX IF NOT EXISTS idx_objective_initiatives_reverse 
ON public.objective_initiatives (initiative_id, objective_id);
COMMENT ON INDEX idx_objective_initiatives_reverse IS 'Optimizes reverse lookups from initiatives to objectives';

-- ============================================================
-- AREAS TABLE OPTIMIZATION
-- ============================================================

-- Active areas with manager
CREATE INDEX IF NOT EXISTS idx_areas_active_manager 
ON public.areas (tenant_id, is_active, manager_id)
WHERE is_active = true;
COMMENT ON INDEX idx_areas_active_manager IS 'Optimizes queries for active areas with managers';

-- ============================================================
-- USER PROFILES OPTIMIZATION
-- ============================================================

-- Active users by role and area
CREATE INDEX IF NOT EXISTS idx_user_profiles_active_role_area 
ON public.user_profiles (tenant_id, role, area_id, is_active)
WHERE is_active = true;
COMMENT ON INDEX idx_user_profiles_active_role_area IS 'Optimizes queries for active users by role and area';

-- User assignment lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_assignment 
ON public.user_profiles (id, tenant_id, full_name)
WHERE is_active = true;
COMMENT ON INDEX idx_user_profiles_assignment IS 'Optimizes user assignment lookups';

-- ============================================================
-- PROGRESS HISTORY OPTIMIZATION
-- ============================================================

-- Date range filtering for progress history
CREATE INDEX IF NOT EXISTS idx_progress_history_date_range 
ON public.progress_history (created_at DESC, initiative_id);
COMMENT ON INDEX idx_progress_history_date_range IS 'Optimizes date range queries for progress history';

-- ============================================================
-- AUDIT LOG OPTIMIZATION
-- ============================================================

-- Enhanced audit log filtering
CREATE INDEX IF NOT EXISTS idx_audit_log_filter_composite 
ON public.audit_log (table_name, action, created_at DESC);
COMMENT ON INDEX idx_audit_log_filter_composite IS 'Optimizes audit log filtering by table and action';

-- User activity tracking
CREATE INDEX IF NOT EXISTS idx_audit_log_user_activity 
ON public.audit_log (user_id, table_name, created_at DESC)
WHERE user_id IS NOT NULL;
COMMENT ON INDEX idx_audit_log_user_activity IS 'Optimizes user activity tracking queries';

-- ============================================================
-- QUARTERS TABLE OPTIMIZATION (Backward Compatibility)
-- ============================================================

-- Quarter filtering with year extraction
CREATE INDEX IF NOT EXISTS idx_quarters_year 
ON public.quarters (tenant_id, EXTRACT(YEAR FROM start_date), quarter_name);
COMMENT ON INDEX idx_quarters_year IS 'Optimizes quarter filtering by year';

-- Active quarter lookup
CREATE INDEX IF NOT EXISTS idx_quarters_current 
ON public.quarters (tenant_id, start_date, end_date);
COMMENT ON INDEX idx_quarters_current IS 'Optimizes current quarter lookups';

-- ============================================================
-- PERFORMANCE STATISTICS INDEXES
-- ============================================================

-- Create partial indexes for frequently filtered statuses
CREATE INDEX IF NOT EXISTS idx_initiatives_planning 
ON public.initiatives (tenant_id, area_id, created_at DESC)
WHERE status = 'planning';

CREATE INDEX IF NOT EXISTS idx_initiatives_in_progress 
ON public.initiatives (tenant_id, area_id, progress, due_date)
WHERE status = 'in_progress';

CREATE INDEX IF NOT EXISTS idx_initiatives_completed 
ON public.initiatives (tenant_id, area_id, completion_date DESC)
WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_initiatives_on_hold 
ON public.initiatives (tenant_id, area_id, updated_at DESC)
WHERE status = 'on_hold';

-- Similar for objectives
CREATE INDEX IF NOT EXISTS idx_objectives_planning 
ON public.objectives (tenant_id, area_id, created_at DESC)
WHERE status = 'planning';

CREATE INDEX IF NOT EXISTS idx_objectives_in_progress 
ON public.objectives (tenant_id, area_id, progress, end_date)
WHERE status = 'in_progress';

CREATE INDEX IF NOT EXISTS idx_objectives_completed 
ON public.objectives (tenant_id, area_id, updated_at DESC)
WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_objectives_overdue 
ON public.objectives (tenant_id, area_id, end_date, progress)
WHERE status = 'overdue';

-- ============================================================
-- COVERING INDEXES FOR COMMON QUERIES
-- ============================================================

-- Covering index for initiative list queries
CREATE INDEX IF NOT EXISTS idx_initiatives_list_covering 
ON public.initiatives (tenant_id, area_id, status, progress) 
INCLUDE (title, description, start_date, due_date, created_by);
COMMENT ON INDEX idx_initiatives_list_covering IS 'Covering index for initiative list queries to avoid table lookups';

-- Covering index for objective list queries
CREATE INDEX IF NOT EXISTS idx_objectives_list_covering 
ON public.objectives (tenant_id, area_id, status, priority) 
INCLUDE (title, description, start_date, end_date, progress);
COMMENT ON INDEX idx_objectives_list_covering IS 'Covering index for objective list queries to avoid table lookups';

-- ============================================================
-- MATERIALIZED VIEW FOR FILTER OPTIONS
-- ============================================================

-- Create a materialized view for filter options to speed up filter UI loading
CREATE MATERIALIZED VIEW IF NOT EXISTS filter_options_cache AS
SELECT 
  tenant_id,
  'initiative_status' as option_type,
  status as option_value,
  COUNT(*) as count
FROM public.initiatives
GROUP BY tenant_id, status

UNION ALL

SELECT 
  tenant_id,
  'objective_status' as option_type,
  status as option_value,
  COUNT(*) as count
FROM public.objectives
GROUP BY tenant_id, status

UNION ALL

SELECT 
  tenant_id,
  'objective_priority' as option_type,
  priority as option_value,
  COUNT(*) as count
FROM public.objectives
GROUP BY tenant_id, priority

UNION ALL

SELECT 
  tenant_id,
  'area' as option_type,
  a.id::text as option_value,
  COUNT(DISTINCT i.id) as count
FROM public.areas a
LEFT JOIN public.initiatives i ON i.area_id = a.id
WHERE a.is_active = true
GROUP BY tenant_id, a.id;

-- Index the materialized view
CREATE INDEX IF NOT EXISTS idx_filter_options_cache_lookup 
ON filter_options_cache (tenant_id, option_type);

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_filter_options_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY filter_options_cache;
END;
$$;

-- Schedule periodic refresh (requires pg_cron extension if available)
-- Alternatively, refresh can be triggered after major data changes

-- ============================================================
-- QUERY PERFORMANCE ANALYSIS HELPERS
-- ============================================================

-- Create a function to analyze filter query performance
CREATE OR REPLACE FUNCTION analyze_filter_query_performance(
  p_table_name text,
  p_tenant_id uuid DEFAULT NULL
)
RETURNS TABLE (
  index_name text,
  index_size text,
  index_scans bigint,
  tuples_read bigint,
  tuples_fetched bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    indexrelname::text as index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND tablename = p_table_name
  ORDER BY idx_scan DESC;
END;
$$;

COMMENT ON FUNCTION analyze_filter_query_performance IS 'Analyzes index usage and performance for filter queries';

-- ============================================================
-- VACUUM AND ANALYZE
-- ============================================================

-- Update table statistics for query planner optimization
ANALYZE public.initiatives;
ANALYZE public.objectives;
ANALYZE public.activities;
ANALYZE public.areas;
ANALYZE public.user_profiles;
ANALYZE public.objective_initiatives;
ANALYZE public.quarters;
ANALYZE public.progress_history;
ANALYZE public.audit_log;

-- ============================================================
-- DOCUMENTATION
-- ============================================================

COMMENT ON SCHEMA public IS 'Optimized with comprehensive filter indexes for FILTER-IMPL-2025 project';

-- Performance expectations:
-- - Date range queries: < 50ms for typical ranges
-- - Status/Priority filtering: < 30ms
-- - Combined filters: < 100ms for complex queries
-- - Search queries: < 200ms for full-text search
-- - Filter option loading: < 20ms from materialized view

-- Index strategy summary:
-- 1. Composite indexes for common filter combinations
-- 2. Partial indexes for status-specific queries
-- 3. Covering indexes to avoid table lookups
-- 4. Trigram indexes for fuzzy search
-- 5. Weighted full-text search indexes
-- 6. Materialized view for filter options caching

-- Maintenance notes:
-- - Run VACUUM ANALYZE weekly on high-traffic tables
-- - Refresh filter_options_cache materialized view hourly or after bulk operations
-- - Monitor index usage with analyze_filter_query_performance() function
-- - Consider partitioning initiatives/objectives tables if > 1M rows per tenant