-- Script completo para configurar objetivos, iniciativas y actividades con relaciones apropiadas
-- Este script maneja todos los datos de OKR de manera integral

-- ============================================
-- PASO 1: VINCULAR OBJETIVOS CON ÁREAS
-- ============================================

-- Verificamos los objetivos existentes
DO $$
DECLARE
  comercial_area_id uuid;
  producto_area_id uuid;
  siga_tenant_id uuid;
BEGIN
  -- Obtener el tenant_id de SIGA
  SELECT id INTO siga_tenant_id FROM tenants WHERE subdomain = 'siga' LIMIT 1;
  
  -- Obtener el area_id de Comercial
  SELECT id INTO comercial_area_id 
  FROM areas 
  WHERE name = 'Comercial' AND tenant_id = siga_tenant_id 
  LIMIT 1;
  
  -- Obtener el area_id de Producto
  SELECT id INTO producto_area_id 
  FROM areas 
  WHERE name = 'Producto' AND tenant_id = siga_tenant_id 
  LIMIT 1;
  
  -- Actualizar objetivos de Comercial
  UPDATE objectives 
  SET area_id = comercial_area_id,
      progress = 75,
      status = 'in_progress'
  WHERE (title ILIKE '%ventas%' 
     OR title ILIKE '%comercial%' 
     OR title ILIKE '%revenue%'
     OR title ILIKE '%market%')
    AND tenant_id = siga_tenant_id
    AND area_id IS NULL;
  
  -- Actualizar objetivos de Producto
  UPDATE objectives 
  SET area_id = producto_area_id,
      progress = 60,
      status = 'in_progress'
  WHERE (title ILIKE '%producto%' 
     OR title ILIKE '%product%' 
     OR title ILIKE '%development%'
     OR title ILIKE '%innovation%')
    AND tenant_id = siga_tenant_id
    AND area_id IS NULL;
END $$;

-- ============================================
-- PASO 2: CREAR QUARTERS SI NO EXISTEN
-- ============================================

INSERT INTO quarters (tenant_id, quarter_name, start_date, end_date)
SELECT 
  t.id,
  'Q1',
  '2025-01-01'::date,
  '2025-03-31'::date
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM quarters q 
  WHERE q.tenant_id = t.id 
  AND q.quarter_name = 'Q1'
)
ON CONFLICT DO NOTHING;

INSERT INTO quarters (tenant_id, quarter_name, start_date, end_date)
SELECT 
  t.id,
  'Q2',
  '2025-04-01'::date,
  '2025-06-30'::date
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM quarters q 
  WHERE q.tenant_id = t.id 
  AND q.quarter_name = 'Q2'
)
ON CONFLICT DO NOTHING;

-- Vincular objetivos con quarters
INSERT INTO objective_quarters (objective_id, quarter_id)
SELECT DISTINCT
  o.id,
  q.id
FROM objectives o
INNER JOIN quarters q ON o.tenant_id = q.tenant_id
WHERE q.quarter_name = 'Q1'
  AND o.area_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM objective_quarters oq 
    WHERE oq.objective_id = o.id 
    AND oq.quarter_id = q.id
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 3: CREAR INICIATIVAS PARA CADA OBJETIVO
-- ============================================

-- Eliminar iniciativas anteriores de prueba para evitar duplicados
DELETE FROM activities 
WHERE initiative_id IN (
  SELECT id FROM initiatives 
  WHERE title LIKE 'Iniciativa de %'
);

DELETE FROM objective_initiatives
WHERE initiative_id IN (
  SELECT id FROM initiatives 
  WHERE title LIKE 'Iniciativa de %'
);

DELETE FROM initiatives 
WHERE title LIKE 'Iniciativa de %';

-- Crear 3 iniciativas para cada objetivo con área asignada
DO $$
DECLARE
  obj RECORD;
  init_id uuid;
  act_id uuid;
  user_id uuid;
  i INTEGER;
  j INTEGER;
BEGIN
  -- Para cada objetivo con área asignada
  FOR obj IN 
    SELECT 
      o.id as objective_id,
      o.title as objective_title,
      o.area_id,
      o.tenant_id,
      o.created_by,
      a.name as area_name
    FROM objectives o
    INNER JOIN areas a ON o.area_id = a.id
    WHERE o.area_id IS NOT NULL
    ORDER BY o.created_at
  LOOP
    -- Obtener un usuario del tenant para asignar
    SELECT id INTO user_id 
    FROM user_profiles 
    WHERE tenant_id = obj.tenant_id 
      AND role IN ('CEO', 'Admin', 'Manager')
    LIMIT 1;
    
    -- Crear 3 iniciativas para este objetivo
    FOR i IN 1..3 LOOP
      -- Generar nuevo UUID para la iniciativa
      init_id := gen_random_uuid();
      
      -- Insertar iniciativa
      INSERT INTO initiatives (
        id,
        tenant_id,
        area_id,
        title,
        description,
        progress,
        created_by,
        status,
        start_date,
        due_date
      ) VALUES (
        init_id,
        obj.tenant_id,
        obj.area_id,
        CASE i
          WHEN 1 THEN 'Estrategia y Planificación - ' || obj.objective_title
          WHEN 2 THEN 'Optimización y Mejora - ' || obj.objective_title
          WHEN 3 THEN 'Innovación y Desarrollo - ' || obj.objective_title
        END,
        CASE i
          WHEN 1 THEN 'Definir e implementar la estrategia para alcanzar: ' || obj.objective_title
          WHEN 2 THEN 'Optimizar procesos y mejorar eficiencia para: ' || obj.objective_title
          WHEN 3 THEN 'Innovar y desarrollar nuevas capacidades para: ' || obj.objective_title
        END,
        CASE 
          WHEN obj.area_name = 'Comercial' THEN 
            CASE i
              WHEN 1 THEN 85
              WHEN 2 THEN 60
              WHEN 3 THEN 30
            END
          WHEN obj.area_name = 'Producto' THEN
            CASE i
              WHEN 1 THEN 70
              WHEN 2 THEN 45
              WHEN 3 THEN 20
            END
          ELSE
            CASE i
              WHEN 1 THEN 65
              WHEN 2 THEN 40
              WHEN 3 THEN 15
            END
        END,
        COALESCE(user_id, obj.created_by),
        CASE 
          WHEN i <= 2 THEN 'in_progress'
          ELSE 'planning'
        END,
        CURRENT_DATE - INTERVAL '45 days',
        CURRENT_DATE + INTERVAL '75 days'
      );
      
      -- Vincular iniciativa con objetivo
      INSERT INTO objective_initiatives (objective_id, initiative_id)
      VALUES (obj.objective_id, init_id)
      ON CONFLICT DO NOTHING;
      
      -- Crear 3 actividades para cada iniciativa
      FOR j IN 1..3 LOOP
        -- Generar nuevo UUID para la actividad
        act_id := gen_random_uuid();
        
        -- Insertar actividad
        INSERT INTO activities (
          id,
          initiative_id,
          title,
          description,
          is_completed,
          assigned_to,
          created_at,
          updated_at
        ) VALUES (
          act_id,
          init_id,
          CASE i
            WHEN 1 THEN -- Estrategia
              CASE j
                WHEN 1 THEN 'Análisis de situación actual'
                WHEN 2 THEN 'Definición de plan estratégico'
                WHEN 3 THEN 'Presentación y aprobación'
              END
            WHEN 2 THEN -- Optimización
              CASE j
                WHEN 1 THEN 'Mapeo de procesos existentes'
                WHEN 2 THEN 'Identificación de mejoras'
                WHEN 3 THEN 'Implementación de optimizaciones'
              END
            WHEN 3 THEN -- Innovación
              CASE j
                WHEN 1 THEN 'Investigación de tendencias'
                WHEN 2 THEN 'Diseño de solución innovadora'
                WHEN 3 THEN 'Prototipo y validación'
              END
          END,
          CASE i
            WHEN 1 THEN -- Estrategia
              CASE j
                WHEN 1 THEN 'Realizar un análisis completo de la situación actual y contexto'
                WHEN 2 THEN 'Definir el plan estratégico con objetivos, metas y KPIs'
                WHEN 3 THEN 'Presentar el plan a stakeholders y obtener aprobación'
              END
            WHEN 2 THEN -- Optimización
              CASE j
                WHEN 1 THEN 'Documentar y mapear todos los procesos actuales del área'
                WHEN 2 THEN 'Identificar cuellos de botella y oportunidades de mejora'
                WHEN 3 THEN 'Implementar las optimizaciones priorizadas'
              END
            WHEN 3 THEN -- Innovación
              CASE j
                WHEN 1 THEN 'Investigar tendencias del mercado y mejores prácticas'
                WHEN 2 THEN 'Diseñar solución innovadora basada en investigación'
                WHEN 3 THEN 'Crear prototipo y validar con usuarios'
              END
          END,
          -- Marcar como completadas según el progreso de la iniciativa
          CASE 
            WHEN obj.area_name = 'Comercial' THEN
              CASE i
                WHEN 1 THEN j <= 2  -- Estrategia: 2 de 3 completadas
                WHEN 2 THEN j = 1   -- Optimización: 1 de 3 completada
                ELSE false           -- Innovación: ninguna completada
              END
            WHEN obj.area_name = 'Producto' THEN
              CASE i
                WHEN 1 THEN j <= 2  -- Estrategia: 2 de 3 completadas
                WHEN 2 THEN j = 1   -- Optimización: 1 de 3 completada
                ELSE false           -- Innovación: ninguna completada
              END
            ELSE
              CASE i
                WHEN 1 THEN j = 1   -- Estrategia: 1 de 3 completada
                WHEN 2 THEN false   -- Optimización: ninguna completada
                ELSE false           -- Innovación: ninguna completada
              END
          END,
          user_id,
          CURRENT_TIMESTAMP - INTERVAL '30 days' + (j * INTERVAL '7 days'),
          CURRENT_TIMESTAMP - INTERVAL '30 days' + (j * INTERVAL '7 days')
        );
      END LOOP; -- Fin del loop de actividades
    END LOOP; -- Fin del loop de iniciativas
  END LOOP; -- Fin del loop de objetivos
END $$;

-- ============================================
-- PASO 4: CREAR DATOS ADICIONALES PARA OTRAS ÁREAS
-- ============================================

-- Crear objetivos para áreas que no tienen
INSERT INTO objectives (tenant_id, area_id, title, description, created_by, progress, status, target_date)
SELECT 
  a.tenant_id,
  a.id,
  CASE 
    WHEN a.name = 'Operaciones' THEN 'Excelencia Operacional'
    WHEN a.name = 'Recursos Humanos' THEN 'Transformación Cultural'
    WHEN a.name = 'Marketing' THEN 'Liderazgo de Marca'
    WHEN a.name = 'Tecnología' THEN 'Transformación Digital'
    WHEN a.name = 'Finanzas' THEN 'Optimización Financiera'
    ELSE 'Objetivo Estratégico de ' || a.name
  END,
  CASE 
    WHEN a.name = 'Operaciones' THEN 'Alcanzar excelencia operacional mediante optimización continua'
    WHEN a.name = 'Recursos Humanos' THEN 'Liderar la transformación cultural y desarrollo del talento'
    WHEN a.name = 'Marketing' THEN 'Posicionar la marca como líder del mercado'
    WHEN a.name = 'Tecnología' THEN 'Impulsar la transformación digital de la organización'
    WHEN a.name = 'Finanzas' THEN 'Optimizar la gestión financiera y rentabilidad'
    ELSE 'Objetivo estratégico para el área de ' || a.name
  END,
  (SELECT id FROM user_profiles WHERE tenant_id = a.tenant_id LIMIT 1),
  CASE 
    WHEN a.name = 'Operaciones' THEN 55
    WHEN a.name = 'Recursos Humanos' THEN 40
    WHEN a.name = 'Marketing' THEN 65
    WHEN a.name = 'Tecnología' THEN 70
    WHEN a.name = 'Finanzas' THEN 80
    ELSE 50
  END,
  'in_progress',
  CURRENT_DATE + INTERVAL '90 days'
FROM areas a
WHERE NOT EXISTS (
  SELECT 1 FROM objectives o 
  WHERE o.area_id = a.id
)
AND a.name IN ('Operaciones', 'Recursos Humanos', 'Marketing', 'Tecnología', 'Finanzas')
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 5: ACTUALIZAR PROGRESO DE INICIATIVAS
-- ============================================

-- Actualizar el progreso de las iniciativas basado en actividades completadas
UPDATE initiatives i
SET progress = COALESCE((
  SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE is_completed = true)::numeric / COUNT(*)::numeric) * 100)
    END
  FROM activities a
  WHERE a.initiative_id = i.id
), i.progress)
WHERE EXISTS (
  SELECT 1 FROM activities a WHERE a.initiative_id = i.id
);

-- ============================================
-- PASO 6: VERIFICACIÓN FINAL
-- ============================================

-- Resumen por área
SELECT 
  t.subdomain as tenant,
  a.name as area,
  COUNT(DISTINCT o.id) as objetivos,
  COUNT(DISTINCT i.id) as iniciativas,
  COUNT(DISTINCT act.id) as actividades,
  COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true) as act_completadas,
  ROUND(AVG(o.progress)) as prog_objetivos,
  ROUND(AVG(i.progress)) as prog_iniciativas
FROM tenants t
LEFT JOIN areas a ON a.tenant_id = t.id
LEFT JOIN objectives o ON o.area_id = a.id
LEFT JOIN initiatives i ON i.area_id = a.id
LEFT JOIN activities act ON act.initiative_id = i.id
WHERE a.id IS NOT NULL
GROUP BY t.id, t.subdomain, a.id, a.name
HAVING COUNT(DISTINCT o.id) > 0 OR COUNT(DISTINCT i.id) > 0
ORDER BY t.subdomain, a.name;

-- Resumen total
SELECT 
  COUNT(DISTINCT o.id) as total_objetivos,
  COUNT(DISTINCT i.id) as total_iniciativas,
  COUNT(DISTINCT a.id) as total_actividades,
  COUNT(DISTINCT a.id) FILTER (WHERE a.is_completed = true) as actividades_completadas
FROM objectives o
LEFT JOIN objective_initiatives oi ON oi.objective_id = o.id
LEFT JOIN initiatives i ON i.id = oi.initiative_id OR i.area_id = o.area_id
LEFT JOIN activities a ON a.initiative_id = i.id
WHERE o.area_id IS NOT NULL;