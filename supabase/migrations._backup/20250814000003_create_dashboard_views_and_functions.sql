-- Migration: Create optimized dashboard views, indexes, and functions
-- Date: 2025-08-14
-- Description: Creates materialized views and functions for CEO, Manager, and team dashboards

-- =========================================
-- 1. PERFORMANCE INDEXES
-- =========================================

-- Ensure all tenant_id columns are indexed
CREATE INDEX IF NOT EXISTS idx_initiatives_tenant_id ON public.initiatives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_objectives_tenant_id ON public.objectives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activities_initiative_id ON public.activities(initiative_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_areas_tenant_id ON public.areas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quarters_tenant_id ON public.quarters(tenant_id);

-- Composite indexes for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_initiatives_tenant_area_status 
  ON public.initiatives(tenant_id, area_id, status);

CREATE INDEX IF NOT EXISTS idx_objectives_tenant_area_status 
  ON public.objectives(tenant_id, area_id, status);

CREATE INDEX IF NOT EXISTS idx_activities_initiative_completed 
  ON public.activities(initiative_id, is_completed);

CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_role 
  ON public.user_profiles(tenant_id, role);

CREATE INDEX IF NOT EXISTS idx_progress_history_initiative_created 
  ON public.progress_history(initiative_id, created_at DESC);

-- Indexes for date-based queries
CREATE INDEX IF NOT EXISTS idx_initiatives_due_date 
  ON public.initiatives(due_date) WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_initiatives_start_date 
  ON public.initiatives(start_date) WHERE start_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_objectives_target_date 
  ON public.objectives(target_date) WHERE target_date IS NOT NULL;

-- =========================================
-- 2. UTILITY FUNCTIONS
-- =========================================

-- Function to calculate initiative completion percentage based on activities
CREATE OR REPLACE FUNCTION calculate_initiative_progress(p_initiative_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_activities integer;
  v_completed_activities integer;
  v_progress integer;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE is_completed = true)
  INTO v_total_activities, v_completed_activities
  FROM public.activities
  WHERE initiative_id = p_initiative_id;
  
  IF v_total_activities = 0 THEN
    RETURN 0;
  END IF;
  
  v_progress := ROUND((v_completed_activities::numeric / v_total_activities) * 100);
  RETURN v_progress;
END;
$$;

-- Function to calculate objective progress based on linked initiatives
CREATE OR REPLACE FUNCTION calculate_objective_progress(p_objective_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_progress numeric;
BEGIN
  SELECT AVG(i.progress)
  INTO v_avg_progress
  FROM public.initiatives i
  INNER JOIN public.objective_initiatives oi ON i.id = oi.initiative_id
  WHERE oi.objective_id = p_objective_id;
  
  IF v_avg_progress IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND(v_avg_progress);
END;
$$;

-- Function to get team performance score
CREATE OR REPLACE FUNCTION calculate_team_performance_score(
  p_area_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_total_initiatives integer;
  v_completed_initiatives integer;
  v_on_track_initiatives integer;
  v_delayed_initiatives integer;
  v_avg_progress numeric;
  v_activities_completed integer;
  v_activities_total integer;
BEGIN
  -- Default date range to current quarter if not provided
  IF p_start_date IS NULL THEN
    p_start_date := date_trunc('quarter', CURRENT_DATE)::date;
  END IF;
  
  IF p_end_date IS NULL THEN
    p_end_date := (date_trunc('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day')::date;
  END IF;
  
  -- Get initiative metrics
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'in_progress' AND due_date >= CURRENT_DATE),
    COUNT(*) FILTER (WHERE status = 'in_progress' AND due_date < CURRENT_DATE),
    AVG(progress)
  INTO 
    v_total_initiatives,
    v_completed_initiatives,
    v_on_track_initiatives,
    v_delayed_initiatives,
    v_avg_progress
  FROM public.initiatives
  WHERE area_id = p_area_id
    AND (start_date IS NULL OR start_date >= p_start_date)
    AND (due_date IS NULL OR due_date <= p_end_date);
  
  -- Get activity metrics
  SELECT 
    COUNT(*) FILTER (WHERE a.is_completed = true),
    COUNT(*)
  INTO v_activities_completed, v_activities_total
  FROM public.activities a
  INNER JOIN public.initiatives i ON a.initiative_id = i.id
  WHERE i.area_id = p_area_id;
  
  v_result := jsonb_build_object(
    'total_initiatives', COALESCE(v_total_initiatives, 0),
    'completed_initiatives', COALESCE(v_completed_initiatives, 0),
    'on_track_initiatives', COALESCE(v_on_track_initiatives, 0),
    'delayed_initiatives', COALESCE(v_delayed_initiatives, 0),
    'average_progress', COALESCE(ROUND(v_avg_progress), 0),
    'activities_completed', COALESCE(v_activities_completed, 0),
    'activities_total', COALESCE(v_activities_total, 0),
    'completion_rate', CASE 
      WHEN v_total_initiatives > 0 
      THEN ROUND((v_completed_initiatives::numeric / v_total_initiatives) * 100)
      ELSE 0
    END,
    'performance_score', CASE
      WHEN v_total_initiatives = 0 THEN 0
      ELSE ROUND(
        (COALESCE(v_avg_progress, 0) * 0.4) +
        ((v_completed_initiatives::numeric / GREATEST(v_total_initiatives, 1)) * 100 * 0.3) +
        ((v_on_track_initiatives::numeric / GREATEST(v_total_initiatives, 1)) * 100 * 0.2) +
        ((1 - (v_delayed_initiatives::numeric / GREATEST(v_total_initiatives, 1))) * 100 * 0.1)
      )
    END
  );
  
  RETURN v_result;
END;
$$;

-- =========================================
-- 3. CEO DASHBOARD VIEW
-- =========================================

CREATE OR REPLACE VIEW public.ceo_dashboard_metrics AS
WITH tenant_metrics AS (
  SELECT 
    t.id as tenant_id,
    t.subdomain,
    o.name as organization_name,
    o.logo_url,
    o.primary_color,
    o.secondary_color
  FROM public.tenants t
  INNER JOIN public.organizations o ON t.organization_id = o.id
),
initiative_metrics AS (
  SELECT 
    tenant_id,
    COUNT(*) as total_initiatives,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_initiatives,
    COUNT(*) FILTER (WHERE status = 'in_progress') as active_initiatives,
    COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold_initiatives,
    COUNT(*) FILTER (WHERE status = 'planning') as planning_initiatives,
    AVG(progress) as avg_progress,
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed') as overdue_initiatives
  FROM public.initiatives
  GROUP BY tenant_id
),
objective_metrics AS (
  SELECT 
    tenant_id,
    COUNT(*) as total_objectives,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_objectives,
    COUNT(*) FILTER (WHERE status = 'in_progress') as active_objectives,
    COUNT(*) FILTER (WHERE priority = 'high') as high_priority_objectives,
    AVG(progress) as avg_objective_progress
  FROM public.objectives
  GROUP BY tenant_id
),
area_metrics AS (
  SELECT 
    tenant_id,
    COUNT(*) as total_areas,
    COUNT(*) FILTER (WHERE is_active = true) as active_areas
  FROM public.areas
  GROUP BY tenant_id
),
user_metrics AS (
  SELECT 
    tenant_id,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE role = 'CEO') as ceo_count,
    COUNT(*) FILTER (WHERE role = 'Admin') as admin_count,
    COUNT(*) FILTER (WHERE role = 'Manager') as manager_count,
    COUNT(*) FILTER (WHERE is_active = true) as active_users
  FROM public.user_profiles
  GROUP BY tenant_id
),
activity_metrics AS (
  SELECT 
    i.tenant_id,
    COUNT(a.*) as total_activities,
    COUNT(a.*) FILTER (WHERE a.is_completed = true) as completed_activities
  FROM public.activities a
  INNER JOIN public.initiatives i ON a.initiative_id = i.id
  GROUP BY i.tenant_id
)
SELECT 
  tm.*,
  COALESCE(im.total_initiatives, 0) as total_initiatives,
  COALESCE(im.completed_initiatives, 0) as completed_initiatives,
  COALESCE(im.active_initiatives, 0) as active_initiatives,
  COALESCE(im.on_hold_initiatives, 0) as on_hold_initiatives,
  COALESCE(im.planning_initiatives, 0) as planning_initiatives,
  COALESCE(ROUND(im.avg_progress::numeric), 0) as avg_initiative_progress,
  COALESCE(im.overdue_initiatives, 0) as overdue_initiatives,
  COALESCE(om.total_objectives, 0) as total_objectives,
  COALESCE(om.completed_objectives, 0) as completed_objectives,
  COALESCE(om.active_objectives, 0) as active_objectives,
  COALESCE(om.high_priority_objectives, 0) as high_priority_objectives,
  COALESCE(ROUND(om.avg_objective_progress::numeric), 0) as avg_objective_progress,
  COALESCE(arm.total_areas, 0) as total_areas,
  COALESCE(arm.active_areas, 0) as active_areas,
  COALESCE(um.total_users, 0) as total_users,
  COALESCE(um.ceo_count, 0) as ceo_count,
  COALESCE(um.admin_count, 0) as admin_count,
  COALESCE(um.manager_count, 0) as manager_count,
  COALESCE(um.active_users, 0) as active_users,
  COALESCE(actm.total_activities, 0) as total_activities,
  COALESCE(actm.completed_activities, 0) as completed_activities,
  CASE 
    WHEN COALESCE(actm.total_activities, 0) > 0 
    THEN ROUND((actm.completed_activities::numeric / actm.total_activities) * 100)
    ELSE 0
  END as activity_completion_rate,
  CASE 
    WHEN COALESCE(im.total_initiatives, 0) > 0 
    THEN ROUND((im.completed_initiatives::numeric / im.total_initiatives) * 100)
    ELSE 0
  END as initiative_completion_rate
FROM tenant_metrics tm
LEFT JOIN initiative_metrics im ON tm.tenant_id = im.tenant_id
LEFT JOIN objective_metrics om ON tm.tenant_id = om.tenant_id
LEFT JOIN area_metrics arm ON tm.tenant_id = arm.tenant_id
LEFT JOIN user_metrics um ON tm.tenant_id = um.tenant_id
LEFT JOIN activity_metrics actm ON tm.tenant_id = actm.tenant_id;

-- =========================================
-- 4. MANAGER DASHBOARD VIEW
-- =========================================

CREATE OR REPLACE VIEW public.manager_dashboard_view AS
WITH area_initiatives AS (
  SELECT 
    a.id as area_id,
    a.name as area_name,
    a.description as area_description,
    a.manager_id,
    a.tenant_id,
    i.id as initiative_id,
    i.title as initiative_title,
    i.progress as initiative_progress,
    i.status as initiative_status,
    i.due_date,
    i.start_date,
    i.created_by,
    CASE 
      WHEN i.due_date < CURRENT_DATE AND i.status != 'completed' THEN true
      ELSE false
    END as is_overdue
  FROM public.areas a
  LEFT JOIN public.initiatives i ON a.id = i.area_id
),
area_activities AS (
  SELECT 
    ai.area_id,
    ai.initiative_id,
    act.id as activity_id,
    act.title as activity_title,
    act.is_completed,
    act.assigned_to,
    up.full_name as assigned_to_name
  FROM area_initiatives ai
  INNER JOIN public.activities act ON ai.initiative_id = act.initiative_id
  LEFT JOIN public.user_profiles up ON act.assigned_to = up.id
),
area_objectives AS (
  SELECT 
    o.area_id,
    o.id as objective_id,
    o.title as objective_title,
    o.priority,
    o.status as objective_status,
    o.progress as objective_progress
  FROM public.objectives o
),
team_members AS (
  SELECT 
    area_id,
    id as member_id,
    full_name,
    email,
    role,
    avatar_url
  FROM public.user_profiles
  WHERE area_id IS NOT NULL
)
SELECT DISTINCT
  ai.area_id,
  ai.area_name,
  ai.area_description,
  ai.manager_id,
  ai.tenant_id,
  mgr.full_name as manager_name,
  mgr.email as manager_email,
  COUNT(DISTINCT ai.initiative_id) as total_initiatives,
  COUNT(DISTINCT ai.initiative_id) FILTER (WHERE ai.initiative_status = 'completed') as completed_initiatives,
  COUNT(DISTINCT ai.initiative_id) FILTER (WHERE ai.initiative_status = 'in_progress') as active_initiatives,
  COUNT(DISTINCT ai.initiative_id) FILTER (WHERE ai.is_overdue = true) as overdue_initiatives,
  COALESCE(AVG(ai.initiative_progress), 0)::integer as avg_progress,
  COUNT(DISTINCT aa.activity_id) as total_activities,
  COUNT(DISTINCT aa.activity_id) FILTER (WHERE aa.is_completed = true) as completed_activities,
  COUNT(DISTINCT tm.member_id) as team_size,
  COUNT(DISTINCT ao.objective_id) as total_objectives,
  COUNT(DISTINCT ao.objective_id) FILTER (WHERE ao.priority = 'high') as high_priority_objectives,
  jsonb_agg(DISTINCT jsonb_build_object(
    'member_id', tm.member_id,
    'full_name', tm.full_name,
    'email', tm.email,
    'role', tm.role,
    'avatar_url', tm.avatar_url
  )) FILTER (WHERE tm.member_id IS NOT NULL) as team_members,
  jsonb_agg(DISTINCT jsonb_build_object(
    'initiative_id', ai.initiative_id,
    'title', ai.initiative_title,
    'progress', ai.initiative_progress,
    'status', ai.initiative_status,
    'due_date', ai.due_date,
    'is_overdue', ai.is_overdue
  )) FILTER (WHERE ai.initiative_id IS NOT NULL) as initiatives_summary
FROM area_initiatives ai
LEFT JOIN area_activities aa ON ai.area_id = aa.area_id
LEFT JOIN area_objectives ao ON ai.area_id = ao.area_id
LEFT JOIN team_members tm ON ai.area_id = tm.area_id
LEFT JOIN public.user_profiles mgr ON ai.manager_id = mgr.id
GROUP BY 
  ai.area_id, 
  ai.area_name, 
  ai.area_description, 
  ai.manager_id,
  ai.tenant_id,
  mgr.full_name,
  mgr.email;

-- =========================================
-- 5. INITIATIVE SUMMARY VIEW
-- =========================================

CREATE OR REPLACE VIEW public.initiative_summary_view AS
WITH activity_stats AS (
  SELECT 
    initiative_id,
    COUNT(*) as total_activities,
    COUNT(*) FILTER (WHERE is_completed = true) as completed_activities,
    jsonb_agg(jsonb_build_object(
      'id', id,
      'title', title,
      'is_completed', is_completed,
      'assigned_to', assigned_to
    ) ORDER BY created_at) as activities_list
  FROM public.activities
  GROUP BY initiative_id
),
linked_objectives AS (
  SELECT 
    oi.initiative_id,
    jsonb_agg(jsonb_build_object(
      'id', o.id,
      'title', o.title,
      'priority', o.priority,
      'status', o.status
    )) as objectives
  FROM public.objective_initiatives oi
  INNER JOIN public.objectives o ON oi.objective_id = o.id
  GROUP BY oi.initiative_id
)
SELECT 
  i.id,
  i.tenant_id,
  i.area_id,
  a.name as area_name,
  i.title,
  i.description,
  i.progress,
  i.status,
  i.start_date,
  i.due_date,
  i.completion_date,
  i.created_by,
  creator.full_name as created_by_name,
  creator.email as created_by_email,
  i.created_at,
  i.updated_at,
  CASE 
    WHEN i.due_date < CURRENT_DATE AND i.status != 'completed' THEN true
    ELSE false
  END as is_overdue,
  CASE 
    WHEN i.due_date IS NOT NULL THEN i.due_date - CURRENT_DATE
    ELSE NULL
  END as days_until_due,
  COALESCE(ast.total_activities, 0) as total_activities,
  COALESCE(ast.completed_activities, 0) as completed_activities,
  CASE 
    WHEN COALESCE(ast.total_activities, 0) > 0 
    THEN ROUND((ast.completed_activities::numeric / ast.total_activities) * 100)
    ELSE 0
  END as activity_completion_rate,
  ast.activities_list,
  lo.objectives
FROM public.initiatives i
LEFT JOIN public.areas a ON i.area_id = a.id
LEFT JOIN public.user_profiles creator ON i.created_by = creator.id
LEFT JOIN activity_stats ast ON i.id = ast.initiative_id
LEFT JOIN linked_objectives lo ON i.id = lo.initiative_id;

-- =========================================
-- 6. TEAM PERFORMANCE VIEW
-- =========================================

CREATE OR REPLACE VIEW public.team_performance_view AS
WITH user_activities AS (
  SELECT 
    up.id as user_id,
    up.full_name,
    up.email,
    up.area_id,
    up.role,
    up.tenant_id,
    COUNT(DISTINCT a.id) as assigned_activities,
    COUNT(DISTINCT a.id) FILTER (WHERE a.is_completed = true) as completed_activities,
    COUNT(DISTINCT a.initiative_id) as active_initiatives
  FROM public.user_profiles up
  LEFT JOIN public.activities a ON up.id = a.assigned_to
  GROUP BY up.id, up.full_name, up.email, up.area_id, up.role, up.tenant_id
),
user_initiatives AS (
  SELECT 
    i.created_by as user_id,
    COUNT(*) as created_initiatives,
    AVG(i.progress) as avg_initiative_progress
  FROM public.initiatives i
  GROUP BY i.created_by
),
recent_activity AS (
  SELECT 
    a.assigned_to as user_id,
    MAX(a.updated_at) as last_activity_update
  FROM public.activities a
  WHERE a.assigned_to IS NOT NULL
  GROUP BY a.assigned_to
)
SELECT 
  ua.user_id,
  ua.full_name,
  ua.email,
  ua.area_id,
  ar.name as area_name,
  ua.role,
  ua.tenant_id,
  ua.assigned_activities,
  ua.completed_activities,
  ua.active_initiatives,
  CASE 
    WHEN ua.assigned_activities > 0 
    THEN ROUND((ua.completed_activities::numeric / ua.assigned_activities) * 100)
    ELSE 0
  END as completion_rate,
  COALESCE(ui.created_initiatives, 0) as created_initiatives,
  COALESCE(ROUND(ui.avg_initiative_progress::numeric), 0) as avg_initiative_progress,
  ra.last_activity_update,
  CASE 
    WHEN ua.assigned_activities = 0 THEN 'No activities'
    WHEN ua.completed_activities::numeric / GREATEST(ua.assigned_activities, 1) >= 0.8 THEN 'High performer'
    WHEN ua.completed_activities::numeric / GREATEST(ua.assigned_activities, 1) >= 0.6 THEN 'Good performer'
    WHEN ua.completed_activities::numeric / GREATEST(ua.assigned_activities, 1) >= 0.4 THEN 'Average performer'
    ELSE 'Needs improvement'
  END as performance_rating,
  CASE 
    WHEN ua.assigned_activities > 10 THEN 'Overloaded'
    WHEN ua.assigned_activities BETWEEN 5 AND 10 THEN 'Optimal'
    WHEN ua.assigned_activities BETWEEN 1 AND 4 THEN 'Light'
    ELSE 'No workload'
  END as workload_status
FROM user_activities ua
LEFT JOIN public.areas ar ON ua.area_id = ar.id
LEFT JOIN user_initiatives ui ON ua.user_id = ui.user_id
LEFT JOIN recent_activity ra ON ua.user_id = ra.user_id;

-- =========================================
-- 7. QUARTERLY PERFORMANCE VIEW
-- =========================================

CREATE OR REPLACE VIEW public.quarterly_performance_view AS
WITH quarter_initiatives AS (
  SELECT 
    q.id as quarter_id,
    q.tenant_id,
    q.quarter_name,
    q.start_date,
    q.end_date,
    i.id as initiative_id,
    i.progress,
    i.status,
    i.area_id
  FROM public.quarters q
  LEFT JOIN public.initiatives i ON 
    i.tenant_id = q.tenant_id AND
    ((i.start_date >= q.start_date AND i.start_date <= q.end_date) OR
     (i.due_date >= q.start_date AND i.due_date <= q.end_date) OR
     (i.start_date <= q.start_date AND (i.due_date >= q.end_date OR i.due_date IS NULL)))
),
quarter_objectives AS (
  SELECT 
    oq.quarter_id,
    COUNT(DISTINCT o.id) as total_objectives,
    AVG(o.progress) as avg_objective_progress,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'completed') as completed_objectives,
    COUNT(DISTINCT o.id) FILTER (WHERE o.priority = 'high') as high_priority_objectives
  FROM public.objective_quarters oq
  INNER JOIN public.objectives o ON oq.objective_id = o.id
  GROUP BY oq.quarter_id
)
SELECT 
  qi.quarter_id,
  qi.tenant_id,
  qi.quarter_name,
  qi.start_date,
  qi.end_date,
  COUNT(DISTINCT qi.initiative_id) as total_initiatives,
  COUNT(DISTINCT qi.initiative_id) FILTER (WHERE qi.status = 'completed') as completed_initiatives,
  COUNT(DISTINCT qi.initiative_id) FILTER (WHERE qi.status = 'in_progress') as active_initiatives,
  COALESCE(AVG(qi.progress), 0)::integer as avg_progress,
  COUNT(DISTINCT qi.area_id) as areas_involved,
  COALESCE(qo.total_objectives, 0) as total_objectives,
  COALESCE(qo.completed_objectives, 0) as completed_objectives,
  COALESCE(qo.high_priority_objectives, 0) as high_priority_objectives,
  COALESCE(ROUND(qo.avg_objective_progress::numeric), 0) as avg_objective_progress,
  CASE 
    WHEN CURRENT_DATE < qi.start_date THEN 'upcoming'
    WHEN CURRENT_DATE > qi.end_date THEN 'completed'
    ELSE 'active'
  END as quarter_status
FROM quarter_initiatives qi
LEFT JOIN quarter_objectives qo ON qi.quarter_id = qo.quarter_id
GROUP BY 
  qi.quarter_id,
  qi.tenant_id,
  qi.quarter_name,
  qi.start_date,
  qi.end_date,
  qo.total_objectives,
  qo.completed_objectives,
  qo.high_priority_objectives,
  qo.avg_objective_progress;

-- =========================================
-- 8. ACTIVITY TRACKING VIEW
-- =========================================

CREATE OR REPLACE VIEW public.activity_tracking_view AS
SELECT 
  a.id as activity_id,
  a.title as activity_title,
  a.description as activity_description,
  a.is_completed,
  a.created_at as activity_created_at,
  a.updated_at as activity_updated_at,
  a.assigned_to,
  assignee.full_name as assigned_to_name,
  assignee.email as assigned_to_email,
  i.id as initiative_id,
  i.title as initiative_title,
  i.status as initiative_status,
  i.area_id,
  ar.name as area_name,
  i.tenant_id,
  CASE 
    WHEN a.is_completed = false AND i.due_date < CURRENT_DATE THEN 'overdue'
    WHEN a.is_completed = false AND i.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
    WHEN a.is_completed = true THEN 'completed'
    ELSE 'on_track'
  END as activity_status,
  i.due_date as initiative_due_date,
  EXTRACT(EPOCH FROM (i.due_date - CURRENT_DATE)) / 86400 as days_until_due
FROM public.activities a
INNER JOIN public.initiatives i ON a.initiative_id = i.id
LEFT JOIN public.areas ar ON i.area_id = ar.id
LEFT JOIN public.user_profiles assignee ON a.assigned_to = assignee.id;

-- =========================================
-- 9. KPI CALCULATION FUNCTIONS
-- =========================================

-- Function to calculate comprehensive KPIs for a tenant
CREATE OR REPLACE FUNCTION calculate_tenant_kpis(
  p_tenant_id uuid,
  p_period_start date DEFAULT NULL,
  p_period_end date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_initiatives_data jsonb;
  v_objectives_data jsonb;
  v_activities_data jsonb;
  v_team_data jsonb;
BEGIN
  -- Default to current quarter if no period specified
  IF p_period_start IS NULL THEN
    p_period_start := date_trunc('quarter', CURRENT_DATE)::date;
  END IF;
  
  IF p_period_end IS NULL THEN
    p_period_end := (date_trunc('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day')::date;
  END IF;
  
  -- Calculate initiative KPIs
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'on_hold', COUNT(*) FILTER (WHERE status = 'on_hold'),
    'planning', COUNT(*) FILTER (WHERE status = 'planning'),
    'overdue', COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed'),
    'avg_progress', COALESCE(ROUND(AVG(progress)), 0),
    'completion_rate', CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)) * 100)
      ELSE 0
    END
  ) INTO v_initiatives_data
  FROM public.initiatives
  WHERE tenant_id = p_tenant_id
    AND (start_date IS NULL OR start_date >= p_period_start)
    AND (due_date IS NULL OR due_date <= p_period_end);
  
  -- Calculate objective KPIs
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'high_priority', COUNT(*) FILTER (WHERE priority = 'high'),
    'avg_progress', COALESCE(ROUND(AVG(progress)), 0)
  ) INTO v_objectives_data
  FROM public.objectives
  WHERE tenant_id = p_tenant_id
    AND (start_date IS NULL OR start_date >= p_period_start)
    AND (end_date IS NULL OR end_date <= p_period_end);
  
  -- Calculate activity KPIs
  SELECT jsonb_build_object(
    'total', COUNT(a.*),
    'completed', COUNT(a.*) FILTER (WHERE a.is_completed = true),
    'assigned', COUNT(a.*) FILTER (WHERE a.assigned_to IS NOT NULL),
    'unassigned', COUNT(a.*) FILTER (WHERE a.assigned_to IS NULL),
    'completion_rate', CASE 
      WHEN COUNT(a.*) > 0 
      THEN ROUND((COUNT(a.*) FILTER (WHERE a.is_completed = true)::numeric / COUNT(a.*)) * 100)
      ELSE 0
    END
  ) INTO v_activities_data
  FROM public.activities a
  INNER JOIN public.initiatives i ON a.initiative_id = i.id
  WHERE i.tenant_id = p_tenant_id;
  
  -- Calculate team KPIs
  SELECT jsonb_build_object(
    'total_users', COUNT(*),
    'active_users', COUNT(*) FILTER (WHERE is_active = true),
    'managers', COUNT(*) FILTER (WHERE role = 'Manager'),
    'admins', COUNT(*) FILTER (WHERE role = 'Admin'),
    'ceos', COUNT(*) FILTER (WHERE role = 'CEO')
  ) INTO v_team_data
  FROM public.user_profiles
  WHERE tenant_id = p_tenant_id;
  
  -- Combine all KPIs
  v_result := jsonb_build_object(
    'period', jsonb_build_object(
      'start', p_period_start,
      'end', p_period_end
    ),
    'initiatives', v_initiatives_data,
    'objectives', v_objectives_data,
    'activities', v_activities_data,
    'team', v_team_data,
    'overall_health_score', ROUND(
      (
        (v_initiatives_data->>'completion_rate')::numeric * 0.3 +
        (v_objectives_data->>'avg_progress')::numeric * 0.3 +
        (v_activities_data->>'completion_rate')::numeric * 0.2 +
        CASE 
          WHEN (v_initiatives_data->>'total')::integer > 0
          THEN (100 - ((v_initiatives_data->>'overdue')::numeric / (v_initiatives_data->>'total')::numeric * 100)) * 0.2
          ELSE 100 * 0.2
        END
      )
    )
  );
  
  RETURN v_result;
END;
$$;

-- =========================================
-- 10. GRANT PERMISSIONS
-- =========================================

-- Grant SELECT permissions on views to authenticated users
GRANT SELECT ON public.ceo_dashboard_metrics TO authenticated;
GRANT SELECT ON public.manager_dashboard_view TO authenticated;
GRANT SELECT ON public.initiative_summary_view TO authenticated;
GRANT SELECT ON public.team_performance_view TO authenticated;
GRANT SELECT ON public.quarterly_performance_view TO authenticated;
GRANT SELECT ON public.activity_tracking_view TO authenticated;

-- Grant EXECUTE permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION calculate_initiative_progress TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_objective_progress TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_team_performance_score TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_tenant_kpis TO authenticated;

-- =========================================
-- 11. CREATE REFRESH FUNCTION FOR MATERIALIZED VIEWS (if needed)
-- =========================================

-- Function to refresh dashboard data (can be called periodically)
CREATE OR REPLACE FUNCTION refresh_dashboard_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If we convert any views to materialized views in the future,
  -- we can refresh them here
  -- REFRESH MATERIALIZED VIEW CONCURRENTLY public.ceo_dashboard_metrics;
  -- REFRESH MATERIALIZED VIEW CONCURRENTLY public.manager_dashboard_view;
  
  -- For now, just update statistics
  ANALYZE public.initiatives;
  ANALYZE public.objectives;
  ANALYZE public.activities;
  ANALYZE public.areas;
  ANALYZE public.user_profiles;
  
  RAISE NOTICE 'Dashboard data refreshed successfully';
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_dashboard_data TO authenticated;

-- =========================================
-- 12. COMMENTS FOR DOCUMENTATION
-- =========================================

COMMENT ON VIEW public.ceo_dashboard_metrics IS 'Comprehensive metrics view for CEO dashboard showing organization-wide KPIs';
COMMENT ON VIEW public.manager_dashboard_view IS 'Manager-specific dashboard view with team and area metrics';
COMMENT ON VIEW public.initiative_summary_view IS 'Detailed initiative information with activity stats and linked objectives';
COMMENT ON VIEW public.team_performance_view IS 'Team member performance metrics and workload analysis';
COMMENT ON VIEW public.quarterly_performance_view IS 'Quarter-based performance metrics for strategic planning';
COMMENT ON VIEW public.activity_tracking_view IS 'Activity tracking with status and assignment information';

COMMENT ON FUNCTION calculate_initiative_progress IS 'Calculates initiative progress based on completed activities';
COMMENT ON FUNCTION calculate_objective_progress IS 'Calculates objective progress based on linked initiatives';
COMMENT ON FUNCTION calculate_team_performance_score IS 'Calculates comprehensive team performance metrics for a given area';
COMMENT ON FUNCTION calculate_tenant_kpis IS 'Calculates comprehensive KPIs for a tenant within a specified period';
COMMENT ON FUNCTION refresh_dashboard_data IS 'Refreshes dashboard data and updates table statistics';