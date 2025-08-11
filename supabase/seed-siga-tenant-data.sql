-- Script específico para poblar datos del tenant SIGA (Turismo)
-- Crea objetivos, iniciativas y actividades específicas para una empresa de turismo

-- ============================================
-- PASO 1: IDENTIFICAR IDs DEL TENANT SIGA
-- ============================================

DO $$
DECLARE
  siga_tenant_id uuid;
  comercial_area_id uuid;
  producto_area_id uuid;
  operaciones_area_id uuid;
  marketing_area_id uuid;
  finanzas_area_id uuid;
  ceo_user_id uuid;
  admin_user_id uuid;
  manager_comercial_id uuid;
  manager_producto_id uuid;
BEGIN
  -- Obtener el tenant_id de SIGA
  SELECT id INTO siga_tenant_id FROM tenants WHERE subdomain = 'siga' LIMIT 1;
  
  IF siga_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant SIGA no encontrado';
  END IF;
  
  -- Obtener IDs de las áreas del tenant SIGA
  SELECT id INTO comercial_area_id FROM areas WHERE name = 'Comercial' AND tenant_id = siga_tenant_id LIMIT 1;
  SELECT id INTO producto_area_id FROM areas WHERE name = 'Producto' AND tenant_id = siga_tenant_id LIMIT 1;
  SELECT id INTO operaciones_area_id FROM areas WHERE name = 'Operaciones' AND tenant_id = siga_tenant_id LIMIT 1;
  SELECT id INTO marketing_area_id FROM areas WHERE name = 'Marketing' AND tenant_id = siga_tenant_id LIMIT 1;
  SELECT id INTO finanzas_area_id FROM areas WHERE name = 'Finanzas' AND tenant_id = siga_tenant_id LIMIT 1;
  
  -- Obtener usuarios del tenant SIGA
  SELECT id INTO ceo_user_id FROM user_profiles WHERE tenant_id = siga_tenant_id AND role = 'CEO' LIMIT 1;
  SELECT id INTO admin_user_id FROM user_profiles WHERE tenant_id = siga_tenant_id AND role = 'Admin' LIMIT 1;
  SELECT id INTO manager_comercial_id FROM user_profiles WHERE tenant_id = siga_tenant_id AND area_id = comercial_area_id AND role = 'Manager' LIMIT 1;
  SELECT id INTO manager_producto_id FROM user_profiles WHERE tenant_id = siga_tenant_id AND area_id = producto_area_id AND role = 'Manager' LIMIT 1;
  
  -- Si no hay managers, usar admin o CEO
  IF manager_comercial_id IS NULL THEN
    manager_comercial_id := COALESCE(admin_user_id, ceo_user_id);
  END IF;
  
  IF manager_producto_id IS NULL THEN
    manager_producto_id := COALESCE(admin_user_id, ceo_user_id);
  END IF;

  -- ============================================
  -- PASO 2: CREAR OBJETIVOS ESPECÍFICOS DE TURISMO PARA SIGA
  -- ============================================
  
  -- Limpiar objetivos anteriores del tenant SIGA (opcional)
  -- DELETE FROM objectives WHERE tenant_id = siga_tenant_id;
  
  -- Objetivo 1: Comercial - Incrementar Ventas de Paquetes Turísticos
  INSERT INTO objectives (
    tenant_id, area_id, title, description, created_by, 
    progress, status, priority, target_date, quarter, metrics
  ) VALUES (
    siga_tenant_id,
    comercial_area_id,
    'Incrementar Ventas de Paquetes Turísticos 30%',
    'Aumentar las ventas de paquetes turísticos en un 30% mediante expansión a nuevos mercados y optimización de canales digitales',
    ceo_user_id,
    75,
    'in_progress',
    'high',
    '2025-03-31'::date,
    'Q1',
    '["Ventas mensuales", "Conversión digital", "Nuevos clientes", "Ticket promedio"]'::jsonb
  ) ON CONFLICT DO NOTHING;
  
  -- Objetivo 2: Producto - Lanzar Experiencias Turísticas Premium
  INSERT INTO objectives (
    tenant_id, area_id, title, description, created_by,
    progress, status, priority, target_date, quarter, metrics
  ) VALUES (
    siga_tenant_id,
    producto_area_id,
    'Lanzar Línea de Experiencias Turísticas Premium',
    'Desarrollar y lanzar una nueva línea de experiencias turísticas premium enfocadas en turismo sostenible y cultural',
    ceo_user_id,
    60,
    'in_progress',
    'high',
    '2025-03-31'::date,
    'Q1',
    '["Nuevos productos lanzados", "Satisfacción del cliente", "Revenue por producto", "Net Promoter Score"]'::jsonb
  ) ON CONFLICT DO NOTHING;
  
  -- Objetivo 3: Operaciones - Optimizar Operaciones Turísticas
  IF operaciones_area_id IS NOT NULL THEN
    INSERT INTO objectives (
      tenant_id, area_id, title, description, created_by,
      progress, status, priority, target_date, quarter, metrics
    ) VALUES (
      siga_tenant_id,
      operaciones_area_id,
      'Optimizar Eficiencia Operacional en 25%',
      'Reducir costos operativos y mejorar tiempos de respuesta en la gestión de reservas y servicios turísticos',
      ceo_user_id,
      45,
      'in_progress',
      'medium',
      '2025-06-30'::date,
      'Q2',
      '["Tiempo de procesamiento", "Costo por reserva", "Índice de errores", "Satisfacción interna"]'::jsonb
    ) ON CONFLICT DO NOTHING;
  END IF;
  
  -- Objetivo 4: Marketing - Posicionamiento Digital
  IF marketing_area_id IS NOT NULL THEN
    INSERT INTO objectives (
      tenant_id, area_id, title, description, created_by,
      progress, status, priority, target_date, quarter, metrics
    ) VALUES (
      siga_tenant_id,
      marketing_area_id,
      'Líder Digital en Turismo Regional',
      'Posicionarse como la agencia de turismo digital líder en la región con 50% más de engagement',
      ceo_user_id,
      65,
      'in_progress',
      'high',
      '2025-03-31'::date,
      'Q1',
      '["Seguidores redes sociales", "Engagement rate", "Tráfico web", "Leads generados"]'::jsonb
    ) ON CONFLICT DO NOTHING;
  END IF;
  
END $$;

-- ============================================
-- PASO 3: CREAR INICIATIVAS ESPECÍFICAS DE TURISMO
-- ============================================

-- Limpiar iniciativas anteriores de prueba
DELETE FROM activities WHERE initiative_id IN (
  SELECT id FROM initiatives 
  WHERE tenant_id = (SELECT id FROM tenants WHERE subdomain = 'siga')
  AND (title LIKE 'Iniciativa de %' OR title LIKE 'Estrategia y Planificación%' OR title LIKE 'Optimización y Mejora%')
);

DELETE FROM objective_initiatives WHERE initiative_id IN (
  SELECT id FROM initiatives 
  WHERE tenant_id = (SELECT id FROM tenants WHERE subdomain = 'siga')
  AND (title LIKE 'Iniciativa de %' OR title LIKE 'Estrategia y Planificación%' OR title LIKE 'Optimización y Mejora%')
);

DELETE FROM initiatives 
WHERE tenant_id = (SELECT id FROM tenants WHERE subdomain = 'siga')
AND (title LIKE 'Iniciativa de %' OR title LIKE 'Estrategia y Planificación%' OR title LIKE 'Optimización y Mejora%');

-- Crear iniciativas específicas para cada objetivo de SIGA
DO $$
DECLARE
  siga_tenant_id uuid;
  obj RECORD;
  init_id uuid;
  act_id uuid;
  i INTEGER;
  j INTEGER;
BEGIN
  -- Obtener tenant SIGA
  SELECT id INTO siga_tenant_id FROM tenants WHERE subdomain = 'siga' LIMIT 1;
  
  -- Para cada objetivo del tenant SIGA
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
    WHERE o.tenant_id = siga_tenant_id
    AND o.area_id IS NOT NULL
    ORDER BY o.created_at
  LOOP
    -- Crear iniciativas basadas en el área
    IF obj.area_name = 'Comercial' THEN
      -- Iniciativa 1: Expansión Digital
      init_id := gen_random_uuid();
      INSERT INTO initiatives (
        id, tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date
      ) VALUES (
        init_id,
        obj.tenant_id,
        obj.area_id,
        'Expansión de Canales Digitales de Venta',
        'Implementar nueva plataforma e-commerce y fortalecer presencia en OTAs (Online Travel Agencies)',
        85,
        obj.created_by,
        'in_progress',
        '2025-01-01'::date,
        '2025-02-28'::date
      );
      
      -- Vincular con objetivo
      INSERT INTO objective_initiatives (objective_id, initiative_id) VALUES (obj.objective_id, init_id);
      
      -- Crear actividades para Expansión Digital
      INSERT INTO activities (initiative_id, title, description, is_completed, assigned_to) VALUES
        (init_id, 'Implementar nueva plataforma e-commerce', 'Desarrollo y lanzamiento de tienda online con booking engine integrado', true, obj.created_by),
        (init_id, 'Integración con Booking y Expedia', 'Conectar inventario con principales OTAs del mercado', true, obj.created_by),
        (init_id, 'Optimización SEO y SEM', 'Mejorar posicionamiento orgánico y campañas pagadas', false, obj.created_by);
      
      -- Iniciativa 2: Programa B2B
      init_id := gen_random_uuid();
      INSERT INTO initiatives (
        id, tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date
      ) VALUES (
        init_id,
        obj.tenant_id,
        obj.area_id,
        'Programa de Alianzas B2B',
        'Desarrollar red de partnerships con hoteles, aerolíneas y empresas locales',
        60,
        obj.created_by,
        'in_progress',
        '2025-01-15'::date,
        '2025-03-15'::date
      );
      
      INSERT INTO objective_initiatives (objective_id, initiative_id) VALUES (obj.objective_id, init_id);
      
      INSERT INTO activities (initiative_id, title, description, is_completed, assigned_to) VALUES
        (init_id, 'Firmar acuerdos con 10 hoteles premium', 'Negociar tarifas preferenciales con hoteles 4-5 estrellas', true, obj.created_by),
        (init_id, 'Alianza con aerolíneas regionales', 'Establecer convenios con 3 aerolíneas principales', false, obj.created_by),
        (init_id, 'Red de proveedores locales', 'Incorporar 20 proveedores de experiencias locales', false, obj.created_by);
      
      -- Iniciativa 3: Fidelización
      init_id := gen_random_uuid();
      INSERT INTO initiatives (
        id, tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date
      ) VALUES (
        init_id,
        obj.tenant_id,
        obj.area_id,
        'Programa de Fidelización y CRM',
        'Implementar programa de puntos y sistema CRM para gestión de clientes',
        30,
        obj.created_by,
        'planning',
        '2025-02-01'::date,
        '2025-04-30'::date
      );
      
      INSERT INTO objective_initiatives (objective_id, initiative_id) VALUES (obj.objective_id, init_id);
      
      INSERT INTO activities (initiative_id, title, description, is_completed, assigned_to) VALUES
        (init_id, 'Diseño del programa de puntos', 'Definir mecánica y beneficios del programa de fidelización', false, obj.created_by),
        (init_id, 'Implementación de CRM', 'Configurar Salesforce o HubSpot para gestión de clientes', false, obj.created_by),
        (init_id, 'Campaña de lanzamiento', 'Lanzar programa con promoción especial para primeros 1000 socios', false, obj.created_by);
      
    ELSIF obj.area_name = 'Producto' THEN
      -- Iniciativa 1: Turismo Sostenible
      init_id := gen_random_uuid();
      INSERT INTO initiatives (
        id, tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date
      ) VALUES (
        init_id,
        obj.tenant_id,
        obj.area_id,
        'Desarrollo de Productos de Turismo Sostenible',
        'Crear línea de paquetes eco-friendly con certificación de sostenibilidad',
        70,
        obj.created_by,
        'in_progress',
        '2025-01-01'::date,
        '2025-03-31'::date
      );
      
      INSERT INTO objective_initiatives (objective_id, initiative_id) VALUES (obj.objective_id, init_id);
      
      INSERT INTO activities (initiative_id, title, description, is_completed, assigned_to) VALUES
        (init_id, 'Diseño de 5 rutas eco-turísticas', 'Crear rutas en reservas naturales y comunidades locales', true, obj.created_by),
        (init_id, 'Certificación de sostenibilidad', 'Obtener certificación Rainforest Alliance o similar', true, obj.created_by),
        (init_id, 'Capacitación de guías en eco-turismo', 'Formar 10 guías especializados en turismo sostenible', false, obj.created_by);
      
      -- Iniciativa 2: Experiencias Gastronómicas
      init_id := gen_random_uuid();
      INSERT INTO initiatives (
        id, tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date
      ) VALUES (
        init_id,
        obj.tenant_id,
        obj.area_id,
        'Tours Gastronómicos Premium',
        'Lanzar experiencias culinarias con chefs locales y restaurantes destacados',
        45,
        obj.created_by,
        'in_progress',
        '2025-01-15'::date,
        '2025-04-15'::date
      );
      
      INSERT INTO objective_initiatives (objective_id, initiative_id) VALUES (obj.objective_id, init_id);
      
      INSERT INTO activities (initiative_id, title, description, is_completed, assigned_to) VALUES
        (init_id, 'Partnership con 10 restaurantes top', 'Acuerdos con restaurantes premiados de la región', true, obj.created_by),
        (init_id, 'Diseño de 3 rutas gastronómicas', 'Crear tours temáticos: vinos, cocina tradicional, fusión', false, obj.created_by),
        (init_id, 'Eventos exclusivos con chefs', 'Organizar cenas privadas y clases de cocina', false, obj.created_by);
      
      -- Iniciativa 3: Turismo Cultural
      init_id := gen_random_uuid();
      INSERT INTO initiatives (
        id, tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date
      ) VALUES (
        init_id,
        obj.tenant_id,
        obj.area_id,
        'Experiencias Culturales Inmersivas',
        'Desarrollar tours culturales con comunidades locales y sitios patrimoniales',
        20,
        obj.created_by,
        'planning',
        '2025-02-01'::date,
        '2025-05-31'::date
      );
      
      INSERT INTO objective_initiatives (objective_id, initiative_id) VALUES (obj.objective_id, init_id);
      
      INSERT INTO activities (initiative_id, title, description, is_completed, assigned_to) VALUES
        (init_id, 'Mapeo de sitios patrimoniales', 'Identificar y documentar 20 sitios de interés cultural', false, obj.created_by),
        (init_id, 'Alianzas con comunidades indígenas', 'Establecer convenios para turismo comunitario', false, obj.created_by),
        (init_id, 'Formación de guías culturales', 'Capacitar guías en historia y tradiciones locales', false, obj.created_by);
      
    ELSIF obj.area_name = 'Marketing' THEN
      -- Iniciativas de Marketing Digital
      init_id := gen_random_uuid();
      INSERT INTO initiatives (
        id, tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date
      ) VALUES (
        init_id,
        obj.tenant_id,
        obj.area_id,
        'Campaña Digital 360°',
        'Estrategia integral de marketing digital multi-canal',
        65,
        obj.created_by,
        'in_progress',
        '2025-01-01'::date,
        '2025-03-31'::date
      );
      
      INSERT INTO objective_initiatives (objective_id, initiative_id) VALUES (obj.objective_id, init_id);
      
      INSERT INTO activities (initiative_id, title, description, is_completed, assigned_to) VALUES
        (init_id, 'Rediseño de website responsive', 'Nueva web con booking engine y chat en vivo', true, obj.created_by),
        (init_id, 'Campaña en redes sociales', 'Contenido diario en Instagram, Facebook y TikTok', true, obj.created_by),
        (init_id, 'Influencer marketing', 'Colaboración con 10 travel influencers', false, obj.created_by);
        
    ELSIF obj.area_name = 'Operaciones' THEN
      -- Iniciativas de Optimización Operacional
      init_id := gen_random_uuid();
      INSERT INTO initiatives (
        id, tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date
      ) VALUES (
        init_id,
        obj.tenant_id,
        obj.area_id,
        'Digitalización de Operaciones',
        'Automatizar procesos de reservas y gestión de servicios',
        45,
        obj.created_by,
        'in_progress',
        '2025-01-15'::date,
        '2025-06-30'::date
      );
      
      INSERT INTO objective_initiatives (objective_id, initiative_id) VALUES (obj.objective_id, init_id);
      
      INSERT INTO activities (initiative_id, title, description, is_completed, assigned_to) VALUES
        (init_id, 'Sistema de reservas automatizado', 'Implementar PMS integrado con canales de venta', true, obj.created_by),
        (init_id, 'App móvil para guías turísticos', 'Aplicación para gestión de tours en tiempo real', false, obj.created_by),
        (init_id, 'Dashboard de control operacional', 'Panel de control con KPIs en tiempo real', false, obj.created_by);
    END IF;
    
  END LOOP;
END $$;

-- ============================================
-- PASO 4: CREAR QUARTERS Y VINCULAR
-- ============================================

-- Crear quarters para 2025 si no existen
INSERT INTO quarters (tenant_id, quarter_name, start_date, end_date)
SELECT 
  (SELECT id FROM tenants WHERE subdomain = 'siga'),
  q.quarter_name,
  q.start_date,
  q.end_date
FROM (VALUES 
  ('Q1', '2025-01-01'::date, '2025-03-31'::date),
  ('Q2', '2025-04-01'::date, '2025-06-30'::date),
  ('Q3', '2025-07-01'::date, '2025-09-30'::date),
  ('Q4', '2025-10-01'::date, '2025-12-31'::date)
) AS q(quarter_name, start_date, end_date)
WHERE NOT EXISTS (
  SELECT 1 FROM quarters 
  WHERE tenant_id = (SELECT id FROM tenants WHERE subdomain = 'siga')
  AND quarter_name = q.quarter_name
)
ON CONFLICT DO NOTHING;

-- Vincular objetivos con quarters
INSERT INTO objective_quarters (objective_id, quarter_id)
SELECT DISTINCT
  o.id,
  q.id
FROM objectives o
INNER JOIN quarters q ON o.tenant_id = q.tenant_id
WHERE o.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'siga')
  AND o.quarter = q.quarter_name
  AND NOT EXISTS (
    SELECT 1 FROM objective_quarters oq 
    WHERE oq.objective_id = o.id 
    AND oq.quarter_id = q.id
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 5: ACTUALIZAR PROGRESO
-- ============================================

-- Actualizar progreso de iniciativas basado en actividades
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
WHERE i.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'siga')
  AND EXISTS (
    SELECT 1 FROM activities a WHERE a.initiative_id = i.id
  );

-- ============================================
-- PASO 6: RESUMEN FINAL PARA SIGA
-- ============================================

-- Vista detallada del tenant SIGA
WITH siga_summary AS (
  SELECT 
    a.name as area,
    COUNT(DISTINCT o.id) as num_objetivos,
    COUNT(DISTINCT i.id) as num_iniciativas,
    COUNT(DISTINCT act.id) as num_actividades,
    COUNT(DISTINCT act.id) FILTER (WHERE act.is_completed = true) as actividades_completadas,
    ROUND(AVG(o.progress)) as progreso_objetivos,
    ROUND(AVG(i.progress)) as progreso_iniciativas
  FROM areas a
  LEFT JOIN objectives o ON o.area_id = a.id
  LEFT JOIN initiatives i ON i.area_id = a.id
  LEFT JOIN activities act ON act.initiative_id = i.id
  WHERE a.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'siga')
  GROUP BY a.id, a.name
  HAVING COUNT(DISTINCT o.id) > 0 OR COUNT(DISTINCT i.id) > 0
  ORDER BY a.name
)
SELECT 
  'SIGA - Turismo' as tenant,
  area,
  num_objetivos as objetivos,
  num_iniciativas as iniciativas,
  num_actividades as actividades,
  actividades_completadas as completadas,
  progreso_objetivos || '%' as prog_obj,
  progreso_iniciativas || '%' as prog_init
FROM siga_summary;

-- Resumen total SIGA
SELECT 
  'TOTAL SIGA' as resumen,
  COUNT(DISTINCT o.id) as total_objetivos,
  COUNT(DISTINCT i.id) as total_iniciativas,
  COUNT(DISTINCT a.id) as total_actividades,
  COUNT(DISTINCT a.id) FILTER (WHERE a.is_completed = true) as completadas,
  ROUND(AVG(o.progress)) || '%' as progreso_promedio
FROM objectives o
LEFT JOIN initiatives i ON i.area_id = o.area_id
LEFT JOIN activities a ON a.initiative_id = i.id
WHERE o.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'siga');