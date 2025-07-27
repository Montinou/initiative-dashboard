# Superadmin Users API

## Overview
The Superadmin Users API provides endpoints for managing users across all tenants in the multi-tenant dashboard application. This API requires superadmin authentication and provides comprehensive user management capabilities.

**Base URL:** `/api/superadmin/users`

## Authentication
All endpoints require superadmin authentication via session cookie (`superadmin-session`).

## Endpoints

### GET /api/superadmin/users
Retrieves a paginated list of users across all tenants with filtering and search capabilities.

#### Query Parameters
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Number of items per page (default: 50)
- `search` (string, optional): Search term for email or full name
- `tenant_id` (string, optional): Filter by specific tenant ID
- `role` (string, optional): Filter by user role

#### Response
```json
{
  "users": [
    {
      "id": "string",
      "email": "string",
      "full_name": "string",
      "role": "string",
      "area": "string",
      "is_active": "boolean",
      "created_at": "string",
      "updated_at": "string",
      "tenants": {
        "id": "string",
        "name": "string",
        "industry": "string"
      }
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

#### Error Responses
- `401 Unauthorized`: Missing or invalid superadmin session
- `500 Internal Server Error`: Server error during user fetch

### POST /api/superadmin/users
Creates a new user within a specified tenant.

#### Request Body
```json
{
  "tenant_id": "string (required)",
  "email": "string (required)",
  "name": "string (required)",
  "role": "string (required)",
  "area_id": "string (optional)"
}
```

#### Validation Rules
- **email**: Must be valid email format
- **role**: Must be one of: `CEO`, `Admin`, `Manager`, `Analyst`
- **tenant_id**: Must reference an active tenant

#### Response
```json
{
  "success": true,
  "user_id": "string",
  "message": "User created successfully",
  "temporary_password": "string",
  "note": "User should change password on first login"
}
```

#### Error Responses
- `400 Bad Request`: Invalid input data, missing fields, or duplicate user
- `401 Unauthorized`: Missing or invalid superadmin session
- `500 Internal Server Error`: Server error during user creation

## Security Features
- Superadmin session validation via `edgeCompatibleAuth`
- Input validation and sanitization
- Email format validation
- Role validation against predefined list
- Tenant existence verification
- Duplicate email prevention within tenant
- Audit logging of all actions

## Implementation Notes
- Creates both auth user and user profile records
- Generates temporary password for new users
- Uses Supabase Admin API for auth user creation
- Email confirmation is automatically set to true
- User metadata includes tenant and role information
- Tracks which superadmin created each user

## Audit Logging
All actions are logged with:
- Superadmin email performing the action
- Action type (`VIEW_USERS`, `CREATE_USER`)
- Relevant IDs and details
- Timestamp (automatic)

## Database Dependencies
- `user_profiles` table for user data
- `tenants` table for tenant validation
- `auth.users` table for authentication
- Superadmin authentication system

## Usage Examples

### Search Users
```bash
GET /api/superadmin/users?search=john&tenant_id=abc123&page=1&limit=25
```

### Create User
```json
POST /api/superadmin/users
{
  "tenant_id": "abc123",
  "email": "newuser@company.com",
  "name": "New User",
  "role": "Manager",
  "area_id": "sales"
}
```

## Role Hierarchy
Supported roles in order of permission level:
1. **CEO** - Full access within tenant
2. **Admin** - Administrative access within tenant  
3. **Manager** - Management access within assigned area
4. **Analyst** - Read/analysis access within assigned area

## Method Restrictions
- `PUT`: Not allowed (405 Method Not Allowed)
- `DELETE`: Not allowed (405 Method Not Allowed)

Use individual user management endpoints for updates and deletions.