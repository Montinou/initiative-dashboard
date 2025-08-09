# 🚀 Configuración Completa de Webhooks para Sincronización BigQuery

## Estado Actual ✅

### Componentes Listos:
1. **BigQuery**: 11 tablas creadas con esquemas completos
2. **Cloud Function v2**: Desplegada con soporte multi-tabla
3. **Triggers SQL**: Configurados para logging local
4. **Migración**: Aplicada exitosamente

### Pendiente:
- Configurar los Database Webhooks en el Dashboard de Supabase (15 minutos)

## 📋 Instrucciones Paso a Paso

### Paso 1: Acceder al Dashboard de Webhooks

1. Abrir: https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/database/hooks
2. O navegar: Dashboard → Database → Webhooks

### Paso 2: Crear Webhooks para Cada Tabla

Para cada tabla de la lista siguiente, repetir estos pasos:

#### Configuración Base (copiar y pegar):
```
URL: https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2
Method: POST
Timeout: 10000

Headers:
Content-Type: application/json
Authorization: Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8
```

#### Lista de Webhooks a Crear:

| # | Nombre del Webhook | Tabla | Prioridad | Descripción |
|---|-------------------|-------|-----------|-------------|
| 1 | `sync-initiatives` | `initiatives` | **ALTA** | Iniciativas principales |
| 2 | `sync-activities` | `activities` | **ALTA** | Actividades de iniciativas |
| 3 | `sync-progress-history` | `progress_history` | **ALTA** | Historial de progreso |
| 4 | `sync-areas` | `areas` | **MEDIA** | Áreas organizacionales |
| 5 | `sync-user-profiles` | `user_profiles` | **MEDIA** | Perfiles de usuarios |
| 6 | `sync-objectives` | `objectives` | **MEDIA** | Objetivos estratégicos |
| 7 | `sync-objective-initiatives` | `objective_initiatives` | **BAJA** | Relación objetivos-iniciativas |
| 8 | `sync-organizations` | `organizations` | **BAJA** | Organizaciones |
| 9 | `sync-tenants` | `tenants` | **BAJA** | Tenants (SEGA, FEMA) |
| 10 | `sync-invitations` | `invitations` | **BAJA** | Invitaciones |
| 11 | `sync-audit-log` | `audit_log` | **BAJA** | Log de auditoría |

### Paso 3: Proceso de Creación (para cada webhook)

1. **Click en "Create a new hook"**

2. **Llenar el formulario:**
   ```yaml
   Name: [usar nombre de la tabla arriba]
   Schema: public
   Table: [usar tabla de la lista]
   
   Events:
   ✅ Insert
   ✅ Update
   ✅ Delete
   
   Type: HTTP Request
   
   Method: POST
   URL: https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2
   
   Headers:
   - Content-Type: application/json
   - Authorization: Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8
   
   Timeout: 10000
   ```

3. **Click en "Create webhook"**

4. **Verificar que esté "Enabled"**

## 🧪 Testing de Sincronización

### Test Rápido por Tabla:

#### 1. Test Initiatives
```sql
-- En Supabase SQL Editor
UPDATE initiatives 
SET progress = progress + 1,
    updated_at = NOW()
WHERE id = (SELECT id FROM initiatives LIMIT 1)
RETURNING id, title, progress;
```

#### 2. Test Activities
```sql
INSERT INTO activities (initiative_id, title, description)
SELECT id, 'Test Activity', 'Testing webhook sync'
FROM initiatives LIMIT 1
RETURNING id, title;
```

#### 3. Test Areas
```sql
UPDATE areas 
SET description = CONCAT(description, ' - Updated ', NOW()::TEXT)
WHERE id = (SELECT id FROM areas LIMIT 1)
RETURNING id, name;
```

### Verificación en BigQuery:
```bash
# Ver datos sincronizados
bq query --use_legacy_sql=false "
SELECT 
  table_id,
  COUNT(*) as records
FROM \`insaight-backend.gestion_iniciativas.INFORMATION_SCHEMA.TABLES\` t
LEFT JOIN (
  SELECT 'iniciativas' as table_name, COUNT(*) as count FROM \`insaight-backend.gestion_iniciativas.iniciativas\`
  UNION ALL
  SELECT 'activities', COUNT(*) FROM \`insaight-backend.gestion_iniciativas.activities\`
  UNION ALL
  SELECT 'areas', COUNT(*) FROM \`insaight-backend.gestion_iniciativas.areas\`
) counts ON t.table_id = counts.table_name
WHERE table_schema = 'gestion_iniciativas'
GROUP BY table_id
"

# Ver logs de la Cloud Function
gcloud functions logs read syncSupabaseToBigQueryV2 --limit 20
```

## 📊 Monitoreo Continuo

### Dashboard de Webhooks
- URL: https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/database/hooks
- Muestra: Estado, últimas ejecuciones, tasa de éxito

### Logs de Cloud Function
```bash
# Últimos 50 logs
gcloud functions logs read syncSupabaseToBigQueryV2 --limit 50

# Logs en tiempo real
gcloud functions logs tail syncSupabaseToBigQueryV2
```

### Query de Auditoría en Supabase
```sql
-- Ver últimas sincronizaciones
SELECT 
  table_name,
  operation,
  record_id,
  status,
  created_at
FROM webhook_audit_log
ORDER BY created_at DESC
LIMIT 20;

-- Contar operaciones por tabla
SELECT 
  table_name,
  operation,
  COUNT(*) as count
FROM webhook_audit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY table_name, operation
ORDER BY table_name, operation;
```

## 🔄 Flujo de Datos Completo

```mermaid
graph LR
    A[App Frontend] --> B[Supabase DB]
    B --> C[Database Trigger]
    C --> D[Database Webhook]
    D --> E[Cloud Function v2]
    E --> F[BigQuery]
    F --> G[Vertex AI Search]
    G --> H[Dialogflow CX]
    H --> I[Usuario Final]
```

## ⚠️ Troubleshooting

### Webhook no se ejecuta
1. Verificar que esté "Enabled" en el dashboard
2. Verificar que los eventos estén marcados
3. Revisar logs en Dashboard → Webhooks → Ver detalles

### Error 401 Unauthorized
- Verificar header Authorization tiene `Bearer ` antes del token
- Token correcto: `Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8`

### Error 500 en Cloud Function
```bash
# Ver detalles del error
gcloud functions logs read syncSupabaseToBigQueryV2 --limit 50 | grep ERROR
```

### Datos no aparecen en BigQuery
1. Verificar que el webhook se ejecutó (Dashboard)
2. Verificar logs de Cloud Function
3. Verificar permisos de BigQuery
4. Esperar 10-15 segundos (latencia normal)

## 📈 Métricas de Éxito

- ✅ **Latencia objetivo**: < 5 segundos desde cambio hasta BigQuery
- ✅ **Disponibilidad**: 99.9% (manejado por Google Cloud)
- ✅ **Reintentos automáticos**: Sí (configurado en Supabase)
- ✅ **Escalabilidad**: Automática (Cloud Functions Gen2)

## 🎯 Checklist Final

- [ ] 11 webhooks creados en Dashboard
- [ ] Todos los webhooks están "Enabled"
- [ ] Test de sincronización exitoso para initiatives
- [ ] Test de sincronización exitoso para activities
- [ ] Datos visibles en BigQuery
- [ ] Cloud Function logs sin errores
- [ ] Vertex AI Search recibiendo actualizaciones

## 📝 Notas Importantes

1. **Orden de creación**: Crear primero los webhooks de alta prioridad
2. **Vertex AI Search**: Tarda 15-30 minutos en reindexar automáticamente
3. **Límites**: Max 10 webhooks concurrentes por tabla
4. **Costos**: Mínimos (~$0.01 por 10,000 invocaciones)

## 🚨 Comando de Emergencia

Si necesitas sincronización manual completa:
```bash
# Sincronizar todo manualmente
curl -X GET "https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2?token=sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8"
```

---

**Tiempo estimado**: 15 minutos para configurar todos los webhooks
**Resultado esperado**: Sincronización automática y en tiempo real de todos los datos