# API Endpoints Documentation

## Base URL
```
Development: http://localhost:3000/api
Production: https://yourdomain.com/api
```

## Authentication
All endpoints require authentication via Supabase Auth cookies.

## Endpoints

### Dashboard APIs

#### GET /api/dashboard/overview
Returns dashboard overview metrics.

**Response:**
```json
{
  "totalInitiatives": 4,
  "activeInitiatives": 2,
  "completedInitiatives": 1,
  "averageProgress": 62.5
}
```

#### GET /api/dashboard/status-distribution
Returns initiative status distribution.

**Response:**
```json
{
  "data": [
    {
      "status": "In Progress",
      "statusKey": "in_progress",
      "count": 2,
      "percentage": 50,
      "color": "#06b6d4"
    }
  ]
}
```

#### GET /api/dashboard/progress-distribution
Returns progress distribution across initiatives.

**Response:**
```json
{
  "data": [
    {
      "range": "0-25%",
      "count": 0,
      "color": "#ef4444"
    },
    {
      "range": "26-50%",
      "count": 2,
      "color": "#f59e0b"
    }
  ]
}
```

#### GET /api/dashboard/area-comparison
Returns area performance comparison.

**Query Parameters:**
- `time_range`: week | month | quarter | year

**Response:**
```json
{
  "data": [
    {
      "area": "Comercial",
      "initiatives": 1,
      "avgProgress": 50,
      "status": "warning"
    }
  ]
}
```

### Analytics API

#### GET /api/analytics/kpi
Returns comprehensive KPI metrics.

**Query Parameters:**
- `time_range`: week | month | quarter | year | all
- `area_id`: UUID (optional)
- `include_insights`: boolean (default: true)
- `include_trends`: boolean (default: false)

**Response:**
```json
{
  "success": true,
  "summary": {
    "totalInitiatives": 2,
    "completedInitiatives": 0,
    "inProgressInitiatives": 2,
    "averageProgress": 50,
    "overdueInitiatives": 0,
    "completionRate": 0
  },
  "statusDistribution": {
    "planning": 0,
    "in_progress": 2,
    "completed": 0,
    "on_hold": 0
  },
  "areaMetrics": [
    {
      "areaId": "uuid",
      "areaName": "Comercial",
      "totalInitiatives": 1,
      "averageProgress": 50,
      "completionRate": 0
    }
  ],
  "insights": [
    "50% de las iniciativas están en progreso",
    "Comercial lidera con 50% de progreso promedio"
  ],
  "metadata": {
    "userRole": "CEO",
    "timeRange": "month",
    "lastUpdated": "2025-08-08T04:00:00Z"
  }
}
```

### Resource APIs

#### GET /api/initiatives
Returns initiatives with relationships.

**Query Parameters:**
- `tenant_id`: UUID (required)
- `area_id`: UUID (optional)
- `objective_id`: UUID (optional)
- `min_progress`: number (optional)
- `max_progress`: number (optional)

**Response:**
```json
{
  "initiatives": [
    {
      "id": "uuid",
      "title": "Campaign Name",
      "description": "Description",
      "status": "in_progress",
      "progress": 50,
      "area": {
        "id": "uuid",
        "name": "Comercial"
      },
      "objectives": [...],
      "activities": [...],
      "created_by_user": {
        "id": "uuid",
        "full_name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "total": 2
}
```

#### POST /api/initiatives
Creates a new initiative.

**Request Body:**
```json
{
  "title": "New Initiative",
  "description": "Description",
  "area_id": "uuid",
  "status": "planning",
  "progress": 0,
  "due_date": "2025-12-31"
}
```

#### PUT /api/initiatives
Updates an existing initiative.

**Request Body:**
```json
{
  "id": "uuid",
  "title": "Updated Title",
  "progress": 75,
  "status": "in_progress"
}
```

#### DELETE /api/initiatives?id={uuid}
Deletes an initiative.

#### GET /api/objectives
Returns objectives with relationships.

**Query Parameters:**
- `tenant_id`: UUID (required)
- `area_id`: UUID (optional)
- `include_initiatives`: boolean (default: false)

#### GET /api/areas
Returns areas for the tenant.

**Response:**
```json
{
  "areas": [
    {
      "id": "uuid",
      "name": "Comercial",
      "description": "Sales department",
      "manager_id": "uuid",
      "initiative_count": 2
    }
  ]
}
```

#### GET /api/activities
Returns activities.

**Query Parameters:**
- `initiative_id`: UUID (optional)
- `assigned_to`: UUID (optional)
- `is_completed`: boolean (optional)

### User APIs

#### GET /api/profile/user
Returns current user profile.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "CEO",
  "tenant_id": "uuid",
  "tenant_name": "Organization Name",
  "area_id": "uuid",
  "area_name": "Comercial"
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

### Common Error Codes
- `401`: Authentication required
- `403`: Insufficient permissions
- `404`: Resource not found
- `422`: Validation error
- `500`: Internal server error

## Rate Limiting

Currently no rate limiting implemented. Planned for production:
- 100 requests per minute per user
- 1000 requests per hour per tenant