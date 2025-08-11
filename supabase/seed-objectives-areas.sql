-- Script para vincular objetivos con áreas y crear relaciones apropiadas

-- Primero verificamos los objetivos existentes
SELECT 
  o.id,
  o.title,
  o.area_id,
  a.name as area_name,
  o.tenant_id,
  t.subdomain
FROM objectives o
LEFT JOIN areas a ON o.area_id = a.id
LEFT JOIN tenants t ON o.tenant_id = t.id;

-- Actualizamos objetivos existentes para vincularlos con áreas apropiadas
-- Asumiendo que tienes objetivos sin area_id, vamos a asignarlos

-- Para el objetivo de Comercial (SIGA tenant)
UPDATE objectives 
SET area_id = (
  SELECT id FROM areas 
  WHERE name = 'Comercial' 
  AND tenant_id = (SELECT id FROM tenants WHERE subdomain = 'siga')
  LIMIT 1
)
WHERE title LIKE '%ventas%' 
  OR title LIKE '%comercial%' 
  OR title LIKE '%revenue%'
  AND area_id IS NULL;

-- Para el objetivo de Producto (SIGA tenant)  
UPDATE objectives 
SET area_id = (
  SELECT id FROM areas 
  WHERE name = 'Producto' 
  AND tenant_id = (SELECT id FROM tenants WHERE subdomain = 'siga')
  LIMIT 1
)
WHERE (title LIKE '%producto%' 
  OR title LIKE '%product%' 
  OR title LIKE '%development%')
  AND area_id IS NULL;

-- Actualizamos el progress de los objetivos para que tengan valores realistas
UPDATE objectives 
SET progress = 75
WHERE title LIKE '%ventas%' OR title LIKE '%comercial%';

UPDATE objectives 
SET progress = 60
WHERE title LIKE '%producto%' OR title LIKE '%product%';

-- Creamos algunos quarters si no existen
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
);

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
);

-- Vinculamos objetivos con quarters
INSERT INTO objective_quarters (objective_id, quarter_id)
SELECT 
  o.id,
  q.id
FROM objectives o
CROSS JOIN quarters q
WHERE o.tenant_id = q.tenant_id
  AND q.quarter_name = 'Q1'
  AND NOT EXISTS (
    SELECT 1 FROM objective_quarters oq 
    WHERE oq.objective_id = o.id 
    AND oq.quarter_id = q.id
  );

-- Creamos algunas iniciativas para las áreas si no existen
INSERT INTO initiatives (tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date)
SELECT 
  a.tenant_id,
  a.id,
  'Iniciativa de ' || a.name || ' 1',
  'Descripción de la iniciativa para el área de ' || a.name,
  CASE 
    WHEN a.name = 'Comercial' THEN 80
    WHEN a.name = 'Producto' THEN 65
    ELSE 50
  END,
  (SELECT id FROM user_profiles WHERE tenant_id = a.tenant_id LIMIT 1),
  'in_progress',
  '2025-01-01'::date,
  '2025-03-31'::date
FROM areas a
WHERE NOT EXISTS (
  SELECT 1 FROM initiatives i 
  WHERE i.area_id = a.id
)
LIMIT 5;

-- Vinculamos objetivos con iniciativas
INSERT INTO objective_initiatives (objective_id, initiative_id)
SELECT 
  o.id,
  i.id
FROM objectives o
JOIN initiatives i ON o.area_id = i.area_id AND o.tenant_id = i.tenant_id
WHERE NOT EXISTS (
  SELECT 1 FROM objective_initiatives oi 
  WHERE oi.objective_id = o.id 
  AND oi.initiative_id = i.id
)
LIMIT 10;

-- Verificamos el resultado final
SELECT 
  a.name as area,
  COUNT(DISTINCT o.id) as num_objectives,
  COUNT(DISTINCT i.id) as num_initiatives,
  AVG(o.progress) as avg_objective_progress,
  AVG(i.progress) as avg_initiative_progress
FROM areas a
LEFT JOIN objectives o ON a.id = o.area_id
LEFT JOIN initiatives i ON a.id = i.area_id
GROUP BY a.id, a.name
ORDER BY a.name;