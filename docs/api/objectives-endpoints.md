# Objectives API Endpoints

## Overview

The Objectives API provides endpoints for managing strategic objectives, which are high-level goals that guide organizational initiatives. Objectives can be linked to multiple initiatives and tracked across different time periods.

## Authorization

- **CEO/Admin**: Full CRUD access to all objectives
- **Manager**: Can create and edit objectives for their area
- **All authenticated users**: Read access to objectives

## Data Model

```typescript
interface Objective {
  id: string
  tenant_id: string
  title: string
  description?: string
  area_id?: string
  created_by: string
  status: 'planning' | 'in_progress' | 'completed' | 'overdue'
  priority: 'high' | 'medium' | 'low'
  progress: number // 0-100
  start_date?: string
  end_date?: string
  target_date?: string
  metrics?: any[]
  created_at: string
  updated_at: string
}
```

## Endpoints

### 1. List Objectives

Get a paginated list of objectives with filtering and sorting options.

```http
GET /api/objectives
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number (1-10000) |
| limit | number | No | 50 | Items per page (1-100) |
| search | string | No | - | Search in title and description |
| status | string | No | - | Filter by status |
| priority | string | No | - | Filter by priority |
| area_id | uuid | No | - | Filter by area |
| objective_id | uuid | No | - | Get specific objective |
| initiative_id | uuid | No | - | Filter by linked initiative |
| assigned_to | uuid | No | - | Filter by assigned user |
| is_completed | boolean | No | - | Filter completed/incomplete |
| min_progress | number | No | - | Minimum progress (0-100) |
| max_progress | number | No | - | Maximum progress (0-100) |
| start_date | string | No | - | Filter by start date |
| end_date | string | No | - | Filter by end date |
| include_initiatives | boolean | No | false | Include linked initiatives |
| sort_by | string | No | created_at | Sort field |
| sort_order | string | No | desc | Sort order (asc/desc) |

#### Valid Values

- **status**: `planning`, `in_progress`, `completed`, `overdue`
- **priority**: `high`, `medium`, `low`
- **sort_by**: `created_at`, `updated_at`, `title`, `priority`, `status`, `progress`
- **sort_order**: `asc`, `desc`

#### Response

```json
{
  "objectives": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "title": "Increase Market Share",
      "description": "Expand into new markets and increase brand presence",
      "area_id": "uuid",
      "area": {
        "id": "uuid",
        "name": "Sales"
      },
      "created_by": "uuid",
      "created_by_profile": {
        "id": "uuid",
        "full_name": "John Doe",
        "email": "john@example.com"
      },
      "status": "in_progress",
      "priority": "high",
      "progress": 65,
      "start_date": "2025-01-01",
      "end_date": "2025-12-31",
      "target_date": "2025-12-31",
      "metrics": [
        {
          "name": "Revenue Growth",
          "target": 20,
          "current": 12,
          "unit": "percentage"
        }
      ],
      "initiatives": [
        {
          "id": "uuid",
          "title": "Q1 Sales Campaign",
          "progress": 75,
          "status": "in_progress",
          "area_id": "uuid",
          "description": "Launch targeted sales campaign"
        }
      ],
      "area_name": "Sales",
      "created_by_name": "John Doe",
      "initiatives_count": 5,
      "overall_progress": 65,
      "is_on_track": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 50,
  "totalPages": 1,
  "hasMore": false,
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 15,
    "totalPages": 1,
    "hasMore": false,
    "hasPrevious": false
  },
  "filters_applied": {
    "status": "in_progress",
    "priority": "high",
    "include_initiatives": true
  }
}
```

### 2. Get Single Objective

Get detailed information about a specific objective.

```http
GET /api/objectives/{id}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Objective ID |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| include_initiatives | boolean | No | true | Include linked initiatives |
| include_activities | boolean | No | false | Include activities from initiatives |
| include_history | boolean | No | false | Include change history |

#### Response

```json
{
  "id": "uuid",
  "title": "Increase Market Share",
  "description": "Detailed description...",
  "status": "in_progress",
  "priority": "high",
  "progress": 65,
  "area": {
    "id": "uuid",
    "name": "Sales",
    "manager": {
      "id": "uuid",
      "full_name": "Manager Name"
    }
  },
  "created_by": {
    "id": "uuid",
    "full_name": "John Doe",
    "email": "john@example.com"
  },
  "initiatives": [
    {
      "id": "uuid",
      "title": "Q1 Campaign",
      "progress": 75,
      "status": "in_progress",
      "activities": [
        {
          "id": "uuid",
          "title": "Prepare materials",
          "is_completed": true
        }
      ]
    }
  ],
  "metrics": [
    {
      "name": "Revenue Growth",
      "target": 20,
      "current": 12,
      "unit": "percentage",
      "trend": "increasing"
    }
  ],
  "history": [
    {
      "date": "2025-01-10",
      "field": "progress",
      "old_value": 60,
      "new_value": 65,
      "changed_by": "Jane Smith"
    }
  ],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

### 3. Create Objective

Create a new strategic objective.

```http
POST /api/objectives
```

#### Request Body

```json
{
  "title": "Increase Market Share",
  "description": "Expand into new markets and increase brand presence",
  "area_id": "uuid",
  "priority": "high",
  "status": "planning",
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "metrics": [
    {
      "name": "Revenue Growth",
      "target": 20,
      "unit": "percentage"
    }
  ]
}
```

#### Validation Rules

- `title`: Required, 1-200 characters
- `description`: Optional, max 2000 characters
- `area_id`: Optional UUID (defaults to user's area for Managers)
- `priority`: Optional, defaults to "medium"
- `status`: Optional, defaults to "planning"
- `start_date`: Optional, ISO date format
- `end_date`: Optional, ISO date format, must be after start_date

#### Response

```json
{
  "id": "uuid",
  "title": "Increase Market Share",
  "description": "Expand into new markets and increase brand presence",
  "area_id": "uuid",
  "tenant_id": "uuid",
  "created_by": "uuid",
  "status": "planning",
  "priority": "high",
  "progress": 0,
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

### 4. Update Objective

Update an existing objective.

```http
PATCH /api/objectives/{id}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Objective ID |

#### Request Body

```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "status": "in_progress",
  "priority": "medium",
  "progress": 45,
  "end_date": "2025-06-30"
}
```

#### Response

```json
{
  "id": "uuid",
  "title": "Updated Title",
  "description": "Updated description",
  "status": "in_progress",
  "priority": "medium",
  "progress": 45,
  "updated_at": "2025-01-15T11:00:00Z"
}
```

### 5. Delete Objective

Delete an objective (soft delete recommended).

```http
DELETE /api/objectives/{id}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Objective ID |

#### Response

```json
{
  "success": true,
  "message": "Objective deleted successfully"
}
```

### 6. Link Initiative to Objective

Link an initiative to an objective.

```http
POST /api/objectives/{id}/initiatives
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Objective ID |

#### Request Body

```json
{
  "initiative_id": "uuid"
}
```

#### Response

```json
{
  "success": true,
  "objective_id": "uuid",
  "initiative_id": "uuid",
  "linked_at": "2025-01-15T11:00:00Z"
}
```

### 7. Unlink Initiative from Objective

Remove the link between an initiative and objective.

```http
DELETE /api/objectives/{id}/initiatives/{initiative_id}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Objective ID |
| initiative_id | uuid | Yes | Initiative ID |

#### Response

```json
{
  "success": true,
  "message": "Initiative unlinked successfully"
}
```

### 8. Update Objective Progress

Update the progress of an objective.

```http
PATCH /api/objectives/{id}/progress
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Objective ID |

#### Request Body

```json
{
  "progress": 75,
  "notes": "Completed phase 2 milestones"
}
```

#### Response

```json
{
  "id": "uuid",
  "progress": 75,
  "previous_progress": 65,
  "updated_at": "2025-01-15T11:00:00Z",
  "updated_by": "uuid"
}
```

### 9. Bulk Operations

Perform operations on multiple objectives.

```http
POST /api/objectives/bulk
```

#### Request Body

```json
{
  "operation": "update",
  "objective_ids": ["uuid1", "uuid2"],
  "data": {
    "status": "completed"
  }
}
```

#### Operations

- `update`: Update multiple objectives
- `delete`: Delete multiple objectives
- `archive`: Archive multiple objectives

#### Response

```json
{
  "success": true,
  "affected": 2,
  "results": [
    {
      "id": "uuid1",
      "success": true
    },
    {
      "id": "uuid2",
      "success": true
    }
  ]
}
```

## Error Responses

### 400 Bad Request

```json
{
  "error": "Invalid input",
  "details": [
    {
      "field": "title",
      "message": "Title is required"
    },
    {
      "field": "end_date",
      "message": "End date must be after start date"
    }
  ]
}
```

### 403 Forbidden

```json
{
  "error": "Insufficient permissions",
  "details": "Managers can only create objectives for their assigned area"
}
```

### 404 Not Found

```json
{
  "error": "Objective not found",
  "details": "No objective found with ID: uuid"
}
```

### 409 Conflict

```json
{
  "error": "Duplicate objective",
  "details": "An objective with this title already exists in this area"
}
```

## Audit Trail

All objective operations are logged in the audit trail:

```json
{
  "entity_type": "objective",
  "entity_id": "uuid",
  "action": "update",
  "changes": {
    "progress": {
      "old": 65,
      "new": 75
    }
  },
  "user_id": "uuid",
  "timestamp": "2025-01-15T11:00:00Z"
}
```

## Examples

### cURL Examples

```bash
# List objectives with filters
curl -X GET "https://api.example.com/api/objectives?status=in_progress&priority=high&include_initiatives=true" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create new objective
curl -X POST "https://api.example.com/api/objectives" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Improve Customer Satisfaction",
    "description": "Achieve 95% satisfaction rating",
    "priority": "high",
    "area_id": "uuid"
  }'

# Update objective progress
curl -X PATCH "https://api.example.com/api/objectives/uuid/progress" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"progress": 80}'
```

### JavaScript Example

```javascript
// Get objectives with initiatives
const response = await fetch('/api/objectives?include_initiatives=true&status=in_progress', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

const data = await response.json()
console.log(`Found ${data.total} objectives`)

// Create new objective
const newObjective = await fetch('/api/objectives', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'New Strategic Objective',
    priority: 'high',
    area_id: areaId
  })
})
```

### TypeScript SDK Example

```typescript
import { ObjectivesAPI } from '@/lib/api-client'

const api = new ObjectivesAPI({ token })

// List objectives with filters
const objectives = await api.list({
  status: 'in_progress',
  priority: 'high',
  includeInitiatives: true,
  page: 1,
  limit: 50
})

// Create objective
const objective = await api.create({
  title: 'Increase Market Share',
  description: 'Expand to new markets',
  priority: 'high',
  areaId: 'uuid',
  startDate: '2025-01-01',
  endDate: '2025-12-31'
})

// Update progress
await api.updateProgress(objective.id, {
  progress: 75,
  notes: 'Q1 targets achieved'
})

// Link to initiative
await api.linkInitiative(objective.id, initiativeId)
```