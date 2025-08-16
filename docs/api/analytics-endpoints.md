# Analytics API Endpoints

## Overview

Analytics APIs provide deep insights into performance metrics, trends, predictions, and data-driven recommendations. These endpoints power analytics dashboards and reporting features.

## Authorization

Analytics endpoints are accessible based on role:
- **CEO/Admin**: Full analytics access across all areas
- **Manager**: Analytics for assigned area only

## Endpoints

### 1. KPI Analytics

Comprehensive KPI metrics and analytics.

```http
GET /api/analytics/kpi
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| kpi_type | string | No | all | Type: efficiency, quality, velocity, all |
| period | string | No | month | Period: day, week, month, quarter, year |
| area_id | uuid | No | - | Filter by area |
| compare_periods | number | No | 1 | Number of previous periods to compare |

#### Response

```json
{
  "kpis": {
    "efficiency": {
      "value": 78.5,
      "target": 80,
      "status": "near_target",
      "trend": "improving",
      "change": 3.2,
      "breakdown": {
        "resource_utilization": 85,
        "time_efficiency": 72,
        "cost_efficiency": 78
      }
    },
    "quality": {
      "value": 92,
      "target": 90,
      "status": "above_target",
      "trend": "stable",
      "change": 0.5,
      "breakdown": {
        "defect_rate": 3,
        "customer_satisfaction": 95,
        "rework_percentage": 5
      }
    },
    "velocity": {
      "value": 3.8,
      "target": 4.0,
      "status": "below_target",
      "trend": "improving",
      "change": 0.3,
      "breakdown": {
        "initiatives_per_month": 3.8,
        "average_cycle_time": 21,
        "throughput": 85
      }
    }
  },
  "historical": [
    {
      "period": "2024-12",
      "efficiency": 75.3,
      "quality": 91.5,
      "velocity": 3.5
    },
    {
      "period": "2025-01",
      "efficiency": 78.5,
      "quality": 92,
      "velocity": 3.8
    }
  ],
  "insights": [
    "Efficiency improved by 3.2% this month",
    "Quality metrics exceed targets consistently",
    "Velocity below target - consider resource allocation"
  ]
}
```

### 2. Performance Analytics

Detailed performance metrics and analysis.

```http
GET /api/analytics/performance
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| dimension | string | No | area | Analysis dimension: area, team, time, objective |
| granularity | string | No | month | Data granularity: day, week, month, quarter |
| start_date | string | No | -30d | Start date or relative time |
| end_date | string | No | today | End date |

#### Response

```json
{
  "performance": {
    "overall_score": 82,
    "components": {
      "completion_rate": 75,
      "on_time_delivery": 85,
      "quality_score": 88,
      "efficiency_rating": 80
    }
  },
  "by_dimension": [
    {
      "dimension_value": "Sales",
      "score": 85,
      "initiatives_completed": 12,
      "average_progress": 78,
      "on_time_percentage": 90,
      "team_size": 8,
      "productivity_index": 1.5
    },
    {
      "dimension_value": "Marketing",
      "score": 78,
      "initiatives_completed": 8,
      "average_progress": 70,
      "on_time_percentage": 75,
      "team_size": 6,
      "productivity_index": 1.33
    }
  ],
  "time_series": [
    {
      "date": "2025-01-01",
      "score": 78,
      "completions": 2,
      "new_initiatives": 3
    },
    {
      "date": "2025-01-08",
      "score": 80,
      "completions": 3,
      "new_initiatives": 2
    }
  ],
  "correlations": {
    "team_size_vs_productivity": 0.65,
    "experience_vs_quality": 0.78,
    "workload_vs_efficiency": -0.45
  }
}
```

### 3. Trend Analysis

Historical trends and predictive analytics.

```http
GET /api/analytics/trends
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| metrics | array | No | [progress] | Metrics to analyze |
| period | string | No | 90d | Analysis period |
| forecast_days | number | No | 30 | Days to forecast |
| confidence_level | number | No | 0.95 | Statistical confidence level |

#### Response

```json
{
  "trends": {
    "progress": {
      "current": 65,
      "trend_direction": "upward",
      "trend_strength": "moderate",
      "rate_of_change": 2.5,
      "acceleration": 0.1,
      "seasonality": {
        "detected": true,
        "pattern": "monthly",
        "peak_periods": ["month_end"]
      }
    }
  },
  "forecast": {
    "progress": [
      {
        "date": "2025-02-01",
        "predicted": 67.5,
        "lower_bound": 65.2,
        "upper_bound": 69.8,
        "confidence": 0.95
      },
      {
        "date": "2025-02-15",
        "predicted": 70,
        "lower_bound": 66.5,
        "upper_bound": 73.5,
        "confidence": 0.90
      }
    ]
  },
  "anomalies": [
    {
      "date": "2025-01-10",
      "metric": "progress",
      "expected": 62,
      "actual": 55,
      "severity": "medium",
      "possible_causes": ["Holiday period", "Resource shortage"]
    }
  ],
  "recommendations": [
    "Maintain current momentum to achieve 70% by month end",
    "Address resource constraints to prevent slowdown"
  ]
}
```

### 4. Predictive Analytics

Machine learning-based predictions and insights.

```http
POST /api/analytics/predict
```

#### Request Body

```json
{
  "target": "completion_date",
  "initiative_id": "uuid",
  "scenarios": [
    {
      "name": "current_pace",
      "parameters": {}
    },
    {
      "name": "increased_resources",
      "parameters": {
        "team_size_increase": 2,
        "budget_increase": 10000
      }
    }
  ]
}
```

#### Response

```json
{
  "predictions": [
    {
      "scenario": "current_pace",
      "predicted_completion": "2025-03-15",
      "confidence": 0.75,
      "probability_on_time": 0.65,
      "risk_factors": [
        "Resource constraints",
        "Dependency delays"
      ]
    },
    {
      "scenario": "increased_resources",
      "predicted_completion": "2025-02-28",
      "confidence": 0.85,
      "probability_on_time": 0.90,
      "impact_analysis": {
        "time_saved_days": 15,
        "efficiency_gain": 20,
        "roi": 2.5
      }
    }
  ],
  "recommendations": [
    {
      "action": "Add 2 team members",
      "impact": "15 days earlier completion",
      "cost": 10000,
      "priority": "high"
    }
  ],
  "model_info": {
    "algorithm": "gradient_boosting",
    "accuracy": 0.82,
    "last_trained": "2025-01-14",
    "features_used": ["historical_velocity", "team_size", "complexity"]
  }
}
```

### 5. Comparative Analytics

Compare performance across different dimensions.

```http
GET /api/analytics/compare
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| compare_by | string | Yes | - | Comparison dimension: areas, periods, teams |
| entities | array | Yes | - | Entity IDs to compare |
| metrics | array | No | all | Metrics to compare |

#### Response

```json
{
  "comparison": {
    "dimension": "areas",
    "entities": [
      {
        "id": "uuid1",
        "name": "Sales",
        "metrics": {
          "efficiency": 85,
          "completion_rate": 78,
          "average_cycle_time": 18,
          "team_productivity": 1.8
        },
        "rank": 1,
        "strengths": ["High efficiency", "Fast cycle time"],
        "improvements": ["Team size optimization"]
      },
      {
        "id": "uuid2",
        "name": "Marketing",
        "metrics": {
          "efficiency": 75,
          "completion_rate": 72,
          "average_cycle_time": 22,
          "team_productivity": 1.5
        },
        "rank": 2,
        "strengths": ["Creative output quality"],
        "improvements": ["Process efficiency", "Resource allocation"]
      }
    ]
  },
  "statistical_analysis": {
    "significant_differences": [
      {
        "metric": "efficiency",
        "p_value": 0.03,
        "significant": true,
        "effect_size": "large"
      }
    ],
    "correlation_matrix": {
      "efficiency_vs_cycle_time": -0.72,
      "completion_vs_productivity": 0.85
    }
  },
  "insights": [
    "Sales area outperforms in efficiency by 10%",
    "Cycle time strongly correlates with efficiency",
    "Marketing shows potential for 20% improvement"
  ]
}
```

### 6. Resource Analytics

Resource utilization and optimization analytics.

```http
GET /api/analytics/resources
```

#### Response

```json
{
  "utilization": {
    "overall": 78,
    "by_area": {
      "Sales": 85,
      "Marketing": 72,
      "Product": 80,
      "Operations": 75
    },
    "by_role": {
      "Manager": 90,
      "Developer": 85,
      "Designer": 70,
      "Analyst": 75
    }
  },
  "allocation": {
    "optimal_distribution": {
      "Sales": 25,
      "Marketing": 20,
      "Product": 35,
      "Operations": 20
    },
    "current_distribution": {
      "Sales": 30,
      "Marketing": 18,
      "Product": 32,
      "Operations": 20
    },
    "recommendations": [
      "Reallocate 5% from Sales to Marketing",
      "Increase Product team by 3%"
    ]
  },
  "productivity": {
    "output_per_resource": 3.2,
    "efficiency_score": 82,
    "bottlenecks": [
      {
        "area": "Marketing",
        "type": "capacity",
        "impact": "high",
        "solution": "Add 2 resources or redistribute workload"
      }
    ]
  },
  "cost_analysis": {
    "cost_per_initiative": 15000,
    "roi": 3.5,
    "budget_utilization": 88,
    "cost_optimization_potential": 12
  }
}
```

### 7. Risk Analytics

Risk assessment and mitigation analytics.

```http
GET /api/analytics/risks
```

#### Response

```json
{
  "risk_profile": {
    "overall_risk_score": 6.5,
    "risk_level": "medium",
    "trend": "decreasing"
  },
  "risk_categories": [
    {
      "category": "schedule",
      "score": 7,
      "level": "high",
      "risks": [
        {
          "id": "risk_001",
          "title": "Q1 deadline at risk",
          "probability": 0.7,
          "impact": 8,
          "score": 5.6,
          "affected_initiatives": 3,
          "mitigation": "Fast-track critical paths"
        }
      ]
    },
    {
      "category": "resource",
      "score": 5,
      "level": "medium",
      "risks": [
        {
          "id": "risk_002",
          "title": "Key person dependency",
          "probability": 0.4,
          "impact": 7,
          "score": 2.8,
          "affected_initiatives": 2,
          "mitigation": "Cross-training and documentation"
        }
      ]
    }
  ],
  "early_warnings": [
    {
      "indicator": "velocity_decline",
      "current_value": 3.2,
      "threshold": 3.0,
      "status": "warning",
      "action": "Monitor closely"
    }
  ],
  "mitigation_effectiveness": {
    "implemented_mitigations": 8,
    "successful": 6,
    "effectiveness_rate": 75
  }
}
```

### 8. Export Analytics Report

Export comprehensive analytics reports.

```http
POST /api/analytics/export
```

#### Request Body

```json
{
  "report_type": "comprehensive",
  "format": "pdf",
  "period": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  },
  "sections": [
    "kpis",
    "trends",
    "performance",
    "risks"
  ],
  "filters": {
    "areas": ["uuid1", "uuid2"]
  }
}
```

#### Response

```json
{
  "report_id": "uuid",
  "status": "generating",
  "format": "pdf",
  "estimated_completion": "2025-01-15T10:35:00Z",
  "download_url": "/api/analytics/reports/uuid/download",
  "expires_at": "2025-01-22T10:30:00Z"
}
```

## Batch Analytics

### Batch Query Multiple Metrics

```http
POST /api/analytics/batch
```

#### Request Body

```json
{
  "queries": [
    {
      "id": "q1",
      "type": "kpi",
      "parameters": {
        "kpi_type": "efficiency",
        "period": "month"
      }
    },
    {
      "id": "q2",
      "type": "trends",
      "parameters": {
        "metrics": ["progress"],
        "period": "90d"
      }
    }
  ]
}
```

#### Response

```json
{
  "results": {
    "q1": {
      "status": "success",
      "data": {...}
    },
    "q2": {
      "status": "success",
      "data": {...}
    }
  },
  "execution_time": 250,
  "cache_hits": 1
}
```

## WebSocket Subscriptions

Real-time analytics updates via WebSocket:

```javascript
// Subscribe to real-time analytics
const ws = new WebSocket('wss://api.example.com/ws/analytics')

ws.send(JSON.stringify({
  action: 'subscribe',
  metrics: ['kpi', 'performance'],
  interval: 60000 // Update every minute
}))

ws.on('message', (data) => {
  const update = JSON.parse(data)
  console.log('Analytics update:', update)
})
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid parameters",
  "details": {
    "period": "Invalid period format",
    "confidence_level": "Must be between 0 and 1"
  }
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 3600,
  "limit": 100,
  "remaining": 0
}
```

## Performance Considerations

1. **Caching**: Analytics queries are cached for 5-15 minutes
2. **Aggregation**: Pre-computed aggregates for common queries
3. **Sampling**: Large datasets use statistical sampling
4. **Async Processing**: Heavy computations processed asynchronously

## Examples

### cURL Example
```bash
# Get KPI analytics with comparison
curl -X GET "https://api.example.com/api/analytics/kpi?period=quarter&compare_periods=2" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Request predictive analytics
curl -X POST "https://api.example.com/api/analytics/predict" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target": "completion_date",
    "initiative_id": "uuid"
  }'
```

### JavaScript Example
```javascript
// Get trend analysis with forecast
const response = await fetch('/api/analytics/trends?metrics[]=progress&forecast_days=60', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

const trends = await response.json()
console.log('Forecast:', trends.forecast)
```

### TypeScript SDK Example
```typescript
import { AnalyticsAPI } from '@/lib/api-client'

const analytics = new AnalyticsAPI({ token })

// Get comprehensive KPIs
const kpis = await analytics.getKPIs({
  kpiType: 'all',
  period: 'quarter',
  comparePeriods: 3
})

// Run predictive analysis
const predictions = await analytics.predict({
  target: 'completion_date',
  initiativeId: 'uuid',
  scenarios: [
    { name: 'current_pace' },
    { name: 'accelerated', parameters: { resources: '+2' } }
  ]
})

// Compare areas
const comparison = await analytics.compare({
  compareBy: 'areas',
  entities: ['sales_id', 'marketing_id'],
  metrics: ['efficiency', 'completion_rate']
})
```