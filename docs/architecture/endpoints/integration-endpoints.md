# 🔌 Integration & AI Endpoints

> Endpoints para integraciones externas, IA y sincronización de datos

## 🤖 Stratix AI

### POST /api/stratix/chat
**Descripción**: Endpoint principal de chat con IA para análisis y recomendaciones

**Request Body**:
```typescript
{
  message: string,
  context?: {
    area_id?: string,
    initiative_id?: string,
    objective_id?: string,
    include_history?: boolean
  },
  options?: {
    temperature?: number,        // 0.0 - 1.0, default: 0.7
    max_tokens?: number,        // Default: 1000
    stream?: boolean            // Default: false
  }
}
```

**Response** (Non-streaming):
```typescript
// Success (200)
{
  response: string,
  metadata: {
    model: string,
    tokens_used: number,
    processing_time_ms: number
  },
  suggestions?: Array<{
    type: "action" | "insight" | "warning",
    title: string,
    description: string,
    priority: "high" | "medium" | "low"
  }>,
  related_data?: {
    initiatives?: Initiative[],
    objectives?: Objective[],
    metrics?: any
  }
}

// Errors
400: { error: "Message required" }
401: { error: "Authentication required" }
429: { error: "Rate limit exceeded" }
500: { error: "AI service unavailable" }
```

**Response** (Streaming - Server-Sent Events):
```typescript
// Event stream format
data: {"chunk": "texto...", "done": false}
data: {"chunk": "más texto...", "done": false}
data: {"done": true, "metadata": {...}}
```

**Funcionalidad Interna**:
- Integración con OpenAI/Anthropic API
- Context-aware responses basadas en datos del tenant
- Rate limiting por usuario
- Historial de conversación opcional
- Análisis de sentimiento y extracción de insights

---

### GET /api/stratix/chat/test
**Descripción**: Endpoint de prueba para verificar disponibilidad del servicio AI

**Response**:
```typescript
// Success (200)
{
  status: "operational",
  model: string,
  version: string,
  limits: {
    requests_per_minute: number,
    tokens_per_request: number
  },
  test_response?: string
}

// Errors
500: { 
  error: "AI service unavailable",
  details: string
}
```

---

## 🔄 BigQuery Sync

### POST /api/sync/bigquery
**Descripción**: Webhook endpoint para sincronizar datos con BigQuery

**Headers**:
```typescript
{
  "authorization": "Bearer <WEBHOOK_SECRET_TOKEN>"
}
```

**Request Body** (Supabase Webhook Payload):
```typescript
{
  type: "INSERT" | "UPDATE" | "DELETE",
  table: string,
  schema: string,
  record: {                      // Nuevo registro (INSERT/UPDATE)
    id: string,
    [key: string]: any
  },
  old_record?: {                 // Registro anterior (UPDATE/DELETE)
    id: string,
    [key: string]: any
  },
  commit_timestamp: string
}
```

**Response**:
```typescript
// Success (200)
{
  success: true,
  action: "inserted" | "updated" | "deleted",
  bigQueryId?: string,
  dataset: string,
  table: string,
  processed_at: string,
  sync_metadata: {
    latency_ms: number,
    retry_count: number
  }
}

// Table not configured (200)
{
  success: false,
  message: "Table not configured for sync",
  table: string
}

// Errors
401: { error: "Unauthorized" }
500: { 
  error: "BigQuery sync failed",
  details: string,
  retry_after?: number
}
```

**Funcionalidad Interna**:
- Validación de token de webhook
- Mapeo de esquemas Supabase → BigQuery
- Transformación de tipos de datos
- Manejo de operaciones CRUD
- Retry automático con backoff exponencial
- Logging en webhook_audit_log
- Dead letter queue para fallos persistentes

---

### GET /api/sync/bigquery/status
**Descripción**: Obtiene estado de sincronización con BigQuery

**Response**:
```typescript
// Success (200)
{
  status: "healthy" | "degraded" | "offline",
  last_sync: string,
  statistics: {
    total_synced_today: number,
    pending_queue: number,
    failed_last_24h: number,
    average_latency_ms: number
  },
  tables_configured: string[],
  recent_errors?: Array<{
    timestamp: string,
    table: string,
    error: string
  }>
}

// Errors
401: { error: "Authentication required" }
403: { error: "Admin access required" }
500: { error: "Failed to fetch sync status" }
```

---

## 🔗 External Webhooks

### POST /api/webhooks/slack
**Descripción**: Recibe notificaciones para enviar a Slack

**Headers**:
```typescript
{
  "X-Webhook-Secret": string
}
```

**Request Body**:
```typescript
{
  channel?: string,              // Default: configurado en env
  text?: string,
  blocks?: Array<any>,          // Slack Block Kit format
  attachments?: Array<any>,
  thread_ts?: string,           // Para responder en thread
  notification_type?: "initiative" | "objective" | "alert"
}
```

**Response**:
```typescript
// Success (200)
{
  success: true,
  message_ts: string,
  channel: string
}

// Errors
400: { error: "Invalid payload" }
401: { error: "Invalid webhook secret" }
500: { error: "Failed to send to Slack" }
```

---

### POST /api/webhooks/teams
**Descripción**: Recibe notificaciones para enviar a Microsoft Teams

**Headers**:
```typescript
{
  "X-Webhook-Secret": string
}
```

**Request Body**:
```typescript
{
  title: string,
  text: string,
  color?: string,
  sections?: Array<{
    activityTitle?: string,
    activitySubtitle?: string,
    facts?: Array<{
      name: string,
      value: string
    }>
  }>,
  potentialAction?: Array<any>
}
```

**Response**:
```typescript
// Success (200)
{
  success: true,
  message: "Notification sent to Teams"
}

// Errors
400: { error: "Invalid payload" }
401: { error: "Invalid webhook secret" }
500: { error: "Failed to send to Teams" }
```

---

## 📊 Data Export APIs

### POST /api/export/powerbi
**Descripción**: Prepara datos para exportación a Power BI

**Request Body**:
```typescript
{
  entities: Array<"initiatives" | "objectives" | "activities" | "kpis">,
  filters?: {
    area_id?: string,
    date_from?: string,
    date_to?: string,
    status?: string[]
  },
  format: "json" | "csv",
  flatten?: boolean              // Aplanar relaciones anidadas
}
```

**Response**:
```typescript
// Success (200)
{
  export_id: string,
  status: "ready" | "processing",
  download_url?: string,         // Si status = "ready"
  expires_at?: string,
  record_count: number,
  file_size_bytes?: number
}

// Errors
400: { error: "Invalid export configuration" }
401: { error: "Authentication required" }
403: { error: "Export not allowed for your role" }
500: { error: "Export failed" }
```

---

### GET /api/export/tableau
**Descripción**: Endpoint compatible con Tableau Web Data Connector

**Query Parameters**:
```typescript
{
  table: "initiatives" | "objectives" | "metrics",
  max_rows?: number,
  include_metadata?: boolean
}
```

**Response**:
```typescript
// Success (200)
{
  table_name: string,
  columns: Array<{
    id: string,
    alias: string,
    dataType: "string" | "int" | "float" | "date" | "datetime" | "bool"
  }>,
  rows: Array<Array<any>>,
  has_more: boolean,
  next_token?: string
}

// Errors
401: { error: "Authentication required" }
500: { error: "Failed to fetch Tableau data" }
```

---

## 🔐 API Keys Management

### GET /api/integrations/api-keys
**Descripción**: Obtiene API keys para integraciones externas

**Response**:
```typescript
// Success (200)
{
  api_keys: Array<{
    id: string,
    name: string,
    key_preview: string,         // Últimos 4 caracteres
    scopes: string[],
    created_at: string,
    last_used?: string,
    expires_at?: string,
    is_active: boolean
  }>
}

// Errors
401: { error: "Authentication required" }
403: { error: "Admin access required" }
500: { error: "Failed to fetch API keys" }
```

---

### POST /api/integrations/api-keys
**Descripción**: Crea una nueva API key

**Request Body**:
```typescript
{
  name: string,
  scopes: Array<"read" | "write" | "delete">,
  expires_in_days?: number       // Default: 365
}
```

**Response**:
```typescript
// Success (201)
{
  id: string,
  name: string,
  api_key: string,               // Solo se muestra una vez
  scopes: string[],
  expires_at: string,
  message: "Save this API key - it won't be shown again"
}

// Errors
400: { error: "Invalid scopes" }
401: { error: "Authentication required" }
403: { error: "Admin access required" }
500: { error: "Failed to create API key" }
```

---

### DELETE /api/integrations/api-keys/[id]
**Descripción**: Revoca una API key

**Response**:
```typescript
// Success (200)
{
  message: "API key revoked successfully"
}

// Errors
401: { error: "Authentication required" }
403: { error: "Admin access required" }
404: { error: "API key not found" }
500: { error: "Failed to revoke API key" }
```

---

*Última actualización: Enero 2025*