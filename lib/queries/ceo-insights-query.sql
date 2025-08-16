-- Comprehensive CEO Dashboard Data Query for AI Insights Generation
-- This query collects all relevant data visible in the CEO dashboard
-- to provide complete context for AI-powered insights

WITH tenant_info AS (
  SELECT 
    t.id as tenant_id,
    t.subdomain,
    o.name as organization_name,
    o.industry,
    o.company_size
  FROM tenants t
  JOIN organizations o ON t.organization_id = o.id
  WHERE t.id = $1 -- tenant_id parameter
),

-- Overall metrics
overall_metrics AS (
  SELECT 
    COUNT(DISTINCT i.id) as total_initiatives,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'completed') as completed_initiatives,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'in_progress') as in_progress_initiatives,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'on_hold') as on_hold_initiatives,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'planning') as planning_initiatives,
    AVG(i.progress) as average_progress,
    COUNT(DISTINCT o.id) as total_objectives,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'completed') as completed_objectives,
    COUNT(DISTINCT a.id) as total_areas,
    COUNT(DISTINCT up.id) as total_team_members,
    COUNT(DISTINCT act.id) as total_activities,
    COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true) as completed_activities
  FROM initiatives i
  LEFT JOIN objectives o ON o.tenant_id = i.tenant_id
  LEFT JOIN areas a ON a.tenant_id = i.tenant_id
  LEFT JOIN user_profiles up ON up.tenant_id = i.tenant_id
  LEFT JOIN activities act ON act.initiative_id = i.id
  WHERE i.tenant_id = $1
),

-- Area performance breakdown
area_performance AS (
  SELECT 
    a.id,
    a.name as area_name,
    a.description as area_description,
    up.full_name as manager_name,
    COUNT(DISTINCT i.id) as initiative_count,
    AVG(i.progress) as avg_progress,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'completed') as completed_count,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'in_progress') as in_progress_count,
    COUNT(DISTINCT i.id) FILTER (WHERE i.due_date < CURRENT_DATE AND i.status != 'completed') as overdue_count,
    COUNT(DISTINCT o.id) as objective_count,
    COUNT(DISTINCT act.id) as activity_count,
    COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true) as completed_activities
  FROM areas a
  LEFT JOIN initiatives i ON i.area_id = a.id
  LEFT JOIN objectives o ON o.area_id = a.id
  LEFT JOIN activities act ON act.initiative_id = i.id
  LEFT JOIN user_profiles up ON up.id = a.manager_id
  WHERE a.tenant_id = $1
  GROUP BY a.id, a.name, a.description, up.full_name
),

-- Time-based trends (last 30 days)
progress_trends AS (
  SELECT 
    DATE(ph.created_at) as date,
    COUNT(DISTINCT ph.initiative_id) as initiatives_updated,
    AVG(i.progress) as daily_avg_progress
  FROM progress_history ph
  JOIN initiatives i ON i.id = ph.initiative_id
  WHERE i.tenant_id = $1
    AND ph.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(ph.created_at)
  ORDER BY date DESC
),

-- Risk analysis
at_risk_initiatives AS (
  SELECT 
    i.id,
    i.title,
    i.progress,
    i.due_date,
    a.name as area_name,
    CASE 
      WHEN i.due_date < CURRENT_DATE AND i.status != 'completed' THEN 'overdue'
      WHEN i.due_date < CURRENT_DATE + INTERVAL '7 days' AND i.progress < 80 THEN 'high_risk'
      WHEN i.due_date < CURRENT_DATE + INTERVAL '14 days' AND i.progress < 60 THEN 'medium_risk'
      WHEN i.progress < 30 AND i.created_at < CURRENT_DATE - INTERVAL '30 days' THEN 'stalled'
      ELSE 'low_risk'
    END as risk_level,
    CURRENT_DATE - i.due_date as days_overdue
  FROM initiatives i
  JOIN areas a ON a.id = i.area_id
  WHERE i.tenant_id = $1
    AND i.status NOT IN ('completed', 'on_hold')
    AND (
      i.due_date < CURRENT_DATE + INTERVAL '14 days'
      OR (i.progress < 30 AND i.created_at < CURRENT_DATE - INTERVAL '30 days')
    )
),

-- Team performance
team_performance AS (
  SELECT 
    up.id,
    up.full_name,
    up.role,
    up.email,
    a.name as area_name,
    COUNT(DISTINCT act.id) as assigned_activities,
    COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true) as completed_activities,
    COUNT(DISTINCT i.id) as initiatives_involved,
    AVG(i.progress) as avg_initiative_progress
  FROM user_profiles up
  LEFT JOIN areas a ON a.id = up.area_id
  LEFT JOIN activities act ON act.assigned_to = up.id
  LEFT JOIN initiatives i ON i.created_by = up.id OR i.area_id = up.area_id
  WHERE up.tenant_id = $1
  GROUP BY up.id, up.full_name, up.role, up.email, a.name
),

-- Recent achievements (last 7 days)
recent_achievements AS (
  SELECT 
    'initiative_completed' as achievement_type,
    i.title as description,
    i.updated_at as achieved_at,
    a.name as area_name
  FROM initiatives i
  JOIN areas a ON a.id = i.area_id
  WHERE i.tenant_id = $1
    AND i.status = 'completed'
    AND i.completion_date >= CURRENT_DATE - INTERVAL '7 days'
  
  UNION ALL
  
  SELECT 
    'objective_completed' as achievement_type,
    o.title as description,
    o.updated_at as achieved_at,
    a.name as area_name
  FROM objectives o
  LEFT JOIN areas a ON a.id = o.area_id
  WHERE o.tenant_id = $1
    AND o.status = 'completed'
    AND o.updated_at >= CURRENT_DATE - INTERVAL '7 days'
),

-- Upcoming milestones (next 14 days)
upcoming_milestones AS (
  SELECT 
    i.title,
    i.due_date,
    i.progress,
    a.name as area_name,
    i.due_date - CURRENT_DATE as days_until_due
  FROM initiatives i
  JOIN areas a ON a.id = i.area_id
  WHERE i.tenant_id = $1
    AND i.status != 'completed'
    AND i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
  ORDER BY i.due_date ASC
),

-- Quarterly comparison
quarterly_comparison AS (
  SELECT 
    q.quarter_name,
    q.start_date,
    q.end_date,
    COUNT(DISTINCT i.id) as initiative_count,
    AVG(i.progress) as avg_progress,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'completed') as completed_count
  FROM quarters q
  LEFT JOIN objective_quarters oq ON oq.quarter_id = q.id
  LEFT JOIN objective_initiatives oi ON oi.objective_id = oq.objective_id
  LEFT JOIN initiatives i ON i.id = oi.initiative_id
  WHERE q.tenant_id = $1
    AND q.start_date <= CURRENT_DATE
    AND q.end_date >= CURRENT_DATE - INTERVAL '1 year'
  GROUP BY q.quarter_name, q.start_date, q.end_date
  ORDER BY q.start_date DESC
)

-- Final result combining all data
SELECT 
  jsonb_build_object(
    'tenant_info', (SELECT row_to_json(tenant_info) FROM tenant_info),
    'overall_metrics', (SELECT row_to_json(overall_metrics) FROM overall_metrics),
    'area_performance', (SELECT jsonb_agg(row_to_json(ap)) FROM area_performance ap),
    'progress_trends', (SELECT jsonb_agg(row_to_json(pt)) FROM progress_trends pt),
    'at_risk_initiatives', (SELECT jsonb_agg(row_to_json(ari)) FROM at_risk_initiatives ari),
    'team_performance', (SELECT jsonb_agg(row_to_json(tp)) FROM team_performance tp WHERE tp.role IN ('Manager', 'CEO', 'Admin')),
    'recent_achievements', (SELECT jsonb_agg(row_to_json(ra)) FROM recent_achievements ra LIMIT 10),
    'upcoming_milestones', (SELECT jsonb_agg(row_to_json(um)) FROM upcoming_milestones um LIMIT 10),
    'quarterly_comparison', (SELECT jsonb_agg(row_to_json(qc)) FROM quarterly_comparison qc),
    'generated_at', CURRENT_TIMESTAMP,
    'data_period', jsonb_build_object(
      'from', CURRENT_DATE - INTERVAL '30 days',
      'to', CURRENT_DATE
    )
  ) as dashboard_data;