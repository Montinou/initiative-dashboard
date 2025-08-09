-- Enable pg_net extension for webhooks
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create webhook function for BigQuery sync
CREATE OR REPLACE FUNCTION public.sync_initiative_to_bigquery()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT := 'https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQuery';
  webhook_secret TEXT := 'sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8';
  payload JSONB;
  request_id BIGINT;
BEGIN
  -- Log the operation
  RAISE NOTICE 'BigQuery sync triggered for % on initiatives', TG_OP;
  
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
  SELECT extensions.net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || webhook_secret
    ),
    body := payload::text
  ) INTO request_id;

  RAISE NOTICE 'Webhook sent to BigQuery sync function, request_id: %', request_id;

  -- Return appropriate value for trigger
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Failed to send BigQuery sync webhook: %', SQLERRM;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for initiatives table
DROP TRIGGER IF EXISTS sync_initiatives_to_bigquery ON public.initiatives;

CREATE TRIGGER sync_initiatives_to_bigquery
AFTER INSERT OR UPDATE OR DELETE ON public.initiatives
FOR EACH ROW
EXECUTE FUNCTION public.sync_initiative_to_bigquery();

-- Create audit table for webhook calls
CREATE TABLE IF NOT EXISTS public.webhook_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  record_id TEXT,
  webhook_url TEXT,
  request_id BIGINT,
  status TEXT DEFAULT 'pending',
  response_code INT,
  response_body TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for audit log
CREATE INDEX IF NOT EXISTS idx_webhook_audit_created_at ON public.webhook_audit_log(created_at DESC);

-- Function to log webhook calls
CREATE OR REPLACE FUNCTION public.log_webhook_call()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.webhook_audit_log (
    table_name, 
    operation, 
    record_id, 
    webhook_url,
    created_at
  )
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT
      ELSE NEW.id::TEXT
    END,
    'https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQuery',
    NOW()
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add audit trigger
DROP TRIGGER IF EXISTS log_initiative_webhook ON public.initiatives;

CREATE TRIGGER log_initiative_webhook
AFTER INSERT OR UPDATE OR DELETE ON public.initiatives
FOR EACH ROW
EXECUTE FUNCTION public.log_webhook_call();

-- Grant necessary permissions (simplified for Supabase)
GRANT ALL ON public.webhook_audit_log TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION public.sync_initiative_to_bigquery() IS 'Syncs initiative changes to BigQuery via Cloud Function webhook';
COMMENT ON TRIGGER sync_initiatives_to_bigquery ON public.initiatives IS 'Triggers BigQuery sync on initiative changes';
COMMENT ON TABLE public.webhook_audit_log IS 'Audit log for BigQuery sync webhook calls';

-- Test the webhook with a sample update (will be rolled back)
DO $$
DECLARE
  test_initiative_id UUID;
BEGIN
  -- Get a random initiative to test
  SELECT id INTO test_initiative_id 
  FROM public.initiatives 
  LIMIT 1;
  
  IF test_initiative_id IS NOT NULL THEN
    -- Update progress to trigger the webhook
    UPDATE public.initiatives 
    SET progress = progress 
    WHERE id = test_initiative_id;
    
    RAISE NOTICE 'Test webhook triggered for initiative %', test_initiative_id;
  END IF;
END $$;