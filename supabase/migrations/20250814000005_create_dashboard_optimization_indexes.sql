-- Migration: Additional performance indexes and optimizations for dashboard blocks
-- Date: 2025-08-14
-- Description: Creates specialized indexes and optimization strategies for shadcn/ui dashboard blocks

-- =========================================
-- 1. SPECIALIZED DASHBOARD INDEXES
-- =========================================

-- Indexes for CEO dashboard block queries
CREATE INDEX IF NOT EXISTS idx_initiatives_status_progress_tenant 
  ON public.initiatives(tenant_id, status, progress) 
  WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_objectives_priority_status_tenant 
  ON public.objectives(tenant_id, priority, status) 
  WHERE priority IS NOT NULL AND status IS NOT NULL;

-- Indexes for Manager dashboard block queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_area_role_active 
  ON public.user_profiles(area_id, role, is_active) 
  WHERE area_id IS NOT NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_activities_assigned_completed 
  ON public.activities(assigned_to, is_completed) 
  WHERE assigned_to IS NOT NULL;

-- Indexes for Initiative summary block queries
CREATE INDEX IF NOT EXISTS idx_initiatives_area_due_date 
  ON public.initiatives(area_id, due_date) 
  WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_objective_initiatives_objective_id 
  ON public.objective_initiatives(objective_id);

-- Indexes for Team performance block queries
CREATE INDEX IF NOT EXISTS idx_activities_initiative_assigned_completed 
  ON public.activities(initiative_id, assigned_to, is_completed);

-- Indexes for Quarter performance block queries
CREATE INDEX IF NOT EXISTS idx_quarters_tenant_start_end 
  ON public.quarters(tenant_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_initiatives_dates_overlap 
  ON public.initiatives(tenant_id, start_date, due_date) 
  WHERE start_date IS NOT NULL OR due_date IS NOT NULL;

-- Indexes for Progress tracking queries
CREATE INDEX IF NOT EXISTS idx_progress_history_initiative_date 
  ON public.progress_history(initiative_id, created_at DESC);

-- Partial indexes for active records only
CREATE INDEX IF NOT EXISTS idx_initiatives_active_tenant_area 
  ON public.initiatives(tenant_id, area_id, progress) 
  WHERE status IN ('in_progress', 'planning');

CREATE INDEX IF NOT EXISTS idx_objectives_active_tenant_area 
  ON public.objectives(tenant_id, area_id, progress) 
  WHERE status IN ('in_progress', 'planning');

-- =========================================
-- 2. DASHBOARD SUMMARY FUNCTIONS
-- =========================================

-- Function to get quick dashboard summary for CEO
CREATE OR REPLACE FUNCTION get_ceo_dashboard_summary(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT jsonb_build_object(
    'total_initiatives', COUNT(DISTINCT i.id),
    'active_initiatives', COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'in_progress'),
    'completed_initiatives', COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'completed'),
    'overdue_initiatives', COUNT(DISTINCT i.id) FILTER (WHERE i.due_date < CURRENT_DATE AND i.status != 'completed'),
    'avg_progress', COALESCE(ROUND(AVG(i.progress)), 0),
    'total_objectives', COUNT(DISTINCT o.id),
    'active_objectives', COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'in_progress'),
    'high_priority_objectives', COUNT(DISTINCT o.id) FILTER (WHERE o.priority = 'high'),
    'total_areas', COUNT(DISTINCT a.id),
    'total_team_members', COUNT(DISTINCT up.id),
    'total_activities', COUNT(DISTINCT act.id),
    'completed_activities', COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true)
  )
  FROM public.initiatives i
  LEFT JOIN public.objectives o ON o.tenant_id = i.tenant_id
  LEFT JOIN public.areas a ON a.tenant_id = i.tenant_id
  LEFT JOIN public.user_profiles up ON up.tenant_id = i.tenant_id
  LEFT JOIN public.activities act ON act.initiative_id = i.id
  WHERE i.tenant_id = p_tenant_id;
$$;

-- Function to get manager dashboard summary for specific area
CREATE OR REPLACE FUNCTION get_manager_dashboard_summary(p_area_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH area_stats AS (
    SELECT 
      a.id,
      a.name,
      a.tenant_id,
      COUNT(DISTINCT i.id) as total_initiatives,
      COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'completed') as completed_initiatives,
      COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'in_progress') as active_initiatives,
      COUNT(DISTINCT i.id) FILTER (WHERE i.due_date < CURRENT_DATE AND i.status != 'completed') as overdue_initiatives,
      COALESCE(AVG(i.progress), 0) as avg_progress,
      COUNT(DISTINCT act.id) as total_activities,
      COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true) as completed_activities,
      COUNT(DISTINCT up.id) as team_size
    FROM public.areas a
    LEFT JOIN public.initiatives i ON a.id = i.area_id
    LEFT JOIN public.activities act ON i.id = act.initiative_id
    LEFT JOIN public.user_profiles up ON a.id = up.area_id AND up.is_active = true
    WHERE a.id = p_area_id
    GROUP BY a.id, a.name, a.tenant_id
  )
  SELECT jsonb_build_object(
    'area_id', id,
    'area_name', name,
    'total_initiatives', total_initiatives,
    'completed_initiatives', completed_initiatives,
    'active_initiatives', active_initiatives,
    'overdue_initiatives', overdue_initiatives,
    'avg_progress', ROUND(avg_progress::numeric),
    'total_activities', total_activities,
    'completed_activities', completed_activities,
    'activity_completion_rate', CASE 
      WHEN total_activities > 0 
      THEN ROUND((completed_activities::numeric / total_activities) * 100)
      ELSE 0
    END,
    'team_size', team_size,
    'performance_score', ROUND(
      (avg_progress * 0.4) +
      (CASE WHEN total_initiatives > 0 THEN (completed_initiatives::numeric / total_initiatives) * 100 * 0.3 ELSE 0 END) +
      (CASE WHEN total_activities > 0 THEN (completed_activities::numeric / total_activities) * 100 * 0.3 ELSE 0 END)
    )
  )
  FROM area_stats;
$$;

-- Function to get initiative details for cards
CREATE OR REPLACE FUNCTION get_initiative_card_data(p_initiative_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT jsonb_build_object(
    'id', i.id,
    'title', i.title,
    'description', i.description,
    'progress', i.progress,
    'status', i.status,
    'start_date', i.start_date,
    'due_date', i.due_date,
    'area_name', a.name,
    'created_by_name', creator.full_name,
    'is_overdue', (i.due_date < CURRENT_DATE AND i.status != 'completed'),
    'days_until_due', CASE 
      WHEN i.due_date IS NOT NULL THEN i.due_date - CURRENT_DATE
      ELSE NULL
    END,
    'total_activities', COUNT(DISTINCT act.id),
    'completed_activities', COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true),
    'activity_completion_rate', CASE 
      WHEN COUNT(DISTINCT act.id) > 0 
      THEN ROUND((COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true)::numeric / COUNT(DISTINCT act.id)) * 100)
      ELSE 0
    END,
    'assigned_members', COUNT(DISTINCT act.assigned_to) FILTER (WHERE act.assigned_to IS NOT NULL),
    'objectives', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', o.id,
        'title', o.title,
        'priority', o.priority
      ))
      FROM public.objective_initiatives oi
      JOIN public.objectives o ON oi.objective_id = o.id
      WHERE oi.initiative_id = i.id),
      '[]'::jsonb
    )
  )
  FROM public.initiatives i
  LEFT JOIN public.areas a ON i.area_id = a.id
  LEFT JOIN public.user_profiles creator ON i.created_by = creator.id
  LEFT JOIN public.activities act ON i.id = act.initiative_id
  WHERE i.id = p_initiative_id
  GROUP BY i.id, i.title, i.description, i.progress, i.status, i.start_date, i.due_date, 
           a.name, creator.full_name;
$$;

-- Function to get team member performance for cards
CREATE OR REPLACE FUNCTION get_team_member_card_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT jsonb_build_object(
    'user_id', up.id,
    'full_name', up.full_name,
    'email', up.email,
    'role', up.role,
    'area_name', a.name,
    'avatar_url', up.avatar_url,
    'assigned_activities', COUNT(DISTINCT act.id),
    'completed_activities', COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true),
    'completion_rate', CASE 
      WHEN COUNT(DISTINCT act.id) > 0 
      THEN ROUND((COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true)::numeric / COUNT(DISTINCT act.id)) * 100)
      ELSE 0
    END,
    'active_initiatives', COUNT(DISTINCT act.initiative_id),
    'overdue_activities', COUNT(DISTINCT act.id) FILTER (
      WHERE act.is_completed = false 
        AND EXISTS (
          SELECT 1 FROM public.initiatives i 
          WHERE i.id = act.initiative_id 
            AND i.due_date < CURRENT_DATE
        )
    ),
    'workload_status', CASE
      WHEN COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = false) > 10 THEN 'overloaded'
      WHEN COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = false) BETWEEN 5 AND 10 THEN 'optimal'
      WHEN COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = false) BETWEEN 1 AND 4 THEN 'light'
      ELSE 'available'
    END,
    'performance_rating', CASE
      WHEN COUNT(DISTINCT act.id) = 0 THEN 'no_data'
      WHEN (COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true)::numeric / COUNT(DISTINCT act.id)) >= 0.8 THEN 'excellent'
      WHEN (COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true)::numeric / COUNT(DISTINCT act.id)) >= 0.6 THEN 'good'
      WHEN (COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true)::numeric / COUNT(DISTINCT act.id)) >= 0.4 THEN 'average'
      ELSE 'needs_improvement'
    END
  )
  FROM public.user_profiles up
  LEFT JOIN public.areas a ON up.area_id = a.id
  LEFT JOIN public.activities act ON up.id = act.assigned_to
  WHERE up.id = p_user_id
  GROUP BY up.id, up.full_name, up.email, up.role, a.name, up.avatar_url;
$$;

-- =========================================
-- 3. PERFORMANCE OPTIMIZATION VIEWS
-- =========================================

-- Optimized view for initiative cards in dashboard
CREATE OR REPLACE VIEW public.initiative_cards_optimized AS
SELECT 
  i.id,
  i.title,
  i.progress,
  i.status,
  i.due_date,
  i.area_id,
  a.name as area_name,
  creator.full_name as created_by_name,
  CASE WHEN i.due_date < CURRENT_DATE AND i.status != 'completed' THEN true ELSE false END as is_overdue,
  CASE WHEN i.due_date IS NOT NULL THEN i.due_date - CURRENT_DATE ELSE NULL END as days_until_due,
  act_stats.total_activities,
  act_stats.completed_activities,
  CASE 
    WHEN act_stats.total_activities > 0 
    THEN ROUND((act_stats.completed_activities::numeric / act_stats.total_activities) * 100)
    ELSE 0
  END as activity_completion_rate,
  obj_links.objective_count
FROM public.initiatives i
LEFT JOIN public.areas a ON i.area_id = a.id
LEFT JOIN public.user_profiles creator ON i.created_by = creator.id
LEFT JOIN (
  SELECT 
    initiative_id,
    COUNT(*) as total_activities,
    COUNT(*) FILTER (WHERE is_completed = true) as completed_activities
  FROM public.activities
  GROUP BY initiative_id
) act_stats ON i.id = act_stats.initiative_id
LEFT JOIN (
  SELECT 
    initiative_id,
    COUNT(*) as objective_count
  FROM public.objective_initiatives
  GROUP BY initiative_id
) obj_links ON i.id = obj_links.initiative_id;

-- Optimized view for team member cards
CREATE OR REPLACE VIEW public.team_member_cards_optimized AS
SELECT 
  up.id as user_id,
  up.full_name,
  up.email,
  up.role,
  up.area_id,
  a.name as area_name,
  up.avatar_url,
  COALESCE(work_stats.assigned_activities, 0) as assigned_activities,
  COALESCE(work_stats.completed_activities, 0) as completed_activities,
  CASE 
    WHEN COALESCE(work_stats.assigned_activities, 0) > 0 
    THEN ROUND((work_stats.completed_activities::numeric / work_stats.assigned_activities) * 100)
    ELSE 0
  END as completion_rate,
  COALESCE(work_stats.active_initiatives, 0) as active_initiatives
FROM public.user_profiles up
LEFT JOIN public.areas a ON up.area_id = a.id
LEFT JOIN (
  SELECT 
    assigned_to,
    COUNT(*) as assigned_activities,
    COUNT(*) FILTER (WHERE is_completed = true) as completed_activities,
    COUNT(DISTINCT initiative_id) as active_initiatives
  FROM public.activities
  WHERE assigned_to IS NOT NULL
  GROUP BY assigned_to
) work_stats ON up.id = work_stats.assigned_to
WHERE up.is_active = true;

-- =========================================
-- 4. DASHBOARD CACHE FUNCTIONS
-- =========================================

-- Function to warm up dashboard caches
CREATE OR REPLACE FUNCTION warm_dashboard_cache(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Force query plan caching for common dashboard queries
  PERFORM get_ceo_dashboard_summary(p_tenant_id);
  
  PERFORM get_manager_dashboard_summary(a.id)
  FROM public.areas a
  WHERE a.tenant_id = p_tenant_id
  LIMIT 5;
  
  -- Update table statistics
  ANALYZE public.initiatives;
  ANALYZE public.objectives;
  ANALYZE public.activities;
  ANALYZE public.user_profiles;
  
  RAISE NOTICE 'Dashboard cache warmed for tenant %', p_tenant_id;
END;
$$;

-- =========================================
-- 5. GRANT PERMISSIONS
-- =========================================

GRANT SELECT ON public.initiative_cards_optimized TO authenticated;
GRANT SELECT ON public.team_member_cards_optimized TO authenticated;

GRANT EXECUTE ON FUNCTION get_ceo_dashboard_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_manager_dashboard_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_initiative_card_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_member_card_data TO authenticated;
GRANT EXECUTE ON FUNCTION warm_dashboard_cache TO authenticated;

-- =========================================
-- 6. ENABLE RLS ON NEW VIEWS
-- =========================================

ALTER VIEW public.initiative_cards_optimized SET (security_barrier = true);
ALTER VIEW public.team_member_cards_optimized SET (security_barrier = true);

-- =========================================
-- 7. COMMENTS FOR DOCUMENTATION
-- =========================================

COMMENT ON FUNCTION get_ceo_dashboard_summary IS 'Fast summary data for CEO dashboard blocks';
COMMENT ON FUNCTION get_manager_dashboard_summary IS 'Optimized manager dashboard data for specific area';
COMMENT ON FUNCTION get_initiative_card_data IS 'Complete initiative data for dashboard cards';
COMMENT ON FUNCTION get_team_member_card_data IS 'Team member performance data for cards';
COMMENT ON FUNCTION warm_dashboard_cache IS 'Warms up query plan cache for dashboard performance';

COMMENT ON VIEW public.initiative_cards_optimized IS 'Optimized view for initiative dashboard cards with pre-calculated metrics';
COMMENT ON VIEW public.team_member_cards_optimized IS 'Optimized view for team member cards with performance data';