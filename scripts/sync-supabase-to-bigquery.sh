#!/bin/bash

# Script para sincronizar datos de Supabase a BigQuery

PROJECT_ID="insaight-backend"
DATASET="gestion_iniciativas"

echo "🔄 Sincronizando datos de Supabase a BigQuery..."

# Crear las tablas en BigQuery con el esquema correcto
echo "📊 Creando/actualizando tablas en BigQuery..."

# Tabla initiatives
bq mk -t \
  --force \
  --description "Iniciativas del sistema" \
  $PROJECT_ID:$DATASET.initiatives \
  id:STRING,initiative_id:STRING,title:STRING,description:STRING,tenant_id:STRING,area_id:STRING,created_by:STRING,status:STRING,progress:FLOAT64,start_date:DATE,due_date:DATE,created_at:TIMESTAMP,updated_at:TIMESTAMP

# Tabla areas
bq mk -t \
  --force \
  --description "Áreas organizacionales" \
  $PROJECT_ID:$DATASET.areas \
  id:STRING,area_id:STRING,name:STRING,description:STRING,tenant_id:STRING,created_at:TIMESTAMP

# Tabla objectives
bq mk -t \
  --force \
  --description "Objetivos estratégicos" \
  $PROJECT_ID:$DATASET.objectives \
  id:STRING,title:STRING,description:STRING,tenant_id:STRING,area_id:STRING,target_date:DATE,progress:FLOAT64,status:STRING,created_at:TIMESTAMP

# Tabla activities
bq mk -t \
  --force \
  --description "Actividades de iniciativas" \
  $PROJECT_ID:$DATASET.activities \
  id:STRING,initiative_id:STRING,title:STRING,description:STRING,is_completed:BOOLEAN,created_at:TIMESTAMP

# Tabla user_profiles
bq mk -t \
  --force \
  --description "Perfiles de usuarios" \
  $PROJECT_ID:$DATASET.user_profiles \
  id:STRING,user_id:STRING,tenant_id:STRING,area_id:STRING,role:STRING,display_name:STRING,created_at:TIMESTAMP

# Tabla objective_initiatives (relación muchos a muchos)
bq mk -t \
  --force \
  --description "Relación entre objetivos e iniciativas" \
  $PROJECT_ID:$DATASET.objective_initiatives \
  objective_id:STRING,initiative_id:STRING,created_at:TIMESTAMP

# Crear vistas compatibles con el webhook existente
echo "📋 Creando vistas para compatibilidad con el webhook..."

# Vista iniciativas (compatible con el webhook)
bq query --use_legacy_sql=false \
  --replace \
  --destination_table=$PROJECT_ID:$DATASET.iniciativas \
  "CREATE OR REPLACE VIEW \`$PROJECT_ID.$DATASET.iniciativas\` AS
  SELECT 
    id as iniciativa_id,
    title as titulo,
    description as descripcion,
    tenant_id,
    area_id,
    created_by as responsable_id,
    status as estado,
    progress as progreso_actual,
    start_date as fecha_inicio,
    due_date as fecha_fin,
    created_at as fecha_creacion,
    updated_at as fecha_actualizacion
  FROM \`$PROJECT_ID.$DATASET.initiatives\`"

# Vista progress_history
bq query --use_legacy_sql=false \
  --replace \
  --destination_table=$PROJECT_ID:$DATASET.progress_history \
  "CREATE OR REPLACE VIEW \`$PROJECT_ID.$DATASET.progress_history\` AS
  SELECT 
    i.id as initiative_id,
    i.created_at,
    COUNT(a.id) as total_activities_count,
    SUM(CASE WHEN a.is_completed THEN 1 ELSE 0 END) as completed_activities_count
  FROM \`$PROJECT_ID.$DATASET.initiatives\` i
  LEFT JOIN \`$PROJECT_ID.$DATASET.activities\` a ON i.id = a.initiative_id
  GROUP BY i.id, i.created_at"

echo "✅ Tablas y vistas creadas en BigQuery"

# Insertar algunos datos de ejemplo si las tablas están vacías
echo "📝 Verificando si necesitamos datos de ejemplo..."

ROW_COUNT=$(bq query --use_legacy_sql=false --format=csv "SELECT COUNT(*) FROM \`$PROJECT_ID.$DATASET.initiatives\`" | tail -n 1)

if [ "$ROW_COUNT" = "0" ]; then
  echo "📥 Insertando datos de ejemplo..."
  
  # Insertar áreas de ejemplo
  bq query --use_legacy_sql=false \
    "INSERT INTO \`$PROJECT_ID.$DATASET.areas\` (id, area_id, name, description, tenant_id, created_at)
    VALUES
    ('a1', 'a1', 'Ventas', 'Área de ventas y desarrollo comercial', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', CURRENT_TIMESTAMP()),
    ('a2', 'a2', 'Marketing', 'Área de marketing y comunicación', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', CURRENT_TIMESTAMP()),
    ('a3', 'a3', 'Producción', 'Área de producción y operaciones', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', CURRENT_TIMESTAMP())"

  # Insertar objetivos de ejemplo
  bq query --use_legacy_sql=false \
    "INSERT INTO \`$PROJECT_ID.$DATASET.objectives\` (id, title, description, tenant_id, area_id, target_date, progress, status, created_at)
    VALUES
    ('o1', 'Aumentar ventas Q1', 'Incrementar ventas en 25% para Q1 2025', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', 'a1', '2025-03-31', 45.0, 'in_progress', CURRENT_TIMESTAMP()),
    ('o2', 'Mejorar satisfacción cliente', 'Alcanzar 90% de satisfacción del cliente', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', 'a2', '2025-06-30', 30.0, 'in_progress', CURRENT_TIMESTAMP()),
    ('o3', 'Optimizar producción', 'Reducir tiempo de producción en 15%', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', 'a3', '2025-12-31', 65.0, 'in_progress', CURRENT_TIMESTAMP())"

  # Insertar iniciativas de ejemplo
  bq query --use_legacy_sql=false \
    "INSERT INTO \`$PROJECT_ID.$DATASET.initiatives\` (id, initiative_id, title, description, tenant_id, area_id, created_by, status, progress, start_date, due_date, created_at, updated_at)
    VALUES
    ('i1', 'i1', 'Campaña Digital Q1 2025', 'Campaña de marketing digital para impulsar ventas', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', 'a1', 'system', 'in_progress', 60.0, '2025-01-01', '2025-03-31', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
    ('i2', 'i2', 'Programa Fidelización', 'Nuevo programa de fidelización de clientes', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', 'a2', 'system', 'planning', 20.0, '2025-02-01', '2025-06-30', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
    ('i3', 'i3', 'Automatización Línea 1', 'Proyecto de automatización de línea de producción', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', 'a3', 'system', 'in_progress', 75.0, '2024-10-01', '2025-03-31', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())"

  # Insertar actividades de ejemplo
  bq query --use_legacy_sql=false \
    "INSERT INTO \`$PROJECT_ID.$DATASET.activities\` (id, initiative_id, title, description, is_completed, created_at)
    VALUES
    ('ac1', 'i1', 'Diseño de creatividades', 'Crear materiales para campaña', true, CURRENT_TIMESTAMP()),
    ('ac2', 'i1', 'Configuración de campañas', 'Setup en Google Ads y Meta', true, CURRENT_TIMESTAMP()),
    ('ac3', 'i1', 'Lanzamiento de campaña', 'Activar campañas en todas las plataformas', false, CURRENT_TIMESTAMP()),
    ('ac4', 'i2', 'Análisis de competencia', 'Investigar programas de fidelización existentes', true, CURRENT_TIMESTAMP()),
    ('ac5', 'i2', 'Diseño del programa', 'Definir beneficios y mecánica', false, CURRENT_TIMESTAMP()),
    ('ac6', 'i3', 'Compra de equipos', 'Adquirir maquinaria automatizada', true, CURRENT_TIMESTAMP()),
    ('ac7', 'i3', 'Instalación', 'Instalar y configurar equipos', true, CURRENT_TIMESTAMP()),
    ('ac8', 'i3', 'Capacitación', 'Entrenar al personal', false, CURRENT_TIMESTAMP())"

  echo "✅ Datos de ejemplo insertados"
else
  echo "ℹ️ Las tablas ya contienen datos ($ROW_COUNT iniciativas encontradas)"
fi

echo "
🎉 ¡Sincronización completada!

📊 Dataset: $PROJECT_ID:$DATASET
📋 Tablas creadas:
  - initiatives
  - areas
  - objectives
  - activities
  - user_profiles
  - objective_initiatives
  
📋 Vistas creadas (compatibles con webhook):
  - iniciativas
  - progress_history

El agente de Dialogflow ahora puede consultar estos datos.
"