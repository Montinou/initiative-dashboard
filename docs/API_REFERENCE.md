# API Reference Documentation

## Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication
All API endpoints require authentication via Supabase Auth. Include the JWT token in the Authorization header:
```
Authorization: Bearer {token}
```

## API Categories
- [Core OKR Management](#objectives-api)
- [File Upload & Import](./api/okr-file-upload.md) - **NEW**: Secure GCS-based file upload and processing
- [Progress Tracking](#progress-tracking-api)
- [Audit & Analytics](#audit-log-api)
- [Manager Dashboard](#manager-dashboard-api)

---

## 📋 Objectives API

### Get Objectives
```http
GET /api/objectives
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tenant_id | string | No | Filter by tenant (defaults to user's tenant) |
| area_id | string | No | Filter by area |
| quarter_id | string | No | Filter by quarter |
| include_initiatives | boolean | No | Include linked initiatives |

#### Response
```json
{
  "objectives": [
    {
      "id": "uuid",
      "title": "Increase Market Share",
      "description": "Expand into new markets",
      "area_id": "uuid",
      "area_name": "Sales",
      "created_by": "uuid",
      "created_by_name": "John Doe",
      "initiatives_count": 5,
      "overall_progress": 45,
      "is_on_track": true,
      "initiatives": [],
      "quarters": [],
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 10
}
```

### Create Objective
```http
POST /api/objectives
```

#### Request Body
```json
{
  "title": "Increase Market Share",
  "description": "Expand into new markets",
  "area_id": "uuid",
  "quarter_ids": ["uuid1", "uuid2"]
}
```

#### Response
```json
{
  "id": "uuid",
  "title": "Increase Market Share",
  "description": "Expand into new markets",
  "area_id": "uuid",
  "tenant_id": "uuid",
  "created_by": "uuid",
  "created_at": "2025-01-01T00:00:00Z"
}
```

### Update Objective
```http
PATCH /api/objectives/{id}
```

#### Request Body
```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

### Delete Objective
```http
DELETE /api/objectives/{id}
```

---

## 📅 Quarters API

### Get Quarters
```http
GET /api/quarters
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | number | No | Filter by year |
| include_stats | boolean | No | Include statistics |

#### Response
```json
{
  "quarters": [
    {
      "id": "uuid",
      "quarter_name": "Q1",
      "start_date": "2025-01-01",
      "end_date": "2025-03-31",
      "tenant_id": "uuid",
      "objectives_count": 5,
      "initiatives_count": 15,
      "activities_count": 45,
      "average_progress": 67,
      "status": "active"
    }
  ],
  "total": 4
}
```

### Create Quarter
```http
POST /api/quarters
```

#### Request Body
```json
{
  "quarter_name": "Q1",
  "start_date": "2025-01-01",
  "end_date": "2025-03-31"
}
```

---

## 🎯 Initiatives API

### Get Initiatives
```http
GET /api/initiatives
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tenant_id | string | No | Filter by tenant |
| area_id | string | No | Filter by area |
| objective_id | string | No | Filter by objective |
| status | string | No | Filter by status |

#### Response
```json
{
  "initiatives": [
    {
      "id": "uuid",
      "title": "Launch New Product",
      "description": "Product launch initiative",
      "progress": 75,
      "area_id": "uuid",
      "area_name": "Product",
      "objective_id": "uuid",
      "objective_title": "Increase Revenue",
      "start_date": "2025-01-01",
      "due_date": "2025-03-31",
      "completion_date": null,
      "created_by": "uuid",
      "created_by_name": "Jane Smith",
      "activities": [],
      "activity_count": 10,
      "completed_activities": 7
    }
  ],
  "total": 25
}
```

### Create Initiative
```http
POST /api/initiatives
```

#### Request Body
```json
{
  "title": "Launch New Product",
  "description": "Product launch initiative",
  "area_id": "uuid",
  "objective_ids": ["uuid"],
  "start_date": "2025-01-01",
  "due_date": "2025-03-31",
  "activities": [
    {
      "title": "Market Research",
      "description": "Conduct market analysis",
      "assigned_to": "uuid",
      "is_completed": false
    }
  ]
}
```

### Update Initiative
```http
PATCH /api/initiatives/{id}
```

#### Request Body
```json
{
  "title": "Updated Title",
  "progress": 80,
  "due_date": "2025-04-15"
}
```

### Add Activity to Initiative
```http
POST /api/initiatives/{id}/activities
```

#### Request Body
```json
{
  "title": "New Activity",
  "description": "Activity description",
  "assigned_to": "uuid",
  "is_completed": false
}
```

---

## 📊 Progress Tracking API

### Get Progress History
```http
GET /api/progress-tracking
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| initiative_id | string | No | Filter by initiative |
| area_id | string | No | Filter by area |
| objective_id | string | No | Filter by objective |
| date_from | string | No | Start date filter |
| date_to | string | No | End date filter |
| limit | number | No | Limit results (default: 100) |

#### Response
```json
{
  "history": [
    {
      "id": "uuid",
      "initiative_id": "uuid",
      "initiative": {
        "id": "uuid",
        "title": "Initiative Name",
        "area_id": "uuid",
        "objective_id": "uuid"
      },
      "progress_value": 75,
      "previous_value": 70,
      "changed_by": "uuid",
      "changed_by_profile": {
        "id": "uuid",
        "full_name": "John Doe",
        "email": "john@example.com"
      },
      "change_notes": "Completed phase 2",
      "changed_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 50
}
```

### Record Progress
```http
POST /api/progress-tracking
```

#### Request Body
```json
{
  "initiative_id": "uuid",
  "progress_value": 75,
  "change_notes": "Completed phase 2"
}
```

### Batch Update Progress
```http
POST /api/progress-tracking/batch
```

#### Request Body
```json
{
  "updates": [
    {
      "initiative_id": "uuid1",
      "progress": 75,
      "notes": "Update 1"
    },
    {
      "initiative_id": "uuid2",
      "progress": 90,
      "notes": "Update 2"
    }
  ]
}
```

---

## 📝 Audit Log API

### Get Audit Log
```http
GET /api/audit-log
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| entity_type | string | No | Filter by entity type |
| entity_id | string | No | Filter by entity ID |
| user_id | string | No | Filter by user |
| action | string | No | Filter by action (create/update/delete) |
| date_from | string | No | Start date filter |
| date_to | string | No | End date filter |
| limit | number | No | Limit results (default: 50) |
| offset | number | No | Pagination offset |

#### Response
```json
{
  "entries": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "user_id": "uuid",
      "user_profile": {
        "id": "uuid",
        "full_name": "John Doe",
        "email": "john@example.com"
      },
      "entity_type": "initiative",
      "entity_id": "uuid",
      "action": "update",
      "changes": {
        "progress": {
          "old": 70,
          "new": 75
        }
      },
      "metadata": {
        "area_id": "uuid"
      },
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "has_more": true
}
```

### Create Audit Log Entry
```http
POST /api/audit-log
```

#### Request Body
```json
{
  "entity_type": "initiative",
  "entity_id": "uuid",
  "action": "update",
  "changes": {
    "progress": {
      "old": 70,
      "new": 75
    }
  },
  "metadata": {
    "reason": "Manual update"
  }
}
```

### Export Audit Log
```http
GET /api/audit-log/export
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| format | string | No | Export format (csv/json) |
| ...filters | various | No | Same filters as GET /api/audit-log |

#### Response
- CSV file download or JSON response based on format parameter

---

## 👥 Manager Dashboard API

### Get Manager Dashboard
```http
GET /api/manager-dashboard
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| area_id | string | Yes | Area ID |
| quarter_id | string | No | Filter by quarter |
| include_team | boolean | No | Include team details |
| include_updates | boolean | No | Include recent updates |

#### Response
```json
{
  "area": {
    "id": "uuid",
    "name": "Sales",
    "description": "Sales department",
    "manager_id": "uuid"
  },
  "team_members": [
    {
      "id": "uuid",
      "full_name": "Team Member",
      "email": "member@example.com",
      "assigned_activities": 5,
      "completed_activities": 3,
      "active_initiatives": 2,
      "performance_score": 85
    }
  ],
  "initiatives": [
    {
      "id": "uuid",
      "title": "Initiative",
      "progress": 60,
      "activities_count": 10,
      "completed_activities": 6,
      "days_remaining": 15,
      "is_at_risk": false,
      "team_members_involved": ["uuid1", "uuid2"]
    }
  ],
  "objectives": [
    {
      "id": "uuid",
      "title": "Objective",
      "initiatives_count": 3,
      "overall_progress": 70,
      "is_on_track": true
    }
  ],
  "activities": [
    {
      "id": "uuid",
      "title": "Activity",
      "assigned_to_name": "John Doe",
      "initiative_title": "Main Initiative",
      "days_overdue": 0,
      "priority": "high"
    }
  ],
  "statistics": {
    "total_team_members": 5,
    "total_initiatives": 10,
    "total_activities": 50,
    "completed_activities": 30,
    "overdue_activities": 2,
    "average_progress": 65,
    "team_utilization": 80,
    "initiatives_at_risk": 1,
    "upcoming_deadlines": 5
  },
  "recent_updates": [
    {
      "id": "uuid",
      "type": "initiative",
      "title": "Progress updated",
      "description": "Initiative progress updated to 75%",
      "timestamp": "2025-01-15T10:30:00Z",
      "user_name": "John Doe",
      "impact": "medium"
    }
  ]
}
```

### Get Team Performance
```http
GET /api/manager-dashboard/team-performance
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| area_id | string | Yes | Area ID |
| period | string | No | Period (week/month/quarter) |

### Assign Activity
```http
POST /api/activities/{id}/assign
```

#### Request Body
```json
{
  "assigned_to": "uuid"
}
```

### Bulk Assign Activities
```http
POST /api/activities/bulk-assign
```

#### Request Body
```json
{
  "assignments": [
    {
      "activity_id": "uuid1",
      "user_id": "uuid1"
    },
    {
      "activity_id": "uuid2",
      "user_id": "uuid2"
    }
  ]
}
```

---

## 🏢 Areas API

### Get Areas
```http
GET /api/areas
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10) |
| search | string | No | Search term |
| includeStats | boolean | No | Include statistics |

#### Response
```json
{
  "areas": [
    {
      "id": "uuid",
      "name": "Sales",
      "description": "Sales department",
      "manager_id": "uuid",
      "manager": {
        "id": "uuid",
        "full_name": "Manager Name",
        "email": "manager@example.com"
      },
      "stats": {
        "total_objectives": 5,
        "total_initiatives": 15,
        "total_activities": 45,
        "completed_initiatives": 10,
        "completed_activities": 35,
        "average_progress": 70
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### Create Area
```http
POST /api/areas
```

#### Request Body
```json
{
  "name": "New Area",
  "description": "Area description",
  "manager_id": "uuid"
}
```

### Update Area
```http
PATCH /api/areas/{id}
```

#### Request Body
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "manager_id": "uuid"
}
```

### Delete Area
```http
DELETE /api/areas/{id}
```

---

## 🏛️ Organizations & Tenants API

### Get Organization
```http
GET /api/organizations/{id}
```

#### Response
```json
{
  "id": "uuid",
  "name": "Organization Name",
  "description": "Organization description",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### Get Tenant
```http
GET /api/tenants/{id}
```

#### Response
```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "subdomain": "company",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### Get Tenant Statistics
```http
GET /api/tenants/{id}/statistics
```

#### Response
```json
{
  "total_users": 25,
  "total_areas": 5,
  "total_objectives": 15,
  "total_initiatives": 50,
  "total_activities": 200,
  "average_progress": 65,
  "completion_rate": 60
}
```

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "error": "Invalid input",
  "details": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **Authenticated requests**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

---

## Pagination

Endpoints that return lists support pagination:

### Query Parameters
- `page`: Page number (starts at 1)
- `limit`: Items per page (max: 100)
- `offset`: Alternative to page-based pagination

### Response Headers
```
X-Total-Count: 250
X-Page-Count: 25
Link: <https://api.example.com/resource?page=2>; rel="next"
```

---

## Webhooks

The API supports webhooks for real-time notifications:

### Supported Events
- `objective.created`
- `objective.updated`
- `objective.deleted`
- `initiative.created`
- `initiative.updated`
- `initiative.completed`
- `activity.assigned`
- `activity.completed`
- `progress.updated`

### Webhook Payload
```json
{
  "event": "initiative.updated",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "id": "uuid",
    "changes": {
      "progress": {
        "old": 70,
        "new": 75
      }
    }
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript
```typescript
import { InitiativeDashboardAPI } from '@/lib/api-client'

const api = new InitiativeDashboardAPI({
  baseURL: 'https://api.example.com',
  token: 'your-jwt-token'
})

// Get objectives
const objectives = await api.objectives.list({
  area_id: 'uuid',
  include_initiatives: true
})

// Create initiative
const initiative = await api.initiatives.create({
  title: 'New Initiative',
  area_id: 'uuid',
  due_date: '2025-03-31'
})

// Update progress
await api.progress.record({
  initiative_id: initiative.id,
  progress_value: 50,
  change_notes: 'Milestone completed'
})
```

### cURL Examples
```bash
# Get objectives
curl -X GET "https://api.example.com/api/objectives?area_id=uuid" \
  -H "Authorization: Bearer your-jwt-token"

# Create initiative
curl -X POST "https://api.example.com/api/initiatives" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Initiative",
    "area_id": "uuid",
    "due_date": "2025-03-31"
  }'

# Export audit log as CSV
curl -X GET "https://api.example.com/api/audit-log/export?format=csv" \
  -H "Authorization: Bearer your-jwt-token" \
  -o audit-log.csv
```

---

**API Version:** 2.0.0  
**Last Updated:** 2025-08-08