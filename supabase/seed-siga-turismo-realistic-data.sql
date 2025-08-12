-- Datos realistas para SIGA Turismo - Empresa de Turismo y Viajes
-- Este script genera datos abundantes y realistas para testing de gráficos y funcionalidad

-- ============================================
-- PASO 1: LIMPIAR DATOS EXISTENTES DE SIGA
-- ============================================

DO $$
DECLARE
  siga_tenant_id uuid;
BEGIN
  -- Obtener el tenant_id de SIGA
  SELECT id INTO siga_tenant_id FROM tenants WHERE subdomain = 'siga' LIMIT 1;
  
  IF siga_tenant_id IS NOT NULL THEN
    -- Limpiar datos existentes de SIGA en orden correcto (respetando FK)
    DELETE FROM activities WHERE initiative_id IN (
      SELECT id FROM initiatives WHERE tenant_id = siga_tenant_id
    );
    DELETE FROM progress_history WHERE initiative_id IN (
      SELECT id FROM initiatives WHERE tenant_id = siga_tenant_id
    );
    DELETE FROM objective_initiatives WHERE objective_id IN (
      SELECT id FROM objectives WHERE tenant_id = siga_tenant_id
    );
    DELETE FROM objective_quarters WHERE objective_id IN (
      SELECT id FROM objectives WHERE tenant_id = siga_tenant_id
    );
    DELETE FROM initiatives WHERE tenant_id = siga_tenant_id;
    DELETE FROM objectives WHERE tenant_id = siga_tenant_id;
    DELETE FROM quarters WHERE tenant_id = siga_tenant_id;
    
    RAISE NOTICE 'Datos existentes de SIGA limpiados';
  END IF;
END $$;

-- ============================================
-- PASO 2: CREAR QUARTERS PARA 2025
-- ============================================

INSERT INTO quarters (tenant_id, quarter_name, start_date, end_date)
SELECT 
  t.id,
  quarter_data.name,
  quarter_data.start_date,
  quarter_data.end_date
FROM tenants t
CROSS JOIN (
  VALUES 
    ('Q1', '2025-01-01'::date, '2025-03-31'::date),
    ('Q2', '2025-04-01'::date, '2025-06-30'::date),
    ('Q3', '2025-07-01'::date, '2025-09-30'::date),
    ('Q4', '2025-10-01'::date, '2025-12-31'::date)
) AS quarter_data(name, start_date, end_date)
WHERE t.subdomain = 'siga'
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 3: CREAR ÁREAS ESPECÍFICAS DE TURISMO
-- ============================================

DO $$
DECLARE
  siga_tenant_id uuid;
  ceo_user_id uuid;
BEGIN
  -- Obtener IDs necesarios
  SELECT id INTO siga_tenant_id FROM tenants WHERE subdomain = 'siga' LIMIT 1;
  SELECT id INTO ceo_user_id FROM user_profiles WHERE tenant_id = siga_tenant_id AND role = 'CEO' LIMIT 1;
  
  -- Limpiar áreas existentes
  DELETE FROM areas WHERE tenant_id = siga_tenant_id;
  
  -- Crear áreas específicas de turismo
  INSERT INTO areas (tenant_id, name, description, created_at) VALUES
  (siga_tenant_id, 'Ventas y Reservas', 'Gestión de ventas, reservas y atención al cliente', NOW() - INTERVAL '6 months'),
  (siga_tenant_id, 'Productos Turísticos', 'Desarrollo y gestión de paquetes y experiencias turísticas', NOW() - INTERVAL '6 months'),
  (siga_tenant_id, 'Marketing Digital', 'Promoción digital, redes sociales y campañas publicitarias', NOW() - INTERVAL '5 months'),
  (siga_tenant_id, 'Operaciones', 'Logística, proveedores y coordinación de servicios', NOW() - INTERVAL '5 months'),
  (siga_tenant_id, 'Experiencia del Cliente', 'Calidad del servicio y satisfacción del cliente', NOW() - INTERVAL '4 months'),
  (siga_tenant_id, 'Tecnología', 'Plataformas digitales, apps y sistemas internos', NOW() - INTERVAL '4 months'),
  (siga_tenant_id, 'Alianzas Estratégicas', 'Partnerships con hoteles, aerolíneas y operadores', NOW() - INTERVAL '3 months');
  
  RAISE NOTICE 'Áreas de SIGA Turismo creadas';
END $$;

-- ============================================
-- PASO 4: CREAR OBJETIVOS ESTRATÉGICOS REALISTAS
-- ============================================

DO $$
DECLARE
  siga_tenant_id uuid;
  ceo_user_id uuid;
  area_ventas_id uuid;
  area_productos_id uuid;
  area_marketing_id uuid;
  area_operaciones_id uuid;
  area_experiencia_id uuid;
  area_tecnologia_id uuid;
  area_alianzas_id uuid;
  q1_id uuid;
  q2_id uuid;
  q3_id uuid;
  q4_id uuid;
BEGIN
  -- Obtener IDs necesarios
  SELECT id INTO siga_tenant_id FROM tenants WHERE subdomain = 'siga' LIMIT 1;
  SELECT id INTO ceo_user_id FROM user_profiles WHERE tenant_id = siga_tenant_id AND role = 'CEO' LIMIT 1;
  
  SELECT id INTO area_ventas_id FROM areas WHERE tenant_id = siga_tenant_id AND name = 'Ventas y Reservas';
  SELECT id INTO area_productos_id FROM areas WHERE tenant_id = siga_tenant_id AND name = 'Productos Turísticos';
  SELECT id INTO area_marketing_id FROM areas WHERE tenant_id = siga_tenant_id AND name = 'Marketing Digital';
  SELECT id INTO area_operaciones_id FROM areas WHERE tenant_id = siga_tenant_id AND name = 'Operaciones';
  SELECT id INTO area_experiencia_id FROM areas WHERE tenant_id = siga_tenant_id AND name = 'Experiencia del Cliente';
  SELECT id INTO area_tecnologia_id FROM areas WHERE tenant_id = siga_tenant_id AND name = 'Tecnología';
  SELECT id INTO area_alianzas_id FROM areas WHERE tenant_id = siga_tenant_id AND name = 'Alianzas Estratégicas';
  
  SELECT id INTO q1_id FROM quarters WHERE tenant_id = siga_tenant_id AND quarter_name = 'Q1';
  SELECT id INTO q2_id FROM quarters WHERE tenant_id = siga_tenant_id AND quarter_name = 'Q2';
  SELECT id INTO q3_id FROM quarters WHERE tenant_id = siga_tenant_id AND quarter_name = 'Q3';
  SELECT id INTO q4_id FROM quarters WHERE tenant_id = siga_tenant_id AND quarter_name = 'Q4';
  
  -- Crear objetivos estratégicos
  INSERT INTO objectives (tenant_id, area_id, title, description, created_by, status, progress, target_date, created_at) VALUES
  
  -- Q1 2025 - Objetivos
  (siga_tenant_id, area_ventas_id, 'Incrementar Ventas Q1 en 25%', 'Aumentar las ventas totales del primer trimestre en un 25% comparado con Q1 2024', ceo_user_id, 'in_progress', 78, '2025-03-31', NOW() - INTERVAL '2 months'),
  (siga_tenant_id, area_productos_id, 'Lanzar 3 Nuevos Paquetes Turísticos', 'Desarrollar y lanzar 3 nuevos paquetes turísticos enfocados en turismo sostenible', ceo_user_id, 'in_progress', 65, '2025-03-31', NOW() - INTERVAL '2 months'),
  (siga_tenant_id, area_marketing_id, 'Alcanzar 50K Seguidores en Redes', 'Crecer la base de seguidores en redes sociales a 50,000 personas', ceo_user_id, 'in_progress', 82, '2025-03-31', NOW() - INTERVAL '2 months'),
  
  -- Q2 2025 - Objetivos
  (siga_tenant_id, area_experiencia_id, 'Mejorar NPS a 85 puntos', 'Incrementar el Net Promoter Score de clientes a 85 puntos o más', ceo_user_id, 'planning', 0, '2025-06-30', NOW() - INTERVAL '1 month'),
  (siga_tenant_id, area_tecnologia_id, 'Implementar Nueva App Móvil', 'Desarrollar e implementar aplicación móvil para reservas y gestión de viajes', ceo_user_id, 'planning', 15, '2025-06-30', NOW() - INTERVAL '1 month'),
  (siga_tenant_id, area_operaciones_id, 'Optimizar Cadena de Suministros', 'Mejorar eficiencia operativa y reducir costos en 15%', ceo_user_id, 'planning', 8, '2025-06-30', NOW() - INTERVAL '1 month'),
  
  -- Q3 2025 - Objetivos
  (siga_tenant_id, area_alianzas_id, 'Establecer 10 Alianzas Estratégicas', 'Crear partnerships con hoteles boutique y aerolíneas regionales', ceo_user_id, 'planning', 0, '2025-09-30', NOW() - INTERVAL '3 weeks'),
  (siga_tenant_id, area_marketing_id, 'Campaña Temporada Alta', 'Ejecutar campaña integral para temporada alta de turismo', ceo_user_id, 'planning', 0, '2025-09-30', NOW() - INTERVAL '3 weeks'),
  
  -- Q4 2025 - Objetivos
  (siga_tenant_id, area_ventas_id, 'Cierre Anual con 40% Crecimiento', 'Alcanzar crecimiento anual del 40% en ingresos totales', ceo_user_id, 'planning', 0, '2025-12-31', NOW() - INTERVAL '2 weeks'),
  (siga_tenant_id, area_productos_id, 'Certificación Turismo Sostenible', 'Obtener certificación internacional de turismo sostenible', ceo_user_id, 'planning', 0, '2025-12-31', NOW() - INTERVAL '2 weeks');
  
  RAISE NOTICE 'Objetivos estratégicos de SIGA Turismo creados';
END $$;

-- ============================================
-- PASO 5: VINCULAR OBJETIVOS CON QUARTERS
-- ============================================

INSERT INTO objective_quarters (objective_id, quarter_id)
SELECT 
  o.id,
  q.id
FROM objectives o
JOIN quarters q ON o.tenant_id = q.tenant_id
JOIN tenants t ON o.tenant_id = t.id
WHERE t.subdomain = 'siga'
  AND (
    (o.target_date BETWEEN q.start_date AND q.end_date) OR
    (q.quarter_name = 'Q1' AND o.title LIKE '%Q1%') OR
    (q.quarter_name = 'Q2' AND o.title LIKE '%Q2%') OR
    (q.quarter_name = 'Q3' AND o.title LIKE '%Q3%') OR
    (q.quarter_name = 'Q4' AND o.title LIKE '%Q4%') OR
    (q.quarter_name = 'Q1' AND o.target_date <= '2025-03-31') OR
    (q.quarter_name = 'Q2' AND o.target_date <= '2025-06-30' AND o.target_date > '2025-03-31') OR
    (q.quarter_name = 'Q3' AND o.target_date <= '2025-09-30' AND o.target_date > '2025-06-30') OR
    (q.quarter_name = 'Q4' AND o.target_date <= '2025-12-31' AND o.target_date > '2025-09-30')
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 6: CREAR INICIATIVAS DETALLADAS Y REALISTAS
-- ============================================

DO $$
DECLARE
  siga_tenant_id uuid;
  objective_rec RECORD;
  initiative_id uuid;
  user_id uuid;
  area_users uuid[];
  random_user uuid;
BEGIN
  SELECT id INTO siga_tenant_id FROM tenants WHERE subdomain = 'siga' LIMIT 1;
  
  -- Para cada objetivo, crear entre 3-5 iniciativas
  FOR objective_rec IN 
    SELECT 
      o.id as objective_id,
      o.title as objective_title,
      o.area_id,
      o.progress as obj_progress,
      a.name as area_name
    FROM objectives o
    JOIN areas a ON o.area_id = a.id
    WHERE o.tenant_id = siga_tenant_id
    ORDER BY o.created_at
  LOOP
    
    -- Obtener usuarios del área
    SELECT ARRAY_AGG(id) INTO area_users 
    FROM user_profiles 
    WHERE tenant_id = siga_tenant_id AND (area_id = objective_rec.area_id OR role IN ('CEO', 'Admin'));
    
    -- Crear iniciativas específicas por área y objetivo
    IF objective_rec.area_name = 'Ventas y Reservas' THEN
      
      IF objective_rec.objective_title LIKE '%Incrementar Ventas Q1%' THEN
        -- Iniciativas para incrementar ventas Q1
        INSERT INTO initiatives (tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date, created_at) VALUES
        (siga_tenant_id, objective_rec.area_id, 'Campaña Promocional Año Nuevo', 'Lanzar campaña especial para viajes de Año Nuevo y Enero', 95, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'completed', '2024-12-01', '2025-01-31', NOW() - INTERVAL '8 weeks'),
        (siga_tenant_id, objective_rec.area_id, 'Programa de Descuentos Tempranos', 'Implementar descuentos por reserva anticipada', 87, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2024-12-15', '2025-02-28', NOW() - INTERVAL '7 weeks'),
        (siga_tenant_id, objective_rec.area_id, 'Capacitación Equipo Ventas', 'Entrenar al equipo en técnicas de venta consultiva', 92, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2025-01-05', '2025-03-15', NOW() - INTERVAL '6 weeks'),
        (siga_tenant_id, objective_rec.area_id, 'CRM Optimization', 'Optimizar procesos de CRM para mejorar conversión', 74, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2025-01-10', '2025-03-31', NOW() - INTERVAL '5 weeks');
        
      ELSIF objective_rec.objective_title LIKE '%Cierre Anual%' THEN
        -- Iniciativas para cierre anual
        INSERT INTO initiatives (tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date, created_at) VALUES
        (siga_tenant_id, objective_rec.area_id, 'Black Friday Turístico', 'Campaña especial de ofertas para Black Friday', 25, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'planning', '2025-10-01', '2025-11-30', NOW() - INTERVAL '2 weeks'),
        (siga_tenant_id, objective_rec.area_id, 'Programa Fidelización Premium', 'Lanzar programa VIP para clientes frecuentes', 18, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'planning', '2025-09-01', '2025-12-31', NOW() - INTERVAL '2 weeks'),
        (siga_tenant_id, objective_rec.area_id, 'Expansion Mercados B2B', 'Desarrollar canal de ventas corporativas', 12, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'planning', '2025-10-15', '2025-12-31', NOW() - INTERVAL '1 week');
      END IF;
      
    ELSIF objective_rec.area_name = 'Productos Turísticos' THEN
      
      IF objective_rec.objective_title LIKE '%3 Nuevos Paquetes%' THEN
        INSERT INTO initiatives (tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date, created_at) VALUES
        (siga_tenant_id, objective_rec.area_id, 'Paquete Ecoturismo Amazónico', 'Desarrollar experiencia de ecoturismo en la Amazonía', 78, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2024-12-01', '2025-03-15', NOW() - INTERVAL '8 weeks'),
        (siga_tenant_id, objective_rec.area_id, 'Ruta Gastronómica Andina', 'Crear paquete gastronómico por la región andina', 65, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2024-12-15', '2025-03-31', NOW() - INTERVAL '7 weeks'),
        (siga_tenant_id, objective_rec.area_id, 'Aventura Costera Sostenible', 'Diseñar experiencia de aventura en la costa', 52, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2025-01-01', '2025-03-31', NOW() - INTERVAL '6 weeks'),
        (siga_tenant_id, objective_rec.area_id, 'Certificación Productos Sostenibles', 'Obtener certificaciones ambientales para paquetes', 71, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2025-01-15', '2025-04-30', NOW() - INTERVAL '5 weeks');
        
      ELSIF objective_rec.objective_title LIKE '%Certificación%' THEN
        INSERT INTO initiatives (tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date, created_at) VALUES
        (siga_tenant_id, objective_rec.area_id, 'Auditoría Sostenibilidad', 'Realizar auditoría completa de prácticas sostenibles', 15, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'planning', '2025-08-01', '2025-10-31', NOW() - INTERVAL '2 weeks'),
        (siga_tenant_id, objective_rec.area_id, 'Capacitación Guías Sostenibles', 'Entrenar guías en prácticas de turismo sostenible', 8, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'planning', '2025-09-01', '2025-11-30', NOW() - INTERVAL '2 weeks'),
        (siga_tenant_id, objective_rec.area_id, 'Implementación Estándares', 'Implementar estándares internacionales de sostenibilidad', 5, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'planning', '2025-10-01', '2025-12-31', NOW() - INTERVAL '1 week');
      END IF;
      
    ELSIF objective_rec.area_name = 'Marketing Digital' THEN
      
      IF objective_rec.objective_title LIKE '%50K Seguidores%' THEN
        INSERT INTO initiatives (tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date, created_at) VALUES
        (siga_tenant_id, objective_rec.area_id, 'Contenido Video Destinos', 'Crear contenido video de alta calidad de destinos', 89, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2024-11-01', '2025-03-31', NOW() - INTERVAL '10 weeks'),
        (siga_tenant_id, objective_rec.area_id, 'Colaboraciones Influencers', 'Partnerships con travel influencers', 85, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2024-12-01', '2025-03-31', NOW() - INTERVAL '8 weeks'),
        (siga_tenant_id, objective_rec.area_id, 'Campañas Ads Segmentadas', 'Campañas publicitarias dirigidas por demografía', 76, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2025-01-01', '2025-03-31', NOW() - INTERVAL '6 weeks'),
        (siga_tenant_id, objective_rec.area_id, 'Concursos y Sorteos', 'Estrategia de engagement con concursos', 92, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2024-12-15', '2025-03-15', NOW() - INTERVAL '7 weeks');
        
      ELSIF objective_rec.objective_title LIKE '%Campaña Temporada Alta%' THEN
        INSERT INTO initiatives (tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date, created_at) VALUES
        (siga_tenant_id, objective_rec.area_id, 'Estrategia Omnicanal Verano', 'Campaña integrada para temporada de verano', 22, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'planning', '2025-06-01', '2025-09-30', NOW() - INTERVAL '3 weeks'),
        (siga_tenant_id, objective_rec.area_id, 'Remarketing Inteligente', 'Sistema de remarketing basado en comportamiento', 18, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'planning', '2025-06-15', '2025-09-30', NOW() - INTERVAL '3 weeks'),
        (siga_tenant_id, objective_rec.area_id, 'Partnerships Medios', 'Alianzas con medios de comunicación', 12, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'planning', '2025-07-01', '2025-09-30', NOW() - INTERVAL '2 weeks');
      END IF;
      
    ELSIF objective_rec.area_name = 'Experiencia del Cliente' THEN
      
      INSERT INTO initiatives (tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date, created_at) VALUES
      (siga_tenant_id, objective_rec.area_id, 'Sistema Feedback Tiempo Real', 'Implementar sistema de feedback en tiempo real', 45, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2025-02-01', '2025-06-30', NOW() - INTERVAL '4 weeks'),
      (siga_tenant_id, objective_rec.area_id, 'Capacitación Servicio Excepcional', 'Entrenar equipo en servicio al cliente excepcional', 38, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2025-02-15', '2025-06-30', NOW() - INTERVAL '3 weeks'),
      (siga_tenant_id, objective_rec.area_id, 'Personalización Experiencias', 'Crear experiencias personalizadas por cliente', 28, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'planning', '2025-03-01', '2025-06-30', NOW() - INTERVAL '3 weeks'),
      (siga_tenant_id, objective_rec.area_id, 'Programa Compensación Quejas', 'Sistema estructurado para manejo de quejas', 52, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2025-01-15', '2025-05-31', NOW() - INTERVAL '5 weeks');
      
    ELSIF objective_rec.area_name = 'Tecnología' THEN
      
      INSERT INTO initiatives (tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date, created_at) VALUES
      (siga_tenant_id, objective_rec.area_id, 'Desarrollo App iOS/Android', 'Crear aplicación nativa para iOS y Android', 32, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2025-01-01', '2025-06-30', NOW() - INTERVAL '6 weeks'),
      (siga_tenant_id, objective_rec.area_id, 'Integración APIs Terceros', 'Conectar con APIs de aerolíneas y hoteles', 28, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2025-01-15', '2025-06-30', NOW() - INTERVAL '5 weeks'),
      (siga_tenant_id, objective_rec.area_id, 'Sistema Notificaciones Push', 'Implementar notificaciones inteligentes', 18, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'planning', '2025-03-01', '2025-06-30', NOW() - INTERVAL '3 weeks'),
      (siga_tenant_id, objective_rec.area_id, 'Portal Self-Service', 'Crear portal de autogestión para clientes', 24, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'planning', '2025-02-01', '2025-06-30', NOW() - INTERVAL '4 weeks');
      
    ELSIF objective_rec.area_name = 'Operaciones' THEN
      
      INSERT INTO initiatives (tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date, created_at) VALUES
      (siga_tenant_id, objective_rec.area_id, 'Automatización Procesos', 'Automatizar procesos operativos repetitivos', 35, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2025-02-01', '2025-06-30', NOW() - INTERVAL '4 weeks'),
      (siga_tenant_id, objective_rec.area_id, 'Optimización Inventario', 'Sistema inteligente de gestión de inventario', 28, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2025-02-15', '2025-06-30', NOW() - INTERVAL '3 weeks'),
      (siga_tenant_id, objective_rec.area_id, 'Red Proveedores Estratégicos', 'Crear red sólida de proveedores confiables', 42, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2025-01-01', '2025-06-30', NOW() - INTERVAL '6 weeks'),
      (siga_tenant_id, objective_rec.area_id, 'Sistema Calidad ISO', 'Implementar sistema de calidad ISO 9001', 15, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'planning', '2025-03-01', '2025-08-31', NOW() - INTERVAL '3 weeks');
      
    ELSIF objective_rec.area_name = 'Alianzas Estratégicas' THEN
      
      INSERT INTO initiatives (tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date, created_at) VALUES
      (siga_tenant_id, objective_rec.area_id, 'Partnership Hoteles Boutique', 'Alianzas con hoteles boutique exclusivos', 22, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'planning', '2025-05-01', '2025-09-30', NOW() - INTERVAL '3 weeks'),
      (siga_tenant_id, objective_rec.area_id, 'Acuerdos Aerolíneas Regionales', 'Convenios preferenciales con aerolíneas', 18, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'planning', '2025-06-01', '2025-09-30', NOW() - INTERVAL '2 weeks'),
      (siga_tenant_id, objective_rec.area_id, 'Red Guías Certificados', 'Crear red de guías turísticos certificados', 35, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'in_progress', '2025-04-01', '2025-09-30', NOW() - INTERVAL '4 weeks'),
      (siga_tenant_id, objective_rec.area_id, 'Convenios Universidades', 'Alianzas con universidades para pasantías', 28, area_users[1 + random() * (array_length(area_users, 1) - 1)], 'planning', '2025-05-15', '2025-09-30', NOW() - INTERVAL '3 weeks');
      
    END IF;
    
  END LOOP;
  
  RAISE NOTICE 'Iniciativas de SIGA Turismo creadas';
END $$;

-- ============================================
-- PASO 7: VINCULAR INICIATIVAS CON OBJETIVOS
-- ============================================

INSERT INTO objective_initiatives (objective_id, initiative_id)
SELECT 
  o.id,
  i.id
FROM objectives o
JOIN initiatives i ON o.area_id = i.area_id
WHERE o.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'siga' LIMIT 1)
  AND i.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'siga' LIMIT 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 8: CREAR ACTIVIDADES DETALLADAS
-- ============================================

DO $$
DECLARE
  initiative_rec RECORD;
  activity_templates TEXT[];
  template TEXT;
  user_id uuid;
  siga_tenant_id uuid;
  area_users uuid[];
  completion_rate FLOAT;
BEGIN
  SELECT id INTO siga_tenant_id FROM tenants WHERE subdomain = 'siga' LIMIT 1;
  
  FOR initiative_rec IN 
    SELECT 
      i.id as initiative_id,
      i.title as initiative_title,
      i.progress,
      i.area_id,
      i.status,
      a.name as area_name
    FROM initiatives i
    JOIN areas a ON i.area_id = a.id
    WHERE i.tenant_id = siga_tenant_id
  LOOP
    
    -- Obtener usuarios del área
    SELECT ARRAY_AGG(id) INTO area_users 
    FROM user_profiles 
    WHERE tenant_id = siga_tenant_id AND (area_id = initiative_rec.area_id OR role IN ('CEO', 'Admin'));
    
    -- Definir plantillas de actividades según el tipo de iniciativa
    IF initiative_rec.initiative_title LIKE '%Campaña%' THEN
      activity_templates := ARRAY[
        'Investigación de mercado y análisis competencia',
        'Definición de buyer personas y segmentación',
        'Creación de brief creativo y concepto',
        'Desarrollo de assets creativos (imágenes, videos)',
        'Configuración de campañas en plataformas digitales',
        'Lanzamiento y monitoreo inicial',
        'Optimización basada en métricas de performance',
        'Análisis de resultados y ROI'
      ];
    ELSIF initiative_rec.initiative_title LIKE '%App%' OR initiative_rec.initiative_title LIKE '%Sistema%' THEN
      activity_templates := ARRAY[
        'Análisis de requerimientos técnicos',
        'Diseño de arquitectura y wireframes',
        'Desarrollo del MVP (Minimum Viable Product)',
        'Implementación de funcionalidades core',
        'Testing y Quality Assurance',
        'Integración con sistemas existentes',
        'Pruebas de usuario y feedback',
        'Despliegue en producción'
      ];
    ELSIF initiative_rec.initiative_title LIKE '%Capacitación%' OR initiative_rec.initiative_title LIKE '%Training%' THEN
      activity_templates := ARRAY[
        'Diagnóstico de necesidades de capacitación',
        'Desarrollo de contenido y materiales',
        'Selección de facilitadores expertos',
        'Programación de sesiones de entrenamiento',
        'Ejecución de módulos de capacitación',
        'Evaluación de conocimientos adquiridos',
        'Seguimiento post-capacitación',
        'Medición de impacto en performance'
      ];
    ELSIF initiative_rec.initiative_title LIKE '%Paquete%' OR initiative_rec.initiative_title LIKE '%Product%' THEN
      activity_templates := ARRAY[
        'Investigación de destinos y experiencias',
        'Negociación con proveedores locales',
        'Diseño de itinerarios y experiencias',
        'Establecimiento de precios competitivos',
        'Creación de materiales promocionales',
        'Capacitación del equipo de ventas',
        'Prueba piloto con clientes selectos',
        'Lanzamiento oficial al mercado'
      ];
    ELSE
      activity_templates := ARRAY[
        'Planificación inicial y definición de scope',
        'Asignación de recursos y equipo',
        'Desarrollo de estrategia de implementación',
        'Ejecución de fase piloto',
        'Monitoreo de progreso y ajustes',
        'Implementación completa',
        'Evaluación de resultados',
        'Documentación y lessons learned'
      ];
    END IF;
    
    -- Calcular tasa de completación basada en progreso
    completion_rate := initiative_rec.progress / 100.0;
    
    -- Crear actividades para esta iniciativa
    FOR i IN 1..array_length(activity_templates, 1) LOOP
      template := activity_templates[i];
      
      -- Seleccionar usuario aleatorio del área
      user_id := area_users[1 + random() * (array_length(area_users, 1) - 1)];
      
      INSERT INTO activities (
        initiative_id,
        title,
        description,
        is_completed,
        assigned_to,
        created_at,
        updated_at
      ) VALUES (
        initiative_rec.initiative_id,
        template,
        'Actividad correspondiente a: ' || initiative_rec.initiative_title,
        (i <= (array_length(activity_templates, 1) * completion_rate + random() * 2 - 1)),
        user_id,
        NOW() - INTERVAL '8 weeks' + (i * INTERVAL '1 week'),
        NOW() - INTERVAL '8 weeks' + (i * INTERVAL '1 week')
      );
    END LOOP;
    
  END LOOP;
  
  RAISE NOTICE 'Actividades detalladas de SIGA Turismo creadas';
END $$;

-- ============================================
-- PASO 9: CREAR HISTORIAL DE PROGRESO
-- ============================================

DO $$
DECLARE
  initiative_rec RECORD;
  progress_points INTEGER[];
  point INTEGER;
  user_id uuid;
  siga_tenant_id uuid;
  date_offset INTEGER;
BEGIN
  SELECT id INTO siga_tenant_id FROM tenants WHERE subdomain = 'siga' LIMIT 1;
  
  FOR initiative_rec IN 
    SELECT 
      i.id as initiative_id,
      i.progress as current_progress,
      i.area_id
    FROM initiatives i
    WHERE i.tenant_id = siga_tenant_id
      AND i.progress > 0
  LOOP
    
    -- Crear progresión realista
    progress_points := ARRAY[0];
    FOR i IN 1..10 LOOP
      progress_points := progress_points || ARRAY[
        LEAST(initiative_rec.current_progress, 
              progress_points[array_length(progress_points, 1)] + (random() * 15 + 5)::INTEGER)
      ];
      EXIT WHEN progress_points[array_length(progress_points, 1)] >= initiative_rec.current_progress;
    END LOOP;
    
    -- Insertar historial de progreso
    date_offset := 60; -- Empezar 60 días atrás
    FOREACH point IN ARRAY progress_points LOOP
      
      -- Seleccionar usuario responsable
      SELECT id INTO user_id 
      FROM user_profiles 
      WHERE tenant_id = siga_tenant_id 
        AND (area_id = initiative_rec.area_id OR role IN ('CEO', 'Admin'))
      ORDER BY random() 
      LIMIT 1;
      
      INSERT INTO progress_history (
        initiative_id,
        completed_activities_count,
        total_activities_count,
        notes,
        updated_by,
        created_at
      ) VALUES (
        initiative_rec.initiative_id,
        (point * 8 / 100), -- Simular actividades completadas
        8, -- Total de actividades
        CASE 
          WHEN point = 0 THEN 'Inicio de iniciativa'
          WHEN point >= initiative_rec.current_progress THEN 'Progreso actual actualizado'
          ELSE 'Progreso regular - milestone alcanzado'
        END,
        user_id,
        NOW() - INTERVAL '1 day' * date_offset
      );
      
      date_offset := date_offset - (random() * 8 + 3)::INTEGER; -- Días entre actualizaciones
    END LOOP;
    
  END LOOP;
  
  RAISE NOTICE 'Historial de progreso de SIGA Turismo creado';
END $$;

-- ============================================
-- PASO 10: ACTUALIZAR PROGRESOS DE INICIATIVAS BASADO EN ACTIVIDADES
-- ============================================

UPDATE initiatives 
SET progress = COALESCE((
  SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE is_completed = true)::numeric / COUNT(*)::numeric) * 100)
    END
  FROM activities a
  WHERE a.initiative_id = initiatives.id
), initiatives.progress)
WHERE tenant_id = (SELECT id FROM tenants WHERE subdomain = 'siga' LIMIT 1);

-- ============================================
-- PASO 11: VERIFICACIÓN Y RESUMEN
-- ============================================

-- Resumen de datos creados
DO $$
DECLARE
  siga_tenant_id uuid;
  summary_text TEXT;
BEGIN
  SELECT id INTO siga_tenant_id FROM tenants WHERE subdomain = 'siga' LIMIT 1;
  
  SELECT format('
🎯 RESUMEN DATOS SIGA TURISMO CREADOS:
===========================================
📋 Áreas: %s
🎯 Objetivos: %s  
🚀 Iniciativas: %s
✅ Actividades: %s
📊 Registros de progreso: %s

📈 DISTRIBUCIÓN POR ESTADO:
- Completadas: %s iniciativas
- En progreso: %s iniciativas  
- Planificando: %s iniciativas

💡 DISTRIBUCIÓN POR ÁREA:
%s',
    (SELECT COUNT(*) FROM areas WHERE tenant_id = siga_tenant_id),
    (SELECT COUNT(*) FROM objectives WHERE tenant_id = siga_tenant_id),
    (SELECT COUNT(*) FROM initiatives WHERE tenant_id = siga_tenant_id),
    (SELECT COUNT(*) FROM activities a JOIN initiatives i ON a.initiative_id = i.id WHERE i.tenant_id = siga_tenant_id),
    (SELECT COUNT(*) FROM progress_history ph JOIN initiatives i ON ph.initiative_id = i.id WHERE i.tenant_id = siga_tenant_id),
    (SELECT COUNT(*) FROM initiatives WHERE tenant_id = siga_tenant_id AND status = 'completed'),
    (SELECT COUNT(*) FROM initiatives WHERE tenant_id = siga_tenant_id AND status = 'in_progress'),
    (SELECT COUNT(*) FROM initiatives WHERE tenant_id = siga_tenant_id AND status = 'planning'),
    (SELECT string_agg(
      format('- %s: %s objetivos, %s iniciativas', 
             a.name, 
             (SELECT COUNT(*) FROM objectives WHERE area_id = a.id),
             (SELECT COUNT(*) FROM initiatives WHERE area_id = a.id)
      ), E'\n'
     )
     FROM areas a WHERE a.tenant_id = siga_tenant_id
    )
  ) INTO summary_text;
  
  RAISE NOTICE '%', summary_text;
END $$;

-- Fin del script