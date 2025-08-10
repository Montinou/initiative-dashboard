#!/bin/bash

# Script para configurar Foreign Data Wrapper de BigQuery en Supabase

PROJECT_ID="insaight-backend"
DATASET="gestion_iniciativas"
SUPABASE_PROJECT_REF="zkkdnslupqnpioltjpeu"
SUPABASE_DB_URL="postgresql://postgres:bWSg6ONuXWdZsDVP@db.zkkdnslupqnpioltjpeu.supabase.co:5432/postgres"

echo "🔧 Configurando Foreign Data Wrapper para BigQuery en Supabase..."

# 1. Crear credenciales de servicio para BigQuery si no existen
echo "📝 Verificando credenciales de servicio..."
SERVICE_ACCOUNT="supabase-bigquery-fdw@${PROJECT_ID}.iam.gserviceaccount.com"

# Verificar si la cuenta de servicio existe
if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT &>/dev/null; then
    echo "Creando cuenta de servicio..."
    gcloud iam service-accounts create supabase-bigquery-fdw \
        --display-name="Supabase BigQuery FDW" \
        --project=$PROJECT_ID
    
    # Dar permisos de BigQuery
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/bigquery.dataViewer"
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/bigquery.jobUser"
fi

# 2. Generar key JSON para la cuenta de servicio
echo "🔑 Generando credenciales JSON..."
KEY_FILE="/tmp/bigquery-fdw-key.json"
gcloud iam service-accounts keys create $KEY_FILE \
    --iam-account=$SERVICE_ACCOUNT \
    --project=$PROJECT_ID

# 3. Preparar el SQL con las credenciales
echo "📄 Preparando script SQL con credenciales..."

# Escapar el JSON para SQL
ESCAPED_CREDENTIALS=$(cat $KEY_FILE | jq -c . | sed "s/'/\\\\'/g")

cat > /tmp/setup-fdw.sql << EOF
-- Configurar Foreign Data Wrapper para BigQuery
BEGIN;

-- 1. Habilitar extensión
CREATE EXTENSION IF NOT EXISTS wrappers;

-- 2. Eliminar configuración anterior si existe
DROP SERVER IF EXISTS bigquery_server CASCADE;

-- 3. Crear servidor FDW
CREATE SERVER bigquery_server
  FOREIGN DATA WRAPPER bigquery_wrapper
  OPTIONS (
    project_id '${PROJECT_ID}',
    dataset_id '${DATASET}',
    api_endpoint 'https://bigquery.googleapis.com/bigquery/v2',
    credentials '${ESCAPED_CREDENTIALS}'
  );

-- 4. Crear mapeo de usuario
CREATE USER MAPPING IF NOT EXISTS FOR postgres
  SERVER bigquery_server;

-- 5. Crear schema para las foreign tables si no existe
CREATE SCHEMA IF NOT EXISTS bigquery;

-- 6. Importar tablas desde BigQuery
IMPORT FOREIGN SCHEMA ${DATASET}
  FROM SERVER bigquery_server
  INTO bigquery;

-- 7. Crear vistas en schema public para fácil acceso
CREATE OR REPLACE VIEW public.bq_initiatives AS 
SELECT * FROM bigquery.initiatives;

CREATE OR REPLACE VIEW public.bq_activities AS 
SELECT * FROM bigquery.activities;

CREATE OR REPLACE VIEW public.bq_objectives AS 
SELECT * FROM bigquery.objectives;

CREATE OR REPLACE VIEW public.bq_areas AS 
SELECT * FROM bigquery.areas;

CREATE OR REPLACE VIEW public.bq_organizations AS 
SELECT * FROM bigquery.organizations;

CREATE OR REPLACE VIEW public.bq_tenants AS 
SELECT * FROM bigquery.tenants;

-- 8. Vista consolidada para el dashboard
CREATE OR REPLACE VIEW public.bq_dashboard_metrics AS
SELECT 
    t.subdomain,
    COUNT(DISTINCT i.id) as total_initiatives,
    COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) as completed_initiatives,
    COUNT(DISTINCT CASE WHEN i.status = 'in_progress' THEN i.id END) as active_initiatives,
    ROUND(AVG(i.progress)::numeric, 2) as avg_progress,
    COUNT(DISTINCT a.id) as total_activities,
    COUNT(DISTINCT CASE WHEN a.is_completed THEN a.id END) as completed_activities
FROM bigquery.tenants t
LEFT JOIN bigquery.initiatives i ON t.id = i.tenant_id
LEFT JOIN bigquery.activities a ON i.id = a.initiative_id
GROUP BY t.subdomain;

-- 9. Función para obtener datos de iniciativas desde BigQuery
CREATE OR REPLACE FUNCTION get_bigquery_initiatives(
    p_tenant_id TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    title TEXT,
    description TEXT,
    area_name TEXT,
    progress INTEGER,
    status TEXT,
    start_date DATE,
    due_date DATE
) 
LANGUAGE sql
AS \$\$
    SELECT 
        i.id,
        i.title,
        i.description,
        a.name as area_name,
        i.progress,
        i.status,
        i.start_date,
        i.due_date
    FROM bigquery.initiatives i
    LEFT JOIN bigquery.areas a ON i.area_id = a.id
    WHERE (p_tenant_id IS NULL OR i.tenant_id = p_tenant_id)
      AND (p_status IS NULL OR i.status = p_status)
    ORDER BY i.created_at DESC;
\$\$;

-- 10. Función para análisis de rendimiento desde BigQuery
CREATE OR REPLACE FUNCTION analyze_performance_from_bigquery(
    p_tenant_id TEXT DEFAULT NULL,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    metric_name TEXT,
    metric_value NUMERIC
) 
LANGUAGE plpgsql
AS \$\$
BEGIN
    RETURN QUERY
    WITH metrics AS (
        SELECT 
            COUNT(DISTINCT i.id) as total_initiatives,
            COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) as completed,
            COUNT(DISTINCT CASE WHEN i.status = 'on_hold' THEN i.id END) as on_hold,
            AVG(i.progress) as avg_progress,
            COUNT(DISTINCT a.id) as total_activities,
            COUNT(DISTINCT CASE WHEN a.is_completed THEN a.id END) as completed_activities
        FROM bigquery.initiatives i
        LEFT JOIN bigquery.activities a ON i.id = a.initiative_id
        WHERE (p_tenant_id IS NULL OR i.tenant_id = p_tenant_id)
          AND i.created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days
    )
    SELECT 'total_initiatives'::TEXT, total_initiatives::NUMERIC FROM metrics
    UNION ALL
    SELECT 'completed_initiatives'::TEXT, completed::NUMERIC FROM metrics
    UNION ALL
    SELECT 'on_hold_initiatives'::TEXT, on_hold::NUMERIC FROM metrics
    UNION ALL
    SELECT 'average_progress'::TEXT, ROUND(avg_progress::NUMERIC, 2) FROM metrics
    UNION ALL
    SELECT 'total_activities'::TEXT, total_activities::NUMERIC FROM metrics
    UNION ALL
    SELECT 'completed_activities'::TEXT, completed_activities::NUMERIC FROM metrics
    UNION ALL
    SELECT 'completion_rate'::TEXT, 
           ROUND((completed::NUMERIC / NULLIF(total_initiatives, 0) * 100), 2) FROM metrics
    UNION ALL
    SELECT 'activity_completion_rate'::TEXT, 
           ROUND((completed_activities::NUMERIC / NULLIF(total_activities, 0) * 100), 2) FROM metrics;
END;
\$\$;

COMMIT;

-- Verificar que todo funciona
SELECT 'Foreign tables creadas:' as status, COUNT(*) as count 
FROM information_schema.foreign_tables 
WHERE foreign_server_name = 'bigquery_server';

-- Probar una consulta simple
SELECT 'Iniciativas en BigQuery:' as status, COUNT(*) as count 
FROM bigquery.initiatives;
EOF

# 4. Ejecutar el SQL en Supabase
echo "🚀 Ejecutando configuración en Supabase..."
PGPASSWORD=bWSg6ONuXWdZsDVP psql "$SUPABASE_DB_URL" -f /tmp/setup-fdw.sql

# 5. Limpiar archivos temporales
echo "🧹 Limpiando archivos temporales..."
rm -f $KEY_FILE /tmp/setup-fdw.sql

echo "
✅ ¡Configuración completada!

📊 Foreign Data Wrapper configurado:
- Servidor: bigquery_server
- Dataset: ${PROJECT_ID}.${DATASET}
- Schema en Supabase: bigquery

📋 Vistas creadas en schema public:
- bq_initiatives
- bq_activities  
- bq_objectives
- bq_areas
- bq_organizations
- bq_tenants
- bq_dashboard_metrics

🔧 Funciones disponibles:
- get_bigquery_initiatives(tenant_id, status)
- analyze_performance_from_bigquery(tenant_id, days)

📝 Ejemplo de uso:
SELECT * FROM bq_initiatives LIMIT 5;
SELECT * FROM get_bigquery_initiatives('cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', 'in_progress');
SELECT * FROM analyze_performance_from_bigquery(NULL, 30);
"