# Superadmin Tenants API

## Overview
The Superadmin Tenants API provides endpoints for managing tenants (companies/organizations) in the multi-tenant dashboard application. This API requires superadmin authentication and provides comprehensive tenant management capabilities.

**Base URL:** `/api/superadmin/tenants`

## Authentication
All endpoints require superadmin authentication via session cookie (`superadmin-session`).

## Endpoints

### GET /api/superadmin/tenants
Retrieves a paginated list of all tenants with filtering and search capabilities.

#### Query Parameters
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Number of items per page (default: 50)
- `search` (string, optional): Search term for tenant name or description
- `industry` (string, optional): Filter by industry type

#### Response
```json
{
  "tenants": [
    {
      "id": "string",
      "name": "string",
      "subdomain": "string",
      "description": "string",
      "industry": "string",
      "is_active": "boolean",
      "settings": {},
      "created_at": "string",
      "updated_at": "string",
      "user_profiles": [
        {
          "count": "number"
        }
      ]
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "pages": "number"
  }
}
```

#### Features
- Returns tenant data with user count for each tenant
- Client-side filtering for search and industry
- Sorted by creation date (newest first)
- Includes tenant settings and status

#### Error Responses
- `401 Unauthorized`: Missing or invalid superadmin session
- `500 Internal Server Error`: Server error during tenant fetch

### POST /api/superadmin/tenants
Creates a new tenant organization.

#### Request Body
```json
{
  "name": "string (required)",
  "industry": "string (required)",
  "description": "string (optional)",
  "settings": {} 
}
```

#### Validation Rules
- **name**: Required, used to generate subdomain
- **industry**: Required industry classification
- **description**: Optional descriptive text
- **settings**: Optional JSON object for tenant configuration

#### Subdomain Generation
- Automatically generated from tenant name
- Converts to lowercase
- Replaces non-alphanumeric characters with hyphens
- Removes leading/trailing hyphens

#### Response
```json
{
  "success": true,
  "tenant_id": "string",
  "message": "Tenant created successfully"
}
```

#### Error Responses
- `400 Bad Request`: Missing required fields (name or industry)
- `401 Unauthorized`: Missing or invalid superadmin session
- `500 Internal Server Error`: Server error during tenant creation

## Security Features
- Superadmin session validation via `edgeCompatibleAuth`
- Input validation for required fields
- Automatic subdomain generation to prevent conflicts
- Audit logging of all actions
- Tracking of which superadmin created each tenant

## Implementation Notes
- Uses Supabase Admin client for database operations
- New tenants are automatically set as active (`is_active: true`)
- Client-side filtering allows for real-time search without additional queries
- User count is provided via related data join
- All tenants include creation tracking metadata

## Audit Logging
All actions are logged with:
- Superadmin email performing the action
- Action type (`VIEW_TENANTS`, `CREATE_TENANT`)
- Relevant tenant information
- Timestamp (automatic)

## Database Dependencies
- `tenants` table for tenant data
- `user_profiles` table for user count (via join)
- Superadmin authentication system

## Usage Examples

### List Tenants with Filtering
```bash
GET /api/superadmin/tenants?search=electric&industry=energy&page=1&limit=20
```

### Create New Tenant
```json
POST /api/superadmin/tenants
{
  "name": "ACME Corporation",
  "industry": "Manufacturing", 
  "description": "Leading manufacturing company",
  "settings": {
    "theme": "corporate",
    "features": ["analytics", "reporting"]
  }
}
```

## Tenant Settings Schema
The `settings` field accepts any JSON object for tenant-specific configuration:

```json
{
  "theme": "string",
  "features": ["string"],
  "limits": {
    "users": "number",
    "storage": "number"
  },
  "integrations": {
    "enabled": ["string"]
  }
}
```

## Industry Classifications
Common industry values include:
- Technology
- Manufacturing
- Healthcare
- Finance
- Education
- Energy
- Retail
- Construction
- Consulting

## Method Restrictions
- `PUT`: Not allowed (405 Method Not Allowed)
- `DELETE`: Not allowed (405 Method Not Allowed)

Use individual tenant management endpoints for updates and deletions.

## Subdomain Examples
- "ACME Corporation" → `acme-corporation`
- "Tech Solutions LLC" → `tech-solutions-llc`
- "ABC-123 Company!" → `abc-123-company`