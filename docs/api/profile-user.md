# Profile User API

## Overview
The Profile User API provides endpoints for managing user profile information in the multi-tenant dashboard application.

**Base URL:** `/api/profile/user`

## Endpoints

### GET /api/profile/user
Retrieves the authenticated user's profile information.

#### Authentication
Requires valid authentication token via `Authorization: Bearer <token>` header.

#### Response
```json
{
  "profile": {
    "id": "string",
    "tenant_id": "string",
    "full_name": "string",
    "email": "string",
    "phone": "string",
    "title": "string",
    "bio": "string",
    "avatar_url": "string",
    "role": "string",
    "area": "string",
    "is_active": "boolean",
    "created_at": "string",
    "updated_at": "string"
  }
}
```

#### Error Responses
- `401 Unauthorized`: Missing or invalid authentication
- `500 Internal Server Error`: Server error during profile fetch

### PUT /api/profile/user
Updates the authenticated user's profile information.

#### Authentication
Requires valid authentication token via `Authorization: Bearer <token>` header.

#### Request Body
```json
{
  "name": "string (required)",
  "phone": "string (optional)",
  "title": "string (optional)",
  "bio": "string (optional)",
  "avatar_url": "string (optional)"
}
```

#### Response
```json
{
  "message": "Profile updated successfully",
  "profile": {
    "id": "string",
    "tenant_id": "string",
    "full_name": "string",
    "email": "string",
    "phone": "string",
    "title": "string",
    "bio": "string",
    "avatar_url": "string",
    "role": "string",
    "area": "string",
    "is_active": "boolean",
    "created_at": "string",
    "updated_at": "string"
  }
}
```

#### Error Responses
- `400 Bad Request`: Invalid input data or missing required fields
- `401 Unauthorized`: Missing or invalid authentication
- `500 Internal Server Error`: Server error during profile update

## Security Features
- Input validation and sanitization for all fields
- Authentication verification via `authenticateUser` utility
- SQL injection protection through parameterized queries
- XSS protection through input sanitization

## Implementation Notes
- Uses Supabase `user_profiles` table for data storage
- All string inputs are sanitized using `sanitizeString` utility
- Phone, title, bio, and avatar_url fields can be null
- Updates include automatic `updated_at` timestamp
- Returns complete updated profile object for client-side state management

## Database Schema
References the `user_profiles` table with the following key fields:
- `id`: Primary key (UUID)
- `tenant_id`: Foreign key to tenants table
- `full_name`: User's display name
- `email`: User's email address
- `phone`: Optional phone number
- `title`: Optional job title
- `bio`: Optional biography text
- `avatar_url`: Optional profile image URL
- `role`: User role within tenant
- `area`: Business area assignment
- `is_active`: Account status flag