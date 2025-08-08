-- IMPORTANT: Run this in Supabase SQL Editor
-- This script adds the missing status column to initiatives table

-- Add status column to initiatives table
ALTER TABLE public.initiatives 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planning';

-- Add check constraint for valid status values
ALTER TABLE public.initiatives
ADD CONSTRAINT check_initiative_status 
CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold'));

-- Update existing initiatives with a default status based on progress
UPDATE public.initiatives
SET status = CASE
  WHEN progress = 0 THEN 'planning'
  WHEN progress = 100 THEN 'completed'
  WHEN progress > 0 AND progress < 100 THEN 'in_progress'
  ELSE 'planning'
END
WHERE status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.initiatives.status IS 'Status of the initiative: planning, in_progress, completed, or on_hold';

-- Verify the change
SELECT 
  id,
  title,
  progress,
  status
FROM public.initiatives
LIMIT 10;