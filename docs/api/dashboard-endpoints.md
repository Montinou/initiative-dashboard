# Dashboard API Endpoints

## Overview

Dashboard APIs provide data for various dashboard views including overview, status distribution, progress tracking, and area comparisons. These endpoints are accessible based on user roles and area assignments.

## Authorization

- **CEO/Admin**: Full access to all dashboard data
- **Manager**: Access limited to assigned area data

## Endpoints

### 1. Dashboard Overview

Get comprehensive dashboard overview with initiatives, areas, and activities.

```http
GET /api/dashboard/overview
```

#### Response

```json
{
  "initiatives": [
    {
      "id": "uuid",
      "title": "Q1 Marketing Campaign",
      "description": "Launch new product campaign",
      "progress": 75,
      "start_date": "2025-01-01",
      "due_date": "2025-03-31",
      "area_id": "uuid",
      "areas": {
        "id": "uuid",
        "name": "Marketing"
      }
    }
  ],
  "areas": [
    {
      "id": "uuid",
      "name": "Sales",
      "manager_id": "uuid",
      "objectives": [
        {
          "id": "uuid",
          "title": "Increase Revenue"
        }
      ]
    }
  ],
  "activities": [
    {
      "id": "uuid",
      "is_completed": false,
      "initiative_id": "uuid"
    }
  ],
  "stats": {
    "totalInitiatives": 25,
    "completedInitiatives": 10,
    "inProgressInitiatives": 12,
    "averageProgress": 65,
    "totalAreas": 5,
    "totalActivities": 150,
    "completedActivities": 90
  }
}
```

### 2. Get Areas Dashboard

Area-specific dashboard data.

```http
GET /api/dashboard/areas
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| include_stats | boolean | No | true | Include area statistics |
| active_only | boolean | No | true | Only show active areas |

#### Response

```json
{
  "areas": [
    {
      "id": "uuid",
      "name": "Marketing",
      "description": "Marketing department",
      "manager": {
        "id": "uuid",
        "full_name": "Jane Smith",
        "email": "jane@example.com"
      },
      "stats": {
        "totalInitiatives": 8,
        "completedInitiatives": 3,
        "averageProgress": 62,
        "totalObjectives": 3,
        "teamMembers": 5
      },
      "recentActivity": [
        {
          "type": "initiative_updated",
          "timestamp": "2025-01-15T10:30:00Z",
          "description": "Campaign progress updated to 80%"
        }
      ]
    }
  ],
  "summary": {
    "totalAreas": 5,
    "activeAreas": 5,
    "totalManagers": 5,
    "areasWithoutManagers": 0
  }
}
```

### 3. Get Initiatives Dashboard

Initiative tracking and management dashboard.

```http
GET /api/dashboard/initiatives
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| status | string | No | all | Filter by status: planning, in_progress, completed, on_hold |
| area_id | uuid | No | - | Filter by area |
| assigned_to | uuid | No | - | Filter by assignee |
| due_soon | boolean | No | false | Show initiatives due in next 30 days |

#### Response

```json
{
  "initiatives": [
    {
      "id": "uuid",
      "title": "Product Launch",
      "description": "Launch new product line",
      "progress": 65,
      "status": "in_progress",
      "start_date": "2025-01-01",
      "due_date": "2025-03-31",
      "area": {
        "id": "uuid",
        "name": "Product"
      },
      "objectives": [
        {
          "id": "uuid",
          "title": "Expand Product Portfolio"
        }
      ],
      "activities": {
        "total": 10,
        "completed": 6
      },
      "assignedTeam": [
        {
          "id": "uuid",
          "name": "John Doe",
          "role": "Product Manager"
        }
      ],
      "daysRemaining": 45,
      "isAtRisk": false,
      "lastUpdated": "2025-01-14T15:30:00Z"
    }
  ],
  "statistics": {
    "total": 25,
    "byStatus": {
      "planning": 5,
      "in_progress": 12,
      "completed": 6,
      "on_hold": 2
    },
    "atRisk": 3,
    "dueSoon": 7,
    "overdue": 2
  }
}
```

### 4. Get Objectives Dashboard

Strategic objectives overview.

```http
GET /api/dashboard/objectives
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| priority | string | No | all | Filter by priority: high, medium, low |
| status | string | No | all | Filter by status |
| quarter | string | No | current | Filter by quarter |

#### Response

```json
{
  "objectives": [
    {
      "id": "uuid",
      "title": "Increase Market Share",
      "description": "Expand to new markets",
      "priority": "high",
      "status": "in_progress",
      "progress": 60,
      "area": {
        "id": "uuid",
        "name": "Sales"
      },
      "linkedInitiatives": 5,
      "completedInitiatives": 2,
      "keyResults": [
        {
          "id": "uuid",
          "title": "Achieve 20% growth",
          "progress": 15,
          "target": 20,
          "unit": "percentage"
        }
      ],
      "owner": {
        "id": "uuid",
        "name": "Sarah Johnson"
      }
    }
  ],
  "summary": {
    "total": 15,
    "byPriority": {
      "high": 5,
      "medium": 7,
      "low": 3
    },
    "byStatus": {
      "planning": 3,
      "in_progress": 8,
      "completed": 4
    },
    "averageProgress": 55
  }
}
```

### 5. Get KPI Data

Key Performance Indicators dashboard.

```http
GET /api/dashboard/kpi-data
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| period | string | No | month | Time period: day, week, month, quarter, year |
| compare | boolean | No | false | Include comparison with previous period |

#### Response

```json
{
  "kpis": [
    {
      "id": "completion_rate",
      "name": "Completion Rate",
      "value": 78,
      "unit": "percentage",
      "trend": "up",
      "change": 5,
      "target": 80,
      "status": "on_track",
      "sparkline": [65, 68, 70, 72, 75, 78]
    },
    {
      "id": "avg_progress",
      "name": "Average Progress",
      "value": 65,
      "unit": "percentage",
      "trend": "stable",
      "change": 0,
      "target": 70,
      "status": "below_target",
      "sparkline": [60, 62, 63, 65, 65, 65]
    },
    {
      "id": "team_productivity",
      "name": "Team Productivity",
      "value": 8.5,
      "unit": "score",
      "trend": "up",
      "change": 0.5,
      "target": 8,
      "status": "above_target",
      "sparkline": [7.5, 7.8, 8.0, 8.2, 8.4, 8.5]
    }
  ],
  "period": {
    "start": "2025-01-01",
    "end": "2025-01-31",
    "label": "January 2025"
  },
  "comparison": {
    "period": "December 2024",
    "kpis": [
      {
        "id": "completion_rate",
        "value": 73,
        "change": 5
      }
    ]
  }
}
```

### 6. Get Status Distribution

Distribution of initiatives by status.

```http
GET /api/dashboard/status-distribution
```

#### Response

```json
{
  "distribution": [
    {
      "status": "planning",
      "count": 5,
      "percentage": 20,
      "color": "#FFA500"
    },
    {
      "status": "in_progress",
      "count": 12,
      "percentage": 48,
      "color": "#4CAF50"
    },
    {
      "status": "completed",
      "count": 6,
      "percentage": 24,
      "color": "#2196F3"
    },
    {
      "status": "on_hold",
      "count": 2,
      "percentage": 8,
      "color": "#9E9E9E"
    }
  ],
  "total": 25,
  "lastUpdated": "2025-01-15T10:30:00Z"
}
```

### 7. Get Progress Distribution

Distribution of initiatives by progress ranges.

```http
GET /api/dashboard/progress-distribution
```

#### Response

```json
{
  "distribution": [
    {
      "range": "0-25%",
      "count": 5,
      "percentage": 20,
      "initiatives": ["uuid1", "uuid2"]
    },
    {
      "range": "26-50%",
      "count": 8,
      "percentage": 32
    },
    {
      "range": "51-75%",
      "count": 7,
      "percentage": 28
    },
    {
      "range": "76-100%",
      "count": 5,
      "percentage": 20
    }
  ],
  "averageProgress": 52,
  "medianProgress": 50,
  "total": 25
}
```

### 8. Get Area Comparison

Compare performance across areas.

```http
GET /api/dashboard/area-comparison
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| metric | string | No | progress | Comparison metric: progress, completion, efficiency |
| period | string | No | month | Time period for comparison |

#### Response

```json
{
  "comparison": [
    {
      "areaId": "uuid",
      "areaName": "Sales",
      "metrics": {
        "averageProgress": 75,
        "completionRate": 80,
        "efficiency": 85,
        "initiatives": 10,
        "completedInitiatives": 8
      },
      "rank": 1,
      "trend": "improving"
    },
    {
      "areaId": "uuid",
      "areaName": "Marketing",
      "metrics": {
        "averageProgress": 65,
        "completionRate": 60,
        "efficiency": 70,
        "initiatives": 8,
        "completedInitiatives": 5
      },
      "rank": 2,
      "trend": "stable"
    }
  ],
  "bestPerforming": {
    "areaId": "uuid",
    "areaName": "Sales",
    "metric": 85
  },
  "needsImprovement": {
    "areaId": "uuid",
    "areaName": "Operations",
    "metric": 45
  }
}
```

### 9. Get Trend Analytics

Historical trends and analytics.

```http
GET /api/dashboard/trend-analytics
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| metric | string | No | progress | Metric to analyze |
| period | string | No | 30d | Period: 7d, 30d, 90d, 1y |
| granularity | string | No | day | Data points: day, week, month |

#### Response

```json
{
  "trends": [
    {
      "date": "2025-01-01",
      "value": 60,
      "initiatives": 20,
      "completed": 5
    },
    {
      "date": "2025-01-08",
      "value": 62,
      "initiatives": 22,
      "completed": 6
    },
    {
      "date": "2025-01-15",
      "value": 65,
      "initiatives": 25,
      "completed": 8
    }
  ],
  "analysis": {
    "trend": "upward",
    "averageGrowth": 2.5,
    "projection": 70,
    "confidence": 0.85
  },
  "insights": [
    "Progress has increased by 5% over the past month",
    "At current rate, 70% average progress expected by month end"
  ]
}
```

### 10. Get Analytics Summary

Comprehensive analytics dashboard.

```http
GET /api/dashboard/analytics
```

#### Response

```json
{
  "performance": {
    "overall": 75,
    "trend": "improving",
    "monthOverMonth": 5,
    "yearOverYear": 15
  },
  "velocity": {
    "current": 3.5,
    "average": 3.2,
    "unit": "initiatives_per_week"
  },
  "quality": {
    "score": 8.2,
    "defectRate": 5,
    "reworkRate": 3
  },
  "predictive": {
    "expectedCompletion": 18,
    "atRiskInitiatives": 3,
    "recommendedActions": [
      "Reallocate resources to at-risk initiatives",
      "Review Q2 planning with area managers"
    ]
  },
  "benchmarks": {
    "industry": 70,
    "internal": 75,
    "performance": "above_average"
  }
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "details": "Please provide valid authentication token"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied",
  "details": "You don't have permission to access this area's data"
}
```

### 400 Bad Request
```json
{
  "error": "Invalid parameters",
  "details": {
    "status": "Invalid status value. Must be one of: planning, in_progress, completed, on_hold"
  }
}
```

## Caching

Dashboard endpoints implement caching for performance:
- **Cache Duration**: 2 minutes for real-time data, 10 minutes for analytics
- **Cache Invalidation**: On data mutations
- **Cache Headers**: ETags and Last-Modified headers included

## Examples

### cURL Example
```bash
# Get dashboard overview
curl -X GET "https://api.example.com/api/dashboard/overview" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get initiatives with filters
curl -X GET "https://api.example.com/api/dashboard/initiatives?status=in_progress&due_soon=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### JavaScript Example
```javascript
// Get KPI data with comparison
const response = await fetch('/api/dashboard/kpi-data?period=quarter&compare=true', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

const kpiData = await response.json()
console.log('Current KPIs:', kpiData.kpis)
console.log('Previous period:', kpiData.comparison)
```

### TypeScript SDK Example
```typescript
import { DashboardAPI } from '@/lib/api-client'

const dashboard = new DashboardAPI({ token })

// Get comprehensive overview
const overview = await dashboard.getOverview()

// Get area comparison
const comparison = await dashboard.getAreaComparison({
  metric: 'efficiency',
  period: 'quarter'
})

// Get trend analytics with projections
const trends = await dashboard.getTrendAnalytics({
  metric: 'progress',
  period: '90d',
  granularity: 'week'
})
```