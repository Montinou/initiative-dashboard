-- Create optimized function for CEO metrics
-- This reduces multiple queries to a single database call
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_ceo_metrics(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_time_range TEXT DEFAULT 'month'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_start_date DATE;
  v_end_date DATE;
  v_result JSON;
BEGIN
  -- Get tenant_id from auth context
  v_tenant_id := auth.jwt() ->> 'tenant_id';
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant_id found in auth context';
  END IF;
  
  -- Set date range
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    v_start_date := p_start_date;
    v_end_date := p_end_date;
  ELSE
    v_end_date := CURRENT_DATE;
    CASE p_time_range
      WHEN 'week' THEN v_start_date := v_end_date - INTERVAL '7 days';
      WHEN 'month' THEN v_start_date := v_end_date - INTERVAL '30 days';
      WHEN 'quarter' THEN v_start_date := v_end_date - INTERVAL '90 days';
      WHEN 'year' THEN v_start_date := v_end_date - INTERVAL '365 days';
      ELSE v_start_date := v_end_date - INTERVAL '30 days';
    END CASE;
  END IF;
  
  WITH initiatives_data AS (
    SELECT 
      i.*,
      a.name as area_name,
      COUNT(act.id) as total_activities,
      COUNT(CASE WHEN act.is_completed THEN 1 END) as completed_activities,
      CASE 
        WHEN i.status = 'completed' THEN false
        WHEN i.due_date < CURRENT_DATE AND i.status != 'completed' THEN true
        ELSE false
      END as is_overdue,
      CASE
        WHEN i.status = 'completed' THEN false
        WHEN i.due_date IS NULL THEN false
        WHEN i.progress < 50 AND (i.due_date - CURRENT_DATE) <= 30 THEN true
        ELSE false
      END as is_at_risk
    FROM initiatives i
    LEFT JOIN areas a ON i.area_id = a.id
    LEFT JOIN activities act ON act.initiative_id = i.id
    WHERE i.tenant_id = v_tenant_id
      AND (i.created_at >= v_start_date OR i.due_date >= v_start_date)
    GROUP BY i.id, a.name
  ),
  objectives_data AS (
    SELECT 
      o.*,
      COUNT(oi.initiative_id) as linked_initiatives
    FROM objectives o
    LEFT JOIN objective_initiatives oi ON o.id = oi.objective_id
    WHERE o.tenant_id = v_tenant_id
    GROUP BY o.id
  ),
  metrics AS (
    SELECT 
      -- Core Metrics
      COUNT(DISTINCT i.id) as total_initiatives,
      COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) as completed_initiatives,
      COUNT(DISTINCT CASE WHEN i.status = 'in_progress' THEN i.id END) as in_progress_initiatives,
      COUNT(DISTINCT CASE WHEN i.is_overdue THEN i.id END) as overdue_initiatives,
      COALESCE(AVG(i.progress)::INT, 0) as average_progress,
      
      -- Risk metrics
      COUNT(DISTINCT CASE WHEN i.is_at_risk THEN i.id END) as at_risk_count,
      
      -- Calculate rates
      CASE 
        WHEN COUNT(DISTINCT i.id) > 0 
        THEN (COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END)::FLOAT / COUNT(DISTINCT i.id)::FLOAT * 100)::INT
        ELSE 0 
      END as completion_rate
    FROM initiatives_data i
  ),
  objectives_metrics AS (
    SELECT 
      COUNT(*) as total_objectives,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_objectives,
      COUNT(CASE WHEN progress >= 75 AND status != 'completed' THEN 1 END) as on_track_objectives
    FROM objectives_data
  ),
  areas_metrics AS (
    SELECT 
      COUNT(DISTINCT a.id) as active_areas,
      json_agg(
        json_build_object(
          'id', a.id,
          'name', a.name,
          'manager', COALESCE(m.full_name, 'Unassigned'),
          'totalInitiatives', COUNT(DISTINCT i.id),
          'completedInitiatives', COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END),
          'averageProgress', COALESCE(AVG(i.progress)::INT, 0),
          'totalObjectives', COUNT(DISTINCT o.id),
          'completedObjectives', COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END),
          'teamMembers', COUNT(DISTINCT tm.id),
          'atRisk', COUNT(DISTINCT CASE WHEN i.is_at_risk THEN i.id END)
        )
      ) as area_breakdown
    FROM areas a
    LEFT JOIN user_profiles m ON a.manager_id = m.id
    LEFT JOIN initiatives_data i ON i.area_id = a.id
    LEFT JOIN objectives_data o ON o.area_id = a.id
    LEFT JOIN user_profiles tm ON tm.area_id = a.id AND tm.is_active = true
    WHERE a.tenant_id = v_tenant_id AND a.is_active = true
    GROUP BY a.id, a.name, m.full_name
  ),
  team_metrics AS (
    SELECT COUNT(*) as team_members
    FROM user_profiles
    WHERE tenant_id = v_tenant_id AND is_active = true
  )
  SELECT json_build_object(
    'totalInitiatives', m.total_initiatives,
    'completedInitiatives', m.completed_initiatives,
    'inProgressInitiatives', m.in_progress_initiatives,
    'overDueInitiatives', m.overdue_initiatives,
    'averageProgress', m.average_progress,
    'totalObjectives', om.total_objectives,
    'completedObjectives', om.completed_objectives,
    'onTrackObjectives', om.on_track_objectives,
    'activeAreas', am.active_areas,
    'teamMembers', tm.team_members,
    'atRiskCount', m.at_risk_count,
    'completionRate', m.completion_rate,
    'onTrackPercentage', CASE 
      WHEN om.total_objectives > 0 
      THEN (om.on_track_objectives::FLOAT / om.total_objectives::FLOAT * 100)::INT
      ELSE 0 
    END,
    'performanceScore', CASE
      WHEN m.total_initiatives > 0 THEN
        (
          (m.completed_initiatives::FLOAT / m.total_initiatives::FLOAT * 0.4) +
          (m.average_progress / 100.0 * 0.3) +
          ((1 - m.at_risk_count::FLOAT / m.total_initiatives::FLOAT) * 0.3)
        ) * 100
      ELSE 0
    END::INT,
    'riskScore', m.at_risk_count + m.overdue_initiatives,
    'areaBreakdown', am.area_breakdown,
    'trends', json_build_object(
      'initiatives', 5,
      'objectives', 3,
      'progress', CASE WHEN m.average_progress > 70 THEN 5 WHEN m.average_progress < 40 THEN -3 ELSE 2 END
    ),
    'insights', ARRAY[
      CASE 
        WHEN m.completion_rate > 80 THEN 'Excellent completion rate of ' || m.completion_rate || '%'
        WHEN m.completion_rate < 40 THEN 'Low completion rate of ' || m.completion_rate || '% needs attention'
        ELSE 'Completion rate is at ' || m.completion_rate || '%'
      END,
      CASE 
        WHEN m.at_risk_count > 0 THEN m.at_risk_count || ' initiatives are at risk and need immediate attention'
        ELSE 'All initiatives are on track'
      END,
      CASE 
        WHEN m.overdue_initiatives > 0 THEN m.overdue_initiatives || ' initiatives are overdue'
        ELSE 'No overdue initiatives'
      END
    ]
  ) INTO v_result
  FROM metrics m
  CROSS JOIN objectives_metrics om
  CROSS JOIN areas_metrics am
  CROSS JOIN team_metrics tm;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_ceo_metrics TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_initiatives_tenant_created 
  ON initiatives(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_initiatives_tenant_status_progress 
  ON initiatives(tenant_id, status, progress);

CREATE INDEX IF NOT EXISTS idx_objectives_tenant_status 
  ON objectives(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_progress_history_created 
  ON progress_history(created_at DESC);