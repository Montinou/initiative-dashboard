# Guía de Configuración: Database Webhooks en Supabase

## Opción Recomendada: Database Webhooks (Nativo de Supabase)

### ✅ Ventajas sobre otras opciones:
- **Confiable**: Manejado nativamente por Supabase
- **Automático**: Se ejecuta en cada cambio sin polling
- **Eficiente**: Solo se activa cuando hay cambios reales
- **Reintentos**: Supabase reintenta automáticamente si falla
- **Sin código adicional**: No requiere cron jobs ni servicios externos

### 📋 Configuración Manual (5 minutos)

1. **Abrir Dashboard de Supabase**
   ```
   https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/database/hooks
   ```

2. **Crear nuevo webhook**
   - Click en "Create a new hook"

3. **Configurar con estos valores exactos:**

   ```yaml
   Name: bigquery-sync
   
   Table: 
     Schema: public
     Table: initiatives
   
   Events: 
     ✅ Insert
     ✅ Update  
     ✅ Delete
   
   Type: HTTP Request
   
   Configuration:
     Method: POST
     URL: https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQuery
     
     Headers:
       Content-Type: application/json
       Authorization: Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8
     
     Timeout: 10000 (10 seconds)
   ```

4. **Click en "Create webhook"**

### 🧪 Testing

Para probar que funciona:

```sql
-- En Supabase SQL Editor
UPDATE initiatives 
SET progress = progress + 1
WHERE id = (SELECT id FROM initiatives LIMIT 1);

-- Verificar en BigQuery (esperar 5-10 segundos)
-- Los datos deberían actualizarse automáticamente
```

### 📊 Monitoreo

1. **En Supabase Dashboard**:
   - Database → Webhooks → Ver logs de ejecución
   - Muestra éxitos, fallos y reintentos

2. **En Cloud Functions**:
   ```bash
   gcloud functions logs read syncSupabaseToBigQuery --limit 50
   ```

3. **En BigQuery**:
   ```bash
   bq query --use_legacy_sql=false "SELECT COUNT(*) FROM insaight-backend.gestion_iniciativas.iniciativas"
   ```

## Alternativas (NO recomendadas)

### ❌ Opción 2: Cron Job
```javascript
// NO RECOMENDADO - Solo si webhooks no funcionan
// Agregar a vercel.json
{
  "crons": [{
    "path": "/api/sync/bigquery?token=sk_sync_5f3e2d9c8b4a1f7e2d8c9b5a6f2e3d9",
    "schedule": "*/15 * * * *"  // Cada 15 minutos
  }]
}
```
**Problemas**: Sincronización con retraso, consume recursos aunque no haya cambios

### ❌ Opción 3: Polling desde Frontend
```javascript
// NUNCA HACER ESTO
useEffect(() => {
  const interval = setInterval(() => {
    fetch('/api/sync/bigquery')  // MAL!
  }, 60000)
}, [])
```
**Problemas**: Terrible para performance, no escalable, costoso

## Resumen

| Método | Tiempo Real | Confiabilidad | Costo | Recomendado |
|--------|------------|---------------|-------|-------------|
| Database Webhooks | ✅ Instantáneo | ✅ Alta | ✅ Bajo | ✅ SÍ |
| Cron Job | ⚠️ 15 min delay | ✅ Alta | ⚠️ Medio | ❌ NO |
| Polling | ⚠️ Variable | ❌ Baja | ❌ Alto | ❌ NUNCA |

## Estado Actual

- ✅ **Cloud Function**: Desplegada y funcionando
- ✅ **Migración**: Aplicada (logging local activo)
- ⏳ **Database Webhook**: Pendiente configuración manual (5 min)
- ✅ **Sincronización manual**: Disponible como backup

## URLs de Referencia

- **Dashboard Webhooks**: https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/database/hooks
- **Cloud Function**: https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQuery
- **Sync Manual**: GET con `?token=sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8`