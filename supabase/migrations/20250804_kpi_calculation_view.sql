-- Migration: KPI Calculation Views & Performance Indexes
-- Priority: P1 | Complexity: L | Time: 6-8 hours
-- Description: Create materialized view for efficient KPI calculations
-- Author: Claude Code Assistant  
-- Date: 2025-08-04
-- Dependencies: 20250804_enhance_initiatives_kpi.sql, 20250804_enhance_activities_weights.sql

-- ===================================================================================
-- PHASE 1: CREATE COMPREHENSIVE KPI SUMMARY MATERIALIZED VIEW
-- ===================================================================================

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS public.kpi_summary;

-- Create comprehensive KPI summary materialized view
CREATE MATERIALIZED VIEW public.kpi_summary AS
SELECT 
    -- Identification
    i.tenant_id,
    i.area_id,
    a.name as area_name,
    CURRENT_TIMESTAMP as last_updated,
    
    -- Basic Initiative Metrics  
    COUNT(i.id) as total_initiatives,
    COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as completed_initiatives,
    COUNT(CASE WHEN i.status = 'in_progress' THEN 1 END) as in_progress_initiatives,
    COUNT(CASE WHEN i.status = 'planning' THEN 1 END) as planning_initiatives,
    COUNT(CASE WHEN i.status = 'on_hold' THEN 1 END) as on_hold_initiatives,
    
    -- Progress Metrics
    ROUND(AVG(i.progress), 2) as average_progress,
    ROUND(
        SUM(i.progress * i.weight_factor) / NULLIF(SUM(i.weight_factor), 0), 2
    ) as weighted_average_progress,
    MIN(i.progress) as min_progress,
    MAX(i.progress) as max_progress,
    
    -- Strategic Initiative Metrics
    COUNT(CASE WHEN i.is_strategic THEN 1 END) as strategic_initiatives,
    COUNT(CASE WHEN i.is_strategic AND i.status = 'completed' THEN 1 END) as completed_strategic,
    ROUND(AVG(CASE WHEN i.is_strategic THEN i.progress ELSE NULL END), 2) as strategic_average_progress,
    ROUND(SUM(CASE WHEN i.is_strategic THEN i.weight_factor ELSE 0 END), 2) as total_strategic_weight,
    
    -- Time-based Metrics
    COUNT(CASE 
        WHEN i.target_date < CURRENT_DATE AND i.status != 'completed' 
        THEN 1 
    END) as overdue_initiatives,
    COUNT(CASE 
        WHEN i.target_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' 
             AND i.status != 'completed'
        THEN 1 
    END) as due_next_30_days,
    
    -- Budget Metrics
    COALESCE(SUM(i.budget), 0) as total_budget,
    COALESCE(SUM(i.actual_cost), 0) as total_actual_cost,
    ROUND(
        CASE 
            WHEN SUM(i.budget) > 0 
            THEN (SUM(i.actual_cost) / SUM(i.budget)) * 100 
            ELSE 0 
        END, 2
    ) as budget_utilization_percentage,
    
    -- Effort Metrics  
    COALESCE(SUM(i.estimated_hours), 0) as total_estimated_hours,
    COALESCE(SUM(i.actual_hours), 0) as total_actual_hours,
    ROUND(
        CASE 
            WHEN SUM(i.actual_hours) > 0 
            THEN SUM(i.estimated_hours)::DECIMAL / SUM(i.actual_hours) 
            ELSE 1 
        END, 2
    ) as effort_efficiency_ratio,
    
    -- Progress Method Distribution
    COUNT(CASE WHEN i.progress_method = 'manual' THEN 1 END) as manual_progress_count,
    COUNT(CASE WHEN i.progress_method = 'subtask_based' THEN 1 END) as subtask_based_count,
    COUNT(CASE WHEN i.progress_method = 'hybrid' THEN 1 END) as hybrid_progress_count,
    
    -- KPI Category Distribution
    COUNT(CASE WHEN i.kpi_category = 'strategic' THEN 1 END) as strategic_category_count,
    COUNT(CASE WHEN i.kpi_category = 'operational' THEN 1 END) as operational_category_count,
    COUNT(CASE WHEN i.kpi_category = 'tactical' THEN 1 END) as tactical_category_count,
    
    -- Priority Distribution
    COUNT(CASE WHEN i.priority = 'high' THEN 1 END) as high_priority_count,
    COUNT(CASE WHEN i.priority = 'medium' THEN 1 END) as medium_priority_count,
    COUNT(CASE WHEN i.priority = 'low' THEN 1 END) as low_priority_count,
    
    -- Performance Indicators
    ROUND(
        (COUNT(CASE WHEN i.status = 'completed' THEN 1 END)::DECIMAL / 
         NULLIF(COUNT(i.id), 0)) * 100, 2
    ) as completion_rate,
    ROUND(
        (COUNT(CASE WHEN i.target_date < CURRENT_DATE AND i.status != 'completed' THEN 1 END)::DECIMAL / 
         NULLIF(COUNT(CASE WHEN i.target_date IS NOT NULL THEN 1 END), 0)) * 100, 2
    ) as overdue_rate,
    
    -- Subtask Aggregated Metrics
    COALESCE(AVG(subtask_stats.total_subtasks), 0) as avg_subtasks_per_initiative,
    COALESCE(AVG(subtask_stats.completed_subtasks), 0) as avg_completed_subtasks,
    COALESCE(AVG(subtask_stats.subtask_completion_rate), 0) as avg_subtask_completion_rate

FROM public.initiatives i 
INNER JOIN public.areas a ON i.area_id = a.id AND i.tenant_id = a.tenant_id
LEFT JOIN (
    -- Subtask statistics subquery
    SELECT 
        act.initiative_id,
        act.tenant_id,
        COUNT(act.id) as total_subtasks,
        COUNT(CASE WHEN act.status = 'Completado' THEN 1 END) as completed_subtasks,
        ROUND(
            (COUNT(CASE WHEN act.status = 'Completado' THEN 1 END)::DECIMAL / 
             NULLIF(COUNT(act.id), 0)) * 100, 2
        ) as subtask_completion_rate
    FROM public.activities act
    GROUP BY act.initiative_id, act.tenant_id
) subtask_stats ON i.id = subtask_stats.initiative_id AND i.tenant_id = subtask_stats.tenant_id

WHERE a.is_active = true
GROUP BY i.tenant_id, i.area_id, a.name;

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_kpi_summary_unique 
ON public.kpi_summary (tenant_id, area_id);

-- ===================================================================================
-- PHASE 2: CREATE STRATEGIC INITIATIVES SUMMARY VIEW
-- ===================================================================================

-- Drop existing view if it exists  
DROP MATERIALIZED VIEW IF EXISTS public.strategic_initiatives_summary;

-- Create strategic initiatives focused materialized view
CREATE MATERIALIZED VIEW public.strategic_initiatives_summary AS
SELECT 
    i.tenant_id,
    COUNT(i.id) as total_strategic_initiatives,
    COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as completed_strategic,
    COUNT(CASE WHEN i.status = 'in_progress' THEN 1 END) as in_progress_strategic,
    ROUND(AVG(i.progress), 2) as avg_strategic_progress,
    ROUND(SUM(i.weight_factor), 2) as total_strategic_weight,
    ROUND(
        SUM(i.progress * i.weight_factor) / NULLIF(SUM(i.weight_factor), 0), 2
    ) as weighted_strategic_progress,
    
    -- Risk Indicators for Strategic Initiatives
    COUNT(CASE 
        WHEN i.weight_factor > 2.0 AND i.progress < 50 
             AND i.target_date < CURRENT_DATE + INTERVAL '30 days'
        THEN 1 
    END) as critical_at_risk_initiatives,
    
    -- Budget for Strategic Initiatives
    COALESCE(SUM(i.budget), 0) as total_strategic_budget,
    COALESCE(SUM(i.actual_cost), 0) as total_strategic_actual_cost,
    
    -- Strategic Categories
    COUNT(CASE WHEN i.kpi_category = 'strategic' THEN 1 END) as strategic_category_count,
    
    CURRENT_TIMESTAMP as last_updated
    
FROM public.initiatives i
WHERE i.is_strategic = true
GROUP BY i.tenant_id;

-- Create unique index on strategic summary
CREATE UNIQUE INDEX idx_strategic_summary_unique 
ON public.strategic_initiatives_summary (tenant_id);

-- ===================================================================================
-- PHASE 3: CREATE COMPREHENSIVE PERFORMANCE INDEXES
-- ===================================================================================

-- Main performance index for KPI dashboard queries
CREATE INDEX IF NOT EXISTS idx_initiatives_kpi_performance 
ON public.initiatives (tenant_id, area_id, status, target_date, is_strategic, progress_method, kpi_category) 
;

-- Index for weighted progress calculations
CREATE INDEX IF NOT EXISTS idx_initiatives_weighted_calculations 
ON public.initiatives (tenant_id, area_id, weight_factor, progress, status) 
;

-- Index for strategic initiative queries
CREATE INDEX IF NOT EXISTS idx_initiatives_strategic_focus 
ON public.initiatives (tenant_id, is_strategic, weight_factor, progress, status, target_date) 
WHERE is_strategic = true;

-- Index for time-based queries (overdue, upcoming)
CREATE INDEX IF NOT EXISTS idx_initiatives_time_based 
ON public.initiatives (tenant_id, target_date, status, completion_date) 
;

-- Index for budget and effort analysis
CREATE INDEX IF NOT EXISTS idx_initiatives_budget_effort 
ON public.initiatives (tenant_id, area_id, budget, actual_cost, estimated_hours, actual_hours) 
WHERE (budget > 0 OR estimated_hours > 0);

-- Index for progress method analysis
CREATE INDEX IF NOT EXISTS idx_initiatives_progress_method_analysis 
ON public.initiatives (tenant_id, progress_method, progress, status) 
;

-- Composite index for area manager queries
CREATE INDEX IF NOT EXISTS idx_initiatives_area_manager 
ON public.initiatives (area_id, tenant_id, status, priority, progress, created_at) 
;

-- Index for activities weight calculations (if not already exists)
CREATE INDEX IF NOT EXISTS idx_activities_kpi_calculations 
ON public.activities (initiative_id, tenant_id, weight_percentage, status, completion_date);

-- ===================================================================================
-- PHASE 4: CREATE REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- ===================================================================================

-- Function to refresh KPI summary materialized view
CREATE OR REPLACE FUNCTION refresh_kpi_summary(
    p_tenant_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Refresh the entire materialized view
    -- Note: CONCURRENTLY requires unique index, which we have
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.strategic_initiatives_summary;
    
    -- Log refresh activity
    INSERT INTO public.audit_log (
        tenant_id,
        user_id, 
        action,
        resource_type,
        resource_id,
        new_values
    ) VALUES (
        p_tenant_id,
        NULL,
        'REFRESH',
        'kpi_materialized_views',
        NULL,
        jsonb_build_object(
            'refresh_timestamp', CURRENT_TIMESTAMP,
            'tenant_filter', p_tenant_id
        )
    );
    
    RAISE NOTICE 'KPI materialized views refreshed successfully at %', CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-refresh views when initiatives or activities change
CREATE OR REPLACE FUNCTION auto_refresh_kpi_views()
RETURNS TRIGGER AS $$
BEGIN
    -- Only refresh if it's been more than 5 minutes since last refresh
    -- to avoid excessive refreshing on bulk operations
    IF NOT EXISTS (
        SELECT 1 FROM public.audit_log 
        WHERE action = 'REFRESH' 
          AND resource_type = 'kpi_materialized_views'
          AND created_at > CURRENT_TIMESTAMP - INTERVAL '5 minutes'
    ) THEN
        PERFORM refresh_kpi_summary(COALESCE(NEW.tenant_id, OLD.tenant_id));
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-refresh (optional, can be disabled for performance)
DROP TRIGGER IF EXISTS trigger_refresh_kpi_on_initiative_change ON public.initiatives;
CREATE TRIGGER trigger_refresh_kpi_on_initiative_change
    AFTER INSERT OR UPDATE OR DELETE ON public.initiatives
    FOR EACH ROW EXECUTE FUNCTION auto_refresh_kpi_views();

DROP TRIGGER IF EXISTS trigger_refresh_kpi_on_activity_change ON public.activities;
CREATE TRIGGER trigger_refresh_kpi_on_activity_change
    AFTER INSERT OR UPDATE OR DELETE ON public.activities
    FOR EACH ROW EXECUTE FUNCTION auto_refresh_kpi_views();

-- ===================================================================================
-- PHASE 5: CREATE PERFORMANCE MONITORING FUNCTIONS
-- ===================================================================================

-- Function to analyze KPI query performance
CREATE OR REPLACE FUNCTION analyze_kpi_performance()
RETURNS TABLE (
    query_type TEXT,
    avg_execution_time_ms NUMERIC,
    recommendations TEXT[]
) AS $$
BEGIN
    -- This would be enhanced with actual query performance monitoring
    -- For now, return basic analysis
    
    RETURN QUERY 
    SELECT 
        'kpi_summary_queries'::TEXT,
        0.0::NUMERIC,
        ARRAY['Monitor materialized view refresh frequency', 'Consider partitioning for large datasets']::TEXT[];
        
    RETURN QUERY
    SELECT 
        'strategic_initiatives_queries'::TEXT,
        0.0::NUMERIC, 
        ARRAY['Ensure strategic flag indexes are used', 'Monitor weight_factor query patterns']::TEXT[];
END;
$$ LANGUAGE plpgsql;

-- Function to get KPI summary statistics
CREATE OR REPLACE FUNCTION get_kpi_summary_stats(
    p_tenant_id UUID,
    p_area_id UUID DEFAULT NULL
) RETURNS TABLE (
    metric_name TEXT,
    current_value NUMERIC,
    previous_value NUMERIC,
    change_percentage NUMERIC,
    trend TEXT
) AS $$
BEGIN
    -- Current KPI metrics
    RETURN QUERY
    SELECT 
        'total_initiatives'::TEXT,
        ks.total_initiatives::NUMERIC,
        0::NUMERIC, -- Previous value would come from historical data
        0::NUMERIC, -- Change percentage
        'stable'::TEXT -- Trend analysis
    FROM public.kpi_summary ks
    WHERE ks.tenant_id = p_tenant_id 
      AND (p_area_id IS NULL OR ks.area_id = p_area_id);
      
    -- Add more KPI metrics as needed
END;
$$ LANGUAGE plpgsql;

-- ===================================================================================
-- PHASE 6: GRANT PERMISSIONS AND SECURITY
-- ===================================================================================

-- Grant SELECT permissions on materialized views
GRANT SELECT ON public.kpi_summary TO authenticated;
GRANT SELECT ON public.strategic_initiatives_summary TO authenticated;

-- Grant EXECUTE permissions on refresh functions to appropriate roles
GRANT EXECUTE ON FUNCTION refresh_kpi_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_kpi_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION get_kpi_summary_stats(UUID, UUID) TO authenticated;

-- Note: RLS policies cannot be applied to materialized views
-- Security will be handled at the application level through the API endpoints
-- that query these materialized views with proper tenant/role filtering

-- ===================================================================================
-- INITIAL DATA LOAD AND VALIDATION
-- ===================================================================================

-- Perform initial refresh of materialized views
SELECT refresh_kpi_summary();

-- Validate materialized view data
DO $$
DECLARE
    kpi_row_count INTEGER;
    strategic_row_count INTEGER;
    sample_record RECORD;
BEGIN
    -- Count rows in materialized views
    SELECT COUNT(*) INTO kpi_row_count FROM public.kpi_summary;
    SELECT COUNT(*) INTO strategic_row_count FROM public.strategic_initiatives_summary;
    
    -- Sample validation
    SELECT * INTO sample_record FROM public.kpi_summary LIMIT 1;
    
    -- Report results
    RAISE NOTICE 'KPI Materialized Views Creation Summary:';
    RAISE NOTICE '- KPI Summary rows: %', kpi_row_count;
    RAISE NOTICE '- Strategic Summary rows: %', strategic_row_count;
    
    IF kpi_row_count > 0 THEN
        RAISE NOTICE '- Sample KPI data exists and is accessible';
    ELSE
        RAISE WARNING '- No KPI data found - check if initiatives and areas exist';
    END IF;
    
    -- Analyze performance
    ANALYZE public.kpi_summary;
    ANALYZE public.strategic_initiatives_summary;
    
    RAISE NOTICE 'KPI calculation views are ready for use!';
END $$;