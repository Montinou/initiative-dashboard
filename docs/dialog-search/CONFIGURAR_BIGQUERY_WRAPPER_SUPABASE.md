# 🔌 Configuración de BigQuery Wrapper en Supabase

## Estado Actual

✅ **Wrapper habilitado** pero ❌ **no configurado**

El wrapper de BigQuery está habilitado en tu proyecto Supabase pero necesita configuración manual de credenciales.

## 📋 Pasos para Configurar (10 minutos)

### Paso 1: Obtener Service Account de Google Cloud

1. **Ir a Google Cloud Console**:
   ```
   https://console.cloud.google.com/iam-admin/serviceaccounts?project=insaight-backend
   ```

2. **Crear Service Account**:
   - Click "CREATE SERVICE ACCOUNT"
   - Name: `supabase-bigquery-connector`
   - Description: `Service account for Supabase to connect to BigQuery`
   - Click "CREATE AND CONTINUE"

3. **Asignar Permisos**:
   - Role 1: `BigQuery Data Viewer`
   - Role 2: `BigQuery Job User`
   - Click "CONTINUE"

4. **Crear Key**:
   - Click "CREATE KEY"
   - Type: JSON
   - Click "CREATE"
   - **Guardar el archivo JSON** (lo necesitarás)

### Paso 2: Configurar en Supabase Dashboard

1. **Ir a Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/database/wrappers
   ```

2. **Buscar BigQuery Wrapper**:
   - Debería aparecer como "Enabled"
   - Click en "Configure" o "Settings"

3. **Llenar la configuración**:
   ```yaml
   Project ID: insaight-backend
   Dataset ID: gestion_iniciativas
   Service Account Key: [Pegar todo el contenido del JSON]
   Location: us-central1
   ```

4. **Guardar configuración**

### Paso 3: Crear las Foreign Tables

Una vez configurado el wrapper, ejecuta este SQL en el SQL Editor de Supabase:

```sql
-- Crear el servidor de BigQuery (si no existe)
CREATE SERVER IF NOT EXISTS bigquery_server
  FOREIGN DATA WRAPPER bigquery_wrapper
  OPTIONS (
    project_id 'insaight-backend',
    dataset_id 'gestion_iniciativas'
  );

-- Crear mapeo de usuario
CREATE USER MAPPING IF NOT EXISTS FOR postgres
  SERVER bigquery_server;

-- Importar tabla de iniciativas de BigQuery
CREATE FOREIGN TABLE IF NOT EXISTS bigquery_iniciativas (
  iniciativa_id text,
  nombre_iniciativa text,
  descripcion text,
  area_responsable text,
  progreso_actual integer,
  estado text
)
SERVER bigquery_server
OPTIONS (
  table 'iniciativas'
);

-- Importar vista de sugerencias ML
CREATE FOREIGN TABLE IF NOT EXISTS bigquery_smart_suggestions (
  area_responsable text,
  recomendacion text,
  tasa_exito float,
  duracion_recomendada_dias integer,
  estado_capacidad text
)
SERVER bigquery_server
OPTIONS (
  table 'smart_initiative_suggestions'
);

-- Test de conexión
SELECT COUNT(*) FROM bigquery_iniciativas;
```

### Paso 4: Crear Funciones Helper

```sql
-- Función para obtener predicciones desde BigQuery
CREATE OR REPLACE FUNCTION get_ml_prediction(
  p_area text,
  p_duration integer DEFAULT 30
)
RETURNS TABLE(
  success_probability float,
  recommendation text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tasa_exito,
    recomendacion
  FROM bigquery_smart_suggestions
  WHERE area_responsable = p_area
  LIMIT 1;
END;
$$;

-- Función para crear iniciativa con ML
CREATE OR REPLACE FUNCTION create_smart_initiative(
  p_title text,
  p_description text,
  p_area_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_area_name text;
  v_prediction float;
  v_recommendation text;
  v_new_id uuid;
BEGIN
  -- Obtener nombre del área
  SELECT name INTO v_area_name FROM areas WHERE id = p_area_id;
  
  -- Obtener predicción de BigQuery
  SELECT success_probability, recommendation 
  INTO v_prediction, v_recommendation
  FROM get_ml_prediction(v_area_name);
  
  -- Crear iniciativa
  INSERT INTO initiatives (
    title,
    description,
    area_id,
    created_by,
    progress,
    status
  ) VALUES (
    p_title,
    p_description || ' [ML: ' || COALESCE(v_prediction::text, 'N/A') || '%]',
    p_area_id,
    p_user_id,
    0,
    'planning'
  ) RETURNING id INTO v_new_id;
  
  -- Retornar resultado
  RETURN jsonb_build_object(
    'id', v_new_id,
    'success_probability', v_prediction,
    'ml_recommendation', v_recommendation
  );
END;
$$;
```

## 🧪 Testing

### Test 1: Verificar conexión
```sql
-- Debería retornar el conteo de iniciativas
SELECT COUNT(*) FROM bigquery_iniciativas;
```

### Test 2: Ver sugerencias ML
```sql
-- Debería mostrar sugerencias inteligentes
SELECT * FROM bigquery_smart_suggestions
ORDER BY tasa_exito DESC
LIMIT 5;
```

### Test 3: Usar predicción
```sql
-- Obtener predicción para un área
SELECT * FROM get_ml_prediction('Marketing', 30);
```

### Test 4: Crear iniciativa inteligente
```sql
-- Crear iniciativa con ML
SELECT create_smart_initiative(
  'Nueva Campaña Test',
  'Descripción de prueba',
  (SELECT id FROM areas LIMIT 1),
  (SELECT id FROM user_profiles LIMIT 1)
);
```

## 🔄 Flujo de Datos Completo

```
1. Usuario solicita crear iniciativa
   ↓
2. Supabase consulta BigQuery (via wrapper)
   ↓
3. BigQuery ML retorna predicción
   ↓
4. Supabase crea iniciativa con predicción
   ↓
5. Webhook sincroniza cambio a BigQuery
   ↓
6. Ciclo completo de retroalimentación
```

## ⚠️ Troubleshooting

### Error: "required option sa_key_id is not specified"
- **Causa**: Falta configurar Service Account en Dashboard
- **Solución**: Seguir Paso 2

### Error: "permission denied for foreign table"
- **Causa**: RLS está activo
- **Solución**: Crear política o desactivar RLS para foreign tables

### Error: "could not connect to server bigquery_server"
- **Causa**: Credenciales incorrectas
- **Solución**: Verificar JSON de Service Account

## 🎯 Beneficios de la Integración

1. **Consultas directas a BigQuery ML** desde Supabase
2. **Predicciones en tiempo real** sin intermediarios
3. **Combinar datos** de ambas fuentes en una query
4. **Reducir latencia** al eliminar APIs intermedias
5. **Simplificar arquitectura** con menos componentes

## 📊 Ejemplo de Query Combinada

```sql
-- Combinar datos locales con predicciones de BigQuery
SELECT 
  i.id,
  i.title,
  i.progress as current_progress,
  bq.tasa_exito as predicted_success,
  CASE 
    WHEN bq.tasa_exito > 80 THEN 'Alta probabilidad'
    WHEN bq.tasa_exito > 60 THEN 'Media probabilidad'
    ELSE 'Requiere atención'
  END as risk_level
FROM initiatives i
JOIN areas a ON i.area_id = a.id
LEFT JOIN bigquery_smart_suggestions bq ON a.name = bq.area_responsable
WHERE i.status = 'in_progress'
ORDER BY bq.tasa_exito DESC;
```

## ✅ Checklist de Configuración

- [ ] Service Account creada en GCP
- [ ] Permisos BigQuery asignados
- [ ] JSON Key descargada
- [ ] Wrapper configurado en Supabase Dashboard
- [ ] Foreign tables creadas
- [ ] Test de conexión exitoso
- [ ] Funciones helper creadas
- [ ] Integración probada end-to-end

---

**Tiempo estimado**: 10-15 minutos
**Resultado**: Acceso directo a BigQuery ML desde Supabase