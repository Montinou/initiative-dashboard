-- Link objectives to initiatives based on area matching
-- This creates the relationships between objectives and initiatives

DO $$
DECLARE
  obj_record RECORD;
  init_record RECORD;
  counter INT := 0;
  area_name TEXT;
BEGIN
  -- Clear existing links for this tenant first to avoid duplicates
  DELETE FROM public.objective_initiatives 
  WHERE objective_id IN (
    SELECT id FROM public.objectives 
    WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  );

  -- Link objectives to initiatives based on area and keywords
  FOR obj_record IN 
    SELECT o.id as obj_id, o.title as obj_title, o.area_id, a.name as area_name
    FROM public.objectives o
    LEFT JOIN public.areas a ON o.area_id = a.id
    WHERE o.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  LOOP
    -- For each objective, find related initiatives
    FOR init_record IN 
      SELECT i.id as init_id, i.title as init_title
      FROM public.initiatives i
      WHERE i.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
        AND (
          -- Same area
          (i.area_id = obj_record.area_id AND obj_record.area_id IS NOT NULL)
          -- Or matching keywords in titles
          OR (
            (obj_record.obj_title ILIKE '%venta%' AND i.title ILIKE '%venta%')
            OR (obj_record.obj_title ILIKE '%turismo%' AND i.title ILIKE '%turismo%')
            OR (obj_record.obj_title ILIKE '%turístic%' AND i.title ILIKE '%turístic%')
            OR (obj_record.obj_title ILIKE '%paquete%' AND i.title ILIKE '%paquete%')
            OR (obj_record.obj_title ILIKE '%marketing%' AND i.title ILIKE '%marketing%')
            OR (obj_record.obj_title ILIKE '%redes%' AND i.title ILIKE '%redes%')
            OR (obj_record.obj_title ILIKE '%social%' AND i.title ILIKE '%social%')
            OR (obj_record.obj_title ILIKE '%cliente%' AND i.title ILIKE '%cliente%')
            OR (obj_record.obj_title ILIKE '%NPS%' AND i.title ILIKE '%satisfacción%')
            OR (obj_record.obj_title ILIKE '%app%' AND i.title ILIKE '%app%')
            OR (obj_record.obj_title ILIKE '%móvil%' AND i.title ILIKE '%móvil%')
            OR (obj_record.obj_title ILIKE '%tecnología%' AND i.title ILIKE '%plataforma%')
            OR (obj_record.obj_title ILIKE '%operacion%' AND i.title ILIKE '%operacion%')
            OR (obj_record.obj_title ILIKE '%cadena%' AND i.title ILIKE '%proceso%')
            OR (obj_record.obj_title ILIKE '%alianza%' AND i.title ILIKE '%partner%')
            OR (obj_record.obj_title ILIKE '%alianza%' AND i.title ILIKE '%alianza%')
            OR (obj_record.obj_title ILIKE '%campaña%' AND i.title ILIKE '%campaña%')
            OR (obj_record.obj_title ILIKE '%premium%' AND i.title ILIKE '%premium%')
            OR (obj_record.obj_title ILIKE '%experiencia%' AND i.title ILIKE '%experiencia%')
            OR (obj_record.obj_title ILIKE '%comercial%' AND i.title ILIKE '%comercial%')
            OR (obj_record.obj_title ILIKE '%visibilidad%' AND i.title ILIKE '%promoción%')
            OR (obj_record.obj_title ILIKE '%producto%' AND i.title ILIKE '%producto%')
          )
        )
      ORDER BY 
        CASE WHEN i.area_id = obj_record.area_id THEN 0 ELSE 1 END,
        i.created_at DESC
      LIMIT 3  -- Link up to 3 initiatives per objective
    LOOP
      -- Insert the link
      INSERT INTO public.objective_initiatives (objective_id, initiative_id)
      VALUES (obj_record.obj_id, init_record.init_id)
      ON CONFLICT DO NOTHING;
      
      counter := counter + 1;
      RAISE NOTICE 'Linked objective "%" with initiative "%"', 
        LEFT(obj_record.obj_title, 30), LEFT(init_record.init_title, 30);
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Created % objective-initiative links in total', counter;
END $$;

-- Show summary of links created
SELECT 
  o.title as objective,
  COUNT(oi.initiative_id) as linked_initiatives
FROM public.objectives o
LEFT JOIN public.objective_initiatives oi ON o.id = oi.objective_id
WHERE o.tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
GROUP BY o.id, o.title
ORDER BY o.title;