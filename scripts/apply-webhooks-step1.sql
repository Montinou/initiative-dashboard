-- Parte 1: Crear función de webhook
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.send_webhook_to_bigquery()
RETURNS TRIGGER AS $$
DECLARE
  request_id BIGINT;
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE 
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
      ELSE row_to_json(NEW)::jsonb
    END,
    'old_record', CASE 
      WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb
      ELSE NULL
    END,
    'timestamp', NOW()
  );

  SELECT net.http_post(
    url := 'https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8'
    ),
    body := payload::text,
    timeout_milliseconds := 10000
  ) INTO request_id;

  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;