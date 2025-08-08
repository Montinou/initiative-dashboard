# Organization Admin Panel API Reference

## Overview

This document provides comprehensive API documentation for all endpoints implemented for the Organization Admin Panel. These endpoints connect to real Supabase database and are ready for production use. All endpoints require authentication and appropriate role-based permissions (CEO or Admin roles only).

## Authentication

All org-admin endpoints require:
- Valid JWT token in Authorization header
- User profile with role 'CEO' or 'Admin'
- Active session with valid tenant_id

```typescript
// Standard authentication pattern
const { data: { user } } = await supabase.auth.getUser();
const userProfile = await getUserProfile(supabase, user.id);

if (!['CEO', 'Admin'].includes(userProfile.role)) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 });
}
```

## Areas Management Endpoints

### GET /api/org-admin/areas
Retrieve all organizational areas with management information.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Sales & Marketing",
      "description": "Revenue generation and customer acquisition",
      "manager": {
        "id": "uuid",
        "full_name": "John Smith",
        "email": "john@company.com"
      },
      "users_count": 8,
      "objectives_count": 5,
      "is_active": true,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### POST /api/org-admin/areas
Create a new organizational area.

**Request Body:**
```json
{
  "name": "Technology",
  "description": "Product development and technical infrastructure",
  "manager_id": "uuid",
  "is_active": true
}
```

**Response:**
```json
{
  "data": {
    "id": "new-uuid",
    "name": "Technology",
    "description": "Product development and technical infrastructure",
    "manager_id": "uuid",
    "is_active": true,
    "created_at": "2024-01-20T14:45:00Z"
  }
}
```

### PUT /api/org-admin/areas/{id}
Update an existing area.

**Request Body:**
```json
{
  "name": "Updated Area Name",
  "description": "Updated description",
  "manager_id": "new-manager-uuid",
  "is_active": false
}
```

### DELETE /api/org-admin/areas/{id}
Soft delete an area (sets is_active to false and reassigns users).

**Response:**
```json
{
  "message": "Area deleted successfully",
  "affected_users": 5,
  "affected_objectives": 3
}
```

### POST /api/org-admin/areas/{id}/assign-users
Bulk assign users to an area.

**Request Body:**
```json
{
  "user_assignments": [
    {
      "user_id": "uuid",
      "action": "assign"
    },
    {
      "user_id": "uuid",
      "action": "unassign"
    }
  ]
}
```

## Users Management Endpoints

### GET /api/org-admin/users
Retrieve all users with comprehensive information.

**Query Parameters:**
- `role`: Filter by role (CEO, Admin, Manager)
- `area_id`: Filter by area assignment
- `status`: Filter by status (active, inactive)
- `search`: Search by name or email

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "full_name": "John Smith",
      "email": "john@company.com",
      "phone": "+1 (555) 123-4567",
      "role": "CEO",
      "area": {
        "id": "uuid",
        "name": "Executive"
      },
      "is_active": true,
      "last_login": "2024-01-15T14:30:00Z",
      "created_at": "2023-12-01T09:00:00Z"
    }
  ],
  "pagination": {
    "total": 24,
    "page": 1,
    "limit": 50
  }
}
```

### PUT /api/org-admin/users/{id}
Update user information and assignments.

**Request Body:**
```json
{
  "full_name": "Updated Name",
  "email": "new-email@company.com",
  "phone": "+1 (555) 987-6543",
  "role": "Admin",
  "area_id": "new-area-uuid",
  "is_active": true
}
```

### POST /api/org-admin/users/bulk-assign
Bulk user operations (assign areas, change roles, etc.).

**Request Body:**
```json
{
  "user_ids": ["uuid1", "uuid2", "uuid3"],
  "action": "assign_area",
  "target_area_id": "area-uuid"
}
```

### GET /api/org-admin/users/unassigned
Get users without area assignments.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "full_name": "Emily Davis",
      "email": "emily@company.com",
      "role": "Manager",
      "is_active": true,
      "created_at": "2024-01-12T14:20:00Z"
    }
  ]
}
```

## Objectives Management Endpoints

### GET /api/org-admin/objectives
Retrieve organizational objectives with filtering.

**Query Parameters:**
- `area_id`: Filter by area
- `quarter`: Filter by quarter (Q1-2024, Q2-2024, etc.)
- `status`: Filter by status (planning, in_progress, completed, overdue)
- `priority`: Filter by priority (high, medium, low)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Increase Q1 Sales Revenue",
      "description": "Achieve 25% growth in sales revenue for Q1 2024",
      "area": {
        "id": "uuid",
        "name": "Sales & Marketing"
      },
      "quarter": "Q1-2024",
      "priority": "high",
      "status": "in_progress",
      "progress": 75,
      "target_date": "2024-03-31",
      "initiatives_count": 4,
      "completed_initiatives": 3,
      "metrics": ["Revenue: $1.2M target", "New customers: 150"]
    }
  ]
}
```

### POST /api/org-admin/objectives
Create new organizational objective.

**Request Body:**
```json
{
  "title": "New Strategic Objective",
  "description": "Detailed objective description",
  "area_id": "uuid",
  "quarter": "Q2-2024",
  "priority": "high",
  "target_date": "2024-06-30",
  "metrics": ["KPI 1", "KPI 2"]
}
```

### POST /api/org-admin/objectives/bulk-actions
Perform bulk operations on objectives.

**Request Body:**
```json
{
  "objective_ids": ["uuid1", "uuid2"],
  "action": "change_quarter",
  "target_quarter": "Q3-2024"
}
```

## Invitations Management Endpoints

### GET /api/org-admin/invitations
Retrieve invitation status and history.

**Query Parameters:**
- `status`: Filter by status (sent, accepted, expired, cancelled)
- `role`: Filter by invited role

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "john.doe@example.com",
      "role": "Manager",
      "area": {
        "id": "uuid",
        "name": "Sales & Marketing"
      },
      "status": "sent",
      "created_at": "2024-01-15T10:30:00Z",
      "expires_at": "2024-02-15T10:30:00Z",
      "sent_by": "Sarah Johnson",
      "custom_message": "Welcome to our team!",
      "last_reminder_sent": null
    }
  ],
  "stats": {
    "total_sent": 24,
    "pending": 8,
    "accepted": 14,
    "expired": 2,
    "conversion_rate": 58.3
  }
}
```

### POST /api/org-admin/invitations
Send single invitation.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "role": "Manager",
  "area_id": "uuid",
  "custom_message": "Welcome to our team!",
  "expires_in_days": 30
}
```

### POST /api/org-admin/invitations/bulk
Send bulk invitations.

**Request Body:**
```json
{
  "emails": ["user1@example.com", "user2@example.com"],
  "role": "Manager",
  "area_id": "uuid",
  "custom_message": "Welcome to our team!",
  "expires_in_days": 30
}
```

### POST /api/org-admin/invitations/{id}/resend
Resend invitation with updated expiration.

### POST /api/org-admin/invitations/{id}/cancel
Cancel pending invitation.

### POST /api/org-admin/invitations/bulk-reminders
Send reminders for pending invitations.

**Request Body:**
```json
{
  "invitation_ids": ["uuid1", "uuid2"],
  "custom_message": "Friendly reminder about your invitation"
}
```

## Organization Settings Endpoints

### GET /api/org-admin/settings
Retrieve organization configuration.

**Response:**
```json
{
  "data": {
    "basic": {
      "name": "TechCorp Inc.",
      "description": "Leading technology solutions provider",
      "website": "https://techcorp.com",
      "subdomain": "techcorp",
      "industry": "Technology",
      "size": "50-200",
      "timezone": "America/New_York"
    },
    "branding": {
      "primary_color": "#3B82F6",
      "secondary_color": "#8B5CF6",
      "logo_url": "https://cdn.example.com/logo.png"
    },
    "quarters": [
      {
        "id": "q1-2024",
        "name": "Q1 2024",
        "start_date": "2024-01-01",
        "end_date": "2024-03-31",
        "is_active": true
      }
    ],
    "notifications": {
      "email_notifications": true,
      "weekly_reports": true,
      "overdue_alerts": true
    },
    "security": {
      "two_factor_required": false,
      "session_timeout": 480,
      "password_policy": "strong"
    }
  }
}
```

### PUT /api/org-admin/settings
Update organization settings.

**Request Body:**
```json
{
  "section": "basic|branding|notifications|security",
  "data": {
    // Section-specific data
  }
}
```

### POST /api/org-admin/settings/quarters
Add new quarter.

**Request Body:**
```json
{
  "name": "Q2 2024",
  "start_date": "2024-04-01",
  "end_date": "2024-06-30",
  "is_active": false
}
```

### PUT /api/org-admin/settings/quarters/{id}
Update quarter configuration.

### DELETE /api/org-admin/settings/quarters/{id}
Remove quarter (with validation for dependent objectives).

## Reports & Analytics Endpoints

### GET /api/org-admin/analytics/overview
Get executive dashboard metrics.

**Response:**
```json
{
  "data": {
    "overview": {
      "totalUsers": 24,
      "activeUsers": 22,
      "totalAreas": 6,
      "totalObjectives": 18,
      "completedObjectives": 12,
      "averageCompletion": 67,
      "monthlyGrowth": 15.3,
      "userEngagement": 89.2
    },
    "trends": {
      "user_growth": [
        { "month": "Jan", "users": 20, "growth": 0.05 },
        { "month": "Feb", "users": 22, "growth": 0.10 }
      ]
    }
  }
}
```

### GET /api/org-admin/analytics/performance
Get performance analytics by area and time period.

**Query Parameters:**
- `period`: Time period (week, month, quarter, year)
- `area_id`: Specific area analysis
- `metric`: Specific metric focus

**Response:**
```json
{
  "data": {
    "performanceTrends": [
      { "month": "Jan", "objectives": 8, "completed": 6 },
      { "month": "Feb", "objectives": 12, "completed": 8 }
    ],
    "areaComparison": [
      { "area": "Sales", "score": 92, "objectives": 5 },
      { "area": "Technology", "score": 88, "objectives": 6 }
    ]
  }
}
```

### GET /api/org-admin/analytics/predictions
Get AI-powered insights and predictions.

**Response:**
```json
{
  "data": {
    "insights": [
      {
        "id": 1,
        "type": "opportunity",
        "title": "High Performance Area",
        "description": "Sales team exceeding targets",
        "impact": "high",
        "confidence": 92,
        "recommendations": [
          "Expand objectives scope",
          "Share best practices with other areas"
        ]
      }
    ],
    "predictions": {
      "quarterly_completion": 78.5,
      "user_growth": 15.2,
      "risk_areas": ["HR", "Operations"]
    }
  }
}
```

### POST /api/org-admin/reports/generate
Generate custom reports.

**Request Body:**
```json
{
  "report_type": "executive|performance|user_activity|custom",
  "date_range": {
    "start": "2024-01-01",
    "end": "2024-03-31"
  },
  "filters": {
    "areas": ["uuid1", "uuid2"],
    "metrics": ["completion_rate", "user_engagement"]
  },
  "format": "pdf|excel|csv"
}
```

### POST /api/org-admin/reports/schedule
Schedule automated report delivery.

**Request Body:**
```json
{
  "name": "Weekly Executive Report",
  "report_config": {
    "type": "executive",
    "filters": {}
  },
  "schedule": {
    "frequency": "weekly",
    "day_of_week": 1,
    "time": "09:00"
  },
  "recipients": ["ceo@company.com", "admin@company.com"],
  "format": "pdf"
}
```

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Detailed error description",
  "timestamp": "2024-01-20T14:45:00Z"
}
```

### Common Error Codes
- `AUTH_REQUIRED`: Authentication required
- `ACCESS_DENIED`: Insufficient permissions
- `VALIDATION_ERROR`: Request validation failed
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `CONFLICT`: Resource conflict (e.g., duplicate email)
- `TENANT_ISOLATION`: Tenant boundary violation

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (auth required)
- `403`: Forbidden (access denied)
- `404`: Not Found
- `409`: Conflict
- `429`: Rate Limited
- `500`: Internal Server Error

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- Standard endpoints: 100 requests/minute per user
- Bulk operations: 10 requests/minute per user
- Report generation: 5 requests/minute per user
- File uploads: 5 requests/minute per user

## Data Models

### User Profile
```typescript
interface UserProfile {
  id: string
  tenant_id: string
  full_name: string
  email: string
  phone?: string
  role: 'CEO' | 'Admin' | 'Manager'
  area_id?: string
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}
```

### Area
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
```

### Objective
```typescript
interface Objective {
  id: string
  tenant_id: string
  area_id: string
  title: string
  description: string
  quarter: string
  priority: 'high' | 'medium' | 'low'
  status: 'planning' | 'in_progress' | 'completed' | 'overdue'
  progress: number
  target_date: string
  created_at: string
  updated_at: string
}
```

### Invitation
```typescript
interface Invitation {
  id: string
  tenant_id: string
  email: string
  role: 'CEO' | 'Admin' | 'Manager'
  area_id?: string
  status: 'sent' | 'accepted' | 'expired' | 'cancelled'
  custom_message?: string
  sent_by: string
  expires_at: string
  accepted_at?: string
  created_at: string
}
```

---

*Last updated: January 2024*
*API Version: v1.0*