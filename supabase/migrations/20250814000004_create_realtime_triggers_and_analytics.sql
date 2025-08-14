-- Migration: Create real-time triggers and advanced analytics functions
-- Date: 2025-08-14
-- Description: Adds real-time update triggers and advanced analytics capabilities

-- =========================================
-- 1. REAL-TIME UPDATE TRIGGERS
-- =========================================

-- Function to notify dashboard updates
CREATE OR REPLACE FUNCTION notify_dashboard_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_channel text;
  v_payload jsonb;
BEGIN
  -- Determine the channel based on the table
  v_channel := 'dashboard_' || TG_TABLE_NAME;
  
  -- Build the payload
  v_payload := jsonb_build_object(
    'operation', TG_OP,
    'table', TG_TABLE_NAME,
    'timestamp', NOW(),
    'record', CASE 
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      ELSE row_to_json(NEW)
    END
  );
  
  -- Add tenant_id to payload if available
  IF TG_TABLE_NAME IN ('initiatives', 'objectives', 'areas') THEN
    IF TG_OP = 'DELETE' THEN
      v_payload := v_payload || jsonb_build_object('tenant_id', OLD.tenant_id);
    ELSE
      v_payload := v_payload || jsonb_build_object('tenant_id', NEW.tenant_id);
    END IF;
  END IF;
  
  -- Send notification
  PERFORM pg_notify(v_channel, v_payload::text);
  
  RETURN NEW;
END;
$$;

-- Create triggers for real-time dashboard updates
CREATE TRIGGER initiatives_dashboard_update
  AFTER INSERT OR UPDATE OR DELETE ON public.initiatives
  FOR EACH ROW
  EXECUTE FUNCTION notify_dashboard_update();

CREATE TRIGGER objectives_dashboard_update
  AFTER INSERT OR UPDATE OR DELETE ON public.objectives
  FOR EACH ROW
  EXECUTE FUNCTION notify_dashboard_update();

CREATE TRIGGER activities_dashboard_update
  AFTER INSERT OR UPDATE OR DELETE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION notify_dashboard_update();

-- =========================================
-- 2. TREND ANALYSIS FUNCTIONS
-- =========================================

-- Function to calculate progress trends
CREATE OR REPLACE FUNCTION calculate_progress_trends(
  p_entity_type text, -- 'initiative' or 'objective'
  p_entity_id uuid,
  p_period_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_trend_data jsonb;
  v_current_progress integer;
  v_previous_progress integer;
  v_trend_direction text;
  v_trend_percentage numeric;
BEGIN
  IF p_entity_type = 'initiative' THEN
    -- Get current progress
    SELECT progress INTO v_current_progress
    FROM public.initiatives
    WHERE id = p_entity_id;
    
    -- Get historical progress data
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', created_at::date,
        'progress', 
          CASE 
            WHEN completed_activities_count > 0 AND total_activities_count > 0
            THEN ROUND((completed_activities_count::numeric / total_activities_count) * 100)
            ELSE 0
          END,
        'notes', notes
      ) ORDER BY created_at DESC
    ) INTO v_trend_data
    FROM public.progress_history
    WHERE initiative_id = p_entity_id
      AND created_at >= CURRENT_DATE - INTERVAL '1 day' * p_period_days;
    
  ELSIF p_entity_type = 'objective' THEN
    -- Get current progress
    SELECT progress INTO v_current_progress
    FROM public.objectives
    WHERE id = p_entity_id;
    
    -- Calculate historical trend from linked initiatives
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', date_series::date,
        'progress', COALESCE(ROUND(AVG(i.progress)), 0)
      ) ORDER BY date_series DESC
    ) INTO v_trend_data
    FROM generate_series(
      CURRENT_DATE - INTERVAL '1 day' * p_period_days,
      CURRENT_DATE,
      INTERVAL '1 day'
    ) date_series
    LEFT JOIN public.objective_initiatives oi ON oi.objective_id = p_entity_id
    LEFT JOIN public.initiatives i ON oi.initiative_id = i.id
    GROUP BY date_series;
  END IF;
  
  -- Calculate trend direction and percentage
  IF v_trend_data IS NOT NULL AND jsonb_array_length(v_trend_data) > 1 THEN
    v_previous_progress := (v_trend_data->0->>'progress')::integer;
    
    IF v_current_progress > v_previous_progress THEN
      v_trend_direction := 'up';
    ELSIF v_current_progress < v_previous_progress THEN
      v_trend_direction := 'down';
    ELSE
      v_trend_direction := 'stable';
    END IF;
    
    IF v_previous_progress > 0 THEN
      v_trend_percentage := ROUND(
        ((v_current_progress - v_previous_progress)::numeric / v_previous_progress) * 100,
        2
      );
    ELSE
      v_trend_percentage := 100;
    END IF;
  ELSE
    v_trend_direction := 'stable';
    v_trend_percentage := 0;
  END IF;
  
  v_result := jsonb_build_object(
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'current_progress', v_current_progress,
    'trend_direction', v_trend_direction,
    'trend_percentage', v_trend_percentage,
    'historical_data', COALESCE(v_trend_data, '[]'::jsonb)
  );
  
  RETURN v_result;
END;
$$;

-- =========================================
-- 3. PREDICTIVE ANALYTICS FUNCTIONS
-- =========================================

-- Function to predict completion date based on current velocity
CREATE OR REPLACE FUNCTION predict_completion_date(
  p_initiative_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_current_progress integer;
  v_start_date date;
  v_due_date date;
  v_days_elapsed integer;
  v_days_total integer;
  v_velocity numeric;
  v_predicted_date date;
  v_confidence text;
  v_is_on_track boolean;
BEGIN
  -- Get initiative details
  SELECT 
    progress,
    start_date,
    due_date
  INTO 
    v_current_progress,
    v_start_date,
    v_due_date
  FROM public.initiatives
  WHERE id = p_initiative_id;
  
  -- Handle null dates
  IF v_start_date IS NULL THEN
    v_start_date := CURRENT_DATE - INTERVAL '30 days';
  END IF;
  
  -- Calculate days elapsed and total
  v_days_elapsed := GREATEST(1, CURRENT_DATE - v_start_date);
  
  IF v_due_date IS NOT NULL THEN
    v_days_total := v_due_date - v_start_date;
  ELSE
    v_days_total := 90; -- Default to 90 days if no due date
  END IF;
  
  -- Calculate velocity (progress per day)
  IF v_current_progress > 0 AND v_days_elapsed > 0 THEN
    v_velocity := v_current_progress::numeric / v_days_elapsed;
    
    -- Predict completion date
    IF v_velocity > 0 THEN
      v_predicted_date := CURRENT_DATE + INTERVAL '1 day' * CEIL((100 - v_current_progress) / v_velocity);
    ELSE
      v_predicted_date := NULL;
    END IF;
    
    -- Determine confidence level
    IF v_days_elapsed < 7 THEN
      v_confidence := 'low';
    ELSIF v_days_elapsed < 30 THEN
      v_confidence := 'medium';
    ELSE
      v_confidence := 'high';
    END IF;
  ELSE
    v_velocity := 0;
    v_predicted_date := NULL;
    v_confidence := 'none';
  END IF;
  
  -- Check if on track
  IF v_due_date IS NOT NULL AND v_predicted_date IS NOT NULL THEN
    v_is_on_track := v_predicted_date <= v_due_date;
  ELSE
    v_is_on_track := NULL;
  END IF;
  
  v_result := jsonb_build_object(
    'initiative_id', p_initiative_id,
    'current_progress', v_current_progress,
    'velocity_per_day', ROUND(v_velocity, 2),
    'predicted_completion_date', v_predicted_date,
    'due_date', v_due_date,
    'is_on_track', v_is_on_track,
    'days_ahead_or_behind', CASE 
      WHEN v_due_date IS NOT NULL AND v_predicted_date IS NOT NULL 
      THEN v_due_date - v_predicted_date
      ELSE NULL
    END,
    'confidence_level', v_confidence,
    'recommendation', CASE
      WHEN v_is_on_track = false THEN 'Needs acceleration - consider adding resources or reducing scope'
      WHEN v_is_on_track = true AND v_velocity > 2 THEN 'Excellent progress - maintain current pace'
      WHEN v_is_on_track = true THEN 'On track - continue monitoring'
      ELSE 'Insufficient data for prediction'
    END
  );
  
  RETURN v_result;
END;
$$;

-- =========================================
-- 4. WORKLOAD BALANCING FUNCTIONS
-- =========================================

-- Function to analyze and suggest workload balancing
CREATE OR REPLACE FUNCTION analyze_workload_balance(
  p_area_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_team_workload jsonb;
  v_avg_workload numeric;
  v_std_deviation numeric;
  v_recommendations jsonb;
BEGIN
  -- Get team workload distribution
  WITH team_load AS (
    SELECT 
      up.id as user_id,
      up.full_name,
      COUNT(a.id) FILTER (WHERE a.is_completed = false) as active_tasks,
      COUNT(a.id) as total_tasks,
      AVG(CASE WHEN i.due_date IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (i.due_date - CURRENT_DATE)) / 86400 
        ELSE 30 
      END) as avg_days_to_deadline
    FROM public.user_profiles up
    LEFT JOIN public.activities a ON up.id = a.assigned_to
    LEFT JOIN public.initiatives i ON a.initiative_id = i.id
    WHERE (p_area_id IS NULL OR up.area_id = p_area_id)
      AND up.role IN ('Manager', 'Admin')
    GROUP BY up.id, up.full_name
  ),
  stats AS (
    SELECT 
      AVG(active_tasks) as avg_workload,
      STDDEV(active_tasks) as std_deviation
    FROM team_load
  )
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'user_id', tl.user_id,
        'full_name', tl.full_name,
        'active_tasks', tl.active_tasks,
        'total_tasks', tl.total_tasks,
        'avg_days_to_deadline', ROUND(tl.avg_days_to_deadline),
        'workload_level', CASE
          WHEN tl.active_tasks > s.avg_workload + s.std_deviation THEN 'overloaded'
          WHEN tl.active_tasks < s.avg_workload - s.std_deviation THEN 'underutilized'
          ELSE 'balanced'
        END
      ) ORDER BY tl.active_tasks DESC
    ),
    s.avg_workload,
    s.std_deviation
  INTO v_team_workload, v_avg_workload, v_std_deviation
  FROM team_load tl, stats s
  GROUP BY s.avg_workload, s.std_deviation;
  
  -- Generate recommendations
  SELECT jsonb_agg(
    CASE
      WHEN (member->>'workload_level') = 'overloaded' THEN
        jsonb_build_object(
          'type', 'redistribute',
          'user_id', member->>'user_id',
          'full_name', member->>'full_name',
          'action', 'Redistribute tasks from this user',
          'tasks_to_redistribute', GREATEST(0, (member->>'active_tasks')::integer - CEIL(v_avg_workload))
        )
      WHEN (member->>'workload_level') = 'underutilized' THEN
        jsonb_build_object(
          'type', 'assign_more',
          'user_id', member->>'user_id',
          'full_name', member->>'full_name',
          'action', 'Can take on additional tasks',
          'capacity', CEIL(v_avg_workload) - (member->>'active_tasks')::integer
        )
      ELSE NULL
    END
  ) FILTER (WHERE (member->>'workload_level') != 'balanced')
  INTO v_recommendations
  FROM jsonb_array_elements(v_team_workload) member;
  
  v_result := jsonb_build_object(
    'area_id', p_area_id,
    'team_workload', v_team_workload,
    'average_workload', ROUND(v_avg_workload, 1),
    'standard_deviation', ROUND(v_std_deviation, 1),
    'balance_score', CASE
      WHEN v_std_deviation < 2 THEN 'excellent'
      WHEN v_std_deviation < 4 THEN 'good'
      WHEN v_std_deviation < 6 THEN 'fair'
      ELSE 'poor'
    END,
    'recommendations', COALESCE(v_recommendations, '[]'::jsonb)
  );
  
  RETURN v_result;
END;
$$;

-- =========================================
-- 5. RISK ASSESSMENT FUNCTIONS
-- =========================================

-- Function to identify at-risk initiatives
CREATE OR REPLACE FUNCTION identify_at_risk_initiatives(
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH risk_analysis AS (
    SELECT 
      i.id,
      i.title,
      i.progress,
      i.due_date,
      i.status,
      a.name as area_name,
      -- Risk factors
      CASE WHEN i.due_date < CURRENT_DATE AND i.status != 'completed' THEN 1 ELSE 0 END as is_overdue,
      CASE WHEN i.due_date <= CURRENT_DATE + INTERVAL '7 days' AND i.progress < 80 THEN 1 ELSE 0 END as deadline_approaching,
      CASE WHEN i.progress < 
        (EXTRACT(EPOCH FROM (CURRENT_DATE - i.start_date)) / 
         EXTRACT(EPOCH FROM (COALESCE(i.due_date, CURRENT_DATE + 90) - i.start_date))) * 100
      THEN 1 ELSE 0 END as behind_schedule,
      CASE WHEN i.status = 'on_hold' THEN 1 ELSE 0 END as is_on_hold,
      -- Calculate days to deadline
      EXTRACT(EPOCH FROM (i.due_date - CURRENT_DATE)) / 86400 as days_to_deadline,
      -- Get activity completion rate
      (SELECT COUNT(*) FILTER (WHERE is_completed = true)::numeric / GREATEST(COUNT(*), 1) * 100
       FROM public.activities WHERE initiative_id = i.id) as activity_completion_rate
    FROM public.initiatives i
    LEFT JOIN public.areas a ON i.area_id = a.id
    WHERE i.tenant_id = p_tenant_id
      AND i.status NOT IN ('completed', 'planning')
  ),
  risk_scoring AS (
    SELECT 
      *,
      -- Calculate risk score (0-100, higher is riskier)
      (
        is_overdue * 40 +
        deadline_approaching * 25 +
        behind_schedule * 20 +
        is_on_hold * 10 +
        CASE 
          WHEN activity_completion_rate < 30 THEN 5
          WHEN activity_completion_rate < 50 THEN 3
          ELSE 0
        END
      ) as risk_score,
      -- Determine risk level
      CASE
        WHEN is_overdue = 1 THEN 'critical'
        WHEN deadline_approaching = 1 AND progress < 50 THEN 'high'
        WHEN behind_schedule = 1 THEN 'medium'
        WHEN is_on_hold = 1 THEN 'medium'
        ELSE 'low'
      END as risk_level,
      -- Generate mitigation suggestions
      CASE
        WHEN is_overdue = 1 THEN 'Immediate action required - initiative is overdue'
        WHEN deadline_approaching = 1 AND progress < 50 THEN 'Accelerate progress - deadline approaching with low completion'
        WHEN behind_schedule = 1 THEN 'Review resource allocation - progress behind schedule'
        WHEN is_on_hold = 1 THEN 'Resume or reassess - initiative on hold'
        WHEN activity_completion_rate < 30 THEN 'Focus on completing activities'
        ELSE 'Monitor progress'
      END as mitigation_suggestion
    FROM risk_analysis
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'title', title,
      'area_name', area_name,
      'progress', progress,
      'due_date', due_date,
      'days_to_deadline', ROUND(days_to_deadline),
      'activity_completion_rate', ROUND(activity_completion_rate),
      'risk_score', risk_score,
      'risk_level', risk_level,
      'risk_factors', jsonb_build_object(
        'is_overdue', is_overdue = 1,
        'deadline_approaching', deadline_approaching = 1,
        'behind_schedule', behind_schedule = 1,
        'is_on_hold', is_on_hold = 1,
        'low_activity_completion', activity_completion_rate < 50
      ),
      'mitigation_suggestion', mitigation_suggestion
    ) ORDER BY risk_score DESC
  ) INTO v_result
  FROM risk_scoring
  WHERE risk_score > 0;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- =========================================
-- 6. ACHIEVEMENT TRACKING FUNCTIONS
-- =========================================

-- Function to calculate achievements and milestones
CREATE OR REPLACE FUNCTION calculate_achievements(
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
  v_achievements jsonb[];
  v_achievement jsonb;
BEGIN
  -- Default to current month if no period specified
  IF p_period_start IS NULL THEN
    p_period_start := date_trunc('month', CURRENT_DATE)::date;
  END IF;
  
  IF p_period_end IS NULL THEN
    p_period_end := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date;
  END IF;
  
  -- Check for 100% completion achievements
  SELECT jsonb_build_object(
    'type', 'perfect_completion',
    'title', 'Perfect Completion',
    'description', format('%s initiatives completed with 100%% progress', COUNT(*)),
    'count', COUNT(*),
    'date', MAX(completion_date)
  ) INTO v_achievement
  FROM public.initiatives
  WHERE tenant_id = p_tenant_id
    AND status = 'completed'
    AND progress = 100
    AND completion_date BETWEEN p_period_start AND p_period_end;
  
  IF (v_achievement->>'count')::integer > 0 THEN
    v_achievements := array_append(v_achievements, v_achievement);
  END IF;
  
  -- Check for early completion achievements
  SELECT jsonb_build_object(
    'type', 'early_completion',
    'title', 'Ahead of Schedule',
    'description', format('%s initiatives completed before deadline', COUNT(*)),
    'count', COUNT(*),
    'avg_days_early', ROUND(AVG(EXTRACT(EPOCH FROM (due_date - completion_date)) / 86400))
  ) INTO v_achievement
  FROM public.initiatives
  WHERE tenant_id = p_tenant_id
    AND status = 'completed'
    AND completion_date < due_date
    AND completion_date BETWEEN p_period_start AND p_period_end;
  
  IF (v_achievement->>'count')::integer > 0 THEN
    v_achievements := array_append(v_achievements, v_achievement);
  END IF;
  
  -- Check for team collaboration achievements
  SELECT jsonb_build_object(
    'type', 'team_collaboration',
    'title', 'Team Collaboration',
    'description', format('%s cross-area initiatives completed', COUNT(DISTINCT i.id)),
    'count', COUNT(DISTINCT i.id)
  ) INTO v_achievement
  FROM public.initiatives i
  WHERE i.tenant_id = p_tenant_id
    AND i.status = 'completed'
    AND EXISTS (
      SELECT 1 FROM public.activities a
      INNER JOIN public.user_profiles up ON a.assigned_to = up.id
      WHERE a.initiative_id = i.id
        AND up.area_id != i.area_id
    )
    AND i.completion_date BETWEEN p_period_start AND p_period_end;
  
  IF (v_achievement->>'count')::integer > 0 THEN
    v_achievements := array_append(v_achievements, v_achievement);
  END IF;
  
  -- Check for high priority objective completion
  SELECT jsonb_build_object(
    'type', 'high_priority_completion',
    'title', 'Strategic Success',
    'description', format('%s high-priority objectives achieved', COUNT(*)),
    'count', COUNT(*)
  ) INTO v_achievement
  FROM public.objectives
  WHERE tenant_id = p_tenant_id
    AND status = 'completed'
    AND priority = 'high'
    AND updated_at BETWEEN p_period_start AND p_period_end;
  
  IF (v_achievement->>'count')::integer > 0 THEN
    v_achievements := array_append(v_achievements, v_achievement);
  END IF;
  
  v_result := jsonb_build_object(
    'period', jsonb_build_object(
      'start', p_period_start,
      'end', p_period_end
    ),
    'achievements', COALESCE(array_to_json(v_achievements)::jsonb, '[]'::jsonb),
    'total_achievements', COALESCE(array_length(v_achievements, 1), 0)
  );
  
  RETURN v_result;
END;
$$;

-- =========================================
-- 7. GRANT PERMISSIONS
-- =========================================

GRANT EXECUTE ON FUNCTION notify_dashboard_update TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_progress_trends TO authenticated;
GRANT EXECUTE ON FUNCTION predict_completion_date TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_workload_balance TO authenticated;
GRANT EXECUTE ON FUNCTION identify_at_risk_initiatives TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_achievements TO authenticated;

-- =========================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =========================================

COMMENT ON FUNCTION notify_dashboard_update IS 'Sends real-time notifications for dashboard updates';
COMMENT ON FUNCTION calculate_progress_trends IS 'Analyzes historical progress trends for initiatives and objectives';
COMMENT ON FUNCTION predict_completion_date IS 'Predicts completion date based on current velocity';
COMMENT ON FUNCTION analyze_workload_balance IS 'Analyzes and suggests workload balancing across team members';
COMMENT ON FUNCTION identify_at_risk_initiatives IS 'Identifies initiatives at risk of missing deadlines';
COMMENT ON FUNCTION calculate_achievements IS 'Tracks and celebrates team achievements and milestones';