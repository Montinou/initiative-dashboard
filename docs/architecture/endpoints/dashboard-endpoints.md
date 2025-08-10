# 📊 Dashboard & Analytics Endpoints

> Endpoints para dashboards, analytics y métricas del sistema

## 📈 Dashboard Principal

### GET /api/dashboard/overview
**Descripción**: Obtiene métricas generales del dashboard con iniciativas, áreas y actividades

**Query Parameters**: Ninguno

**Response**:
```typescript
// Success (200)
{
  initiatives: Array<{
    id: string,
    title: string,
    description?: string,
    progress: number,
    start_date?: string,
    due_date?: string,
    area_id: string,
    areas: {
      id: string,
      name: string
    }
  }>,
  areas: Array<{
    id: string,
    name: string,
    manager_id?: string,
    objectives: Array<{
      id: string,
      title: string
    }>
  }>,
  activities: Array<{
    id: string,
    is_completed: boolean,
    initiative_id: string
  }>,
  stats: {
    totalInitiatives: number,
    completedInitiatives: number,
    inProgressInitiatives: number,
    averageProgress: number,
    totalAreas: number,
    totalActivities: number,
    completedActivities: number
  }
}

// Errors
401: { error: "Not authenticated" }
404: { error: "Profile not found" }
500: { error: "Internal server error" }
```

**Funcionalidad Interna**:
- Filtra por tenant_id del usuario
- Los managers solo ven datos de su área
- Calcula estadísticas agregadas
- Ejecuta queries en paralelo para mejor performance

---

### GET /api/dashboard/kpi-data
**Descripción**: Obtiene datos de KPIs con caching multi-capa (Redis, memoria, localStorage)

**Query Parameters**:
```typescript
{
  areaId?: string,
  forceRefresh?: "true",      // Forzar actualización de cache
  useWarmCache?: "true"       // Usar cache precalentado
}
```

**Response**:
```typescript
// Success (200)
{
  summary: {
    totalObjectives: number,
    completedObjectives: number,
    totalInitiatives: number,
    averageProgress: number,
    // ... más métricas
  },
  areaMetrics: Array<{
    areaId: string,
    areaName: string,
    metrics: {
      initiatives: number,
      completedInitiatives: number,
      averageProgress: number,
      // ... más métricas por área
    }
  }>,
  lastUpdated: string,
  cacheInfo: {
    cached: boolean,
    source: "memory" | "redis" | "localStorage" | "api",
    ttl: number,
    hitRate: number
  }
}

// Headers de respuesta
{
  "Cache-Control": "private, max-age=300",
  "X-Cache-Status": "HIT" | "MISS",
  "X-Response-Time": "XXms"
}

// Errors
401: { error: "Authentication required" }
500: { error: "Failed to fetch KPI data" }
```

**Funcionalidad Interna**:
- Implementa estrategia de caching PERF-002
- Cache basado en rol y tenant para seguridad
- TTL de 5 minutos por defecto
- Monitoreo de performance y hit rate
- Invalidación automática de cache

---

### GET /api/dashboard/analytics
**Descripción**: Obtiene analytics detallados del sistema

**Query Parameters**:
```typescript
{
  period?: "week" | "month" | "quarter" | "year",
  startDate?: string,
  endDate?: string,
  groupBy?: "area" | "status" | "priority"
}
```

**Response**: Documentación pendiente de revisión del archivo

---

### GET /api/dashboard/trend-analytics
**Descripción**: Obtiene tendencias analíticas históricas

**Query Parameters**:
```typescript
{
  metric?: "progress" | "completion" | "initiatives",
  period?: "daily" | "weekly" | "monthly",
  limit?: number
}
```

**Response**: Documentación pendiente de revisión del archivo

---

### GET /api/dashboard/progress-distribution
**Descripción**: Obtiene distribución de progreso de iniciativas

**Response**:
```typescript
// Success (200)
{
  distribution: {
    "0-25": number,    // Cantidad de iniciativas con 0-25% progreso
    "26-50": number,
    "51-75": number,
    "76-99": number,
    "100": number
  },
  total: number,
  average: number
}
```

---

### GET /api/dashboard/status-distribution
**Descripción**: Obtiene distribución de estados de iniciativas

**Response**:
```typescript
// Success (200)
{
  distribution: {
    planning: number,
    in_progress: number,
    completed: number,
    on_hold: number
  },
  total: number,
  percentages: {
    planning: number,
    in_progress: number,
    completed: number,
    on_hold: number
  }
}
```

---

### GET /api/dashboard/area-comparison
**Descripción**: Obtiene comparación de métricas entre áreas

**Response**:
```typescript
// Success (200)
{
  areas: Array<{
    id: string,
    name: string,
    metrics: {
      totalInitiatives: number,
      completedInitiatives: number,
      averageProgress: number,
      totalObjectives: number,
      completedObjectives: number
    },
    ranking: number
  }>,
  bestPerforming: {
    id: string,
    name: string,
    score: number
  }
}
```

---

### GET /api/dashboard/areas
**Descripción**: Obtiene información específica de áreas para dashboard

**Response**: Documentación pendiente de revisión del archivo

---

### GET /api/dashboard/objectives
**Descripción**: Obtiene objetivos para visualización en dashboard

**Response**: Documentación pendiente de revisión del archivo

---

### GET /api/dashboard/initiatives
**Descripción**: Obtiene iniciativas optimizadas para dashboard

**Response**: Documentación pendiente de revisión del archivo

---

## 👨‍💼 Manager Dashboard

### GET /api/manager-dashboard
**Descripción**: Obtiene datos completos del dashboard para managers

**Response**:
```typescript
// Success (200)
{
  area: {
    id: string,
    name: string,
    description?: string,
    is_active: boolean
  },
  stats: {
    totalInitiatives: number,
    activeInitiatives: number,
    completedInitiatives: number,
    averageProgress: number,
    totalActivities: number,
    completedActivities: number
  },
  initiatives: Initiative[],
  recentActivity: Activity[],
  upcomingDeadlines: Array<{
    id: string,
    title: string,
    due_date: string,
    days_remaining: number
  }>
}

// Errors
401: { error: "Authentication required" }
403: { error: "Manager access required" }
404: { error: "User profile not found" }
```

---

### GET /api/manager/area-summary
**Descripción**: Obtiene resumen completo del área del manager

**Response**:
```typescript
// Success (200)
{
  area: {
    id: string,
    name: string,
    description?: string,
    is_active: boolean
  },
  initiatives: Array<{
    id: string,
    title: string,
    description?: string,
    progress: number,
    status: string,
    start_date?: string,
    due_date?: string,
    total_activities: number,
    completed_activities: number,
    created_at: string,
    updated_at: string
  }>,
  metrics: {
    totalInitiatives: number,
    activeInitiatives: number,
    completedInitiatives: number,
    averageProgress: number,
    onTimeDeliveryRate: number,
    totalBudget?: number,
    spentBudget?: number
  },
  teamMembers?: Array<{
    id: string,
    full_name: string,
    email: string,
    role: string
  }>
}

// Errors
401: { error: "Authentication required" }
403: { 
  error: "Manager access required" |
         "Account is inactive" |
         "Data access not available"
}
404: { error: "User profile not found" }
500: { error: "Failed to fetch initiatives" }
```

**Funcionalidad Interna**:
- Valida rol de Manager y área asignada
- Verifica que la cuenta esté activa
- Usa vista `initiatives_with_subtasks_summary` para datos optimizados
- Calcula métricas en tiempo real
- Aplica scope de datos basado en permisos

---

### GET /api/manager/initiatives
**Descripción**: Obtiene iniciativas del área del manager con filtros

**Query Parameters**:
```typescript
{
  status?: "planning" | "in_progress" | "completed" | "on_hold",
  priority?: "high" | "medium" | "low",
  search?: string,
  sortBy?: "progress" | "due_date" | "created_at",
  order?: "asc" | "desc"
}
```

**Response**: Documentación pendiente de revisión del archivo

---

### GET /api/manager/file-stats
**Descripción**: Obtiene estadísticas de archivos del área

**Response**:
```typescript
// Success (200)
{
  totalFiles: number,
  totalSize: number,
  filesByType: {
    pdf: number,
    excel: number,
    word: number,
    image: number,
    other: number
  },
  recentUploads: number,
  topUploaders: Array<{
    user_id: string,
    user_name: string,
    file_count: number
  }>
}
```

---

### GET /api/manager/file-history
**Descripción**: Obtiene historial de archivos subidos al área

**Query Parameters**:
```typescript
{
  limit?: number,      // Default: 50
  offset?: number,     // Default: 0
  startDate?: string,
  endDate?: string
}
```

**Response**: Documentación pendiente de revisión del archivo

---

### GET /api/manager/file-activity
**Descripción**: Obtiene actividad reciente de archivos

**Response**: Documentación pendiente de revisión del archivo

---

## 📊 Analytics Generales

### GET /api/analytics
**Descripción**: Endpoint principal de analytics

**Response**: Documentación pendiente de revisión del archivo

---

### GET /api/analytics/trends
**Descripción**: Obtiene tendencias analíticas

**Response**: Documentación pendiente de revisión del archivo

---

### GET /api/analytics/kpi
**Descripción**: Obtiene KPIs analíticos específicos

**Response**: Documentación pendiente de revisión del archivo

---

*Última actualización: Enero 2025*