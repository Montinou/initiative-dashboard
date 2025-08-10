-- Script para probar los webhooks de BigQuery

-- 1. Insertar un registro de prueba
INSERT INTO public.areas (id, name, tenant_id, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Test Area for Webhook - ' || NOW()::text,
  '550e8400-e29b-41d4-a716-446655440000', -- SIGA tenant
  NOW(),
  NOW()
) RETURNING id, name;

-- 2. Ver los últimos webhooks enviados (si pg_net guarda logs)
SELECT * FROM net._http_response 
ORDER BY created DESC 
LIMIT 5;

-- 3. Contar triggers activos
SELECT COUNT(*) as total_triggers
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE 'bigquery_sync_%';

-- 4. Listar todos los triggers de webhook
SELECT 
  trigger_name,
  event_object_table,
  string_agg(event_manipulation, ', ') as events
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%sync%'
GROUP BY trigger_name, event_object_table
ORDER BY event_object_table;