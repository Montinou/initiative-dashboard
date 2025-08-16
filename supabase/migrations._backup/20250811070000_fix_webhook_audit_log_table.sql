-- ============================================================
-- Fix webhook_audit_log table by adding missing status column
-- ============================================================

-- Add the missing status column
ALTER TABLE public.webhook_audit_log 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Add any other missing columns that might be needed
ALTER TABLE public.webhook_audit_log 
ADD COLUMN IF NOT EXISTS response_status integer,
ADD COLUMN IF NOT EXISTS response_body text,
ADD COLUMN IF NOT EXISTS error_message text;

-- Add helpful comment
COMMENT ON TABLE public.webhook_audit_log IS 
'Audit log for webhook executions with status tracking';