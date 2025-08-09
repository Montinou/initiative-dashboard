# 🚀 Cómo Configurar el Webhook de Sincronización

## Configuración en 3 Pasos (5 minutos)

### Paso 1: Acceder al Dashboard de Supabase

1. Abre este link: [Database Webhooks](https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/database/hooks)
2. O navega manualmente:
   - Ir a [Supabase Dashboard](https://supabase.com/dashboard)
   - Seleccionar proyecto: `zkkdnslupqnpioltjpeu`
   - Menu lateral: `Database` → `Webhooks`

### Paso 2: Crear el Webhook

1. Click en el botón **"Create a new hook"**

2. Llenar el formulario con estos valores **EXACTOS** (copiar y pegar):

   **Información Básica:**
   - **Name**: `bigquery-sync`
   - **Schema**: `public`
   - **Table**: `initiatives`

   **Eventos a Capturar:**
   - ✅ **Insert** (marcar)
   - ✅ **Update** (marcar)
   - ✅ **Delete** (marcar)

   **Configuración HTTP:**
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: 
     ```
     https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQuery
     ```

   **Headers** (agregar estos dos):
   - **Header 1**:
     - Key: `Content-Type`
     - Value: `application/json`
   
   - **Header 2**:
     - Key: `Authorization`
     - Value: `Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8`

   **Configuración Avanzada:**
   - **Timeout**: `10000` (10 segundos)
   - **HTTP Pool Size**: `10` (default)

3. Click en **"Create webhook"**

### Paso 3: Verificar que Funciona

1. **Test Rápido en SQL Editor**:
   
   Abre [SQL Editor](https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/sql/new) y ejecuta:
   
   ```sql
   -- Actualizar una iniciativa de prueba
   UPDATE initiatives 
   SET progress = progress + 1,
       updated_at = NOW()
   WHERE id = (SELECT id FROM initiatives LIMIT 1)
   RETURNING id, title, progress;
   ```

2. **Verificar en el Log del Webhook** (mismo dashboard):
   - Deberías ver una entrada nueva con status `200 OK`
   - Si hay error, revisa los headers y URL

3. **Confirmar en BigQuery** (esperar 10 segundos):
   ```bash
   bq query --use_legacy_sql=false \
     "SELECT iniciativa_id, nombre_iniciativa, progreso_actual 
      FROM insaight-backend.gestion_iniciativas.iniciativas 
      ORDER BY progreso_actual DESC LIMIT 5"
   ```

## 🎯 Valores para Copiar/Pegar

### URL del Webhook:
```
https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQuery
```

### Authorization Header:
```
Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8
```

### Content-Type Header:
```
application/json
```

## ✅ Checklist de Verificación

- [ ] Webhook creado con nombre `bigquery-sync`
- [ ] Configurado para tabla `initiatives`
- [ ] Los 3 eventos (Insert, Update, Delete) marcados
- [ ] URL de Cloud Function correcta
- [ ] Headers de autorización configurados
- [ ] Test ejecutado y webhook responde con 200
- [ ] Datos actualizados en BigQuery

## 🔧 Troubleshooting

### Error 401 Unauthorized
- Verificar que el header `Authorization` tenga el valor completo con `Bearer `
- Token correcto: `Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8`

### Error 404 Not Found
- Verificar URL: debe ser exactamente la URL de la Cloud Function
- NO agregar `/` al final de la URL

### Error 500 Internal Server Error
- Revisar logs de Cloud Function:
  ```bash
  gcloud functions logs read syncSupabaseToBigQuery --limit 20
  ```

### Webhook no se ejecuta
- Verificar que esté "Enabled" en el dashboard
- Verificar que los eventos estén marcados
- Probar con un INSERT nuevo en vez de UPDATE

## 📊 Monitoreo Continuo

### Ver Estado del Webhook
En el Dashboard de Webhooks puedes ver:
- Cantidad de ejecuciones
- Tasa de éxito/fallo
- Últimas ejecuciones con detalles

### Sincronización Manual (Backup)
Si necesitas forzar una sincronización completa:
```bash
curl "https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQuery?token=sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8"
```

## 📝 Notas Importantes

1. **El webhook se activa INSTANTÁNEAMENTE** cuando hay cambios en `initiatives`
2. **Supabase reintenta automáticamente** si hay fallos temporales
3. **Los datos en BigQuery se actualizan en ~5-10 segundos**
4. **Vertex AI Search tarda 15-30 min** en reindexar (proceso automático)

## 🎉 ¡Listo!

Una vez configurado, el sistema funciona automáticamente:

```
Cambio en App → Supabase → Webhook → Cloud Function → BigQuery → Vertex AI → Dialogflow
```

No requiere mantenimiento ni intervención manual.