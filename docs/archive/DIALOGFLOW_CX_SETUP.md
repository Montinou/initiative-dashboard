# Configuración de Dialogflow CX con Seguridad y Tools

## 📋 Resumen de la Implementación

Este documento describe la configuración completa de Dialogflow CX con:
- ✅ Session mapping seguro por usuario
- ✅ BigQuery Tool para análisis
- ✅ Webhook Functions para acciones
- ✅ Generative Features (Playbooks) con Gemini 2.0
- ✅ Seguridad multi-tenant con RLS

## 🔧 Componentes Implementados

### 1. Session Mapping API (`/api/ai/session-map`)
- **POST**: Crea sesión única por usuario con hash SHA256
- **GET**: Recupera datos de sesión para validación
- **DELETE**: Limpia sesión al cerrar
- **TTL**: 24 horas con Redis
- **Datos almacenados**: userId, tenantId, role, areaId

### 2. Webhook Principal (`docs/dialog-search/cloud-function-dialogflow-webhook`)
- Validación de tenant/rol via session mapping
- Integración con Supabase usando Service Role
- Aplicación de RLS según contexto del usuario
- Funciones disponibles:
  - `create-initiative`: Crea iniciativas con análisis inteligente
  - `suggest-initiatives`: Sugiere basado en gaps y datos históricos
  - `analyze-performance`: Análisis de métricas KPI
  - `check-capacity`: Verifica capacidad del equipo

### 3. Componente Frontend Seguro (`components/dialogflow-widget.tsx`)
- Inicialización automática de sesión
- Envío de contexto en cada request
- Limpieza de sesión al desmontar
- UI adaptativa con tema dark mode

## 🚀 Pasos de Configuración

### 1. Variables de Entorno

```env
# Frontend (.env.local)
NEXT_PUBLIC_DF_ENABLED=true
NEXT_PUBLIC_DF_PROJECT_ID=insaight-backend
NEXT_PUBLIC_DF_AGENT_ID=7f297240-ca50-4896-8b71-e82fd707fa88
NEXT_PUBLIC_DF_LOCATION=us-central1
NEXT_PUBLIC_DF_TITLE=Initiative Assistant AI

# Backend (Cloud Functions)
SUPABASE_URL=https://zkkdnslupqnpioltjpeu.supabase.co
SUPABASE_SERVICE_KEY=<your-service-role-key>
REDIS_URL=redis://localhost:6379
GCLOUD_PROJECT_ID=insaight-backend
```

### 2. Desplegar Cloud Function

```bash
cd docs/dialog-search/cloud-function-dialogflow-webhook
gcloud functions deploy dialogflowWebhook \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1 \
  --set-env-vars SUPABASE_URL=$SUPABASE_URL,SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
```

### 3. Configurar el Agente en Dialogflow CX

#### Via Script (Recomendado):
```bash
chmod +x scripts/configure-dialogflow-cx.sh
./scripts/configure-dialogflow-cx.sh
```

#### Via Consola Manual:

1. **Ir al agente**: https://conversational-agents.cloud.google.com/projects/insaight-backend/locations/us-central1/agents/7f297240-ca50-4896-8b71-e82fd707fa88/

2. **Configurar Webhook**:
   - Manage > Webhooks > Create
   - Name: `Initiative Dashboard Webhook`
   - URL: `https://us-central1-insaight-backend.cloudfunctions.net/dialogflowWebhook`
   - Timeout: 30s

3. **Habilitar Generative Features**:
   - Agent Settings > Generative AI
   - Enable Generative Features: ✅
   - Model: `gemini-2.0-flash-exp`
   - System Instructions:
   ```
   Eres un asistente experto en gestión de iniciativas y OKRs.
   Siempre valida el contexto del usuario antes de ejecutar acciones.
   Filtra datos según el tenant_id del usuario.
   Respeta los permisos según el rol (CEO ve todo, Manager ve su área).
   ```

4. **Configurar BigQuery Tool**:
   - Manage > Tools > Create
   - Type: BigQuery
   - Dataset: `insaight-backend.gestion_iniciativas`
   - Service Account: Con roles `bigquery.jobUser` + `bigquery.dataViewer`

5. **Configurar Tool Schemas**:

```json
{
  "tools": [
    {
      "name": "getInitiatives",
      "description": "Obtiene iniciativas filtradas",
      "parameters": {
        "type": "object",
        "properties": {
          "area_id": { "type": "string" },
          "status": { 
            "type": "string",
            "enum": ["planning", "in_progress", "on_hold", "completed"]
          },
          "min_progress": { "type": "number" }
        }
      }
    },
    {
      "name": "getKPIMetrics",
      "description": "Obtiene métricas KPI",
      "parameters": {
        "type": "object",
        "properties": {
          "tenant_id": { "type": "string" },
          "timeframe": {
            "type": "string",
            "enum": ["week", "month", "quarter", "year"]
          }
        }
      }
    },
    {
      "name": "createInitiative",
      "description": "Crea nueva iniciativa",
      "parameters": {
        "type": "object",
        "required": ["title", "area_id"],
        "properties": {
          "title": { "type": "string" },
          "description": { "type": "string" },
          "area_id": { "type": "string" },
          "objective_id": { "type": "string" },
          "start_date": { "type": "string", "format": "date" },
          "due_date": { "type": "string", "format": "date" }
        }
      }
    },
    {
      "name": "analyzeTeamCapacity",
      "description": "Analiza capacidad del equipo",
      "parameters": {
        "type": "object",
        "required": ["area_id"],
        "properties": {
          "area_id": { "type": "string" },
          "include_forecast": { "type": "boolean" }
        }
      }
    }
  ]
}
```

6. **Configurar Default Welcome Intent**:
   - Start Flow > Default Welcome Intent
   - Add webhook fulfillment
   - Tag: `session-init`
   - Response:
   ```
   ¡Hola! Soy tu asistente de Initiative Dashboard potenciado con Gemini 2.0. 🚀
   
   Puedo ayudarte a:
   • 📊 Analizar el rendimiento de tus iniciativas
   • ✨ Crear nuevas iniciativas con análisis inteligente
   • 📈 Generar reportes y métricas KPI
   • 👥 Analizar la capacidad de tu equipo
   • 💡 Sugerir mejoras basadas en datos históricos
   
   ¿En qué puedo ayudarte hoy?
   ```

## 🔒 Seguridad

### Flujo de Seguridad:
1. **Frontend**: Usuario autenticado en Supabase
2. **Session Map**: Genera sessionId único con contexto
3. **Dialogflow**: Envía sessionId en cada request
4. **Webhook**: Valida session y obtiene tenant/rol
5. **Queries**: Aplica filtros según contexto del usuario
6. **Respuesta**: Datos filtrados por tenant y permisos

### Validación en Webhook:

```javascript
// En el webhook, siempre validar:
const sessionId = req.body.sessionInfo?.parameters?.sessionId;
const sessionData = await redis.get(`dialogflow:session:${sessionId}`);

if (!sessionData) {
  return { error: 'Session no válida' };
}

const { tenantId, role, areaId } = JSON.parse(sessionData);

// Aplicar filtros según rol
let query = baseQuery;
if (role === 'manager') {
  query += ` AND area_id = '${areaId}'`;
}
query += ` AND tenant_id = '${tenantId}'`;
```

## 📊 Permisos BigQuery

El Service Account del agente necesita:
- `bigquery.jobUser`: Para ejecutar queries
- `bigquery.dataViewer`: Para leer datos

Datasets permitidos:
- `initiative_dashboard.*`: Todas las tablas del sistema
- `gestion_iniciativas.*`: Vistas materializadas

## 🧪 Testing

### Test de Session Mapping:
```bash
# Crear sesión
curl -X POST http://localhost:3000/api/ai/session-map \
  -H "Cookie: <auth-cookie>"

# Verificar sesión
curl http://localhost:3000/api/ai/session-map?sessionId=<session-id>
```

### Test del Webhook:
```bash
curl -X POST https://us-central1-insaight-backend.cloudfunctions.net/dialogflowWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "fulfillmentInfo": { "tag": "analyze-performance" },
    "sessionInfo": {
      "parameters": {
        "sessionId": "<session-id>",
        "timeframe": "30"
      }
    }
  }'
```

## 📝 Notas Importantes

1. **Redis Requerido**: Para almacenar mappings de sesión
2. **HTTPS Obligatorio**: Para el webhook en producción
3. **Secret Manager**: Usar para claves sensibles en GCP
4. **Monitoring**: Habilitar logs en Cloud Functions
5. **Rate Limiting**: Implementar para prevenir abuso

## 🔄 Actualización del Agente

Para actualizar la configuración del agente:

```bash
# Exportar configuración actual
gcloud alpha dialogflow cx agents export \
  --agent=$AGENT_ID \
  --location=$LOCATION \
  --destination=agent-backup.blob

# Modificar y re-importar
gcloud alpha dialogflow cx agents import \
  --agent=$AGENT_ID \
  --location=$LOCATION \
  --source=agent-updated.blob
```

## 📚 Referencias

- [Dialogflow CX Documentation](https://cloud.google.com/dialogflow/cx/docs)
- [Generative AI Features](https://cloud.google.com/dialogflow/cx/docs/concept/generative)
- [Tools Documentation](https://cloud.google.com/dialogflow/cx/docs/concept/tools)
- [Security Best Practices](https://cloud.google.com/dialogflow/cx/docs/concept/security)