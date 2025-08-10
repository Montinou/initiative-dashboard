# 🛠️ Admin & Organization Management Endpoints

> Endpoints para administración de la organización, usuarios y configuraciones

## 👥 Gestión de Usuarios

### GET /api/org-admin/users
**Descripción**: Obtiene lista de usuarios de la organización con filtros (solo CEO y Admin)

**Query Parameters**:
```typescript
{
  page?: string,           // Default: "1"
  limit?: string,          // Default: "50", max: 100
  search?: string,         // Búsqueda por nombre o email
  role?: "CEO" | "Admin" | "Manager",
  area_id?: string | "unassigned",
  is_active?: "true" | "false"
}
```

**Response**:
```typescript
// Success (200)
{
  users: Array<{
    id: string,
    tenant_id: string,
    email: string,
    full_name: string,
    role: "CEO" | "Admin" | "Manager",
    area_id?: string,
    user_id?: string,
    avatar_url?: string,
    phone?: string,
    is_active: boolean,
    is_system_admin: boolean,
    last_login?: string,
    created_at: string,
    updated_at: string,
    area?: {
      id: string,
      name: string
    }
  }>,
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  },
  statistics: {
    total: number,
    active: number,
    inactive: number,
    byRole: {
      CEO: number,
      Admin: number,
      Manager: number
    }
  }
}

// Errors
401: { error: "Authentication required" }
403: { error: "Insufficient permissions" }
500: { error: "Failed to fetch users" }
```

**Funcionalidad Interna**:
- Solo accesible por CEO y Admin
- Filtra por tenant_id del usuario autenticado
- Soporta búsqueda, filtros y paginación
- Incluye estadísticas de usuarios

---

### POST /api/org-admin/users
**Descripción**: Crea un nuevo usuario en la organización

**Request Body**:
```typescript
{
  email: string,                     // Email válido
  full_name: string,                 // Min: 1, Max: 100
  role: "CEO" | "Admin" | "Manager",
  area_id?: string | null,           // UUID del área
  phone?: string,
  send_invitation?: boolean           // Default: true
}
```

**Response**:
```typescript
// Success (201)
{
  user: UserProfile,
  message: "User created successfully",
  invitation?: {
    sent: boolean,
    token?: string
  }
}

// Errors
400: { 
  error: "Invalid input",
  details: ZodError[]
}
401: { error: "Authentication required" }
403: { error: "Insufficient permissions" }
409: { error: "User already exists" }
500: { error: "Failed to create user" }
```

---

### PUT /api/org-admin/users/[id]
**Descripción**: Actualiza información de un usuario

**Request Body**:
```typescript
{
  full_name?: string,
  role?: "CEO" | "Admin" | "Manager",
  area_id?: string | null,
  phone?: string | null,
  is_active?: boolean
}
```

**Response**:
```typescript
// Success (200)
{
  user: UserProfile,
  message: "User updated successfully"
}

// Errors
400: { error: "Invalid input" }
401: { error: "Authentication required" }
403: { error: "Insufficient permissions" }
404: { error: "User not found" }
500: { error: "Failed to update user" }
```

---

### DELETE /api/org-admin/users/[id]
**Descripción**: Desactiva o elimina un usuario

**Response**:
```typescript
// Success (200)
{
  message: "User deactivated successfully"
}

// Errors
401: { error: "Authentication required" }
403: { error: "Insufficient permissions" | "Cannot delete yourself" }
404: { error: "User not found" }
500: { error: "Failed to delete user" }
```

---

## 📊 Estadísticas Organizacionales

### GET /api/org-admin/stats
**Descripción**: Obtiene estadísticas generales de la organización

**Response**:
```typescript
// Success (200)
{
  users: {
    total: number,
    active: number,
    inactive: number,
    byRole: {
      CEO: number,
      Admin: number,
      Manager: number,
      Analyst: number
    },
    recentlyActive: number,        // Últimos 7 días
    pendingInvitations: number
  },
  areas: {
    total: number,
    withManager: number,
    withoutManager: number,
    active: number
  },
  initiatives: {
    total: number,
    byStatus: {
      planning: number,
      in_progress: number,
      completed: number,
      on_hold: number
    },
    averageProgress: number,
    overdue: number
  },
  activities: {
    total: number,
    completed: number,
    pending: number,
    completionRate: number
  },
  lastUpdated: string
}

// Errors
401: { error: "Authentication required" }
403: { error: "Insufficient permissions" }
500: { error: "Failed to fetch statistics" }
```

---

## 🏢 Gestión de Áreas

### GET /api/org-admin/areas
**Descripción**: Obtiene todas las áreas de la organización para administración

**Query Parameters**:
```typescript
{
  includeInactive?: "true",
  includeStats?: "true"
}
```

**Response**:
```typescript
// Success (200)
{
  areas: Array<{
    id: string,
    name: string,
    description?: string,
    manager_id?: string,
    is_active: boolean,
    created_at: string,
    updated_at: string,
    manager?: {
      id: string,
      full_name: string,
      email: string
    },
    stats?: {
      users: number,
      initiatives: number,
      objectives: number,
      averageProgress: number
    }
  }>,
  total: number
}

// Errors
401: { error: "Authentication required" }
403: { error: "Insufficient permissions" }
500: { error: "Failed to fetch areas" }
```

---

### GET /api/org-admin/areas/[id]
**Descripción**: Obtiene detalles completos de un área específica

**Response**:
```typescript
// Success (200)
{
  area: {
    id: string,
    name: string,
    description?: string,
    manager_id?: string,
    is_active: boolean,
    created_at: string,
    updated_at: string
  },
  manager?: UserProfile,
  users: UserProfile[],
  initiatives: {
    total: number,
    recent: Initiative[]
  },
  objectives: {
    total: number,
    recent: Objective[]
  },
  metrics: {
    performance: number,
    productivity: number,
    completionRate: number
  }
}

// Errors
401: { error: "Authentication required" }
403: { error: "Insufficient permissions" }
404: { error: "Area not found" }
500: { error: "Failed to fetch area details" }
```

---

### GET /api/org-admin/areas/[id]/users
**Descripción**: Obtiene usuarios asignados a un área específica

**Response**:
```typescript
// Success (200)
{
  users: Array<{
    id: string,
    email: string,
    full_name: string,
    role: string,
    is_active: boolean,
    avatar_url?: string,
    last_login?: string
  }>,
  total: number,
  manager?: {
    id: string,
    full_name: string,
    email: string
  }
}

// Errors
401: { error: "Authentication required" }
403: { error: "Insufficient permissions" }
404: { error: "Area not found" }
500: { error: "Failed to fetch area users" }
```

---

## 📧 Gestión de Invitaciones

### GET /api/org-admin/invitations
**Descripción**: Obtiene lista de invitaciones enviadas

**Query Parameters**:
```typescript
{
  status?: "sent" | "accepted" | "expired",
  area_id?: string,
  page?: number,
  limit?: number
}
```

**Response**:
```typescript
// Success (200)
{
  invitations: Array<{
    id: string,
    email: string,
    role: string,
    area_id?: string,
    status: "sent" | "accepted" | "expired",
    custom_message?: string,
    sent_by: string,
    token: string,
    expires_at: string,
    accepted_at?: string,
    accepted_by?: string,
    last_reminder_sent?: string,
    reminder_count: number,
    created_at: string,
    area?: {
      id: string,
      name: string
    },
    sender?: {
      id: string,
      full_name: string
    }
  }>,
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  },
  statistics: {
    total: number,
    pending: number,
    accepted: number,
    expired: number,
    acceptanceRate: number
  }
}

// Errors
401: { error: "Authentication required" }
403: { error: "Insufficient permissions" }
500: { error: "Failed to fetch invitations" }
```

---

### POST /api/org-admin/invitations
**Descripción**: Envía una nueva invitación

**Request Body**:
```typescript
{
  email: string,
  role: "CEO" | "Admin" | "Manager",
  area_id?: string,
  custom_message?: string,
  expires_in_days?: number    // Default: 7
}
```

**Response**:
```typescript
// Success (201)
{
  invitation: Invitation,
  message: "Invitation sent successfully",
  email_sent: boolean
}

// Errors
400: { error: "Invalid email" | "User already exists" }
401: { error: "Authentication required" }
403: { error: "Insufficient permissions" }
500: { error: "Failed to send invitation" }
```

---

### POST /api/org-admin/invitations/resend
**Descripción**: Reenvía una invitación existente

**Request Body**:
```typescript
{
  invitation_id: string,
  extend_expiry?: boolean    // Default: true
}
```

**Response**:
```typescript
// Success (200)
{
  invitation: Invitation,
  message: "Invitation resent successfully",
  email_sent: boolean,
  new_expiry?: string
}

// Errors
400: { error: "Invitation already accepted" | "Invitation expired" }
401: { error: "Authentication required" }
403: { error: "Insufficient permissions" }
404: { error: "Invitation not found" }
500: { error: "Failed to resend invitation" }
```

---

### DELETE /api/org-admin/invitations/[id]
**Descripción**: Cancela una invitación pendiente

**Response**:
```typescript
// Success (200)
{
  message: "Invitation cancelled successfully"
}

// Errors
400: { error: "Cannot cancel accepted invitation" }
401: { error: "Authentication required" }
403: { error: "Insufficient permissions" }
404: { error: "Invitation not found" }
500: { error: "Failed to cancel invitation" }
```

---

## 📝 Audit Log

### GET /api/audit-log
**Descripción**: Obtiene el registro de auditoría de la organización

**Query Parameters**:
```typescript
{
  user_id?: string,
  action?: string,
  table_name?: string,
  start_date?: string,
  end_date?: string,
  page?: number,
  limit?: number
}
```

**Response**:
```typescript
// Success (200)
{
  logs: Array<{
    id: string,
    user_id?: string,
    action: string,
    table_name: string,
    record_id?: string,
    old_data?: any,
    new_data?: any,
    created_at: string,
    user?: {
      id: string,
      full_name: string,
      email: string
    }
  }>,
  pagination: {
    page: number,
    limit: number,
    total: number
  }
}

// Errors
401: { error: "Authentication required" }
403: { error: "Insufficient permissions" }
500: { error: "Failed to fetch audit logs" }
```

---

### GET /api/audit-log/export
**Descripción**: Exporta logs de auditoría en formato CSV o JSON

**Query Parameters**:
```typescript
{
  format: "csv" | "json",
  start_date?: string,
  end_date?: string,
  user_id?: string
}
```

**Response**:
```typescript
// Success (200)
// Headers: Content-Type: text/csv o application/json
// Headers: Content-Disposition: attachment; filename="audit-log-YYYY-MM-DD.csv"
// Body: Archivo CSV o JSON con los logs

// Errors
401: { error: "Authentication required" }
403: { error: "Insufficient permissions" }
500: { error: "Failed to export audit logs" }
```

---

*Última actualización: Enero 2025*