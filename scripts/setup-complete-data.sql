-- Script to setup complete data consistency
-- This script creates quarters and links objectives to initiatives

-- 1. First, let's create quarters for 2024 and 2025
INSERT INTO public.quarters (id, tenant_id, quarter_name, start_date, end_date)
VALUES 
  -- Quarters for SIGA tenant (default)
  ('11111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Q1', '2024-01-01', '2024-03-31'),
  ('22222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Q2', '2024-04-01', '2024-06-30'),
  ('33333333-3333-3333-3333-333333333333', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Q3', '2024-07-01', '2024-09-30'),
  ('44444444-4444-4444-4444-444444444444', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Q4', '2024-10-01', '2024-12-31'),
  ('55555555-5555-5555-5555-555555555555', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Q1', '2025-01-01', '2025-03-31'),
  ('66666666-6666-6666-6666-666666666666', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Q2', '2025-04-01', '2025-06-30'),
  ('77777777-7777-7777-7777-777777777777', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Q3', '2025-07-01', '2025-09-30'),
  ('88888888-8888-8888-8888-888888888888', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Q4', '2025-10-01', '2025-12-31')
ON CONFLICT (id) DO NOTHING;

-- 2. Now let's get the actual IDs of objectives and initiatives and link them
-- First, let's create a temporary view to see what we have
DO $$
DECLARE
  obj_record RECORD;
  init_record RECORD;
  area_match TEXT;
  counter INT := 0;
BEGIN
  -- Link objectives to initiatives based on area matching
  FOR obj_record IN 
    SELECT id, title, area_id, tenant_id 
    FROM public.objectives 
    WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  LOOP
    -- For each objective, find initiatives in the same area
    FOR init_record IN 
      SELECT id, title, area_id 
      FROM public.initiatives 
      WHERE tenant_id = obj_record.tenant_id 
        AND area_id = obj_record.area_id
      LIMIT 3  -- Link up to 3 initiatives per objective
    LOOP
      -- Insert the link
      INSERT INTO public.objective_initiatives (objective_id, initiative_id)
      VALUES (obj_record.id, init_record.id)
      ON CONFLICT DO NOTHING;
      
      counter := counter + 1;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Created % objective-initiative links', counter;
END $$;

-- 3. Link objectives to quarters
-- Link Q1 2025 objectives
INSERT INTO public.objective_quarters (objective_id, quarter_id)
SELECT o.id, '55555555-5555-5555-5555-555555555555'
FROM public.objectives o
WHERE o.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND o.title LIKE '%Q1%'
ON CONFLICT DO NOTHING;

-- Link Q2 2025 objectives  
INSERT INTO public.objective_quarters (objective_id, quarter_id)
SELECT o.id, '66666666-6666-6666-6666-666666666666'
FROM public.objectives o
WHERE o.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND (o.title LIKE '%Paquetes%' OR o.title LIKE '%App%')
ON CONFLICT DO NOTHING;

-- Link Q3 2025 objectives
INSERT INTO public.objective_quarters (objective_id, quarter_id)
SELECT o.id, '77777777-7777-7777-7777-777777777777'
FROM public.objectives o
WHERE o.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND (o.title LIKE '%Redes%' OR o.title LIKE '%NPS%' OR o.title LIKE '%Campaña%')
ON CONFLICT DO NOTHING;

-- Link Q4 2025 objectives
INSERT INTO public.objective_quarters (objective_id, quarter_id)
SELECT o.id, '88888888-8888-8888-8888-888888888888'
FROM public.objectives o
WHERE o.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND (o.title LIKE '%Alianzas%' OR o.title LIKE '%Premium%' OR o.title LIKE '%Cadena%')
ON CONFLICT DO NOTHING;

-- For objectives without specific quarter assignment, assign them to current quarter (Q1 2025)
INSERT INTO public.objective_quarters (objective_id, quarter_id)
SELECT o.id, '55555555-5555-5555-5555-555555555555'
FROM public.objectives o
WHERE o.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND NOT EXISTS (
    SELECT 1 FROM public.objective_quarters oq WHERE oq.objective_id = o.id
  )
ON CONFLICT DO NOTHING;

-- 4. Show summary of what was created
SELECT 'Summary of Data Setup:' as info;

SELECT 
  'Quarters Created' as entity,
  COUNT(*) as count
FROM public.quarters
WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

UNION ALL

SELECT 
  'Objectives with Quarters' as entity,
  COUNT(DISTINCT objective_id) as count
FROM public.objective_quarters oq
JOIN public.objectives o ON o.id = oq.objective_id
WHERE o.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

UNION ALL

SELECT 
  'Objectives with Initiatives' as entity,
  COUNT(DISTINCT objective_id) as count
FROM public.objective_initiatives oi
JOIN public.objectives o ON o.id = oi.objective_id
WHERE o.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

UNION ALL

SELECT 
  'Total Objective-Initiative Links' as entity,
  COUNT(*) as count
FROM public.objective_initiatives oi
JOIN public.objectives o ON o.id = oi.objective_id
WHERE o.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';