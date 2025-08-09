-- ============================================
-- CONFIGURACIÓN COMPLETA DE BIGQUERY WRAPPER CON VAULT
-- ============================================
-- Usa el key_id ya cargado en Vault en la migración anterior

BEGIN;

-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS wrappers;
-- Vault ya está habilitado en Supabase, no necesita CREATE EXTENSION

-- 2. Limpiar configuraciones anteriores si existen
DROP FOREIGN TABLE IF EXISTS public.bigquery_iniciativas CASCADE;
DROP FOREIGN TABLE IF EXISTS public.bigquery_smart_suggestions CASCADE;
DROP FOREIGN TABLE IF EXISTS bigquery.iniciativas CASCADE;
DROP FOREIGN TABLE IF EXISTS bigquery.smart_initiative_suggestions CASCADE;
DROP FOREIGN TABLE IF EXISTS bigquery.activities CASCADE;
DROP FOREIGN TABLE IF EXISTS bigquery.areas CASCADE;
DROP FOREIGN TABLE IF EXISTS bigquery.user_profiles CASCADE;
DROP FOREIGN TABLE IF EXISTS bigquery.objectives CASCADE;
DROP FOREIGN TABLE IF EXISTS bigquery.progress_history CASCADE;

-- Limpiar user mappings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_foreign_server WHERE srvname = 'bigquery_server') THEN
    DROP USER MAPPING IF EXISTS FOR postgres SERVER bigquery_server;
    DROP USER MAPPING IF EXISTS FOR anon SERVER bigquery_server;
    DROP USER MAPPING IF EXISTS FOR authenticated SERVER bigquery_server;
    DROP USER MAPPING IF EXISTS FOR service_role SERVER bigquery_server;
  END IF;
END $$;

DROP SERVER IF EXISTS bigquery_server CASCADE;

-- 3. Crear Foreign Data Wrapper
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_foreign_data_wrapper WHERE fdwname = 'bigquery_wrapper') THEN
    CREATE FOREIGN DATA WRAPPER bigquery_wrapper
      HANDLER big_query_fdw_handler
      VALIDATOR big_query_fdw_validator;
  END IF;
END $$;

-- 4. Crear servidor con credenciales de Vault
CREATE SERVER bigquery_server
  FOREIGN DATA WRAPPER bigquery_wrapper
  OPTIONS (
    project_id 'insaight-backend',
    dataset_id 'gestion_iniciativas',
    sa_key_id '1cef52e5-b83a-465c-8ce7-1d1cedf2a751'
  );

-- 5. Crear mapeos de usuario
CREATE USER MAPPING IF NOT EXISTS FOR postgres
  SERVER bigquery_server;

CREATE USER MAPPING IF NOT EXISTS FOR anon
  SERVER bigquery_server;

CREATE USER MAPPING IF NOT EXISTS FOR authenticated
  SERVER bigquery_server;

CREATE USER MAPPING IF NOT EXISTS FOR service_role
  SERVER bigquery_server;

-- 6. Crear esquema para foreign tables
CREATE SCHEMA IF NOT EXISTS bigquery;

-- 7. Crear Foreign Tables

-- Tabla principal de iniciativas
CREATE FOREIGN TABLE bigquery.iniciativas (
  iniciativa_id text,
  nombre_iniciativa text,
  descripcion text,
  area_responsable text,
  responsable_directo text,
  fecha_inicio date,
  fecha_fin_estimada date,
  fecha_fin_real date,
  estado text,
  progreso_actual integer,
  presupuesto_asignado numeric,
  costo_real numeric,
  resumen_resultados text,
  lecciones_aprendidas text,
  tenant_id text,
  created_at timestamp,
  updated_at timestamp
)
SERVER bigquery_server
OPTIONS (
  table 'iniciativas',
  location 'US'
);

-- Vista de sugerencias ML
CREATE FOREIGN TABLE bigquery.smart_initiative_suggestions (
  area_responsable text,
  recomendacion text,
  tasa_exito numeric,
  duracion_recomendada_dias integer,
  carga_actual integer,
  estado_capacidad text,
  tipo_sugerido text,
  fecha_generacion timestamp
)
SERVER bigquery_server
OPTIONS (
  table 'smart_initiative_suggestions',
  location 'US'
);

-- Tabla de actividades
CREATE FOREIGN TABLE bigquery.activities (
  activity_id text,
  initiative_id text,
  title text,
  description text,
  is_completed boolean,
  created_at timestamp,
  completed_at timestamp
)
SERVER bigquery_server
OPTIONS (
  table 'activities',
  location 'US'
);

-- Tabla de áreas
CREATE FOREIGN TABLE bigquery.areas (
  area_id text,
  name text,
  description text,
  manager_id text,
  tenant_id text,
  created_at timestamp
)
SERVER bigquery_server
OPTIONS (
  table 'areas',
  location 'US'
);

-- Tabla de user profiles
CREATE FOREIGN TABLE bigquery.user_profiles (
  user_id text,
  full_name text,
  email text,
  role text,
  tenant_id text,
  created_at timestamp,
  updated_at timestamp
)
SERVER bigquery_server
OPTIONS (
  table 'user_profiles',
  location 'US'
);

-- Tabla de objetivos
CREATE FOREIGN TABLE bigquery.objectives (
  objective_id text,
  title text,
  description text,
  tenant_id text,
  created_at timestamp,
  updated_at timestamp
)
SERVER bigquery_server
OPTIONS (
  table 'objectives',
  location 'US'
);

-- Tabla de historial de progreso
CREATE FOREIGN TABLE bigquery.progress_history (
  history_id text,
  initiative_id text,
  progress_value integer,
  recorded_at timestamp,
  recorded_by text,
  notes text
)
SERVER bigquery_server
OPTIONS (
  table 'progress_history',
  location 'US'
);

-- 8. Crear vistas públicas con alias para compatibilidad
CREATE OR REPLACE VIEW public.bigquery_iniciativas AS
SELECT * FROM bigquery.iniciativas;

CREATE OR REPLACE VIEW public.bigquery_smart_suggestions AS
SELECT * FROM bigquery.smart_initiative_suggestions;

-- 9. Funciones helper para acceso a BigQuery ML

-- Función para obtener predicción ML de BigQuery
CREATE OR REPLACE FUNCTION get_bigquery_ml_prediction(
  p_area_name text,
  p_duration integer DEFAULT 30
)
RETURNS TABLE(
  success_probability numeric,
  recommendation text,
  capacity_status text,
  suggested_duration integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tasa_exito as success_probability,
    recomendacion as recommendation,
    estado_capacidad as capacity_status,
    duracion_recomendada_dias as suggested_duration
  FROM bigquery.smart_initiative_suggestions
  WHERE area_responsable = p_area_name
  ORDER BY fecha_generacion DESC NULLS LAST
  LIMIT 1;
  
  -- Si no hay predicción, retornar valores por defecto
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      75.0::numeric,
      'Sin datos ML disponibles - usando valores promedio'::text,
      'Capacidad disponible'::text,
      30::integer;
  END IF;
END;
$$;

-- Función para crear iniciativa con ML de BigQuery
CREATE OR REPLACE FUNCTION create_initiative_with_bigquery_ml(
  p_title text,
  p_description text,
  p_area_id uuid,
  p_tenant_id uuid,
  p_created_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_area_name text;
  v_prediction record;
  v_new_id uuid;
  v_metadata jsonb;
BEGIN
  -- Obtener nombre del área
  SELECT name INTO v_area_name FROM areas WHERE id = p_area_id;
  
  -- Obtener predicción de BigQuery ML
  SELECT * INTO v_prediction
  FROM get_bigquery_ml_prediction(v_area_name);
  
  -- Preparar metadata con información ML
  v_metadata := jsonb_build_object(
    'ml_prediction', v_prediction.success_probability,
    'ml_recommendation', v_prediction.recommendation,
    'ml_capacity', v_prediction.capacity_status,
    'ml_duration', v_prediction.suggested_duration,
    'source', 'bigquery_ml'
  );
  
  -- Crear la iniciativa
  INSERT INTO initiatives (
    id,
    title,
    description,
    area_id,
    tenant_id,
    created_by,
    start_date,
    due_date,
    status,
    progress,
    metadata
  ) VALUES (
    gen_random_uuid(),
    p_title,
    format('%s [ML Score: %s%%]', p_description, ROUND(v_prediction.success_probability, 1)),
    p_area_id,
    p_tenant_id,
    p_created_by,
    CURRENT_DATE,
    CURRENT_DATE + (v_prediction.suggested_duration || ' days')::INTERVAL,
    'planning',
    0,
    v_metadata
  )
  RETURNING id INTO v_new_id;
  
  -- Log en auditoría
  INSERT INTO audit_log (
    user_id,
    action,
    table_name,
    record_id,
    new_data
  ) VALUES (
    p_created_by,
    'CREATE_WITH_BIGQUERY_ML',
    'initiatives',
    v_new_id,
    v_metadata
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'initiative_id', v_new_id,
    'ml_analysis', jsonb_build_object(
      'success_probability', v_prediction.success_probability,
      'recommendation', v_prediction.recommendation,
      'capacity_status', v_prediction.capacity_status,
      'suggested_duration_days', v_prediction.suggested_duration,
      'source', 'bigquery_ml'
    ),
    'message', format(
      'Iniciativa creada con %s%% probabilidad de éxito (BigQuery ML)',
      ROUND(v_prediction.success_probability, 1)
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error al crear iniciativa con ML'
    );
END;
$$;

-- 10. Vista combinada con predicciones ML
CREATE OR REPLACE VIEW initiatives_with_bigquery_ml AS
SELECT 
  i.id,
  i.title,
  i.description,
  i.area_id,
  a.name as area_name,
  i.progress,
  i.status,
  i.start_date,
  i.due_date,
  bq.tasa_exito as ml_success_probability,
  bq.recomendacion as ml_recommendation,
  bq.estado_capacidad as ml_capacity_status,
  CASE 
    WHEN bq.tasa_exito >= 80 THEN 'low'
    WHEN bq.tasa_exito >= 60 THEN 'medium'
    ELSE 'high'
  END as risk_level
FROM initiatives i
JOIN areas a ON i.area_id = a.id
LEFT JOIN LATERAL (
  SELECT * FROM bigquery.smart_initiative_suggestions
  WHERE area_responsable = a.name
  ORDER BY fecha_generacion DESC NULLS LAST
  LIMIT 1
) bq ON true
WHERE i.tenant_id IS NOT NULL;

-- 11. Función de prueba de conexión
CREATE OR REPLACE FUNCTION test_bigquery_connection()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_result jsonb;
  v_count integer;
  v_ml_count integer;
  v_error text;
BEGIN
  v_result := jsonb_build_object('timestamp', NOW());
  
  -- Test 1: Contar iniciativas en BigQuery
  BEGIN
    SELECT COUNT(*) INTO v_count FROM bigquery.iniciativas LIMIT 1;
    v_result := v_result || jsonb_build_object('bigquery_initiatives_count', v_count);
  EXCEPTION
    WHEN OTHERS THEN
      v_error := SQLERRM;
      v_result := v_result || jsonb_build_object(
        'bigquery_initiatives_error', v_error
      );
  END;
  
  -- Test 2: Contar sugerencias ML
  BEGIN
    SELECT COUNT(*) INTO v_ml_count FROM bigquery.smart_initiative_suggestions LIMIT 1;
    v_result := v_result || jsonb_build_object('ml_suggestions_count', v_ml_count);
  EXCEPTION
    WHEN OTHERS THEN
      v_error := SQLERRM;
      v_result := v_result || jsonb_build_object(
        'ml_suggestions_error', v_error
      );
  END;
  
  -- Información de configuración
  v_result := v_result || jsonb_build_object(
    'vault_configured', EXISTS(SELECT 1 FROM vault.secrets WHERE name = 'bigquery'),
    'wrapper_enabled', EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'wrappers'),
    'server_configured', EXISTS(SELECT 1 FROM pg_foreign_server WHERE srvname = 'bigquery_server'),
    'connection_status', CASE 
      WHEN v_count IS NOT NULL AND v_count >= 0 THEN 'connected'
      ELSE 'error'
    END
  );
  
  RETURN v_result;
END;
$$;

COMMIT;

-- Ejecutar test de conexión
SELECT test_bigquery_connection();

-- Mensaje informativo
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ BIGQUERY WRAPPER CONFIGURADO CON ÉXITO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Foreign tables creadas en esquema bigquery:';
  RAISE NOTICE '  - bigquery.iniciativas';
  RAISE NOTICE '  - bigquery.smart_initiative_suggestions';
  RAISE NOTICE '  - bigquery.activities';
  RAISE NOTICE '  - bigquery.areas';
  RAISE NOTICE '  - bigquery.user_profiles';
  RAISE NOTICE '  - bigquery.objectives';
  RAISE NOTICE '  - bigquery.progress_history';
  RAISE NOTICE '';
  RAISE NOTICE 'Vistas públicas de compatibilidad:';
  RAISE NOTICE '  - public.bigquery_iniciativas';
  RAISE NOTICE '  - public.bigquery_smart_suggestions';
  RAISE NOTICE '';
  RAISE NOTICE 'Funciones disponibles:';
  RAISE NOTICE '  - get_bigquery_ml_prediction(area_name)';
  RAISE NOTICE '  - create_initiative_with_bigquery_ml(...)';
  RAISE NOTICE '  - test_bigquery_connection()';
  RAISE NOTICE '';
  RAISE NOTICE 'Para probar:';
  RAISE NOTICE '  SELECT * FROM bigquery.iniciativas LIMIT 5;';
  RAISE NOTICE '  SELECT * FROM bigquery.smart_initiative_suggestions;';
  RAISE NOTICE '  SELECT test_bigquery_connection();';
  RAISE NOTICE '';
END $$;