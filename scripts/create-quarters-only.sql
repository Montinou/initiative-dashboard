-- Create quarters for the current tenant
-- This script creates quarters for 2024 and 2025

-- First check if quarters already exist to avoid duplicates
DO $$
BEGIN
  -- Insert quarters only if they don't exist
  INSERT INTO public.quarters (tenant_id, quarter_name, start_date, end_date)
  SELECT 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    quarter_name,
    start_date::date,
    end_date::date
  FROM (VALUES
    ('Q1', '2024-01-01', '2024-03-31'),
    ('Q2', '2024-04-01', '2024-06-30'),
    ('Q3', '2024-07-01', '2024-09-30'),
    ('Q4', '2024-10-01', '2024-12-31'),
    ('Q1', '2025-01-01', '2025-03-31'),
    ('Q2', '2025-04-01', '2025-06-30'),
    ('Q3', '2025-07-01', '2025-09-30'),
    ('Q4', '2025-10-01', '2025-12-31')
  ) AS quarters(quarter_name, start_date, end_date)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.quarters q 
    WHERE q.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    AND q.quarter_name = quarters.quarter_name
    AND EXTRACT(YEAR FROM q.start_date) = EXTRACT(YEAR FROM quarters.start_date::date)
  );
END $$;

-- Show what was created
SELECT quarter_name, start_date, end_date 
FROM public.quarters 
WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
ORDER BY start_date;