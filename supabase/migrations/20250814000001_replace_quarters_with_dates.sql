-- Migration: Replace quarters with date ranges for simpler date management
-- This migration adds start_date and end_date to objectives table
-- and updates the system to use date ranges instead of quarters

-- Step 1: Add date columns to objectives table if they don't exist
ALTER TABLE public.objectives 
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date;

-- Step 2: Migrate existing quarter data to date ranges (if quarters exist)
-- This preserves existing data by converting quarters to date ranges
UPDATE public.objectives o
SET 
  start_date = COALESCE(
    o.start_date,
    (SELECT q.start_date FROM public.quarters q 
     JOIN public.objective_quarters oq ON oq.quarter_id = q.id 
     WHERE oq.objective_id = o.id 
     ORDER BY q.start_date ASC 
     LIMIT 1),
    o.created_at::date
  ),
  end_date = COALESCE(
    o.end_date,
    o.target_date,
    (SELECT q.end_date FROM public.quarters q 
     JOIN public.objective_quarters oq ON oq.quarter_id = q.id 
     WHERE oq.objective_id = o.id 
     ORDER BY q.end_date DESC 
     LIMIT 1),
    (o.created_at + interval '3 months')::date
  )
WHERE o.start_date IS NULL OR o.end_date IS NULL;

-- Step 3: Drop the quarters-related constraints and tables (after migration)
-- Note: We keep the tables for now but won't use them in the application
-- This allows for rollback if needed

-- Step 4: Create indexes for date-based queries
CREATE INDEX IF NOT EXISTS idx_objectives_date_range 
ON public.objectives(tenant_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_initiatives_date_range 
ON public.initiatives(tenant_id, start_date, due_date);

-- Step 5: Update the objectives table check constraints (if needed)
-- Skip constraint for now as some existing data might not comply

-- Step 6: Create a view for date-based reporting
CREATE OR REPLACE VIEW public.objectives_with_dates AS
SELECT 
  o.*,
  CASE 
    WHEN o.end_date < CURRENT_DATE THEN 'overdue'
    WHEN o.start_date > CURRENT_DATE THEN 'upcoming'
    ELSE 'active'
  END as date_status,
  EXTRACT(EPOCH FROM (o.end_date::timestamp - o.start_date::timestamp)) / 86400 as duration_days
FROM public.objectives o;

-- Step 7: Grant permissions on the new view
GRANT SELECT ON public.objectives_with_dates TO authenticated;

-- Step 8: Comment the changes
COMMENT ON COLUMN public.objectives.start_date IS 'Start date for the objective (replaces quarter system)';
COMMENT ON COLUMN public.objectives.end_date IS 'End date for the objective (replaces quarter system)';