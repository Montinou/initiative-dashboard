# 📦 Core Endpoints

> Endpoints principales del sistema para gestión de recursos fundamentales

## 🔐 Autenticación y Perfiles

### POST /api/profile/setup
**Descripción**: Crea o actualiza el perfil de usuario durante el proceso de autenticación inicial

**Headers**:
```typescript
{
  "authorization": "Bearer <token>",
  "host": string // Para determinar el tenant
}
```

**Request Body**: No requiere body

**Response**:
```typescript
// Success (200)
{
  message: string,
  profile: {
    id: string,
    user_id: string,
    tenant_id: string,
    email: string,
    full_name: string,
    role: "CEO" | "Admin" | "Manager" | "Analyst",
    area_id?: string,
    is_active: boolean
  },
  user: {
    id: string,
    email: string,
    metadata: Record<string, any>
  }
}

// Errors
401: { error: "Missing authorization header" | "Invalid token" }
500: { error: "Failed to create/update profile", details: string }
```

**Funcionalidad Interna**:
- Valida el token JWT del usuario
- Determina el tenant según el dominio del host
- Asigna rol basado en el email (CEO, Admin, Analyst)
- Usa upsert para crear o actualizar el perfil
- Utiliza Supabase Service Role Key para operaciones admin

---

### GET /api/profile/user
**Descripción**: Obtiene el perfil completo del usuario autenticado con información del tenant y área

**Headers**:
```typescript
{
  "cookie": string // Contiene el token de sesión de Supabase
}
```

**Response**:
```typescript
// Success (200)
{
  id: string,
  email: string,
  full_name: string,
  role: "CEO" | "Admin" | "Manager" | "Analyst",
  tenant_id: string,
  area_id?: string,
  is_active: boolean,
  is_system_admin: boolean,
  tenant: {
    id: string,
    name: string,
    slug: string,
    settings: Record<string, any>
  } | null,
  area: {
    id: string,
    name: string
  } | null
}

// Errors
401: { error: "Not authenticated" }
404: { error: "Profile not found" }
500: { error: "Internal server error" }
```

---

## 🎯 Iniciativas

### GET /api/initiatives
**Descripción**: Obtiene lista de iniciativas con sus relaciones (áreas, objetivos, actividades)

**Query Parameters**:
```typescript
{
  area_id?: string,
  objective_id?: string,
  created_by?: string,
  min_progress?: string,
  max_progress?: string
}
```

**Response**:
```typescript
// Success (200)
{
  initiatives: Array<{
    id: string,
    tenant_id: string,
    area_id: string,
    title: string,
    description?: string,
    progress: number,
    status: "planning" | "in_progress" | "completed" | "on_hold",
    due_date?: string,
    start_date?: string,
    completion_date?: string,
    created_by: string,
    created_at: string,
    updated_at: string,
    area: {
      id: string,
      name: string
    },
    objectives: Array<{
      id: string,
      title: string,
      description?: string
    }>,
    activities: Array<{
      id: string,
      title: string,
      description?: string,
      is_completed: boolean,
      assigned_to?: string
    }>,
    created_by_user: {
      id: string,
      full_name: string,
      email: string
    },
    calculated_progress: number,
    activity_stats: {
      total: number,
      completed: number
    }
  }>,
  total: number
}

// Errors
401: { error: "Authentication required" }
500: { error: "Failed to fetch initiatives" }
```

---

### POST /api/initiatives
**Descripción**: Crea una nueva iniciativa con objetivos y actividades opcionales

**Request Body**:
```typescript
{
  title: string,
  description?: string,
  area_id: string,
  objective_ids?: string[],
  due_date?: string,
  start_date?: string,
  activities?: Array<{
    title: string,
    description?: string,
    assigned_to?: string
  }>
}
```

**Response**:
```typescript
// Success (201)
{
  initiative: {
    id: string,
    tenant_id: string,
    area_id: string,
    title: string,
    description?: string,
    progress: number,
    created_by: string,
    due_date?: string,
    start_date?: string,
    created_at: string,
    updated_at: string
  },
  message: "Initiative created successfully"
}

// Errors
400: { error: "Title and area_id are required" }
401: { error: "Authentication required" }
403: { error: "Cannot create initiatives for other areas" }
500: { error: "Failed to create initiative" }
```

---

### PUT /api/initiatives
**Descripción**: Actualiza una iniciativa existente

**Request Body**:
```typescript
{
  id: string,
  title?: string,
  description?: string,
  progress?: number,
  due_date?: string,
  start_date?: string,
  completion_date?: string,
  objective_ids?: string[]
}
```

**Response**:
```typescript
// Success (200)
{
  initiative: Initiative,
  message: "Initiative updated successfully"
}

// Errors
400: { error: "Initiative ID is required" }
401: { error: "Authentication required" }
403: { error: "Cannot update initiatives from other areas" }
404: { error: "Initiative not found" }
500: { error: "Failed to update initiative" }
```

---

### DELETE /api/initiatives
**Descripción**: Elimina una iniciativa

**Query Parameters**:
```typescript
{
  id: string
}
```

**Response**:
```typescript
// Success (200)
{
  message: "Initiative deleted successfully"
}

// Errors
400: { 
  error: "Initiative ID is required" |
         "Cannot delete initiative with associated activities. Delete activities first."
}
401: { error: "Authentication required" }
403: { error: "Cannot delete initiatives from other areas" }
404: { error: "Initiative not found" }
500: { error: "Failed to delete initiative" }
```

---

## ✅ Actividades

### GET /api/activities
**Descripción**: Obtiene lista de actividades con filtros opcionales

**Query Parameters**:
```typescript
{
  initiative_id?: string,
  assigned_to?: string,
  is_completed?: "true" | "false"
}
```

**Response**:
```typescript
// Success (200)
{
  activities: Array<{
    id: string,
    initiative_id: string,
    title: string,
    description?: string,
    is_completed: boolean,
    assigned_to?: string,
    created_at: string,
    updated_at: string,
    initiative: {
      id: string,
      title: string,
      area_id: string,
      tenant_id: string
    },
    assigned_to_user?: {
      id: string,
      full_name: string,
      email: string
    }
  }>,
  total: number
}

// Errors
401: { error: "Authentication required" }
500: { error: "Failed to fetch activities" }
```

---

### POST /api/activities
**Descripción**: Crea una nueva actividad para una iniciativa

**Request Body**:
```typescript
{
  initiative_id: string,
  title: string,
  description?: string,
  assigned_to?: string
}
```

**Response**:
```typescript
// Success (201)
{
  activity: {
    id: string,
    initiative_id: string,
    title: string,
    description?: string,
    is_completed: false,
    assigned_to?: string,
    created_at: string,
    updated_at: string
  },
  message: "Activity created successfully"
}

// Errors
400: { error: "Initiative ID and title are required" }
401: { error: "Authentication required" }
403: { error: "Cannot create activities for initiatives in other areas" }
404: { error: "Initiative not found" }
500: { error: "Failed to create activity" }
```

---

### PUT /api/activities
**Descripción**: Actualiza una actividad existente

**Request Body**:
```typescript
{
  id: string,
  title?: string,
  description?: string,
  is_completed?: boolean,
  assigned_to?: string
}
```

**Response**:
```typescript
// Success (200)
{
  activity: Activity,
  message: "Activity updated successfully"
}

// Errors
400: { error: "Activity ID is required" }
401: { error: "Authentication required" }
403: { error: "Cannot update activities from other areas" }
404: { error: "Activity not found" }
500: { error: "Failed to update activity" }
```

---

### DELETE /api/activities
**Descripción**: Elimina una actividad

**Query Parameters**:
```typescript
{
  id: string
}
```

**Response**:
```typescript
// Success (200)
{
  message: "Activity deleted successfully"
}

// Errors
400: { error: "Activity ID is required" }
401: { error: "Authentication required" }
403: { error: "Cannot delete activities from other areas" }
404: { error: "Activity not found" }
500: { error: "Failed to delete activity" }
```

---

## 🏢 Áreas

### GET /api/areas
**Descripción**: Obtiene lista de áreas del tenant con estadísticas opcionales

**Query Parameters**:
```typescript
{
  page?: string,              // Default: "1"
  limit?: string,             // Default: "50", max: 100
  search?: string,            // Búsqueda por nombre
  includeStats?: "true"       // Incluir estadísticas de iniciativas
}
```

**Response**:
```typescript
// Success (200)
{
  areas: Array<{
    id: string,
    name: string,
    manager_id?: string,
    created_at: string,
    updated_at: string,
    manager: null,              // Manager relationship not implemented
    stats?: {                  // Solo si includeStats=true
      total: number,
      planning: number,
      in_progress: number,
      completed: number,
      on_hold: number,
      totalProgress: number,
      averageProgress: number
    }
  }>,
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}

// Errors
401: { error: "Authentication required" }
500: { error: "Failed to fetch areas" }
```

---

### POST /api/areas
**Descripción**: Crea una nueva área (solo CEO y Admin)

**Request Body**:
```typescript
{
  name: string,
  description?: string,         // Campo no usado actualmente
  manager_id?: string
}
```

**Response**:
```typescript
// Success (201)
{
  message: "Area created successfully",
  area: {
    id: string,
    tenant_id: string,
    name: string,
    manager_id?: string,
    created_at: string,
    updated_at: string
  }
}

// Errors
400: { 
  error: "Name is required" |
         "Invalid manager ID or manager not found"
}
401: { error: "Authentication required" }
403: { error: "Insufficient permissions" }
500: { error: "Failed to create area" }
```

---

## 🎯 Objetivos

### GET /api/objectives
**Descripción**: Obtiene lista de objetivos con relaciones opcionales

**Query Parameters**:
```typescript
{
  tenant_id?: string,           // Default: tenant del usuario
  area_id?: string,
  quarter_id?: string,
  include_initiatives?: "true"  // Incluir iniciativas relacionadas
}
```

**Response**:
```typescript
// Success (200)
{
  objectives: Array<{
    id: string,
    tenant_id: string,
    area_id?: string,
    title: string,
    description?: string,
    quarter?: string,
    priority: "high" | "medium" | "low",
    status: "planning" | "in_progress" | "completed" | "overdue",
    progress: number,
    target_date?: string,
    metrics: any[],
    created_by: string,
    created_at: string,
    updated_at: string,
    area?: {
      id: string,
      name: string
    },
    created_by_profile: {
      id: string,
      full_name: string,
      email: string
    },
    initiatives?: Initiative[],    // Si include_initiatives=true
    area_name?: string,
    created_by_name?: string,
    initiatives_count: number
  }>,
  total: number
}

// Errors
401: { error: "Unauthorized" }
404: { error: "User profile not found" }
500: { error: "Failed to fetch objectives" }
```

---

### POST /api/objectives
**Descripción**: Crea un nuevo objetivo (Executive, Admin, o Manager de área)

**Request Body**:
```typescript
{
  title: string,
  description?: string,
  area_id?: string,              // Default: área del usuario si es Manager
  quarter_ids?: string[]         // IDs de quarters a asociar
}
```

**Response**:
```typescript
// Success (201)
{
  id: string,
  tenant_id: string,
  area_id?: string,
  title: string,
  description?: string,
  priority: "medium",
  status: "planning",
  progress: 0,
  created_by: string,
  created_at: string,
  updated_at: string
}

// Errors
400: { 
  error: "Invalid input",
  details: ZodIssue[]
}
401: { error: "Unauthorized" }
403: { error: "Insufficient permissions" }
404: { error: "User profile not found" }
500: { error: "Failed to create objective" }
```

---

*Última actualización: Enero 2025*