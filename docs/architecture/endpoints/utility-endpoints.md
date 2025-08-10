# 🛠️ Utility & Debug Endpoints

> Endpoints de utilidad, debugging, testing y funciones auxiliares del sistema

## 🐛 Debug Endpoints

### GET /api/debug/auth
**Descripción**: Debug de información de autenticación del usuario actual

**Response**:
```typescript
// Success (200)
{
  authenticated: boolean,
  user: {
    id: string,
    email: string,
    email_verified: boolean,
    phone?: string,
    created_at: string,
    last_sign_in_at?: string,
    app_metadata: {
      provider?: string,
      providers?: string[]
    },
    user_metadata: any,
    identities?: Array<{
      id: string,
      user_id: string,
      identity_data: any,
      provider: string,
      created_at: string,
      last_sign_in_at: string
    }>
  },
  session: {
    access_token: string,        // Parcialmente oculto
    refresh_token: string,       // Parcialmente oculto
    expires_in: number,
    expires_at: number,
    token_type: string
  },
  debug_info: {
    supabase_url: string,
    headers: Record<string, string>,
    cookies: string[]
  }
}

// Errors
401: { error: "Not authenticated" }
500: { error: "Debug information unavailable" }
```

**Nota**: Solo disponible en entornos de desarrollo/staging

---

### GET /api/debug/user-profile
**Descripción**: Debug completo del perfil de usuario y permisos

**Response**:
```typescript
// Success (200)
{
  profile: {
    id: string,
    user_id: string,
    tenant_id: string,
    email: string,
    full_name: string,
    role: string,
    area_id?: string,
    is_active: boolean,
    is_system_admin: boolean,
    created_at: string,
    updated_at: string,
    last_login?: string
  },
  tenant: {
    id: string,
    organization_id: string,
    subdomain: string,
    organization: {
      id: string,
      name: string,
      settings: any
    }
  },
  area?: {
    id: string,
    name: string,
    manager_id?: string,
    is_active: boolean
  },
  permissions: {
    can_create_initiatives: boolean,
    can_edit_all_initiatives: boolean,
    can_delete_initiatives: boolean,
    can_manage_users: boolean,
    can_view_all_areas: boolean,
    can_access_admin: boolean
  },
  data_scope: {
    tenant_id: string,
    area_ids: string[],
    initiative_ids?: string[]
  }
}

// Errors
401: { error: "Not authenticated" }
404: { error: "Profile not found" }
500: { error: "Failed to fetch debug info" }
```

---

### GET /api/test-db
**Descripción**: Test de conexión y estado de la base de datos

**Response**:
```typescript
// Success (200)
{
  status: "healthy",
  database: {
    connected: boolean,
    version: string,
    ssl_enabled: boolean,
    pool_size: number,
    active_connections: number
  },
  tables_accessible: string[],
  row_counts: {
    users: number,
    initiatives: number,
    activities: number,
    areas: number,
    objectives: number
  },
  performance: {
    simple_query_ms: number,
    complex_query_ms: number,
    write_test_ms: number
  },
  supabase: {
    url: string,
    project_ref: string,
    anon_key_present: boolean,
    service_key_present: boolean
  }
}

// Errors
500: { 
  error: "Database connection failed",
  details: string
}
```

---

## 📅 Quarters Management

### GET /api/quarters
**Descripción**: Obtiene quarters/trimestres configurados

**Query Parameters**:
```typescript
{
  year?: number,
  include_past?: boolean,
  include_future?: boolean
}
```

**Response**:
```typescript
// Success (200)
{
  quarters: Array<{
    id: string,
    tenant_id: string,
    quarter_name: "Q1" | "Q2" | "Q3" | "Q4",
    year: number,
    start_date: string,
    end_date: string,
    is_current: boolean,
    is_active: boolean,
    objectives_count?: number,
    initiatives_count?: number
  }>,
  current_quarter?: {
    id: string,
    name: string,
    days_remaining: number,
    progress_percentage: number
  }
}

// Errors
401: { error: "Authentication required" }
500: { error: "Failed to fetch quarters" }
```

---

### POST /api/quarters
**Descripción**: Crea un nuevo quarter

**Request Body**:
```typescript
{
  quarter_name: "Q1" | "Q2" | "Q3" | "Q4",
  year: number,
  start_date: string,
  end_date: string,
  auto_create_objectives?: boolean
}
```

**Response**:
```typescript
// Success (201)
{
  quarter: Quarter,
  message: "Quarter created successfully",
  objectives_created?: number
}

// Errors
400: { 
  error: "Invalid quarter data" |
         "Quarter already exists"
}
401: { error: "Authentication required" }
403: { error: "Admin access required" }
500: { error: "Failed to create quarter" }
```

---

## 📈 Progress Tracking

### GET /api/progress-tracking
**Descripción**: Obtiene datos de tracking de progreso

**Query Parameters**:
```typescript
{
  entity: "initiative" | "objective" | "area",
  entity_id: string,
  period?: "day" | "week" | "month",
  start_date?: string,
  end_date?: string
}
```

**Response**:
```typescript
// Success (200)
{
  entity: {
    id: string,
    type: string,
    name: string,
    current_progress: number
  },
  history: Array<{
    date: string,
    progress: number,
    delta: number,              // Cambio desde punto anterior
    activities_completed?: number,
    notes?: string,
    updated_by?: {
      id: string,
      name: string
    }
  }>,
  trends: {
    direction: "up" | "down" | "stable",
    average_daily_change: number,
    estimated_completion_date?: string,
    days_ahead_or_behind: number
  },
  milestones?: Array<{
    progress: number,
    reached_at?: string,
    expected_at?: string
  }>
}

// Errors
400: { error: "Entity type and ID required" }
401: { error: "Authentication required" }
404: { error: "Entity not found" }
500: { error: "Failed to fetch progress tracking" }
```

---

### POST /api/progress-tracking/update
**Descripción**: Actualiza manualmente el progreso

**Request Body**:
```typescript
{
  entity_type: "initiative" | "objective",
  entity_id: string,
  progress: number,              // 0-100
  notes?: string,
  activities_completed?: number,
  force_update?: boolean         // Ignorar validaciones
}
```

**Response**:
```typescript
// Success (200)
{
  previous_progress: number,
  new_progress: number,
  delta: number,
  updated_at: string,
  history_entry_id: string
}

// Errors
400: { 
  error: "Invalid progress value" |
         "Progress cannot decrease"  // Si force_update = false
}
401: { error: "Authentication required" }
403: { error: "Cannot update progress for this entity" }
404: { error: "Entity not found" }
500: { error: "Failed to update progress" }
```

---

## 🏢 OKR Departments

### GET /api/okrs/departments
**Descripción**: Obtiene OKRs agrupados por departamento

**Query Parameters**:
```typescript
{
  quarter_id?: string,
  include_initiatives?: boolean,
  include_metrics?: boolean
}
```

**Response**:
```typescript
// Success (200)
{
  departments: Array<{
    area_id: string,
    area_name: string,
    manager?: {
      id: string,
      name: string,
      email: string
    },
    okrs: Array<{
      objective: {
        id: string,
        title: string,
        description?: string,
        progress: number,
        status: string,
        target_date?: string
      },
      key_results: Array<{
        id: string,
        title: string,
        current_value: number,
        target_value: number,
        unit: string,
        progress: number
      }>,
      initiatives?: Initiative[]
    }>,
    summary: {
      total_objectives: number,
      completed_objectives: number,
      average_progress: number,
      on_track: number,
      at_risk: number,
      behind: number
    }
  }>,
  organization_summary: {
    total_departments: number,
    total_okrs: number,
    average_completion: number,
    best_performing_department: {
      id: string,
      name: string,
      score: number
    }
  }
}

// Errors
401: { error: "Authentication required" }
500: { error: "Failed to fetch department OKRs" }
```

---

## 🔍 Search

### GET /api/search
**Descripción**: Búsqueda global en el sistema

**Query Parameters**:
```typescript
{
  q: string,                     // Query de búsqueda
  types?: Array<"initiatives" | "objectives" | "activities" | "users" | "files">,
  limit?: number,                // Default: 20 por tipo
  fuzzy?: boolean                // Búsqueda aproximada
}
```

**Response**:
```typescript
// Success (200)
{
  results: {
    initiatives?: Array<{
      id: string,
      title: string,
      description?: string,
      match_score: number,
      highlighted_text?: string
    }>,
    objectives?: Array<{
      id: string,
      title: string,
      description?: string,
      match_score: number,
      highlighted_text?: string
    }>,
    activities?: Array<{
      id: string,
      title: string,
      initiative_title?: string,
      match_score: number,
      highlighted_text?: string
    }>,
    users?: Array<{
      id: string,
      full_name: string,
      email: string,
      role: string,
      match_score: number
    }>,
    files?: Array<{
      id: string,
      filename: string,
      uploaded_by: string,
      match_score: number
    }>
  },
  total_results: number,
  search_time_ms: number,
  suggestions?: string[]         // Términos de búsqueda sugeridos
}

// Errors
400: { error: "Search query required" }
401: { error: "Authentication required" }
500: { error: "Search failed" }
```

---

## 🔧 System Health

### GET /api/health
**Descripción**: Health check del sistema

**Response**:
```typescript
// Success (200)
{
  status: "healthy" | "degraded" | "unhealthy",
  timestamp: string,
  uptime_seconds: number,
  checks: {
    database: {
      status: "ok" | "error",
      latency_ms: number,
      error?: string
    },
    storage: {
      status: "ok" | "error",
      available_space_gb: number,
      error?: string
    },
    redis: {
      status: "ok" | "error",
      latency_ms: number,
      memory_usage_mb: number,
      error?: string
    },
    external_apis: {
      supabase: "ok" | "error",
      openai?: "ok" | "error",
      bigquery?: "ok" | "error"
    }
  },
  version: {
    api: string,
    database: string,
    deployed_at: string,
    git_commit?: string
  }
}

// Errors
500: { 
  error: "Health check failed",
  failing_services: string[]
}
```

---

### GET /api/metrics
**Descripción**: Métricas de performance del sistema

**Response**:
```typescript
// Success (200)
{
  performance: {
    average_response_time_ms: number,
    p95_response_time_ms: number,
    p99_response_time_ms: number,
    requests_per_second: number,
    error_rate: number
  },
  resources: {
    cpu_usage_percent: number,
    memory_usage_mb: number,
    disk_io_ops: number,
    network_bytes_per_second: number
  },
  business_metrics: {
    active_users_today: number,
    api_calls_today: number,
    data_changes_today: number,
    failed_operations: number
  },
  cache_metrics: {
    hit_rate: number,
    miss_rate: number,
    evictions: number,
    memory_usage_mb: number
  }
}

// Errors
401: { error: "Authentication required" }
403: { error: "Admin access required" }
500: { error: "Failed to fetch metrics" }
```

---

*Última actualización: Enero 2025*