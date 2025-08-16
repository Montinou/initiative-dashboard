# API Documentation Overview

## Base Information

### Base URLs
```
Development: http://localhost:3000/api
Staging: https://staging.siga-turismo.vercel.app/api
Production: https://siga-turismo.vercel.app/api
```

### API Version
Current Version: **2.0.0**  
Last Updated: **2025-08-16**

## Authentication

All API endpoints require authentication using Supabase Auth. The API supports two authentication methods:

### 1. Bearer Token Authentication (Recommended for API Clients)
Include the JWT token in the Authorization header:
```http
Authorization: Bearer {jwt_token}
```

### 2. Cookie-Based Authentication (Web Sessions)
For browser-based requests, authentication is handled automatically via secure HTTP-only cookies set by Supabase.

### Authentication Flow

```javascript
// Example: Obtaining a token
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Use the token in API requests
const response = await fetch('/api/objectives', {
  headers: {
    'Authorization': `Bearer ${data.session.access_token}`,
    'Content-Type': 'application/json'
  }
})
```

### Authentication Errors

| Status Code | Error | Description |
|------------|-------|-------------|
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 401 | User profile not found | User authenticated but profile not configured |

## Authorization & Roles

The system implements role-based access control (RBAC) with three primary roles:

### Role Hierarchy

1. **CEO** - Full access to all tenant data
2. **Admin** - Full access to all tenant data
3. **Manager** - Access limited to assigned area

### Permission Matrix

| Resource | CEO | Admin | Manager |
|----------|-----|-------|---------|
| All Objectives | ✅ Full | ✅ Full | 🔒 Area Only |
| All Initiatives | ✅ Full | ✅ Full | 🔒 Area Only |
| All Areas | ✅ Full | ✅ Full | 👁️ Read Only |
| Activities | ✅ Full | ✅ Full | ✅ Area Only |
| Audit Log | ✅ Full | ✅ Full | 🔒 Limited |
| CEO Dashboard | ✅ Access | ✅ Access | ❌ No Access |
| Manager Dashboard | ✅ Access | ✅ Access | ✅ Area Only |

## Multi-Tenancy

All API operations are automatically scoped to the authenticated user's tenant through Row Level Security (RLS) policies. No manual tenant filtering is required in API calls.

### Tenant Isolation
- Data is automatically filtered by `tenant_id`
- Cross-tenant access is prevented at the database level
- Tenant context is derived from the authenticated user's profile

## Standard Request Format

### Headers
```http
Content-Type: application/json
Authorization: Bearer {token}
Accept: application/json
```

### Request Body Structure
```json
{
  "field1": "value1",
  "field2": "value2",
  "nested": {
    "field": "value"
  }
}
```

## Standard Response Format

### Success Response
```json
{
  "data": {...} | [...],
  "total": 100,
  "page": 1,
  "limit": 50,
  "totalPages": 2,
  "hasMore": true
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": "Additional error information" | [...],
  "code": "ERROR_CODE"
}
```

## Pagination

Most list endpoints support pagination:

### Query Parameters
| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| page | number | 1 | 10000 | Page number (1-indexed) |
| limit | number | 50 | 100 | Items per page |
| offset | number | 0 | - | Alternative to page-based pagination |

### Pagination Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 250,
    "totalPages": 5,
    "hasMore": true,
    "hasPrevious": false
  }
}
```

## Filtering & Sorting

### Common Filter Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Text search in relevant fields |
| status | string | Filter by status |
| start_date | string | ISO date for range start |
| end_date | string | ISO date for range end |
| area_id | uuid | Filter by area |

### Sorting Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| sort_by | string | created_at | Field to sort by |
| sort_order | string | desc | Sort direction (asc/desc) |

## Rate Limiting

API endpoints implement rate limiting to prevent abuse:

| Authentication Level | Limit | Window |
|---------------------|-------|--------|
| Authenticated | 1000 requests | Per hour |
| Unauthenticated | 100 requests | Per hour |
| Burst Protection | 20 requests | Per second |

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
Retry-After: 3600
```

## Data Validation

All endpoints validate input data using Zod schemas:

### Validation Error Response
```json
{
  "error": "Invalid input",
  "details": [
    {
      "field": "title",
      "message": "Title is required"
    },
    {
      "field": "progress",
      "message": "Progress must be between 0 and 100"
    }
  ]
}
```

## CORS Configuration

The API supports Cross-Origin Resource Sharing (CORS) with the following configuration:

```http
Access-Control-Allow-Origin: https://siga-turismo.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

## API Categories

The API is organized into the following categories:

1. **[CEO Dashboard APIs](./ceo-endpoints.md)** - Executive metrics and insights
2. **[Dashboard APIs](./dashboard-endpoints.md)** - General dashboard data
3. **[Analytics APIs](./analytics-endpoints.md)** - Performance analytics and trends
4. **[Objectives APIs](./objectives-endpoints.md)** - Strategic objectives management
5. **[Initiatives APIs](./initiatives-endpoints.md)** - Initiative tracking
6. **[Areas APIs](./areas-endpoints.md)** - Area and team management
7. **[Webhooks](./webhooks.md)** - Real-time event notifications

## Common HTTP Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Request successful, no content to return |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (duplicate, etc.) |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

## SDK Support

### JavaScript/TypeScript Client
```typescript
import { InitiativeAPI } from '@/lib/api-client'

const api = new InitiativeAPI({
  baseURL: 'https://api.example.com',
  token: 'your-jwt-token'
})

const objectives = await api.objectives.list({
  page: 1,
  limit: 50,
  status: 'in_progress'
})
```

### cURL Examples
```bash
# Get objectives
curl -X GET "https://api.example.com/api/objectives" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Create initiative
curl -X POST "https://api.example.com/api/initiatives" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Initiative","area_id":"uuid"}'
```

## Error Handling Best Practices

1. **Always check for error responses** before processing data
2. **Implement exponential backoff** for rate limit errors
3. **Log error details** for debugging
4. **Provide user-friendly messages** for common errors
5. **Handle network timeouts** gracefully

## Security Considerations

1. **Never expose tokens** in client-side code or logs
2. **Use HTTPS** for all API communications
3. **Implement request signing** for webhooks
4. **Validate all input** on both client and server
5. **Follow principle of least privilege** for API access

## Support & Resources

- **API Status**: https://status.siga-turismo.vercel.app
- **Developer Portal**: https://developers.siga-turismo.vercel.app
- **Support Email**: api-support@siga-turismo.com
- **GitHub Issues**: https://github.com/siga-turismo/api/issues

## Changelog

### Version 2.0.0 (2025-08-16)
- Added comprehensive authentication support
- Implemented role-based access control
- Added multi-tenant isolation
- Enhanced error responses
- Added rate limiting
- Improved pagination support

### Version 1.0.0 (2025-01-01)
- Initial API release