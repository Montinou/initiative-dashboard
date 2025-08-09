-- Create webhook function for BigQuery sync
-- This function will be triggered on initiatives table changes

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to sync with BigQuery via webhook
CREATE OR REPLACE FUNCTION sync_initiative_to_bigquery()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
  webhook_secret TEXT;
  payload JSONB;
  request_id INT;
BEGIN
  -- Get webhook configuration from environment or hardcode
  -- In production, use Supabase Vault for secrets
  webhook_url := current_setting('app.webhook_url', true);
  webhook_secret := current_setting('app.webhook_secret', true);
  
  -- Fallback to default if not set (update with your actual URL)
  IF webhook_url IS NULL THEN
    webhook_url := 'https://your-app.vercel.app/api/sync/bigquery';
  END IF;
  
  -- Construct payload based on operation
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type', 'INSERT',
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW),
      'timestamp', NOW()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object(
      'type', 'UPDATE',
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW),
      'old_record', row_to_json(OLD),
      'timestamp', NOW()
    );
  ELSIF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'type', 'DELETE',
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'old_record', row_to_json(OLD),
      'timestamp', NOW()
    );
  END IF;

  -- Send webhook using pg_net
  SELECT net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(webhook_secret, 'default-secret')
    ),
    body := payload::text
  ) INTO request_id;

  -- Log the webhook call (optional)
  RAISE NOTICE 'BigQuery sync webhook sent: % (request_id: %)', TG_OP, request_id;

  -- Return appropriate value for trigger
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for initiatives table
DROP TRIGGER IF EXISTS sync_initiatives_to_bigquery ON initiatives;

CREATE TRIGGER sync_initiatives_to_bigquery
AFTER INSERT OR UPDATE OR DELETE ON initiatives
FOR EACH ROW
EXECUTE FUNCTION sync_initiative_to_bigquery();

-- Create audit table for webhook calls (optional)
CREATE TABLE IF NOT EXISTS webhook_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  record_id TEXT,
  webhook_url TEXT,
  request_id INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to log webhook calls
CREATE OR REPLACE FUNCTION log_webhook_call()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO webhook_audit_log (table_name, operation, record_id, webhook_url)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT
      ELSE NEW.id::TEXT
    END,
    current_setting('app.webhook_url', true)
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add audit trigger
CREATE TRIGGER log_initiative_webhook
AFTER INSERT OR UPDATE OR DELETE ON initiatives
FOR EACH ROW
EXECUTE FUNCTION log_webhook_call();

-- Configuration comments
COMMENT ON FUNCTION sync_initiative_to_bigquery() IS 'Syncs initiative changes to BigQuery via webhook';
COMMENT ON TRIGGER sync_initiatives_to_bigquery ON initiatives IS 'Triggers BigQuery sync on initiative changes';

-- To configure the webhook URL and secret, run:
-- ALTER DATABASE postgres SET app.webhook_url = 'https://your-app.vercel.app/api/sync/bigquery';
-- ALTER DATABASE postgres SET app.webhook_secret = 'your-secret-token';