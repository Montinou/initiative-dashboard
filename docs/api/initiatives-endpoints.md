# Initiatives API Endpoints

## Overview

The Initiatives API provides endpoints for managing initiatives - actionable projects that contribute to achieving strategic objectives. Initiatives contain activities and can be tracked for progress.

## Authorization

- **CEO/Admin**: Full CRUD access to all initiatives
- **Manager**: Full access to initiatives in their area
- **All authenticated users**: Read access based on area permissions

## Data Model

```typescript
interface Initiative {
  id: string
  tenant_id: string
  area_id: string
  title: string
  description?: string
  progress: number // 0-100
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold'
  created_by: string
  start_date?: string
  due_date?: string
  completion_date?: string
  created_at: string
  updated_at: string
}

interface Activity {
  id: string
  initiative_id: string
  title: string
  description?: string
  is_completed: boolean
  assigned_to?: string
  created_at: string
  updated_at: string
}
```

## Endpoints

### 1. List Initiatives

Get a paginated list of initiatives with filtering options.

```http
GET /api/initiatives
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 50 | Items per page (max 100) |
| search | string | No | - | Search in title and description |
| status | string | No | - | Filter by status |
| area_id | uuid | No | - | Filter by area |
| objective_id | uuid | No | - | Filter by linked objective |
| assigned_to | uuid | No | - | Filter by assignee |
| created_by | uuid | No | - | Filter by creator |
| progress_min | number | No | - | Minimum progress (0-100) |
| progress_max | number | No | - | Maximum progress (0-100) |
| start_date | string | No | - | Filter by start date |
| due_date | string | No | - | Filter by due date |
| overdue | boolean | No | - | Show only overdue initiatives |
| at_risk | boolean | No | - | Show at-risk initiatives |
| include_activities | boolean | No | false | Include activities |
| include_objectives | boolean | No | false | Include linked objectives |
| sort_by | string | No | created_at | Sort field |
| sort_order | string | No | desc | Sort order |

#### Response

```json
{
  "initiatives": [
    {
      "id": "uuid",
      "title": "Q1 Marketing Campaign",
      "description": "Launch comprehensive marketing campaign",
      "progress": 65,
      "status": "in_progress",
      "area_id": "uuid",
      "area": {
        "id": "uuid",
        "name": "Marketing"
      },
      "created_by": "uuid",
      "creator": {
        "id": "uuid",
        "full_name": "John Doe"
      },
      "start_date": "2025-01-01",
      "due_date": "2025-03-31",
      "completion_date": null,
      "activities": [
        {
          "id": "uuid",
          "title": "Design campaign materials",
          "is_completed": true,
          "assigned_to": {
            "id": "uuid",
            "full_name": "Jane Smith"
          }
        }
      ],
      "objectives": [
        {
          "id": "uuid",
          "title": "Increase Brand Awareness"
        }
      ],
      "statistics": {
        "total_activities": 10,
        "completed_activities": 6,
        "team_members": 4,
        "days_remaining": 45,
        "is_overdue": false,
        "is_at_risk": false
      },
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1,
    "hasMore": false
  },
  "summary": {
    "total": 25,
    "by_status": {
      "planning": 5,
      "in_progress": 15,
      "completed": 4,
      "on_hold": 1
    },
    "average_progress": 58,
    "overdue_count": 2,
    "at_risk_count": 3
  }
}
```

### 2. Get Single Initiative

Get detailed information about a specific initiative.

```http
GET /api/initiatives/{id}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Initiative ID |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| include_activities | boolean | No | true | Include activities |
| include_objectives | boolean | No | true | Include objectives |
| include_progress_history | boolean | No | false | Include progress history |
| include_team | boolean | No | false | Include team members |

#### Response

```json
{
  "id": "uuid",
  "title": "Q1 Marketing Campaign",
  "description": "Detailed description...",
  "progress": 65,
  "status": "in_progress",
  "area": {
    "id": "uuid",
    "name": "Marketing",
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
  "start_date": "2025-01-01",
  "due_date": "2025-03-31",
  "activities": [
    {
      "id": "uuid",
      "title": "Design materials",
      "description": "Create visual assets",
      "is_completed": true,
      "assigned_to": {
        "id": "uuid",
        "full_name": "Jane Smith",
        "email": "jane@example.com"
      },
      "completed_at": "2025-01-10T15:30:00Z"
    }
  ],
  "objectives": [
    {
      "id": "uuid",
      "title": "Increase Brand Awareness",
      "progress": 70
    }
  ],
  "progress_history": [
    {
      "date": "2025-01-10",
      "progress": 50,
      "notes": "Completed design phase",
      "updated_by": "Jane Smith"
    }
  ],
  "team_members": [
    {
      "id": "uuid",
      "full_name": "Jane Smith",
      "role": "Designer",
      "assigned_activities": 3
    }
  ],
  "metrics": {
    "total_activities": 10,
    "completed_activities": 6,
    "completion_rate": 60,
    "days_elapsed": 15,
    "days_remaining": 75,
    "velocity": 0.4,
    "projected_completion": "2025-03-20"
  }
}
```

### 3. Create Initiative

Create a new initiative.

```http
POST /api/initiatives
```

#### Request Body

```json
{
  "title": "New Product Launch",
  "description": "Launch new product line Q2",
  "area_id": "uuid",
  "start_date": "2025-04-01",
  "due_date": "2025-06-30",
  "objective_ids": ["uuid1", "uuid2"],
  "activities": [
    {
      "title": "Market Research",
      "description": "Conduct market analysis",
      "assigned_to": "uuid"
    },
    {
      "title": "Product Development",
      "description": "Develop MVP"
    }
  ]
}
```

#### Validation Rules

- `title`: Required, 1-200 characters
- `description`: Optional, max 2000 characters
- `area_id`: Required, valid UUID
- `start_date`: Optional, ISO date format
- `due_date`: Optional, ISO date format, must be after start_date
- `objective_ids`: Optional array of UUIDs
- `activities`: Optional array of activity objects

#### Response

```json
{
  "id": "uuid",
  "title": "New Product Launch",
  "description": "Launch new product line Q2",
  "area_id": "uuid",
  "tenant_id": "uuid",
  "progress": 0,
  "status": "planning",
  "created_by": "uuid",
  "start_date": "2025-04-01",
  "due_date": "2025-06-30",
  "activities": [
    {
      "id": "uuid",
      "title": "Market Research",
      "is_completed": false
    }
  ],
  "created_at": "2025-01-15T10:30:00Z"
}
```

### 4. Update Initiative

Update an existing initiative.

```http
PATCH /api/initiatives/{id}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Initiative ID |

#### Request Body

```json
{
  "title": "Updated Title",
  "progress": 75,
  "status": "in_progress",
  "due_date": "2025-07-31"
}
```

#### Response

```json
{
  "id": "uuid",
  "title": "Updated Title",
  "progress": 75,
  "status": "in_progress",
  "due_date": "2025-07-31",
  "updated_at": "2025-01-15T11:00:00Z"
}
```

### 5. Delete Initiative

Delete an initiative.

```http
DELETE /api/initiatives/{id}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Initiative ID |

#### Response

```json
{
  "success": true,
  "message": "Initiative deleted successfully"
}
```

### 6. Add Activity

Add a new activity to an initiative.

```http
POST /api/initiatives/{id}/activities
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Initiative ID |

#### Request Body

```json
{
  "title": "New Activity",
  "description": "Activity description",
  "assigned_to": "uuid"
}
```

#### Response

```json
{
  "id": "uuid",
  "initiative_id": "uuid",
  "title": "New Activity",
  "description": "Activity description",
  "is_completed": false,
  "assigned_to": "uuid",
  "created_at": "2025-01-15T11:00:00Z"
}
```

### 7. Update Activity

Update an activity within an initiative.

```http
PATCH /api/initiatives/{id}/activities/{activity_id}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Initiative ID |
| activity_id | uuid | Yes | Activity ID |

#### Request Body

```json
{
  "title": "Updated Activity",
  "is_completed": true,
  "assigned_to": "uuid"
}
```

#### Response

```json
{
  "id": "uuid",
  "title": "Updated Activity",
  "is_completed": true,
  "assigned_to": "uuid",
  "completed_at": "2025-01-15T11:00:00Z",
  "updated_at": "2025-01-15T11:00:00Z"
}
```

### 8. Delete Activity

Delete an activity from an initiative.

```http
DELETE /api/initiatives/{id}/activities/{activity_id}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Initiative ID |
| activity_id | uuid | Yes | Activity ID |

#### Response

```json
{
  "success": true,
  "message": "Activity deleted successfully"
}
```

### 9. Update Progress

Update initiative progress based on completed activities.

```http
POST /api/initiatives/{id}/update-progress
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Initiative ID |

#### Request Body

```json
{
  "manual_progress": 75,
  "notes": "Completed major milestone"
}
```

#### Response

```json
{
  "id": "uuid",
  "previous_progress": 65,
  "new_progress": 75,
  "calculated_progress": 70,
  "manual_override": true,
  "updated_at": "2025-01-15T11:00:00Z"
}
```

### 10. Bulk Complete Activities

Mark multiple activities as completed.

```http
POST /api/initiatives/{id}/activities/bulk-complete
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Initiative ID |

#### Request Body

```json
{
  "activity_ids": ["uuid1", "uuid2", "uuid3"]
}
```

#### Response

```json
{
  "success": true,
  "completed": 3,
  "initiative_progress": 80,
  "results": [
    {
      "id": "uuid1",
      "success": true
    },
    {
      "id": "uuid2",
      "success": true
    },
    {
      "id": "uuid3",
      "success": true
    }
  ]
}
```

### 11. Clone Initiative

Create a copy of an existing initiative.

```http
POST /api/initiatives/{id}/clone
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Initiative ID to clone |

#### Request Body

```json
{
  "title": "Cloned Initiative Title",
  "area_id": "uuid",
  "start_date": "2025-07-01",
  "due_date": "2025-09-30",
  "include_activities": true
}
```

#### Response

```json
{
  "id": "new-uuid",
  "title": "Cloned Initiative Title",
  "description": "Original description",
  "area_id": "uuid",
  "progress": 0,
  "status": "planning",
  "activities_count": 10,
  "created_at": "2025-01-15T11:00:00Z"
}
```

### 12. Get Initiative Timeline

Get timeline view of initiative activities.

```http
GET /api/initiatives/{id}/timeline
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | Initiative ID |

#### Response

```json
{
  "initiative": {
    "id": "uuid",
    "title": "Initiative Title",
    "start_date": "2025-01-01",
    "due_date": "2025-03-31"
  },
  "timeline": [
    {
      "date": "2025-01-15",
      "events": [
        {
          "type": "activity_completed",
          "activity": "Design completed",
          "completed_by": "Jane Smith"
        }
      ]
    },
    {
      "date": "2025-01-20",
      "events": [
        {
          "type": "progress_update",
          "progress": 50,
          "notes": "Halfway milestone"
        }
      ]
    }
  ],
  "milestones": [
    {
      "date": "2025-02-15",
      "title": "Beta Release",
      "status": "upcoming"
    }
  ]
}
```

## Batch Operations

### Batch Update Initiatives

```http
POST /api/initiatives/batch
```

#### Request Body

```json
{
  "operation": "update",
  "initiative_ids": ["uuid1", "uuid2"],
  "data": {
    "status": "on_hold"
  }
}
```

## Error Responses

### 400 Bad Request

```json
{
  "error": "Invalid input",
  "details": [
    {
      "field": "due_date",
      "message": "Due date must be after start date"
    }
  ]
}
```

### 403 Forbidden

```json
{
  "error": "Insufficient permissions",
  "details": "You can only modify initiatives in your assigned area"
}
```

### 404 Not Found

```json
{
  "error": "Initiative not found",
  "details": "No initiative found with ID: uuid"
}
```

## WebSocket Subscriptions

Subscribe to real-time initiative updates:

```javascript
// Subscribe to initiative updates
const ws = new WebSocket('wss://api.example.com/ws/initiatives')

ws.send(JSON.stringify({
  action: 'subscribe',
  initiative_ids: ['uuid1', 'uuid2']
}))

ws.on('message', (data) => {
  const update = JSON.parse(data)
  // Handle progress updates, activity completions, etc.
})
```

## Examples

### cURL Examples

```bash
# List initiatives with filters
curl -X GET "https://api.example.com/api/initiatives?status=in_progress&include_activities=true" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create initiative with activities
curl -X POST "https://api.example.com/api/initiatives" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Initiative",
    "area_id": "uuid",
    "activities": [
      {"title": "Task 1"},
      {"title": "Task 2"}
    ]
  }'

# Update progress
curl -X POST "https://api.example.com/api/initiatives/uuid/update-progress" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"manual_progress": 80}'
```

### JavaScript Example

```javascript
// Get initiatives with activities
const response = await fetch('/api/initiatives?include_activities=true', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

const data = await response.json()

// Add activity to initiative
const activity = await fetch(`/api/initiatives/${initiativeId}/activities`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'New Task',
    assigned_to: userId
  })
})
```

### TypeScript SDK Example

```typescript
import { InitiativesAPI } from '@/lib/api-client'

const api = new InitiativesAPI({ token })

// List initiatives with filters
const initiatives = await api.list({
  status: 'in_progress',
  areaId: 'uuid',
  includeActivities: true,
  includeObjectives: true
})

// Create initiative
const initiative = await api.create({
  title: 'Q2 Campaign',
  areaId: 'uuid',
  startDate: '2025-04-01',
  dueDate: '2025-06-30',
  activities: [
    { title: 'Planning', assignedTo: 'uuid' },
    { title: 'Execution' }
  ]
})

// Update activity
await api.updateActivity(initiative.id, activityId, {
  isCompleted: true
})

// Bulk complete activities
await api.bulkCompleteActivities(initiative.id, [
  'activity1',
  'activity2'
])
```