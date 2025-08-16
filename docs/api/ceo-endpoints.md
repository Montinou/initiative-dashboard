# CEO Dashboard API Endpoints

## Overview

The CEO Dashboard APIs provide executive-level metrics, insights, and strategic overviews for C-level executives and administrators. These endpoints require CEO or Admin role access.

## Authorization

All CEO endpoints require:
- Authentication via Bearer token or session cookie
- User role must be `CEO` or `Admin`

## Endpoints

### 1. Get CEO Metrics

Comprehensive metrics dashboard for executives.

```http
GET /api/ceo/metrics
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| start_date | string | No | - | Start date (YYYY-MM-DD) |
| end_date | string | No | - | End date (YYYY-MM-DD) |
| time_range | string | No | month | Time range: week, month, quarter, year |

#### Response

```json
{
  "totalInitiatives": 45,
  "completedInitiatives": 20,
  "inProgressInitiatives": 20,
  "overDueInitiatives": 5,
  "averageProgress": 65,
  "totalObjectives": 15,
  "completedObjectives": 8,
  "onTrackObjectives": 5,
  "activeAreas": 5,
  "teamMembers": 25,
  "atRiskCount": 3,
  "completionRate": 44,
  "onTrackPercentage": 33,
  "trends": {
    "initiatives": 5,
    "objectives": 2,
    "progress": 3
  },
  "insights": [
    "Excellent completion rate of 44%",
    "3 initiatives are at risk and need immediate attention",
    "Sales is the top performing area with 75% average progress"
  ],
  "areaBreakdown": [
    {
      "id": "uuid",
      "name": "Sales",
      "manager": "John Doe",
      "totalInitiatives": 10,
      "completedInitiatives": 5,
      "averageProgress": 75,
      "totalObjectives": 3,
      "completedObjectives": 2,
      "teamMembers": 5,
      "atRisk": 0
    }
  ],
  "timelineData": [
    {
      "date": "2025-01-15",
      "initiative": "Q1 Campaign",
      "area": "Marketing",
      "progress": 80,
      "notes": "Milestone achieved"
    }
  ],
  "recentActivity": [
    {
      "id": "uuid",
      "title": "Product Launch progress updated",
      "description": "Progress: 75%",
      "area": "Product",
      "timestamp": "2025-01-15T10:30:00Z",
      "updatedBy": "Jane Smith"
    }
  ],
  "efficiency": 44,
  "utilization": 44,
  "riskScore": 8,
  "performanceScore": 72
}
```

### 2. Get Strategic Overview

High-level strategic view of organizational objectives and initiatives.

```http
GET /api/ceo/strategic-overview
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| include_projections | boolean | No | false | Include future projections |
| quarter | string | No | current | Quarter filter (Q1, Q2, Q3, Q4) |

#### Response

```json
{
  "strategicObjectives": [
    {
      "id": "uuid",
      "title": "Increase Market Share",
      "priority": "high",
      "progress": 65,
      "status": "in_progress",
      "linkedInitiatives": 5,
      "completedInitiatives": 2,
      "estimatedCompletion": "2025-03-31",
      "keyRisks": ["Resource constraints", "Market conditions"],
      "opportunities": ["New market segment", "Partnership potential"]
    }
  ],
  "portfolioHealth": {
    "healthScore": 75,
    "onTrackPercentage": 70,
    "atRiskPercentage": 20,
    "delayedPercentage": 10,
    "resourceUtilization": 85
  },
  "strategicAlignment": {
    "alignedInitiatives": 40,
    "unalignedInitiatives": 5,
    "alignmentScore": 89
  },
  "executionMetrics": {
    "velocityTrend": "increasing",
    "averageTimeToCompletion": 45,
    "successRate": 78,
    "failureRate": 5
  }
}
```

### 3. Get Team Performance

Team performance metrics and analytics.

```http
GET /api/ceo/team-performance
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| period | string | No | month | Period: week, month, quarter, year |
| area_id | uuid | No | - | Filter by specific area |
| include_individual | boolean | No | false | Include individual performance |

#### Response

```json
{
  "overallPerformance": {
    "score": 82,
    "trend": "improving",
    "comparisonToPrevious": 5
  },
  "areaPerformance": [
    {
      "areaId": "uuid",
      "areaName": "Sales",
      "manager": "John Doe",
      "performanceScore": 85,
      "completionRate": 75,
      "onTimeDelivery": 90,
      "teamSize": 5,
      "activeTasks": 15,
      "completedTasks": 45,
      "trending": "up"
    }
  ],
  "topPerformers": [
    {
      "userId": "uuid",
      "name": "Jane Smith",
      "role": "Manager",
      "area": "Marketing",
      "score": 95,
      "completedTasks": 25,
      "efficiency": 92
    }
  ],
  "performanceDistribution": {
    "excellent": 5,
    "good": 12,
    "average": 6,
    "belowAverage": 2
  },
  "workloadAnalysis": {
    "overloaded": 2,
    "optimal": 18,
    "underutilized": 5
  }
}
```

### 4. Get Executive Insights

AI-powered insights and recommendations.

```http
GET /api/ceo/insights
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| category | string | No | all | Category: performance, risk, opportunity, all |
| limit | number | No | 10 | Maximum insights to return |

#### Response

```json
{
  "insights": [
    {
      "id": "uuid",
      "type": "risk",
      "severity": "high",
      "title": "Critical Initiative Delays",
      "description": "3 high-priority initiatives are behind schedule",
      "impact": "May affect Q1 targets",
      "recommendations": [
        "Reallocate resources from low-priority tasks",
        "Consider extending deadlines",
        "Schedule review meeting with area managers"
      ],
      "affectedAreas": ["Product", "Engineering"],
      "confidence": 0.85
    },
    {
      "id": "uuid",
      "type": "opportunity",
      "severity": "medium",
      "title": "Team Capacity Available",
      "description": "Marketing team has 30% unused capacity",
      "impact": "Could accelerate campaign initiatives",
      "recommendations": [
        "Assign additional strategic initiatives",
        "Cross-train with other departments"
      ],
      "affectedAreas": ["Marketing"],
      "confidence": 0.92
    }
  ],
  "summary": {
    "totalInsights": 10,
    "highPriority": 2,
    "mediumPriority": 5,
    "lowPriority": 3
  }
}
```

### 5. Get Risk Analysis

Comprehensive risk assessment and mitigation strategies.

```http
GET /api/ceo/risk-analysis
```

#### Response

```json
{
  "overallRiskLevel": "medium",
  "riskScore": 65,
  "risks": [
    {
      "id": "uuid",
      "category": "execution",
      "title": "Resource Constraints",
      "probability": "high",
      "impact": "high",
      "score": 9,
      "description": "Limited resources affecting multiple initiatives",
      "affectedInitiatives": 5,
      "mitigationStrategies": [
        "Hire additional staff",
        "Outsource non-critical tasks",
        "Reprioritize initiatives"
      ],
      "owner": "COO",
      "dueDate": "2025-02-01"
    }
  ],
  "riskTrends": {
    "increasing": 2,
    "stable": 5,
    "decreasing": 3
  },
  "riskMatrix": {
    "highImpactHighProbability": 2,
    "highImpactLowProbability": 1,
    "lowImpactHighProbability": 3,
    "lowImpactLowProbability": 4
  }
}
```

### 6. Export CEO Dashboard

Export dashboard data in various formats.

```http
GET /api/ceo/export
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| format | string | No | pdf | Format: pdf, excel, csv, json |
| period | string | No | month | Report period |
| sections | array | No | all | Sections to include |

#### Response

For PDF/Excel/CSV formats: Returns file download
For JSON format:
```json
{
  "exportId": "uuid",
  "format": "pdf",
  "generatedAt": "2025-01-15T10:30:00Z",
  "downloadUrl": "/api/ceo/export/download/uuid",
  "expiresAt": "2025-01-16T10:30:00Z",
  "sections": ["metrics", "insights", "risks"],
  "fileSize": 2048576
}
```

## Error Responses

### 403 Forbidden
```json
{
  "error": "Insufficient permissions",
  "details": "CEO or Admin role required"
}
```

### 400 Bad Request
```json
{
  "error": "Invalid parameters",
  "details": [
    {
      "field": "time_range",
      "message": "Must be one of: week, month, quarter, year"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch CEO metrics",
  "details": "Database connection error"
}
```

## Rate Limits

CEO endpoints have higher rate limits:
- **Rate Limit**: 2000 requests per hour
- **Burst Limit**: 50 requests per second

## Caching

CEO dashboard data is cached for performance:
- **Cache Duration**: 5 minutes
- **Cache Key**: Based on user ID and query parameters
- **Cache Invalidation**: On data updates

## WebSocket Support

Real-time updates available via WebSocket:

```javascript
// Connect to real-time updates
const ws = new WebSocket('wss://api.example.com/ws/ceo-dashboard')

ws.on('message', (data) => {
  const update = JSON.parse(data)
  // Handle real-time metric updates
})
```

## Best Practices

1. **Use time_range parameter** instead of date ranges for better performance
2. **Cache responses** on the client for 5 minutes
3. **Subscribe to WebSocket** for real-time updates
4. **Export large datasets** asynchronously
5. **Implement pagination** for area breakdowns with many areas

## Examples

### cURL Example
```bash
# Get CEO metrics for last quarter
curl -X GET "https://api.example.com/api/ceo/metrics?time_range=quarter" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### JavaScript Example
```javascript
// Get strategic overview with projections
const response = await fetch('/api/ceo/strategic-overview?include_projections=true', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

const data = await response.json()
console.log('Strategic objectives:', data.strategicObjectives)
```

### TypeScript SDK Example
```typescript
import { CEODashboardAPI } from '@/lib/api-client'

const api = new CEODashboardAPI({ token: authToken })

// Get comprehensive metrics
const metrics = await api.getMetrics({ 
  timeRange: 'quarter' 
})

// Get team performance with individual metrics
const performance = await api.getTeamPerformance({ 
  period: 'month',
  includeIndividual: true 
})

// Get AI insights
const insights = await api.getInsights({ 
  category: 'risk',
  limit: 5 
})
```