#!/bin/bash

# Script para corregir el esquema de BigQuery según el esquema real de Supabase

PROJECT_ID="insaight-backend"
DATASET="gestion_iniciativas"

echo "🔧 Corrigiendo esquema de BigQuery según schema-public.sql..."

# Eliminar tablas existentes para recrearlas con el esquema correcto
echo "🗑️ Eliminando tablas existentes..."
bq rm -f -t $PROJECT_ID:$DATASET.initiatives
bq rm -f -t $PROJECT_ID:$DATASET.areas
bq rm -f -t $PROJECT_ID:$DATASET.objectives
bq rm -f -t $PROJECT_ID:$DATASET.activities
bq rm -f -t $PROJECT_ID:$DATASET.user_profiles
bq rm -f -t $PROJECT_ID:$DATASET.objective_initiatives
bq rm -f -t $PROJECT_ID:$DATASET.tenants
bq rm -f -t $PROJECT_ID:$DATASET.organizations
bq rm -f -t $PROJECT_ID:$DATASET.progress_history
bq rm -f -t $PROJECT_ID:$DATASET.iniciativas

echo "📊 Creando tablas con esquema correcto..."

# Tabla organizations
bq mk -t \
  --force \
  --description "Organizations" \
  $PROJECT_ID:$DATASET.organizations \
  id:STRING,name:STRING,description:STRING,website:STRING,subdomain:STRING,industry:STRING,company_size:STRING,timezone:STRING,logo_url:STRING,primary_color:STRING,secondary_color:STRING,created_at:TIMESTAMP,updated_at:TIMESTAMP

# Tabla tenants
bq mk -t \
  --force \
  --description "Tenants" \
  $PROJECT_ID:$DATASET.tenants \
  id:STRING,organization_id:STRING,subdomain:STRING,created_at:TIMESTAMP,updated_at:TIMESTAMP

# Tabla areas (corregido sin area_id duplicado)
bq mk -t \
  --force \
  --description "Áreas organizacionales" \
  $PROJECT_ID:$DATASET.areas \
  id:STRING,tenant_id:STRING,name:STRING,description:STRING,manager_id:STRING,is_active:BOOLEAN,created_at:TIMESTAMP,updated_at:TIMESTAMP

# Tabla user_profiles
bq mk -t \
  --force \
  --description "Perfiles de usuarios" \
  $PROJECT_ID:$DATASET.user_profiles \
  id:STRING,tenant_id:STRING,email:STRING,full_name:STRING,role:STRING,area_id:STRING,user_id:STRING,avatar_url:STRING,phone:STRING,is_active:BOOLEAN,is_system_admin:BOOLEAN,last_login:TIMESTAMP,created_at:TIMESTAMP,updated_at:TIMESTAMP

# Tabla initiatives (con progress como INTEGER)
bq mk -t \
  --force \
  --description "Iniciativas del sistema" \
  $PROJECT_ID:$DATASET.initiatives \
  id:STRING,tenant_id:STRING,area_id:STRING,title:STRING,description:STRING,progress:INTEGER,created_by:STRING,due_date:DATE,start_date:DATE,completion_date:DATE,status:STRING,created_at:TIMESTAMP,updated_at:TIMESTAMP

# Tabla objectives (con progress como INTEGER)
bq mk -t \
  --force \
  --description "Objetivos estratégicos" \
  $PROJECT_ID:$DATASET.objectives \
  id:STRING,tenant_id:STRING,area_id:STRING,title:STRING,description:STRING,created_by:STRING,quarter:STRING,priority:STRING,status:STRING,progress:INTEGER,target_date:DATE,metrics:JSON,created_at:TIMESTAMP,updated_at:TIMESTAMP

# Tabla activities
bq mk -t \
  --force \
  --description "Actividades de iniciativas" \
  $PROJECT_ID:$DATASET.activities \
  id:STRING,initiative_id:STRING,title:STRING,description:STRING,is_completed:BOOLEAN,assigned_to:STRING,created_at:TIMESTAMP,updated_at:TIMESTAMP

# Tabla objective_initiatives
bq mk -t \
  --force \
  --description "Relación entre objetivos e iniciativas" \
  $PROJECT_ID:$DATASET.objective_initiatives \
  id:STRING,objective_id:STRING,initiative_id:STRING

# Tabla progress_history (real, no vista)
bq mk -t \
  --force \
  --description "Historial de progreso" \
  $PROJECT_ID:$DATASET.progress_history \
  id:STRING,initiative_id:STRING,completed_activities_count:INTEGER,total_activities_count:INTEGER,notes:STRING,updated_by:STRING,created_at:TIMESTAMP

echo "📝 Insertando datos de ejemplo con esquema correcto..."

# Insertar organizaciones
bq query --use_legacy_sql=false \
  "INSERT INTO \`$PROJECT_ID.$DATASET.organizations\` (id, name, description, subdomain, timezone, primary_color, secondary_color, created_at, updated_at)
  VALUES
  ('org1', 'SIGA', 'Organización SIGA', 'siga', 'America/Buenos_Aires', '#3B82F6', '#8B5CF6', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
  ('org2', 'FEMA', 'Organización FEMA', 'fema', 'America/Buenos_Aires', '#059669', '#10B981', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
  ('org3', 'Stratix', 'Organización Stratix', 'stratix', 'America/Buenos_Aires', '#DC2626', '#F87171', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())"

# Insertar tenants
bq query --use_legacy_sql=false \
  "INSERT INTO \`$PROJECT_ID.$DATASET.tenants\` (id, organization_id, subdomain, created_at, updated_at)
  VALUES
  ('cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', 'org1', 'siga', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
  ('ab9c23d5-6c7e-5f90-c9b8-3f2e4d5a6b7d', 'org2', 'fema', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
  ('de0f34e6-7d8f-6g01-d0c9-4g3f5e6b7c8e', 'org3', 'stratix', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())"

# Insertar áreas
bq query --use_legacy_sql=false \
  "INSERT INTO \`$PROJECT_ID.$DATASET.areas\` (id, tenant_id, name, description, is_active, created_at, updated_at)
  VALUES
  ('a1', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', 'Ventas', 'Área de ventas y desarrollo comercial', true, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
  ('a2', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', 'Marketing', 'Área de marketing y comunicación', true, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
  ('a3', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', 'Producción', 'Área de producción y operaciones', true, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())"

# Insertar objetivos con progress como INTEGER
bq query --use_legacy_sql=false \
  "INSERT INTO \`$PROJECT_ID.$DATASET.objectives\` (id, tenant_id, area_id, title, description, created_by, priority, status, progress, target_date, created_at, updated_at)
  VALUES
  ('o1', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', 'a1', 'Aumentar ventas Q1', 'Incrementar ventas en 25% para Q1 2025', 'system', 'high', 'in_progress', 45, '2025-03-31', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
  ('o2', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', 'a2', 'Mejorar satisfacción cliente', 'Alcanzar 90% de satisfacción del cliente', 'system', 'high', 'in_progress', 30, '2025-06-30', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
  ('o3', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', 'a3', 'Optimizar producción', 'Reducir tiempo de producción en 15%', 'system', 'medium', 'in_progress', 65, '2025-12-31', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())"

# Insertar iniciativas con progress como INTEGER
bq query --use_legacy_sql=false \
  "INSERT INTO \`$PROJECT_ID.$DATASET.initiatives\` (id, tenant_id, area_id, title, description, progress, created_by, status, start_date, due_date, created_at, updated_at)
  VALUES
  ('i1', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', 'a1', 'Campaña Digital Q1 2025', 'Campaña de marketing digital para impulsar ventas', 60, 'system', 'in_progress', '2025-01-01', '2025-03-31', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
  ('i2', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', 'a2', 'Programa Fidelización', 'Nuevo programa de fidelización de clientes', 20, 'system', 'planning', '2025-02-01', '2025-06-30', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
  ('i3', 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', 'a3', 'Automatización Línea 1', 'Proyecto de automatización de línea de producción', 75, 'system', 'in_progress', '2024-10-01', '2025-03-31', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())"

# Insertar actividades
bq query --use_legacy_sql=false \
  "INSERT INTO \`$PROJECT_ID.$DATASET.activities\` (id, initiative_id, title, description, is_completed, created_at, updated_at)
  VALUES
  ('ac1', 'i1', 'Diseño de creatividades', 'Crear materiales para campaña', true, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
  ('ac2', 'i1', 'Configuración de campañas', 'Setup en Google Ads y Meta', true, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
  ('ac3', 'i1', 'Lanzamiento de campaña', 'Activar campañas en todas las plataformas', false, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
  ('ac4', 'i2', 'Análisis de competencia', 'Investigar programas de fidelización existentes', true, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
  ('ac5', 'i2', 'Diseño del programa', 'Definir beneficios y mecánica', false, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
  ('ac6', 'i3', 'Compra de equipos', 'Adquirir maquinaria automatizada', true, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
  ('ac7', 'i3', 'Instalación', 'Instalar y configurar equipos', true, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
  ('ac8', 'i3', 'Capacitación', 'Entrenar al personal', false, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())"

# Insertar relaciones objetivo-iniciativa
bq query --use_legacy_sql=false \
  "INSERT INTO \`$PROJECT_ID.$DATASET.objective_initiatives\` (id, objective_id, initiative_id)
  VALUES
  ('oi1', 'o1', 'i1'),
  ('oi2', 'o2', 'i2'),
  ('oi3', 'o3', 'i3')"

# Recrear vista iniciativas compatible con el webhook
echo "📋 Recreando vista iniciativas..."
bq mk --use_legacy_sql=false \
  --view "SELECT 
  id as iniciativa_id,
  title as titulo,
  description as descripcion,
  tenant_id,
  area_id,
  created_by as responsable_id,
  status as estado,
  CAST(progress AS FLOAT64) as progreso_actual,
  start_date as fecha_inicio,
  due_date as fecha_fin,
  created_at as fecha_creacion,
  updated_at as fecha_actualizacion
FROM \`$PROJECT_ID.$DATASET.initiatives\`" \
  $PROJECT_ID:$DATASET.iniciativas

echo "
✅ Esquema corregido exitosamente

📊 Tablas actualizadas:
- organizations (con subdomain)
- tenants (con organization_id)
- areas (sin area_id duplicado)
- initiatives (progress como INTEGER)
- objectives (progress como INTEGER)
- activities
- objective_initiatives
- user_profiles
- progress_history

📋 Vista recreada:
- iniciativas (compatible con webhook)

🎯 Datos de ejemplo insertados para todas las tablas
"