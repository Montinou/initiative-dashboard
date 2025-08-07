-- =============================================
-- Migration 005: Create Optimized Views
-- =============================================
-- This migration creates database views to simplify complex queries
-- and provide optimized data access patterns for the application.
-- Views inherit RLS policies from underlying tables automatically.

-- ============================================================
-- Manager Initiative Summary View
-- ============================================================

-- Drop view if exists to allow recreation
DROP VIEW IF EXISTS public.manager_initiative_summary CASCADE;

-- Create view for manager dashboard with aggregated initiative data
CREATE OR REPLACE VIEW public.manager_initiative_summary AS
SELECT
    a.id AS area_id,
    a.name AS area_name,
    a.manager_id,
    o.id AS objective_id,
    o.title AS objective_title,
    o.description AS objective_description,
    i.id AS initiative_id,
    i.title AS initiative_title,
    i.description AS initiative_description,
    i.progress AS initiative_progress,
    i.start_date,
    i.due_date,
    i.completion_date,
    i.created_by,
    COUNT(DISTINCT act.id) AS total_activities,
    COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true) AS completed_activities,
    -- Calculate actual progress based on activities if available
    CASE 
        WHEN COUNT(DISTINCT act.id) > 0 THEN
            ROUND((COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true)::NUMERIC / COUNT(DISTINCT act.id)::NUMERIC) * 100)::INTEGER
        ELSE
            i.progress
    END AS calculated_progress
FROM
    public.areas a
JOIN
    public.objectives o ON a.id = o.area_id
JOIN
    public.objective_initiatives oi ON o.id = oi.objective_id
JOIN
    public.initiatives i ON oi.initiative_id = i.id
LEFT JOIN
    public.activities act ON i.id = act.initiative_id
GROUP BY
    a.id, a.name, a.manager_id,
    o.id, o.title, o.description,
    i.id, i.title, i.description, i.progress,
    i.start_date, i.due_date, i.completion_date, i.created_by;

-- Add comment for documentation
COMMENT ON VIEW public.manager_initiative_summary IS 'Aggregated view of initiatives with calculated progress for manager dashboards';

-- Grant appropriate permissions
GRANT SELECT ON public.manager_initiative_summary TO authenticated;

-- ============================================================
-- Manager Activity Details View
-- ============================================================

-- Drop view if exists to allow recreation
DROP VIEW IF EXISTS public.manager_activity_details CASCADE;

-- Create detailed view of activities for granular tracking
CREATE OR REPLACE VIEW public.manager_activity_details AS
SELECT
    a.id AS area_id,
    a.name AS area_name,
    a.manager_id AS area_manager_id,
    i.id AS initiative_id,
    i.title AS initiative_title,
    i.progress AS initiative_progress,
    i.start_date AS initiative_start_date,
    i.due_date AS initiative_due_date,
    act.id AS activity_id,
    act.title AS activity_title,
    act.description AS activity_description,
    act.is_completed,
    act.assigned_to,
    u.full_name AS assigned_to_name,
    u.email AS assigned_to_email,
    act.created_at AS activity_created_at,
    act.updated_at AS activity_updated_at
FROM
    public.activities act
JOIN
    public.initiatives i ON act.initiative_id = i.id
JOIN
    public.areas a ON i.area_id = a.id
LEFT JOIN
    public.user_profiles u ON act.assigned_to = u.id;

-- Add comment for documentation
COMMENT ON VIEW public.manager_activity_details IS 'Detailed view of activities with full context for task management';

-- Grant appropriate permissions
GRANT SELECT ON public.manager_activity_details TO authenticated;

-- ============================================================
-- Quarterly Performance View
-- ============================================================

-- Create view for quarterly performance metrics
CREATE OR REPLACE VIEW public.quarterly_performance AS
SELECT
    q.id AS quarter_id,
    q.quarter_name,
    q.start_date,
    q.end_date,
    q.tenant_id,
    o.id AS objective_id,
    o.title AS objective_title,
    o.area_id,
    a.name AS area_name,
    COUNT(DISTINCT oi.initiative_id) AS total_initiatives,
    COUNT(DISTINCT oi.initiative_id) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM public.initiatives i 
            WHERE i.id = oi.initiative_id 
            AND i.progress = 100
        )
    ) AS completed_initiatives,
    AVG(i.progress) AS average_progress,
    COUNT(DISTINCT act.id) AS total_activities,
    COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true) AS completed_activities
FROM
    public.quarters q
JOIN
    public.objective_quarters oq ON q.id = oq.quarter_id
JOIN
    public.objectives o ON oq.objective_id = o.id
JOIN
    public.areas a ON o.area_id = a.id
LEFT JOIN
    public.objective_initiatives oi ON o.id = oi.objective_id
LEFT JOIN
    public.initiatives i ON oi.initiative_id = i.id
LEFT JOIN
    public.activities act ON i.id = act.initiative_id
GROUP BY
    q.id, q.quarter_name, q.start_date, q.end_date, q.tenant_id,
    o.id, o.title, o.area_id, a.name;

-- Add comment for documentation
COMMENT ON VIEW public.quarterly_performance IS 'Quarterly performance metrics aggregated by objectives and areas';

-- Grant appropriate permissions
GRANT SELECT ON public.quarterly_performance TO authenticated;

-- ============================================================
-- User Workload View
-- ============================================================

-- Create view to analyze user workload and assignments
CREATE OR REPLACE VIEW public.user_workload AS
SELECT
    up.id AS user_profile_id,
    up.full_name,
    up.email,
    up.role,
    up.area_id,
    a.name AS area_name,
    COUNT(DISTINCT i.id) FILTER (WHERE i.created_by = up.id) AS initiatives_created,
    COUNT(DISTINCT act.id) FILTER (WHERE act.assigned_to = up.id) AS activities_assigned,
    COUNT(DISTINCT act.id) FILTER (
        WHERE act.assigned_to = up.id 
        AND act.is_completed = false
    ) AS pending_activities,
    COUNT(DISTINCT act.id) FILTER (
        WHERE act.assigned_to = up.id 
        AND act.is_completed = true
    ) AS completed_activities,
    AVG(i.progress) FILTER (WHERE i.created_by = up.id) AS average_initiative_progress
FROM
    public.user_profiles up
LEFT JOIN
    public.areas a ON up.area_id = a.id
LEFT JOIN
    public.initiatives i ON i.created_by = up.id
LEFT JOIN
    public.activities act ON act.assigned_to = up.id
GROUP BY
    up.id, up.full_name, up.email, up.role, up.area_id, a.name;

-- Add comment for documentation
COMMENT ON VIEW public.user_workload IS 'Analysis of user workload including created initiatives and assigned activities';

-- Grant appropriate permissions
GRANT SELECT ON public.user_workload TO authenticated;

-- ============================================================
-- Initiative Timeline View
-- ============================================================

-- Create view for initiative timeline visualization
CREATE OR REPLACE VIEW public.initiative_timeline AS
SELECT
    i.id AS initiative_id,
    i.title AS initiative_title,
    i.description,
    i.progress,
    i.start_date,
    i.due_date,
    i.completion_date,
    i.created_at,
    i.updated_at,
    i.area_id,
    a.name AS area_name,
    i.created_by,
    up.full_name AS created_by_name,
    up.email AS created_by_email,
    -- Calculate status based on dates and progress
    CASE
        WHEN i.completion_date IS NOT NULL THEN 'completed'
        WHEN i.due_date < CURRENT_DATE AND i.progress < 100 THEN 'overdue'
        WHEN i.start_date > CURRENT_DATE THEN 'not_started'
        WHEN i.progress > 0 THEN 'in_progress'
        ELSE 'planned'
    END AS status,
    -- Calculate days remaining or overdue
    CASE
        WHEN i.completion_date IS NOT NULL THEN 0
        ELSE i.due_date - CURRENT_DATE
    END AS days_remaining,
    -- Get associated objectives
    ARRAY_AGG(DISTINCT o.title) FILTER (WHERE o.title IS NOT NULL) AS objectives
FROM
    public.initiatives i
JOIN
    public.areas a ON i.area_id = a.id
JOIN
    public.user_profiles up ON i.created_by = up.id
LEFT JOIN
    public.objective_initiatives oi ON i.id = oi.initiative_id
LEFT JOIN
    public.objectives o ON oi.objective_id = o.id
GROUP BY
    i.id, i.title, i.description, i.progress,
    i.start_date, i.due_date, i.completion_date,
    i.created_at, i.updated_at, i.area_id,
    a.name, i.created_by, up.full_name, up.email;

-- Add comment for documentation
COMMENT ON VIEW public.initiative_timeline IS 'Timeline view of initiatives with status calculations and associated objectives';

-- Grant appropriate permissions
GRANT SELECT ON public.initiative_timeline TO authenticated;

-- ============================================================
-- Area Performance Summary View
-- ============================================================

-- Create view for area-level performance metrics
CREATE OR REPLACE VIEW public.area_performance_summary AS
SELECT
    a.id AS area_id,
    a.name AS area_name,
    a.manager_id,
    m.full_name AS manager_name,
    m.email AS manager_email,
    COUNT(DISTINCT o.id) AS total_objectives,
    COUNT(DISTINCT i.id) AS total_initiatives,
    COUNT(DISTINCT i.id) FILTER (WHERE i.progress = 100) AS completed_initiatives,
    COUNT(DISTINCT i.id) FILTER (WHERE i.progress > 0 AND i.progress < 100) AS in_progress_initiatives,
    COUNT(DISTINCT i.id) FILTER (WHERE i.progress = 0) AS not_started_initiatives,
    AVG(i.progress) AS average_initiative_progress,
    COUNT(DISTINCT act.id) AS total_activities,
    COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true) AS completed_activities,
    COUNT(DISTINCT up.id) AS team_members
FROM
    public.areas a
LEFT JOIN
    public.user_profiles m ON a.manager_id = m.id
LEFT JOIN
    public.objectives o ON a.id = o.area_id
LEFT JOIN
    public.initiatives i ON a.id = i.area_id
LEFT JOIN
    public.activities act ON i.id = act.initiative_id
LEFT JOIN
    public.user_profiles up ON a.id = up.area_id
GROUP BY
    a.id, a.name, a.manager_id, m.full_name, m.email;

-- Add comment for documentation
COMMENT ON VIEW public.area_performance_summary IS 'Comprehensive performance metrics aggregated at the area level';

-- Grant appropriate permissions
GRANT SELECT ON public.area_performance_summary TO authenticated;

-- ============================================================
-- Recent Activity Feed View
-- ============================================================

-- Create view for recent activity feed
CREATE OR REPLACE VIEW public.recent_activity_feed AS
SELECT
    'initiative_created' AS activity_type,
    i.id AS entity_id,
    i.title AS entity_title,
    i.created_at AS activity_timestamp,
    i.created_by AS user_id,
    up.full_name AS user_name,
    i.area_id,
    a.name AS area_name,
    NULL::uuid AS related_entity_id,
    NULL::text AS related_entity_title
FROM
    public.initiatives i
JOIN
    public.user_profiles up ON i.created_by = up.id
JOIN
    public.areas a ON i.area_id = a.id

UNION ALL

SELECT
    'activity_completed' AS activity_type,
    act.id AS entity_id,
    act.title AS entity_title,
    act.updated_at AS activity_timestamp,
    act.assigned_to AS user_id,
    up.full_name AS user_name,
    i.area_id,
    a.name AS area_name,
    i.id AS related_entity_id,
    i.title AS related_entity_title
FROM
    public.activities act
JOIN
    public.initiatives i ON act.initiative_id = i.id
JOIN
    public.areas a ON i.area_id = a.id
LEFT JOIN
    public.user_profiles up ON act.assigned_to = up.id
WHERE
    act.is_completed = true

UNION ALL

SELECT
    'objective_created' AS activity_type,
    o.id AS entity_id,
    o.title AS entity_title,
    o.created_at AS activity_timestamp,
    o.created_by AS user_id,
    up.full_name AS user_name,
    o.area_id,
    a.name AS area_name,
    NULL::uuid AS related_entity_id,
    NULL::text AS related_entity_title
FROM
    public.objectives o
JOIN
    public.user_profiles up ON o.created_by = up.id
LEFT JOIN
    public.areas a ON o.area_id = a.id

ORDER BY activity_timestamp DESC;

-- Add comment for documentation
COMMENT ON VIEW public.recent_activity_feed IS 'Unified activity feed showing recent actions across the system';

-- Grant appropriate permissions
GRANT SELECT ON public.recent_activity_feed TO authenticated;