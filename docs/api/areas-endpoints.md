# Areas API Endpoints

## Overview

The Areas API provides endpoints for managing organizational areas (departments/teams), including team member management, area statistics, and hierarchical organization structure.

## Authorization

- **CEO/Admin**: Full CRUD access to all areas
- **Manager**: Read access to all areas, full access to assigned area
- **Users**: Read access to their assigned area

## Data Model

```typescript
interface Area {
  id: string
  tenant_id: string
  name: string
  description?: string
  manager_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface AreaWithRelations extends Area {
  manager?: UserProfile
  initiatives?: Initiative[]
  objectives?: Objective[]
  team_members?: UserProfile[]
}
```

## Endpoints

### 1. List Areas

Get a paginated list of areas with optional statistics.

```http
GET /api/areas
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 10 | Items per page |
| search | string | No | - | Search in name and description |
| is_active | boolean | No | true | Filter by active status |
| has_manager | boolean | No | - | Filter areas with/without managers |
| include_stats | boolean | No | false | Include area statistics |
| include_team | boolean | No | false | Include team members |
| include_initiatives | boolean | No | false | Include initiatives |
| sort_by | string | No | name | Sort field |
| sort_order | string | No | asc | Sort order |

#### Response

```json
{
  "areas": [
    {
      "id": "uuid",
      "name": "Sales",
      "description": "Sales department responsible for revenue generation",
      "is_active": true,
      "manager_id": "uuid",
      "manager": {
        "id": "uuid",
        "full_name": "John Doe",
        "email": "john@example.com",
        "avatar_url": "https://..."
      },
      "stats": {
        "total_objectives": 5,
        "total_initiatives": 15,
        "total_activities": 45,
        "completed_initiatives": 8,
        "completed_activities": 35,
        "average_progress": 70,
        "team_members": 8,
        "active_initiatives": 7,
        "overdue_initiatives": 1
      },
      "team_members": [
        {
          "id": "uuid",
          "full_name": "Jane Smith",
          "role": "Manager",
          "email": "jane@example.com"
        }
      ],
      "recent_activity": {
        "last_update": "2025-01-15T10:30:00Z",
        "type": "initiative_completed",
        "description": "Q1 Campaign completed"
      },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2025-01-15T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  },
  "summary": {
    "total_areas": 25,
    "active_areas": 23,
    "areas_with_managers": 20,
    "total_team_members": 150
  }
}
```

### 2. Get Single Area

Get detailed information about a specific area.

```http
GET /api/areas/{id}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Area ID |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| include_full_stats | boolean | No | true | Include comprehensive statistics |
| include_team | boolean | No | true | Include team members |
| include_initiatives | boolean | No | false | Include all initiatives |
| include_objectives | boolean | No | false | Include all objectives |
| include_hierarchy | boolean | No | false | Include parent/child areas |

#### Response

```json
{
  "id": "uuid",
  "name": "Sales",
  "description": "Sales department",
  "is_active": true,
  "manager": {
    "id": "uuid",
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "last_login": "2025-01-15T09:00:00Z"
  },
  "team_members": [
    {
      "id": "uuid",
      "full_name": "Jane Smith",
      "email": "jane@example.com",
      "role": "Manager",
      "is_active": true,
      "assigned_activities": 5,
      "completed_activities": 3
    }
  ],
  "initiatives": [
    {
      "id": "uuid",
      "title": "Q1 Sales Campaign",
      "progress": 75,
      "status": "in_progress",
      "due_date": "2025-03-31"
    }
  ],
  "objectives": [
    {
      "id": "uuid",
      "title": "Increase Revenue 20%",
      "progress": 60,
      "priority": "high"
    }
  ],
  "statistics": {
    "performance": {
      "completion_rate": 75,
      "on_time_delivery": 85,
      "efficiency_score": 82
    },
    "workload": {
      "active_initiatives": 7,
      "upcoming_deadlines": 3,
      "overdue_items": 1,
      "team_utilization": 78
    },
    "trends": {
      "progress_trend": "improving",
      "velocity": 3.5,
      "monthly_growth": 5
    }
  },
  "hierarchy": {
    "parent": null,
    "children": [
      {
        "id": "uuid",
        "name": "Inside Sales"
      },
      {
        "id": "uuid",
        "name": "Enterprise Sales"
      }
    ]
  }
}
```

### 3. Create Area

Create a new organizational area.

```http
POST /api/areas
```

#### Request Body

```json
{
  "name": "Product Development",
  "description": "Product development and engineering team",
  "manager_id": "uuid",
  "parent_area_id": "uuid"
}
```

#### Validation Rules

- `name`: Required, 1-100 characters, unique within tenant
- `description`: Optional, max 500 characters
- `manager_id`: Optional, valid user UUID
- `parent_area_id`: Optional, valid area UUID

#### Response

```json
{
  "id": "uuid",
  "name": "Product Development",
  "description": "Product development and engineering team",
  "manager_id": "uuid",
  "tenant_id": "uuid",
  "is_active": true,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

### 4. Update Area

Update an existing area.

```http
PATCH /api/areas/{id}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Area ID |

#### Request Body

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "manager_id": "new-manager-uuid",
  "is_active": true
}
```

#### Response

```json
{
  "id": "uuid",
  "name": "Updated Name",
  "description": "Updated description",
  "manager_id": "new-manager-uuid",
  "is_active": true,
  "updated_at": "2025-01-15T11:00:00Z"
}
```

### 5. Delete Area

Delete or deactivate an area.

```http
DELETE /api/areas/{id}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Area ID |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| soft_delete | boolean | No | true | Soft delete (deactivate) vs hard delete |
| reassign_to | uuid | No | - | Reassign initiatives to another area |

#### Response

```json
{
  "success": true,
  "message": "Area deactivated successfully",
  "reassigned_initiatives": 5
}
```

### 6. Manage Area Team

Add or remove team members from an area.

```http
POST /api/areas/{id}/team
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Area ID |

#### Request Body

```json
{
  "action": "add",
  "user_ids": ["uuid1", "uuid2"]
}
```

#### Actions
- `add`: Add users to the area
- `remove`: Remove users from the area
- `replace`: Replace all team members

#### Response

```json
{
  "success": true,
  "area_id": "uuid",
  "added": 2,
  "removed": 0,
  "total_team_members": 10
}
```

### 7. Update Area Manager

Change the manager of an area.

```http
PUT /api/areas/{id}/manager
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Area ID |

#### Request Body

```json
{
  "manager_id": "uuid",
  "transition_date": "2025-02-01",
  "notify_team": true
}
```

#### Response

```json
{
  "success": true,
  "area_id": "uuid",
  "previous_manager": {
    "id": "uuid",
    "name": "John Doe"
  },
  "new_manager": {
    "id": "uuid",
    "name": "Jane Smith"
  },
  "transition_date": "2025-02-01"
}
```

### 8. Get Area Statistics

Get detailed statistics for an area.

```http
GET /api/areas/{id}/statistics
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Area ID |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| period | string | No | month | Time period: day, week, month, quarter, year |
| compare | boolean | No | false | Include comparison with previous period |

#### Response

```json
{
  "area_id": "uuid",
  "period": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  },
  "metrics": {
    "initiatives": {
      "total": 15,
      "completed": 8,
      "in_progress": 5,
      "planned": 2,
      "completion_rate": 53
    },
    "activities": {
      "total": 50,
      "completed": 35,
      "assigned": 45,
      "completion_rate": 70
    },
    "objectives": {
      "total": 5,
      "achieved": 2,
      "on_track": 2,
      "at_risk": 1
    },
    "team": {
      "total_members": 8,
      "active_members": 7,
      "average_workload": 6.25,
      "productivity_score": 82
    }
  },
  "comparison": {
    "previous_period": "2024-12",
    "changes": {
      "completion_rate": 5,
      "productivity": 3,
      "team_size": 0
    }
  },
  "trends": [
    {
      "date": "2025-01-01",
      "completion_rate": 48,
      "active_initiatives": 6
    },
    {
      "date": "2025-01-15",
      "completion_rate": 53,
      "active_initiatives": 5
    }
  ]
}
```

### 9. Get Area Workload

Analyze workload distribution in an area.

```http
GET /api/areas/{id}/workload
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Area ID |

#### Response

```json
{
  "area_id": "uuid",
  "workload_analysis": {
    "total_capacity": 320,
    "used_capacity": 250,
    "utilization_rate": 78,
    "by_member": [
      {
        "user_id": "uuid",
        "name": "Jane Smith",
        "assigned_activities": 8,
        "completed_this_week": 3,
        "hours_logged": 35,
        "utilization": 87,
        "status": "optimal"
      }
    ],
    "by_initiative": [
      {
        "initiative_id": "uuid",
        "title": "Q1 Campaign",
        "allocated_hours": 80,
        "used_hours": 60,
        "team_members": 3
      }
    ]
  },
  "recommendations": [
    "Consider redistributing tasks from Jane (87% utilized)",
    "John has capacity for 2 more activities"
  ]
}
```

### 10. Clone Area Structure

Create a new area with the same structure as an existing one.

```http
POST /api/areas/{id}/clone
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Source area ID |

#### Request Body

```json
{
  "name": "New Area Name",
  "include_objectives": false,
  "include_team": false
}
```

#### Response

```json
{
  "id": "new-uuid",
  "name": "New Area Name",
  "description": "Cloned from Sales",
  "structure_copied": true,
  "created_at": "2025-01-15T11:00:00Z"
}
```

## Bulk Operations

### Bulk Update Areas

```http
POST /api/areas/bulk
```

#### Request Body

```json
{
  "operation": "update",
  "area_ids": ["uuid1", "uuid2"],
  "data": {
    "is_active": false
  }
}
```

## Organization Admin Endpoints

### Get Organization Areas Overview

```http
GET /api/org-admin/areas
```

#### Response

```json
{
  "areas": [...],
  "organization_structure": {
    "total_areas": 25,
    "active_areas": 23,
    "areas_with_managers": 20,
    "average_team_size": 6
  },
  "recommendations": [
    "3 areas without managers need assignment",
    "Consider merging low-activity areas"
  ]
}
```

### Manage Area Users

```http
POST /api/org-admin/areas/{id}/users
```

#### Request Body

```json
{
  "action": "bulk_assign",
  "user_ids": ["uuid1", "uuid2"],
  "role": "member"
}
```

## Error Responses

### 400 Bad Request

```json
{
  "error": "Invalid input",
  "details": {
    "name": "Area name already exists"
  }
}
```

### 403 Forbidden

```json
{
  "error": "Insufficient permissions",
  "details": "Only CEO and Admin can create areas"
}
```

### 409 Conflict

```json
{
  "error": "Cannot delete area",
  "details": "Area has active initiatives. Reassign or complete them first."
}
```

## Examples

### cURL Examples

```bash
# List areas with statistics
curl -X GET "https://api.example.com/api/areas?include_stats=true" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create new area
curl -X POST "https://api.example.com/api/areas" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Innovation Lab",
    "description": "R&D and innovation team",
    "manager_id": "uuid"
  }'

# Update area manager
curl -X PUT "https://api.example.com/api/areas/uuid/manager" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"manager_id": "new-manager-uuid"}'
```

### JavaScript Example

```javascript
// Get areas with full details
const response = await fetch('/api/areas?include_stats=true&include_team=true', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

const data = await response.json()

// Add team members to area
await fetch(`/api/areas/${areaId}/team`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'add',
    user_ids: ['user1', 'user2']
  })
})
```

### TypeScript SDK Example

```typescript
import { AreasAPI } from '@/lib/api-client'

const api = new AreasAPI({ token })

// List areas with statistics
const areas = await api.list({
  includeStats: true,
  includeTeam: true,
  isActive: true
})

// Get area details with full statistics
const area = await api.get(areaId, {
  includeFullStats: true,
  includeTeam: true,
  includeHierarchy: true
})

// Update area
await api.update(areaId, {
  name: 'Updated Name',
  managerId: 'new-manager-id'
})

// Manage team
await api.manageTeam(areaId, {
  action: 'add',
  userIds: ['user1', 'user2']
})

// Get workload analysis
const workload = await api.getWorkload(areaId)
console.log('Utilization:', workload.workload_analysis.utilization_rate)
```