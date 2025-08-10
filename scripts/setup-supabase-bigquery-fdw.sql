-- Script para configurar Foreign Data Wrappers en Supabase
-- Conecta Supabase con las tablas de BigQuery actualizadas

-- 1. Habilitar la extensión si no está habilitada
CREATE EXTENSION IF NOT EXISTS wrappers;

-- 2. Eliminar el servidor FDW existente si existe (esto también elimina las foreign tables)
DROP SERVER IF EXISTS bigquery_server CASCADE;

-- 3. Crear el servidor FDW para BigQuery
CREATE SERVER bigquery_server
  FOREIGN DATA WRAPPER bigquery_wrapper
  OPTIONS (
    project_id 'insaight-backend',
    dataset_id 'gestion_iniciativas',
    api_endpoint 'https://bigquery.googleapis.com/bigquery/v2',
    -- Necesitarás configurar las credenciales apropiadas
    -- Las credenciales deben estar en formato JSON de service account
    credentials '{}' -- Se debe reemplazar con las credenciales reales
  );

-- 4. Crear el mapeo de usuario (si no existe)
CREATE USER MAPPING IF NOT EXISTS FOR postgres
  SERVER bigquery_server
  OPTIONS (
    credentials '{}' -- Se debe reemplazar con las credenciales reales
  );

-- 5. Importar el esquema de BigQuery
-- Esto creará automáticamente todas las foreign tables
IMPORT FOREIGN SCHEMA gestion_iniciativas
  FROM SERVER bigquery_server
  INTO public;

-- 6. Crear vistas locales para facilitar el acceso
-- Vista para iniciativas con joins
CREATE OR REPLACE VIEW v_initiatives_with_details AS
SELECT 
    i.id,
    i.title,
    i.description,
    i.tenant_id,
    i.area_id,
    a.name as area_name,
    i.progress,
    i.status,
    i.created_by,
    i.start_date,
    i.due_date,
    i.created_at,
    i.updated_at,
    t.subdomain as tenant_subdomain,
    o.name as organization_name
FROM initiatives i
LEFT JOIN areas a ON i.area_id = a.id
LEFT JOIN tenants t ON i.tenant_id = t.id
LEFT JOIN organizations o ON t.organization_id = o.id;

-- Vista para objetivos con progreso
CREATE OR REPLACE VIEW v_objectives_with_progress AS
SELECT 
    o.id,
    o.title,
    o.description,
    o.tenant_id,
    o.area_id,
    a.name as area_name,
    o.progress,
    o.status,
    o.priority,
    o.target_date,
    o.created_by,
    o.created_at,
    o.updated_at,
    COUNT(DISTINCT oi.initiative_id) as initiative_count,
    AVG(i.progress) as avg_initiative_progress
FROM objectives o
LEFT JOIN areas a ON o.area_id = a.id
LEFT JOIN objective_initiatives oi ON o.id = oi.objective_id
LEFT JOIN initiatives i ON oi.initiative_id = i.id
GROUP BY 
    o.id, o.title, o.description, o.tenant_id, o.area_id,
    a.name, o.progress, o.status, o.priority, o.target_date,
    o.created_by, o.created_at, o.updated_at;

-- Vista para actividades con estado de iniciativa
CREATE OR REPLACE VIEW v_activities_with_initiative AS
SELECT 
    a.id,
    a.initiative_id,
    i.title as initiative_title,
    a.title as activity_title,
    a.description,
    a.is_completed,
    a.assigned_to,
    a.created_at,
    a.updated_at,
    i.tenant_id,
    i.area_id,
    i.status as initiative_status,
    i.progress as initiative_progress
FROM activities a
LEFT JOIN initiatives i ON a.initiative_id = i.id;

-- 7. Crear funciones para sincronización bidireccional
-- Función para sincronizar cambios de Supabase a BigQuery
CREATE OR REPLACE FUNCTION sync_to_bigquery()
RETURNS trigger AS $$
BEGIN
    -- Aquí iría la lógica para sincronizar con BigQuery
    -- Por ejemplo, usando pg_net para hacer llamadas HTTP al webhook
    
    -- Log del cambio en la tabla de auditoría
    INSERT INTO wrappers_fdw_stats (
        fdw_name,
        rows_out,
        bytes_out,
        metadata,
        created_at
    ) VALUES (
        'bigquery_sync',
        1,
        octet_length(row_to_json(NEW)::text),
        jsonb_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'record_id', NEW.id
        ),
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Crear triggers para sincronización automática (opcional)
-- Puedes activar estos triggers si quieres sincronización automática

-- CREATE TRIGGER sync_initiatives_to_bigquery
-- AFTER INSERT OR UPDATE OR DELETE ON initiatives
-- FOR EACH ROW EXECUTE FUNCTION sync_to_bigquery();

-- CREATE TRIGGER sync_activities_to_bigquery
-- AFTER INSERT OR UPDATE OR DELETE ON activities
-- FOR EACH ROW EXECUTE FUNCTION sync_to_bigquery();

-- CREATE TRIGGER sync_objectives_to_bigquery
-- AFTER INSERT OR UPDATE OR DELETE ON objectives
-- FOR EACH ROW EXECUTE FUNCTION sync_to_bigquery();

-- 9. Función para consultar datos agregados desde BigQuery
CREATE OR REPLACE FUNCTION get_initiative_analytics(
    p_tenant_id UUID DEFAULT NULL,
    p_area_id UUID DEFAULT NULL,
    p_timeframe INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_initiatives BIGINT,
    completed_initiatives BIGINT,
    in_progress_initiatives BIGINT,
    planning_initiatives BIGINT,
    avg_progress NUMERIC,
    total_activities BIGINT,
    completed_activities BIGINT,
    activity_completion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT i.id) as total_initiatives,
        COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) as completed_initiatives,
        COUNT(DISTINCT CASE WHEN i.status = 'in_progress' THEN i.id END) as in_progress_initiatives,
        COUNT(DISTINCT CASE WHEN i.status = 'planning' THEN i.id END) as planning_initiatives,
        ROUND(AVG(i.progress), 2) as avg_progress,
        COUNT(DISTINCT a.id) as total_activities,
        COUNT(DISTINCT CASE WHEN a.is_completed = true THEN a.id END) as completed_activities,
        ROUND(
            COUNT(DISTINCT CASE WHEN a.is_completed = true THEN a.id END)::NUMERIC / 
            NULLIF(COUNT(DISTINCT a.id), 0) * 100, 
            2
        ) as activity_completion_rate
    FROM initiatives i
    LEFT JOIN activities a ON i.id = a.initiative_id
    WHERE 
        (p_tenant_id IS NULL OR i.tenant_id = p_tenant_id)
        AND (p_area_id IS NULL OR i.area_id = p_area_id)
        AND i.created_at >= CURRENT_DATE - INTERVAL '1 day' * p_timeframe;
END;
$$ LANGUAGE plpgsql;

-- 10. Función para obtener sugerencias de iniciativas basadas en BigQuery
CREATE OR REPLACE FUNCTION suggest_initiatives_from_bigquery(
    p_tenant_id UUID
)
RETURNS TABLE (
    suggestion_type TEXT,
    title TEXT,
    description TEXT,
    area_id UUID,
    area_name TEXT,
    urgency_score INTEGER,
    based_on TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH low_progress_objectives AS (
        SELECT 
            o.id,
            o.title,
            o.area_id,
            a.name as area_name,
            o.progress,
            o.target_date,
            COUNT(oi.initiative_id) as initiative_count
        FROM objectives o
        LEFT JOIN areas a ON o.area_id = a.id
        LEFT JOIN objective_initiatives oi ON o.id = oi.objective_id
        WHERE o.tenant_id = p_tenant_id
            AND o.progress < 50
            AND o.status != 'completed'
        GROUP BY o.id, o.title, o.area_id, a.name, o.progress, o.target_date
        HAVING COUNT(oi.initiative_id) < 2
    ),
    underutilized_areas AS (
        SELECT 
            a.id as area_id,
            a.name as area_name,
            COUNT(i.id) as active_initiatives
        FROM areas a
        LEFT JOIN initiatives i ON a.id = i.area_id 
            AND i.status IN ('planning', 'in_progress')
        WHERE a.tenant_id = p_tenant_id
            AND a.is_active = true
        GROUP BY a.id, a.name
        HAVING COUNT(i.id) < 2
    )
    -- Sugerencias basadas en objetivos con bajo progreso
    SELECT 
        'low_progress_objective' as suggestion_type,
        'Impulsar ' || title as title,
        'Iniciativa para acelerar el objetivo con solo ' || progress || '% de progreso' as description,
        area_id,
        area_name,
        CASE 
            WHEN target_date < CURRENT_DATE + INTERVAL '30 days' THEN 10
            WHEN target_date < CURRENT_DATE + INTERVAL '60 days' THEN 7
            ELSE 5
        END as urgency_score,
        'Objetivo con bajo progreso' as based_on
    FROM low_progress_objectives
    UNION ALL
    -- Sugerencias basadas en áreas subutilizadas
    SELECT 
        'underutilized_area' as suggestion_type,
        'Nueva iniciativa para ' || area_name as title,
        'El área tiene capacidad para más iniciativas (actualmente ' || active_initiatives || ')' as description,
        area_id,
        area_name,
        3 as urgency_score,
        'Área con capacidad disponible' as based_on
    FROM underutilized_areas
    ORDER BY urgency_score DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- 11. Verificar que las foreign tables se crearon correctamente
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.foreign_tables
    WHERE foreign_server_name = 'bigquery_server';
    
    RAISE NOTICE 'Se crearon % foreign tables desde BigQuery', table_count;
END $$;

-- 12. Crear índices para mejorar performance (si es necesario)
-- Nota: Los índices en foreign tables no siempre son efectivos
-- CREATE INDEX IF NOT EXISTS idx_initiatives_tenant ON initiatives(tenant_id);
-- CREATE INDEX IF NOT EXISTS idx_initiatives_area ON initiatives(area_id);
-- CREATE INDEX IF NOT EXISTS idx_activities_initiative ON activities(initiative_id);

COMMENT ON SERVER bigquery_server IS 'Conexión FDW con BigQuery para datos de iniciativas';
COMMENT ON VIEW v_initiatives_with_details IS 'Vista consolidada de iniciativas con información de área y organización';
COMMENT ON VIEW v_objectives_with_progress IS 'Vista de objetivos con métricas de progreso agregadas';
COMMENT ON VIEW v_activities_with_initiative IS 'Vista de actividades con contexto de iniciativa';
COMMENT ON FUNCTION get_initiative_analytics IS 'Obtiene métricas agregadas de iniciativas desde BigQuery';
COMMENT ON FUNCTION suggest_initiatives_from_bigquery IS 'Genera sugerencias inteligentes basadas en datos de BigQuery';