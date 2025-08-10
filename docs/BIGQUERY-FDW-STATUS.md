# Estado de Foreign Data Wrappers (FDW) - BigQuery en Supabase

## ✅ Estado: CONFIGURADO Y FUNCIONANDO

### 📊 Configuración Actual

#### Servidor FDW
- **Nombre**: `bigquery_server`
- **Tipo**: `bigquery_wrapper`
- **Dataset**: `insaight-backend.gestion_iniciativas`
- **Estado**: ✅ Activo y funcionando

#### Foreign Tables en Schema `bigquery`
Las siguientes tablas están disponibles desde Supabase conectadas a BigQuery:

1. **areas** - 3 registros
2. **activities** - 8 registros  
3. **objectives** - 3 registros
4. **progress_history**
5. **user_profiles**
6. **iniciativas** 
7. **smart_initiative_suggestions**

### 🔧 Cómo Usar los Wrappers

#### Desde SQL en Supabase:
```sql
-- Consultar iniciativas desde BigQuery
SELECT * FROM bigquery.iniciativas;

-- Consultar actividades con JOIN
SELECT 
    a.*, 
    i.nombre_iniciativa 
FROM bigquery.activities a
JOIN bigquery.iniciativas i ON a.initiative_id = i.iniciativa_id;

-- Análisis agregado
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completadas
FROM bigquery.activities;
```

#### Desde tu aplicación Next.js:
```typescript
// Usando Supabase Client
const { data, error } = await supabase
  .from('bigquery.areas')
  .select('*');

// O usando RPC para funciones personalizadas
const { data } = await supabase
  .rpc('get_bigquery_initiatives', {
    p_tenant_id: 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c'
  });
```

### 📈 Datos Disponibles

| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| areas | 3 | Ventas, Marketing, Producción |
| activities | 8 | 5 completadas, 3 pendientes |
| objectives | 3 | Objetivos con progreso 30-65% |
| initiatives | 3 | Iniciativas con progreso 20-75% |

### 🔄 Flujo de Datos

```
BigQuery (Fuente de verdad)
    ↓
Foreign Data Wrapper
    ↓
Supabase (Schema: bigquery)
    ↓
Tu aplicación Next.js
```

### ⚡ Rendimiento

- Las consultas se ejecutan directamente en BigQuery
- Los datos NO se copian a Supabase (zero-copy)
- Latencia típica: 200-500ms por consulta
- Ideal para reportes y análisis

### 🔐 Seguridad

- Cuenta de servicio: `supabase-bigquery-fdw@insaight-backend.iam.gserviceaccount.com`
- Permisos: Solo lectura (`bigquery.dataViewer`)
- Las credenciales están seguras en la configuración del servidor FDW

### 🚀 Próximos Pasos Recomendados

1. **Crear vistas materializadas** para consultas frecuentes:
```sql
CREATE MATERIALIZED VIEW mv_dashboard_metrics AS
SELECT ... FROM bigquery.initiatives ...;
```

2. **Configurar refresh automático**:
```sql
CREATE OR REPLACE FUNCTION refresh_bigquery_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_metrics;
END;
$$ LANGUAGE plpgsql;
```

3. **Agregar índices** en las vistas materializadas para mejor performance

### 📝 Notas Importantes

- Los wrappers son **solo lectura** - no puedes INSERT/UPDATE/DELETE
- Para escribir datos, usa la API de BigQuery directamente o el webhook
- Los cambios en BigQuery se reflejan inmediatamente (no hay caché)
- El schema `bigquery` está separado del schema `public` para evitar conflictos

### 🔍 Comandos de Verificación

```bash
# Verificar conexión
psql $SUPABASE_URL -c "SELECT COUNT(*) FROM bigquery.areas;"

# Ver todas las foreign tables
psql $SUPABASE_URL -c "SELECT * FROM information_schema.foreign_tables WHERE foreign_server_name = 'bigquery_server';"

# Test de performance
psql $SUPABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM bigquery.activities;"
```

---
*Última actualización: 2025-08-10*