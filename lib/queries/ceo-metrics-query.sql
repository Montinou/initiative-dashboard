-- CEO Metrics Optimized Query
-- This query fetches all CEO dashboard metrics in a single optimized call
-- Can be used to create a database function for better performance

WITH date_range AS (
  SELECT 
    CURRENT_DATE - INTERVAL '30 days' as start_date,
    CURRENT_DATE as end_date
),
initiatives_data AS (
  SELECT 
    i.id,
    i.title,
    i.progress,
    i.status,
    i.start_date,
    i.due_date,
    i.completion_date,
    i.area_id,
    i.tenant_id,
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
  WHERE i.tenant_id = auth.jwt() ->> 'tenant_id'
    AND i.created_at >= (SELECT start_date FROM date_range)
  GROUP BY i.id, i.title, i.progress, i.status, i.start_date, i.due_date, 
           i.completion_date, i.area_id, i.tenant_id, a.name
),
objectives_data AS (
  SELECT 
    o.id,
    o.title,
    o.status,
    o.progress,
    o.area_id,
    o.tenant_id,
    COUNT(oi.initiative_id) as linked_initiatives
  FROM objectives o
  LEFT JOIN objective_initiatives oi ON o.id = oi.objective_id
  WHERE o.tenant_id = auth.jwt() ->> 'tenant_id'
  GROUP BY o.id, o.title, o.status, o.progress, o.area_id, o.tenant_id
),
areas_summary AS (
  SELECT 
    a.id,
    a.name,
    a.manager_id,
    up.full_name as manager_name,
    COUNT(DISTINCT i.id) as total_initiatives,
    COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) as completed_initiatives,
    AVG(i.progress) as avg_progress,
    COUNT(DISTINCT o.id) as total_objectives,
    COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) as completed_objectives,
    COUNT(DISTINCT tm.id) as team_members,
    COUNT(DISTINCT CASE WHEN i.is_at_risk THEN i.id END) as at_risk_count
  FROM areas a
  LEFT JOIN user_profiles up ON a.manager_id = up.id
  LEFT JOIN initiatives_data i ON i.area_id = a.id
  LEFT JOIN objectives_data o ON o.area_id = a.id
  LEFT JOIN user_profiles tm ON tm.area_id = a.id AND tm.is_active = true
  WHERE a.tenant_id = auth.jwt() ->> 'tenant_id'
    AND a.is_active = true
  GROUP BY a.id, a.name, a.manager_id, up.full_name
),
user_summary AS (
  SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'CEO' THEN 1 END) as ceo_count,
    COUNT(CASE WHEN role = 'Admin' THEN 1 END) as admin_count,
    COUNT(CASE WHEN role = 'Manager' THEN 1 END) as manager_count
  FROM user_profiles
  WHERE tenant_id = auth.jwt() ->> 'tenant_id'
    AND is_active = true
)
SELECT 
  -- Core Metrics
  (SELECT COUNT(*) FROM initiatives_data) as total_initiatives,
  (SELECT COUNT(*) FROM initiatives_data WHERE status = 'completed') as completed_initiatives,
  (SELECT COUNT(*) FROM initiatives_data WHERE status = 'in_progress') as in_progress_initiatives,
  (SELECT COUNT(*) FROM initiatives_data WHERE is_overdue) as overdue_initiatives,
  (SELECT AVG(progress) FROM initiatives_data)::INT as average_progress,
  
  -- Objectives Metrics
  (SELECT COUNT(*) FROM objectives_data) as total_objectives,
  (SELECT COUNT(*) FROM objectives_data WHERE status = 'completed') as completed_objectives,
  (SELECT COUNT(*) FROM objectives_data WHERE progress >= 75 AND status != 'completed') as on_track_objectives,
  
  -- Organization Metrics
  (SELECT COUNT(*) FROM areas_summary) as active_areas,
  (SELECT total_users FROM user_summary) as team_members,
  
  -- Risk Metrics
  (SELECT COUNT(*) FROM initiatives_data WHERE is_at_risk) as at_risk_count,
  (SELECT 
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(CASE WHEN status = 'completed' THEN 1 END)::FLOAT / COUNT(*)::FLOAT * 100)::INT
      ELSE 0 
    END 
   FROM initiatives_data) as completion_rate,
  
  -- Performance Score (weighted calculation)
  (SELECT 
    CASE
      WHEN COUNT(*) > 0 THEN
        (
          (COUNT(CASE WHEN status = 'completed' THEN 1 END)::FLOAT / COUNT(*)::FLOAT * 0.4) +
          (AVG(progress) / 100 * 0.3) +
          ((1 - COUNT(CASE WHEN is_at_risk THEN 1 END)::FLOAT / COUNT(*)::FLOAT) * 0.3)
        ) * 100
      ELSE 0
    END::INT
   FROM initiatives_data) as performance_score,
  
  -- Risk Score
  (SELECT COUNT(*) FROM initiatives_data WHERE is_at_risk OR is_overdue) as risk_score,
  
  -- Area Breakdown (as JSON)
  (SELECT json_agg(
    json_build_object(
      'id', id,
      'name', name,
      'manager', manager_name,
      'totalInitiatives', total_initiatives,
      'completedInitiatives', completed_initiatives,
      'averageProgress', COALESCE(avg_progress::INT, 0),
      'totalObjectives', total_objectives,
      'completedObjectives', completed_objectives,
      'teamMembers', team_members,
      'atRisk', at_risk_count
    )
  ) FROM areas_summary) as area_breakdown,
  
  -- Recent Activity (last 5 progress updates)
  (SELECT json_agg(
    json_build_object(
      'id', ph.id,
      'title', i.title || ' progress updated',
      'description', COALESCE(ph.notes, 'Progress: ' || 
        ROUND((ph.completed_activities_count::FLOAT / NULLIF(ph.total_activities_count, 0) * 100))::TEXT || '%'),
      'area', a.name,
      'timestamp', ph.created_at,
      'updatedBy', up.full_name
    ) ORDER BY ph.created_at DESC
  )
  FROM (
    SELECT * FROM progress_history 
    WHERE initiative_id IN (SELECT id FROM initiatives_data)
    ORDER BY created_at DESC 
    LIMIT 5
  ) ph
  JOIN initiatives i ON ph.initiative_id = i.id
  LEFT JOIN areas a ON i.area_id = a.id
  LEFT JOIN user_profiles up ON ph.updated_by = up.id
  ) as recent_activity;