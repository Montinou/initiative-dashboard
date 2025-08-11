# Configuración Manual de Dialogflow CX

## 🎯 Acceso a la Consola

1. Abrir el agente en la consola:
   ```
   https://dialogflow.cloud.google.com/cx/projects/insaight-backend/locations/us-central1/agents/7f297240-ca50-4896-8b71-e82fd707fa88
   ```

## ✨ Paso 1: Habilitar Generative AI

1. Ir a **Agent Settings** (ícono de engranaje)
2. Seleccionar **Generative AI**
3. Activar **Enable generative features**
4. Configurar:
   - **Model**: `gemini-2.0-flash-exp`
   - **Temperature**: `0.7`
   - **Top K**: `40`
   - **Top P**: `0.95`

5. En **System Instructions**, pegar:
```
Eres un asistente experto en gestión de iniciativas y OKRs para Initiative Dashboard.

CONTEXTO:
- Tienes acceso a datos en tiempo real a través de BigQuery y webhooks
- El usuario está autenticado y su contexto se obtiene del session mapping
- Debes respetar los permisos según el rol del usuario

CAPACIDADES:
1. Analizar datos de iniciativas, objetivos y KPIs
2. Crear nuevas iniciativas con análisis inteligente
3. Generar planes de acción y actividades
4. Analizar la capacidad del equipo
5. Sugerir mejoras basadas en patrones históricos

DIRECTRICES:
- Siempre valida el contexto del usuario antes de ejecutar acciones
- Filtra datos según el tenant_id del usuario
- CEO puede ver toda la organización
- Manager solo ve su área
- Usa un tono profesional pero amigable
- Proporciona insights basados en datos concretos
- Sugiere acciones específicas y medibles

SEGURIDAD:
- Nunca expongas datos de otros tenants
- Valida permisos antes de crear o modificar datos
- Usa el session mapping para obtener el contexto real
```

## 🔧 Paso 2: Configurar Webhook

1. Ir a **Manage** > **Webhooks**
2. Click **Create**
3. Configurar:
   - **Display name**: `Initiative Dashboard Webhook`
   - **Webhook URL**: `https://us-central1-insaight-backend.cloudfunctions.net/dialogflowWebhook`
   - **Timeout**: `30s`
   - **Authentication**: None (la seguridad está en el session mapping)
4. Click **Save**

## 📊 Paso 3: Configurar BigQuery Tool

1. Ir a **Manage** > **Tools**
2. Click **Create**
3. Seleccionar **BigQuery**
4. Configurar:
   - **Display name**: `BigQuery Analytics`
   - **Project ID**: `insaight-backend`
   - **Dataset ID**: `gestion_iniciativas`
   - **Connection method**: Service Account

5. En **Tool Schemas**, añadir:

### Schema 1: getInitiatives
```json
{
  "name": "getInitiatives",
  "description": "Obtiene iniciativas filtradas por área, estado o progreso",
  "inputSchema": {
    "type": "object",
    "properties": {
      "area_id": {
        "type": "string",
        "description": "ID del área (opcional)"
      },
      "status": {
        "type": "string",
        "enum": ["planning", "in_progress", "on_hold", "completed"],
        "description": "Estado de la iniciativa"
      },
      "min_progress": {
        "type": "number",
        "description": "Progreso mínimo (0-100)"
      },
      "limit": {
        "type": "number",
        "description": "Número máximo de resultados",
        "default": 10
      }
    }
  },
  "query": "SELECT * FROM iniciativas WHERE 1=1 ${area_id ? 'AND area_id = @area_id' : ''} ${status ? 'AND estado = @status' : ''} ${min_progress ? 'AND progreso_actual >= @min_progress' : ''} ORDER BY fecha_actualizacion DESC LIMIT ${limit}"
}
```

### Schema 2: getKPIMetrics
```json
{
  "name": "getKPIMetrics",
  "description": "Obtiene métricas KPI del dashboard",
  "inputSchema": {
    "type": "object",
    "properties": {
      "timeframe": {
        "type": "string",
        "enum": ["7", "30", "90", "365"],
        "description": "Días hacia atrás",
        "default": "30"
      }
    }
  },
  "query": "SELECT COUNT(DISTINCT iniciativa_id) as total_iniciatives, AVG(progreso_actual) as avg_progress, COUNT(CASE WHEN estado = 'completed' THEN 1 END) as completed, COUNT(CASE WHEN estado = 'on_hold' THEN 1 END) as on_hold FROM iniciativas WHERE DATE(fecha_actualizacion) >= DATE_SUB(CURRENT_DATE(), INTERVAL @timeframe DAY)"
}
```

## 🛠️ Paso 4: Configurar Webhook Tool

1. En **Manage** > **Tools**
2. Click **Create**
3. Seleccionar **External Tool**
4. Configurar:
   - **Display name**: `Initiative Actions`
   - **OpenAPI schema** o **Tool definition**:

```yaml
openapi: 3.0.0
info:
  title: Initiative Dashboard Actions
  version: 1.0.0
servers:
  - url: https://us-central1-insaight-backend.cloudfunctions.net
paths:
  /dialogflowWebhook:
    post:
      operationId: executeAction
      parameters:
        - name: action
          in: query
          required: true
          schema:
            type: string
            enum: [createInitiative, createActivity, createActionPlan, analyzeCapacity, suggestImprovements]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExecuteActionRequest'
      responses:
        '200':
          description: Successful fulfillment
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WebhookResponse'
        '400':
          description: Bad request
        '401':
          description: Unauthorized
        '500':
          description: Server error
components:
  schemas:
    ExecuteActionRequest:
      type: object
      properties:
        sessionId:
          type: string
          description: Session ID del usuario (inyectado desde la sesión)
        params:
          oneOf:
            - $ref: '#/components/schemas/CreateActivityParams'
            - type: object
              additionalProperties: true
              description: Parámetros genéricos para otras acciones
      required: [sessionId]
    CreateActivityParams:
      type: object
      description: Parámetros para crear una actividad dentro de una iniciativa
      properties:
        initiative_id:
          type: string
          description: ID de la iniciativa a la que pertenece la actividad
        title:
          type: string
          description: Título de la actividad
        description:
          type: string
        due_date:
          type: string
          format: date
          description: Fecha límite (YYYY-MM-DD)
        owner_id:
          type: string
          description: Responsable (por defecto el usuario de la sesión)
        priority:
          type: string
          enum: [low, medium, high]
          default: medium
        effort:
          type: number
          description: Esfuerzo estimado (puntos u horas)
        status:
          type: string
          enum: [pending, in_progress, done]
          default: pending
      required: [initiative_id, title]
    WebhookResponse:
      type: object
      properties:
        fulfillmentResponse:
          type: object
          properties:
            messages:
              type: array
              items:
                type: object
        sessionInfo:
          type: object
          properties:
            session:
              type: string
            parameters:
              type: object
              additionalProperties: true
      required: [fulfillmentResponse]
```

5. Guardar la herramienta.

### Acción: createActivity
- Uso: `action=createActivity`
- Presets (desde sesión):
  - `tenant_id = $session.params.tenantId`
  - `area_id = $session.params.areaId`
  - `owner_id` por defecto: `$session.params.userId`
- Parámetros mínimos: `initiative_id`, `title`
- Ejemplo de payload:
```json
{
  "sessionId": "${dialogflow_session}",
  "params": {
    "initiative_id": "init_123",
    "title": "Preparar brief de campaña Q4",
    "description": "Definir objetivos, KPIs y stakeholders",
    "due_date": "2025-09-15",
    "priority": "high",
    "effort": 8
  }
}
```

> Nota: La creación se realiza en el webhook usando Supabase con RLS y el contexto de sesión. El conector de BigQuery es solo para lectura.

## 📚 Referencia de datos (BigQuery) y plantillas de consultas

Para ayudar al agente a usar correctamente ExecuteCustomQuery, define y documenta explícitamente las tablas y las consultas permitidas.

### Tablas en `insaight-backend.gestion_iniciativas`

- Tabla `iniciativas`
  - Campos principales: `iniciativa_id STRING` (PK), `tenant_id STRING`, `area_id STRING`, `titulo STRING`, `estado STRING` (planning|in_progress|on_hold|completed), `progreso_actual FLOAT64`, `fecha_actualizacion TIMESTAMP`.
- Tabla `actividades`
  - Campos principales: `actividad_id STRING` (PK), `iniciativa_id STRING`, `tenant_id STRING`, `area_id STRING`, `titulo STRING`, `descripcion STRING`, `status STRING` (pending|in_progress|done), `priority STRING` (low|medium|high), `effort FLOAT64`, `owner_id STRING`, `due_date DATE`, `created_at TIMESTAMP`, `updated_at TIMESTAMP`.

> Ajusta nombres/columnas si tu dataset difiere; mantén siempre `tenant_id` y, cuando aplique, `area_id` para filtrado multi‑tenant/área.

### Consultas aprobadas (SQL, StandardSQL)

1) getInitiatives
```
SELECT *
FROM `insaight-backend.gestion_iniciativas.iniciativas`
WHERE tenant_id = @tenant_id
  AND (@area_id IS NULL OR area_id = @area_id)
  AND (@status IS NULL OR estado = @status)
  AND (@min_progress IS NULL OR progreso_actual >= @min_progress)
ORDER BY fecha_actualizacion DESC
LIMIT @limit
```
Parámetros requeridos/sugeridos:
- tenant_id STRING (obligatorio, desde sesión)
- area_id STRING (opcional, desde sesión)
- status STRING (opcional)
- min_progress FLOAT64 (opcional)
- limit INT64 (default 10)

2) getKPIMetrics
```
SELECT COUNT(DISTINCT iniciativa_id) AS total_initiatives,
       AVG(progreso_actual)         AS avg_progress,
       COUNTIF(estado = 'completed') AS completed,
       COUNTIF(estado = 'on_hold')   AS on_hold
FROM `insaight-backend.gestion_iniciativas.iniciativas`
WHERE DATE(fecha_actualizacion) >= DATE_SUB(CURRENT_DATE(), INTERVAL @timeframe DAY)
  AND tenant_id = @tenant_id
  AND (@area_id IS NULL OR area_id = @area_id)
```
Parámetros:
- timeframe INT64 (default 30)
- tenant_id STRING (obligatorio)
- area_id STRING (opcional)

3) getActivitiesByInitiative
```
SELECT *
FROM `insaight-backend.gestion_iniciativas.actividades`
WHERE tenant_id = @tenant_id
  AND iniciativa_id = @initiative_id
ORDER BY due_date ASC, created_at DESC
LIMIT @limit
```
Parámetros: initiative_id STRING (obligatorio), tenant_id STRING (obligatorio), limit INT64 (default 50)

### Cómo mapear ExecuteCustomQuery (requestBody)

En la acción ExecuteCustomQuery, crea los siguientes campos:
- `requestBody.parameters.query` = pega la plantilla SQL
- `requestBody.parameters.parameterMode` = `NAMED`
- `requestBody.parameters.useLegacySql` = `false`
- `requestBody.parameters.queryParameters[]` = uno por cada parámetro, con estructura:
```
{
  "name": "tenant_id",
  "parameterType": { "type": "STRING" },
  "parameterValue": { "value": "$session.params.tenantId" }
}
```
Ejemplos adicionales:
- `area_id` → STRING → `$session.params.areaId`
- `status` → STRING → `$tool.params.status` (defínelo como input del método)
- `min_progress` → FLOAT64 → `$tool.params.min_progress`
- `limit` → INT64 → `${$tool.params.limit || 10}`
- `timeframe` → INT64 → `${$tool.params.timeframe || 30}`

### Definir métodos del Tool (recomendado)

Crea métodos para guiar al LLM y no dejar la SQL libre:
- Método: `getInitiatives`
  - Inputs: `status? (string)`, `min_progress? (number)`, `limit? (number)`
  - Presets: `tenant_id=$session.params.tenantId`, `area_id=$session.params.areaId`
  - Mapea los inputs a `queryParameters` como arriba.
- Método: `getKPIMetrics`
  - Inputs: `timeframe? (number)`
  - Presets: `tenant_id`, `area_id` desde sesión.
- Método: `getActivitiesByInitiative`
  - Inputs: `initiative_id (string)`, `limit? (number)`
  - Presets: `tenant_id` desde sesión.

### Prompt de herramientas (guardrails) para BigQuery

Pega esto al inicio de las System Instructions o como descripción del Tool:
```
Solo puedes consultar BigQuery usando las plantillas aprobadas: getInitiatives, getKPIMetrics, getActivitiesByInitiative.
Siempre incluye tenant_id = @tenant_id y, si existe, area_id = @area_id.
Nunca ejecutes DML (INSERT/UPDATE/DELETE) ni queries sin LIMIT.
Usa StandardSQL (useLegacySql=false) y parámetros con nombre (parameterMode=NAMED).
```

### Payloads de prueba (panel Test tool)

getInitiatives
```json
{
  "parameters": {
    "query": "SELECT * FROM `insaight-backend.gestion_iniciativas.iniciativas` WHERE tenant_id = @tenant_id AND (@area_id IS NULL OR area_id = @area_id) AND (@status IS NULL OR estado = @status) AND (@min_progress IS NULL OR progreso_actual >= @min_progress) ORDER BY fecha_actualizacion DESC LIMIT @limit",
    "parameterMode": "NAMED",
    "useLegacySql": false,
    "queryParameters": [
      {"name":"tenant_id","parameterType":{"type":"STRING"},"parameterValue":{"value":"$session.params.tenantId"}},
      {"name":"area_id","parameterType":{"type":"STRING"},"parameterValue":{"value":"$session.params.areaId"}},
      {"name":"status","parameterType":{"type":"STRING"},"parameterValue":{"value":"in_progress"}},
      {"name":"min_progress","parameterType":{"type":"FLOAT64"},"parameterValue":{"value":50}},
      {"name":"limit","parameterType":{"type":"INT64"},"parameterValue":{"value":10}}
    ]
  }
}
```

getKPIMetrics
```json
{
  "parameters": {
    "query": "SELECT COUNT(DISTINCT iniciativa_id) AS total_initiatives, AVG(progreso_actual) AS avg_progress, COUNTIF(estado='completed') AS completed, COUNTIF(estado='on_hold') AS on_hold FROM `insaight-backend.gestion_iniciativas.iniciativas` WHERE DATE(fecha_actualizacion) >= DATE_SUB(CURRENT_DATE(), INTERVAL @timeframe DAY) AND tenant_id=@tenant_id AND (@area_id IS NULL OR area_id=@area_id)",
    "parameterMode": "NAMED",
    "useLegacySql": false,
    "queryParameters": [
      {"name":"tenant_id","parameterType":{"type":"STRING"},"parameterValue":{"value":"$session.params.tenantId"}},
      {"name":"area_id","parameterType":{"type":"STRING"},"parameterValue":{"value":"$session.params.areaId"}},
      {"name":"timeframe","parameterType":{"type":"INT64"},"parameterValue":{"value":30}}
    ]
  }
}
```

## 🎯 Paso 5: Configurar Default Welcome Intent

1. Ir a **Default Start Flow**
2. Click en **Default Welcome Intent**
3. En **Fulfillment**:
   - Activar **Enable webhook call for this intent**
   - Seleccionar webhook: `Initiative Dashboard Webhook`
   - Tag: `session-init`
4. En **Response**, añadir:
```
¡Hola! Soy tu asistente de Initiative Dashboard potenciado con Gemini 2.0. 🚀

Puedo ayudarte a:
• 📊 Analizar el rendimiento de tus iniciativas
• ✨ Crear nuevas iniciativas con análisis inteligente
• ✅ Crear actividades y planes de acción
• 📈 Generar reportes y métricas KPI
• 👥 Analizar la capacidad de tu equipo
• 💡 Sugerir mejoras basadas en datos históricos

¿En qué puedo ayudarte hoy?
```

## 🔐 Paso 6: Configurar Session Parameters

1. Ir a **Agent Settings** > **Parameters**
2. Añadir los siguientes parámetros de sesión:

| Parameter | Entity Type | Required | Description |
|-----------|------------|----------|-------------|
| sessionId | @sys.any | No | ID único de sesión |
| userId | @sys.any | No | ID del usuario |
| tenantId | @sys.any | No | ID del tenant |
| tenantName | @sys.any | No | Nombre del tenant |
| role | @sys.any | No | Rol del usuario |
| areaId | @sys.any | No | ID del área |
| areaName | @sys.any | No | Nombre del área |

## 🧪 Paso 7: Probar el Agente

1. Click en **Test Agent** (esquina superior derecha)
2. En el simulador, escribir: "Hola"
3. Verificar que:
   - Se muestra el mensaje de bienvenida
   - El webhook se ejecuta (ver logs)
   - El session ID se genera

4. Probar comandos:
   - "Muéstrame las iniciativas activas"
   - "¿Cuál es el progreso promedio?"
   - "Crea una nueva iniciativa para mejorar ventas"
   - "Crea una actividad en la iniciativa X para preparar el brief antes del 15/09"
   - "Analiza la capacidad de mi equipo"

## 📝 Paso 8: Configurar Intents Adicionales

### Intent: Analizar Rendimiento
- **Training phrases**:
  - "¿Cómo vamos con las iniciativas?"
  - "Muéstrame el rendimiento"
  - "Análisis de KPIs"
- **Parameters**: timeframe (opcional)
- **Webhook**: Sí, tag: `analyze-performance`

### Intent: Crear Iniciativa
- **Training phrases**:
  - "Quiero crear una nueva iniciativa"
  - "Necesito añadir una iniciativa"
  - "Crear iniciativa para [objetivo]"
- **Parameters**: title, description, area
- **Webhook**: Sí, tag: `create-initiative`

### Intent: Crear Actividad
- **Training phrases**:
  - "Crea una actividad para la iniciativa [X]"
  - "Añade tarea: preparar brief antes del 15/09"
  - "Agregar actividad en ventas con prioridad alta"
- **Parameters**: initiative_id, title, due_date (opcional), priority (opcional)
- **Webhook**: Sí, tag: `create-activity`
- **Lógica esperada**: usar `tenantId`, `areaId`, `userId` desde la sesión; validar permisos y respetar RLS.

### Intent: Verificar Capacidad
- **Training phrases**:
  - "¿Mi equipo tiene capacidad?"
  - "Análisis de carga de trabajo"
  - "¿Podemos tomar más iniciativas?"
- **Webhook**: Sí, tag: `check-capacity`

## ✅ Verificación Final

1. **Generative AI**: Habilitado con Gemini 2.0
2. **Webhook**: Configurado y respondiendo
3. **Tools**: BigQuery y Webhook configurados
4. **Session Parameters**: Definidos
5. **Welcome Intent**: Con webhook
6. **Test**: Funcionando en simulador

## 🚀 Activación en Producción

1. En el frontend, verificar variables:
```env
NEXT_PUBLIC_DF_ENABLED=true
NEXT_PUBLIC_DF_PROJECT_ID=insaight-backend
NEXT_PUBLIC_DF_AGENT_ID=7f297240-ca50-4896-8b71-e82fd707fa88
NEXT_PUBLIC_DF_LOCATION=us-central1
```

2. Verificar que el webhook esté desplegado:
```bash
curl -X POST https://us-central1-insaight-backend.cloudfunctions.net/dialogflowWebhook \
  -H "Content-Type: application/json" \
  -d '{"fulfillmentInfo":{"tag":"test"}}'
```

3. Verificar Redis para session mapping:
```bash
redis-cli ping
```

## 🔒 Checklist de Seguridad

- [ ] Service Account con permisos mínimos
- [ ] SUPABASE_SERVICE_KEY en Secret Manager
- [ ] Redis con autenticación
- [ ] HTTPS en todos los endpoints
- [ ] Validación de session en webhook
- [ ] RLS aplicado en queries
- [ ] Logs habilitados para auditoría

## 📊 Monitoreo

1. **Cloud Logging**: Ver logs del webhook
2. **Dialogflow Console**: Ver conversaciones
3. **BigQuery**: Auditar queries ejecutadas
4. **Redis**: Monitorear sesiones activas

---

Una vez completados estos pasos, el agente estará completamente configurado y listo para usar con todas las medidas de seguridad implementadas.