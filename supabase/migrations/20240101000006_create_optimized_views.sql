-- ============================================================
-- Migration 6: Create optimized views
-- ============================================================
-- This migration creates views that simplify complex queries
-- and improve performance for common data access patterns
-- Views inherit RLS policies from underlying tables
-- ============================================================

-- ============================================================
-- Manager Initiative Summary View
-- ============================================================
-- Provides a comprehensive summary of initiatives grouped by area and objective
-- Includes activity completion statistics
CREATE OR REPLACE VIEW public.manager_initiative_summary AS
SELECT
    a.id AS area_id,
    a.name AS area_name,
    a.description AS area_description,
    a.tenant_id,
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
    COUNT(DISTINCT CASE WHEN act.is_completed THEN act.id END) AS completed_activities,
    ROUND(
      CASE 
        WHEN COUNT(act.id) > 0 
        THEN (COUNT(CASE WHEN act.is_completed THEN 1 END)::numeric / COUNT(act.id)::numeric) * 100
        ELSE 0 
      END, 
      2
    ) AS calculated_progress
FROM
    public.areas a
LEFT JOIN
    public.objectives o ON a.id = o.area_id
LEFT JOIN
    public.objective_initiatives oi ON o.id = oi.objective_id
LEFT JOIN
    public.initiatives i ON oi.initiative_id = i.id
LEFT JOIN
    public.activities act ON i.id = act.initiative_id
GROUP BY
    a.id, a.name, a.description, a.tenant_id,
    o.id, o.title, o.description,
    i.id, i.title, i.description, i.progress, 
    i.start_date, i.due_date, i.completion_date, i.created_by;

-- ============================================================
-- Manager Activity Details View
-- ============================================================
-- Provides detailed activity information with context from initiatives and areas
CREATE OR REPLACE VIEW public.manager_activity_details AS
SELECT
    a.id AS area_id,
    a.name AS area_name,
    a.description AS area_description,
    a.tenant_id,
    i.id AS initiative_id,
    i.title AS initiative_title,
    i.description AS initiative_description,
    i.progress AS initiative_progress,
    i.due_date AS initiative_due_date,
    act.id AS activity_id,
    act.title AS activity_title,
    act.description AS activity_description,
    act.is_completed,
    act.created_at AS activity_created_at,
    act.updated_at AS activity_updated_at,
    act.assigned_to AS assigned_to_id,
    u.full_name AS assigned_to_name,
    u.email AS assigned_to_email,
    u.role AS assigned_to_role
FROM
    public.activities act
JOIN
    public.initiatives i ON act.initiative_id = i.id
JOIN
    public.areas a ON i.area_id = a.id
LEFT JOIN
    public.user_profiles u ON act.assigned_to = u.id;

-- ============================================================
-- Dashboard Overview View
-- ============================================================
-- High-level metrics for dashboards and reporting
CREATE OR REPLACE VIEW public.dashboard_overview AS
SELECT
    t.id AS tenant_id,
    t.subdomain,
    o.id AS organization_id,
    o.name AS organization_name,
    COUNT(DISTINCT a.id) AS total_areas,
    COUNT(DISTINCT obj.id) AS total_objectives,
    COUNT(DISTINCT i.id) AS total_initiatives,
    COUNT(DISTINCT act.id) AS total_activities,
    COUNT(DISTINCT CASE WHEN i.progress = 100 THEN i.id END) AS completed_initiatives,
    COUNT(DISTINCT CASE WHEN act.is_completed THEN act.id END) AS completed_activities,
    ROUND(AVG(i.progress), 2) AS average_initiative_progress,
    COUNT(DISTINCT up.id) AS total_users,
    COUNT(DISTINCT CASE WHEN up.role = 'CEO' THEN up.id END) AS ceo_count,
    COUNT(DISTINCT CASE WHEN up.role = 'Admin' THEN up.id END) AS admin_count,
    COUNT(DISTINCT CASE WHEN up.role = 'Manager' THEN up.id END) AS manager_count
FROM
    public.tenants t
JOIN
    public.organizations o ON t.organization_id = o.id
LEFT JOIN
    public.areas a ON t.id = a.tenant_id
LEFT JOIN
    public.objectives obj ON t.id = obj.tenant_id
LEFT JOIN
    public.initiatives i ON t.id = i.tenant_id
LEFT JOIN
    public.activities act ON i.id = act.initiative_id
LEFT JOIN
    public.user_profiles up ON t.id = up.tenant_id
GROUP BY
    t.id, t.subdomain, o.id, o.name;

-- ============================================================
-- Area Performance View
-- ============================================================
-- Performance metrics aggregated by area
CREATE OR REPLACE VIEW public.area_performance AS
SELECT
    a.id AS area_id,
    a.name AS area_name,
    a.tenant_id,
    a.manager_id,
    m.full_name AS manager_name,
    COUNT(DISTINCT o.id) AS objective_count,
    COUNT(DISTINCT i.id) AS initiative_count,
    COUNT(DISTINCT act.id) AS activity_count,
    COUNT(DISTINCT CASE WHEN i.progress = 100 THEN i.id END) AS completed_initiatives,
    COUNT(DISTINCT CASE WHEN act.is_completed THEN act.id END) AS completed_activities,
    ROUND(AVG(i.progress), 2) AS average_progress,
    COUNT(DISTINCT i.id) FILTER (WHERE i.due_date < CURRENT_DATE AND i.progress < 100) AS overdue_initiatives,
    COUNT(DISTINCT i.id) FILTER (WHERE i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' AND i.progress < 100) AS upcoming_initiatives
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
GROUP BY
    a.id, a.name, a.tenant_id, a.manager_id, m.full_name;

-- ============================================================
-- User Workload View
-- ============================================================
-- Shows workload distribution across users
CREATE OR REPLACE VIEW public.user_workload AS
SELECT
    up.id AS user_id,
    up.full_name,
    up.email,
    up.role,
    up.area_id,
    a.name AS area_name,
    up.tenant_id,
    COUNT(DISTINCT i.id) FILTER (WHERE i.created_by = up.id) AS initiatives_created,
    COUNT(DISTINCT act.id) FILTER (WHERE act.assigned_to = up.id) AS activities_assigned,
    COUNT(DISTINCT act.id) FILTER (WHERE act.assigned_to = up.id AND act.is_completed) AS activities_completed,
    COUNT(DISTINCT act.id) FILTER (WHERE act.assigned_to = up.id AND NOT act.is_completed) AS activities_pending,
    ROUND(
      CASE 
        WHEN COUNT(DISTINCT act.id) FILTER (WHERE act.assigned_to = up.id) > 0
        THEN (COUNT(DISTINCT act.id) FILTER (WHERE act.assigned_to = up.id AND act.is_completed)::numeric / 
              COUNT(DISTINCT act.id) FILTER (WHERE act.assigned_to = up.id)::numeric) * 100
        ELSE 0 
      END, 
      2
    ) AS completion_rate
FROM
    public.user_profiles up
LEFT JOIN
    public.areas a ON up.area_id = a.id
LEFT JOIN
    public.initiatives i ON i.created_by = up.id
LEFT JOIN
    public.activities act ON act.assigned_to = up.id
GROUP BY
    up.id, up.full_name, up.email, up.role, up.area_id, a.name, up.tenant_id;

-- ============================================================
-- Quarter Progress View
-- ============================================================
-- Progress tracking by quarter
CREATE OR REPLACE VIEW public.quarter_progress AS
SELECT
    q.id AS quarter_id,
    q.tenant_id,
    q.quarter_name,
    q.start_date,
    q.end_date,
    COUNT(DISTINCT o.id) AS objective_count,
    COUNT(DISTINCT oi.initiative_id) AS initiative_count,
    COUNT(DISTINCT act.id) AS activity_count,
    AVG(i.progress) AS average_progress,
    COUNT(DISTINCT CASE WHEN i.progress = 100 THEN i.id END) AS completed_initiatives,
    CASE 
        WHEN CURRENT_DATE < q.start_date THEN 'upcoming'
        WHEN CURRENT_DATE > q.end_date THEN 'completed'
        ELSE 'active'
    END AS quarter_status
FROM
    public.quarters q
LEFT JOIN
    public.objective_quarters oq ON q.id = oq.quarter_id
LEFT JOIN
    public.objectives o ON oq.objective_id = o.id
LEFT JOIN
    public.objective_initiatives oi ON o.id = oi.objective_id
LEFT JOIN
    public.initiatives i ON oi.initiative_id = i.id
LEFT JOIN
    public.activities act ON i.id = act.initiative_id
GROUP BY
    q.id, q.tenant_id, q.quarter_name, q.start_date, q.end_date;

-- Add comments for documentation
COMMENT ON VIEW public.manager_initiative_summary IS 'Comprehensive initiative summary with activity statistics';
COMMENT ON VIEW public.manager_activity_details IS 'Detailed activity view with full context';
COMMENT ON VIEW public.dashboard_overview IS 'High-level tenant metrics for dashboards';
COMMENT ON VIEW public.area_performance IS 'Performance metrics grouped by area';
COMMENT ON VIEW public.user_workload IS 'User workload and assignment distribution';
COMMENT ON VIEW public.quarter_progress IS 'Progress tracking by quarter periods';