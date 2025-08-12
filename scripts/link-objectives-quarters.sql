-- Link objectives to quarters based on their titles and context
-- This assigns quarters to objectives

DO $$
DECLARE
  q1_2025_id uuid;
  q2_2025_id uuid;
  q3_2025_id uuid;
  q4_2025_id uuid;
BEGIN
  -- Get quarter IDs for 2025
  SELECT id INTO q1_2025_id FROM public.quarters 
  WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' 
    AND quarter_name = 'Q1' AND EXTRACT(YEAR FROM start_date) = 2025;
    
  SELECT id INTO q2_2025_id FROM public.quarters 
  WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' 
    AND quarter_name = 'Q2' AND EXTRACT(YEAR FROM start_date) = 2025;
    
  SELECT id INTO q3_2025_id FROM public.quarters 
  WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' 
    AND quarter_name = 'Q3' AND EXTRACT(YEAR FROM start_date) = 2025;
    
  SELECT id INTO q4_2025_id FROM public.quarters 
  WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' 
    AND quarter_name = 'Q4' AND EXTRACT(YEAR FROM start_date) = 2025;

  -- Clear existing quarter assignments for this tenant
  DELETE FROM public.objective_quarters 
  WHERE objective_id IN (
    SELECT id FROM public.objectives 
    WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  );

  -- Assign Q1 2025 to sales and immediate objectives
  IF q1_2025_id IS NOT NULL THEN
    INSERT INTO public.objective_quarters (objective_id, quarter_id)
    SELECT o.id, q1_2025_id
    FROM public.objectives o
    WHERE o.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      AND (
        o.title ILIKE '%Q1%' 
        OR o.title ILIKE '%venta%'
        OR o.title ILIKE '%comercial%'
        OR o.title ILIKE '%visibilidad%'
      )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Assign Q2 2025 to product and app objectives
  IF q2_2025_id IS NOT NULL THEN
    INSERT INTO public.objective_quarters (objective_id, quarter_id)
    SELECT o.id, q2_2025_id
    FROM public.objectives o
    WHERE o.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      AND (
        o.title ILIKE '%paquete%'
        OR o.title ILIKE '%app%'
        OR o.title ILIKE '%móvil%'
        OR o.title ILIKE '%producto%'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.objective_quarters 
        WHERE objective_id = o.id
      )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Assign Q3 2025 to marketing and customer objectives
  IF q3_2025_id IS NOT NULL THEN
    INSERT INTO public.objective_quarters (objective_id, quarter_id)
    SELECT o.id, q3_2025_id
    FROM public.objectives o
    WHERE o.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      AND (
        o.title ILIKE '%redes%'
        OR o.title ILIKE '%NPS%'
        OR o.title ILIKE '%campaña%'
        OR o.title ILIKE '%marketing%'
        OR o.title ILIKE '%cliente%'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.objective_quarters 
        WHERE objective_id = o.id
      )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Assign Q4 2025 to strategic and operations objectives
  IF q4_2025_id IS NOT NULL THEN
    INSERT INTO public.objective_quarters (objective_id, quarter_id)
    SELECT o.id, q4_2025_id
    FROM public.objectives o
    WHERE o.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      AND (
        o.title ILIKE '%alianza%'
        OR o.title ILIKE '%premium%'
        OR o.title ILIKE '%cadena%'
        OR o.title ILIKE '%operacion%'
        OR o.title ILIKE '%experiencia%premium%'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.objective_quarters 
        WHERE objective_id = o.id
      )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Assign remaining objectives to Q1 2025 (current quarter)
  IF q1_2025_id IS NOT NULL THEN
    INSERT INTO public.objective_quarters (objective_id, quarter_id)
    SELECT o.id, q1_2025_id
    FROM public.objectives o
    WHERE o.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      AND NOT EXISTS (
        SELECT 1 FROM public.objective_quarters 
        WHERE objective_id = o.id
      )
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Completed assigning quarters to objectives';
END $$;

-- Show objectives with their assigned quarters
SELECT 
  o.title as objective,
  STRING_AGG(q.quarter_name || ' ' || EXTRACT(YEAR FROM q.start_date)::text, ', ' ORDER BY q.start_date) as assigned_quarters
FROM public.objectives o
LEFT JOIN public.objective_quarters oq ON o.id = oq.objective_id
LEFT JOIN public.quarters q ON oq.quarter_id = q.id
WHERE o.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
GROUP BY o.id, o.title
ORDER BY o.title;