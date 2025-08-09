-- ============================================
-- OTORGAR PERMISOS AL ESQUEMA BIGQUERY
-- ============================================

BEGIN;

-- Otorgar permisos de uso del esquema a todos los roles
GRANT USAGE ON SCHEMA bigquery TO postgres;
GRANT USAGE ON SCHEMA bigquery TO anon;
GRANT USAGE ON SCHEMA bigquery TO authenticated;
GRANT USAGE ON SCHEMA bigquery TO service_role;

-- Otorgar permisos SELECT en todas las tablas del esquema bigquery
GRANT SELECT ON ALL TABLES IN SCHEMA bigquery TO postgres;
GRANT SELECT ON ALL TABLES IN SCHEMA bigquery TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA bigquery TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA bigquery TO service_role;

-- Configurar permisos por defecto para futuras tablas
ALTER DEFAULT PRIVILEGES IN SCHEMA bigquery 
  GRANT SELECT ON TABLES TO anon;
  
ALTER DEFAULT PRIVILEGES IN SCHEMA bigquery 
  GRANT SELECT ON TABLES TO authenticated;
  
ALTER DEFAULT PRIVILEGES IN SCHEMA bigquery 
  GRANT SELECT ON TABLES TO service_role;

-- Otorgar permisos EXECUTE en las funciones
GRANT EXECUTE ON FUNCTION test_bigquery_connection() TO anon;
GRANT EXECUTE ON FUNCTION test_bigquery_connection() TO authenticated;
GRANT EXECUTE ON FUNCTION test_bigquery_connection() TO service_role;

GRANT EXECUTE ON FUNCTION get_bigquery_ml_prediction(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_bigquery_ml_prediction(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_bigquery_ml_prediction(text, integer) TO service_role;

GRANT EXECUTE ON FUNCTION create_initiative_with_bigquery_ml(text, text, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_initiative_with_bigquery_ml(text, text, uuid, uuid, uuid) TO service_role;

-- Otorgar permisos en las vistas públicas
GRANT SELECT ON public.bigquery_iniciativas TO anon;
GRANT SELECT ON public.bigquery_iniciativas TO authenticated;
GRANT SELECT ON public.bigquery_iniciativas TO service_role;

GRANT SELECT ON public.bigquery_smart_suggestions TO anon;
GRANT SELECT ON public.bigquery_smart_suggestions TO authenticated;
GRANT SELECT ON public.bigquery_smart_suggestions TO service_role;

GRANT SELECT ON initiatives_with_bigquery_ml TO anon;
GRANT SELECT ON initiatives_with_bigquery_ml TO authenticated;
GRANT SELECT ON initiatives_with_bigquery_ml TO service_role;

COMMIT;

-- Mensaje informativo
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PERMISOS OTORGADOS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Permisos otorgados para:';
  RAISE NOTICE '  - Esquema bigquery';
  RAISE NOTICE '  - Todas las foreign tables';
  RAISE NOTICE '  - Funciones de ML';
  RAISE NOTICE '  - Vistas públicas';
  RAISE NOTICE '';
  RAISE NOTICE 'Roles con acceso:';
  RAISE NOTICE '  - anon (lectura)';
  RAISE NOTICE '  - authenticated (lectura + funciones)';
  RAISE NOTICE '  - service_role (todos los permisos)';
  RAISE NOTICE '';
END $$;