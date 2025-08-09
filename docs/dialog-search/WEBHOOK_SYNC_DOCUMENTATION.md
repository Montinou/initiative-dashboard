# Documentación de Sincronización Webhook
## Supabase → BigQuery → Vertex AI Search

## Arquitectura

```
[Supabase DB] → [Webhook Trigger] → [API/Cloud Function] → [BigQuery] → [Vertex AI Search]
```

## Opciones de Implementación

### Opción 1: Next.js API Route (Recomendado para desarrollo)

**Ventajas:**
- Integrado en tu aplicación
- Fácil de debuggear
- No requiere infraestructura adicional

**Archivos creados:**
- `/app/api/sync/bigquery/route.ts` - Endpoint de sincronización

**Configuración:**
1. Instalar dependencias:
```bash
pnpm add @google-cloud/bigquery
```

2. Variables de entorno (.env.local):
```env
GCLOUD_PROJECT_ID=insaight-backend
WEBHOOK_SECRET_TOKEN=<tu-secret-aqui>
SYNC_API_TOKEN=<tu-token-aqui>
AUTO_REINDEX_VERTEX=true
```

3. Endpoints disponibles:
- `POST /api/sync/bigquery` - Webhook para cambios individuales
- `GET /api/sync/bigquery?token=<SYNC_API_TOKEN>` - Sincronización completa

### Opción 2: Google Cloud Function (Recomendado para producción)

**Ventajas:**
- Escalabilidad automática
- Independiente de tu aplicación
- Menor latencia para BigQuery

**Archivos creados:**
- `/docs/dialog-search/cloud-function-sync/index.js` - Código de la función
- `/docs/dialog-search/cloud-function-sync/package.json` - Dependencias
- `/docs/dialog-search/cloud-function-sync/.env.yaml` - Variables de entorno
- `/docs/dialog-search/cloud-function-sync/deploy.sh` - Script de despliegue

**Despliegue:**
```bash
cd docs/dialog-search/cloud-function-sync
chmod +x deploy.sh
./deploy.sh
```

**URL resultante:**
```
https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQuery
```

## Configuración en Supabase

### 1. Ejecutar migración
```bash
supabase migration up --file supabase/migrations/20240109000001_create_bigquery_sync_webhook.sql
```

### 2. Configurar webhook URL
En Supabase SQL Editor:
```sql
-- Para Next.js API
ALTER DATABASE postgres SET app.webhook_url = 'https://tu-app.vercel.app/api/sync/bigquery';

-- Para Cloud Function
ALTER DATABASE postgres SET app.webhook_url = 'https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQuery';

-- Configurar secret
ALTER DATABASE postgres SET app.webhook_secret = 'tu-webhook-secret';

-- Verificar
SHOW app.webhook_url;
SHOW app.webhook_secret;
```

### 3. Verificar pg_net
```sql
-- Debe estar habilitado
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- Ver webhooks enviados
SELECT * FROM net._http_response ORDER BY created DESC LIMIT 10;

-- Ver audit log
SELECT * FROM webhook_audit_log ORDER BY created_at DESC LIMIT 10;
```

## Flujo de Datos

### INSERT/UPDATE
1. Se modifica un registro en `initiatives`
2. Trigger de Supabase envía webhook
3. API/Function recibe el payload
4. Obtiene datos adicionales si es necesario (área, responsable)
5. Mapea datos al esquema de BigQuery
6. Inserta/actualiza en BigQuery
7. (Opcional) Trigger reindexación en Vertex AI

### DELETE
1. Se elimina un registro en `initiatives`
2. Trigger envía webhook con `old_record`
3. API/Function elimina de BigQuery

### Sincronización Completa
1. GET request al endpoint con token
2. Obtiene todas las iniciativas de Supabase
3. Limpia tabla de BigQuery
4. Inserta todos los registros

## Mapeo de Datos

| Supabase | BigQuery | Notas |
|----------|----------|-------|
| id | iniciativa_id | ID único |
| title | nombre_iniciativa | |
| description | descripcion | |
| areas.name | area_responsable | Join con tabla areas |
| user_profiles.full_name | responsable_directo | Join con user_profiles |
| start_date | fecha_inicio | |
| target_date | fecha_fin_estimada | |
| completion_date | fecha_fin_real | |
| status | estado | Mapeado a español |
| progress | progreso_actual | |
| budget | presupuesto_asignado | |
| actual_cost | costo_real | |
| results_summary | resumen_resultados | |
| lessons_learned | lecciones_aprendidas | |

## Mapeo de Estados

| Supabase | BigQuery |
|----------|----------|
| planning | Planificación |
| in_progress | En Progreso |
| completed | Completado |
| on_hold | En Pausa |
| cancelled | Cancelado |

## Testing

### Test webhook manual
```bash
# Simular INSERT
curl -X POST https://tu-endpoint/api/sync/bigquery \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_WEBHOOK_SECRET" \
  -d '{
    "type": "INSERT",
    "table": "initiatives",
    "record": {
      "id": "test-001",
      "title": "Test Initiative",
      "progress": 50
    }
  }'
```

### Test sincronización completa
```bash
curl "https://tu-endpoint/api/sync/bigquery?token=TU_SYNC_TOKEN"
```

### Verificar en BigQuery
```bash
bq query --use_legacy_sql=false \
  "SELECT * FROM insaight-backend.gestion_iniciativas.iniciativas 
   ORDER BY nombre_iniciativa"
```

## Monitoreo

### Logs en Vercel
```bash
vercel logs --follow
```

### Logs en Cloud Functions
```bash
gcloud functions logs read syncSupabaseToBigQuery --limit 50
```

### Métricas en BigQuery
```sql
-- Contar registros
SELECT COUNT(*) FROM `insaight-backend.gestion_iniciativas.iniciativas`;

-- Últimas actualizaciones (si agregas timestamp)
SELECT * FROM `insaight-backend.gestion_iniciativas.iniciativas`
ORDER BY fecha_inicio DESC
LIMIT 10;
```

## Troubleshooting

### Error: pg_net not enabled
- Contacta soporte de Supabase para habilitar la extensión
- Alternativa: Usar Database Webhooks en el dashboard de Supabase

### Error: Unauthorized
- Verifica que el token en el header coincida con `WEBHOOK_SECRET_TOKEN`
- Verifica que la URL del webhook esté correctamente configurada

### Datos no se sincronizan
1. Verificar logs del webhook en Supabase
2. Verificar logs del endpoint (Vercel/Cloud Functions)
3. Verificar permisos de BigQuery
4. Verificar que el trigger esté activo

### Reindexación no funciona
- El proceso de reindexación en Vertex AI es asíncrono
- Puede tomar 15-30 minutos
- Verificar en la consola de Vertex AI Search

## Seguridad

1. **Tokens secretos**: Usar tokens fuertes y únicos
2. **HTTPS**: Siempre usar HTTPS para webhooks
3. **Validación**: Validar estructura del payload
4. **Rate limiting**: Implementar límites si es necesario
5. **Service Account**: Usar cuenta de servicio con permisos mínimos

## Costos Estimados

- **BigQuery**: ~$0.02 por GB almacenado/mes
- **Cloud Functions**: Gratis hasta 2M invocaciones/mes
- **Vertex AI Search**: Según documentos indexados
- **Webhooks**: Incluidos en plan de Supabase

## Próximos Pasos

1. ✅ Webhook básico implementado
2. ⏳ Agregar reintentos en caso de fallo
3. ⏳ Implementar cola de mensajes para alta carga
4. ⏳ Agregar métricas y alertas
5. ⏳ Implementar reindexación automática de Vertex AI