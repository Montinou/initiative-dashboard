# Profile Company API

## Overview
The Profile Company API provides endpoints for managing company profile information in the multi-tenant dashboard application. Only users with CEO or Admin roles can modify company profiles.

**Base URL:** `/api/profile/company`

## Endpoints

### GET /api/profile/company
Retrieves the company profile for the authenticated user's tenant.

#### Authentication
Requires valid authentication token via `Authorization: Bearer <token>` header.

#### Response
```json
{
  "profile": {
    "tenant_id": "string",
    "company_name": "string",
    "industry": "string",
    "website": "string",
    "phone": "string",
    "email": "string",
    "address": "string",
    "description": "string",
    "logo_url": "string",
    "cover_image_url": "string",
    "mission": "string",
    "vision": "string",
    "values": ["string"],
    "social_media": {},
    "created_at": "string",
    "updated_at": "string"
  }
}
```

#### Default Response
If no company profile exists, returns a default structure with empty fields and the user's tenant_id.

#### Error Responses
- `401 Unauthorized`: Missing or invalid authentication
- `500 Internal Server Error`: Server error during profile fetch

### PUT /api/profile/company
Updates the company profile for the authenticated user's tenant.

#### Authentication
Requires valid authentication token via `Authorization: Bearer <token>` header.

#### Authorization
Only users with `CEO` or `Admin` roles can update company profiles.

#### Request Body
```json
{
  "company_name": "string (required)",
  "industry": "string (optional)",
  "website": "string (optional)",
  "phone": "string (optional)",
  "email": "string (optional)",
  "address": "string (optional)",
  "description": "string (optional)",
  "logo_url": "string (optional)",
  "cover_image_url": "string (optional)",
  "mission": "string (optional)",
  "vision": "string (optional)",
  "values": ["string"] (optional),
  "social_media": {} (optional)
}
```

#### Response
```json
{
  "message": "Company profile updated successfully",
  "profile": {
    "tenant_id": "string",
    "company_name": "string",
    "industry": "string",
    "website": "string",
    "phone": "string",
    "email": "string",
    "address": "string",
    "description": "string",
    "logo_url": "string",
    "cover_image_url": "string",
    "mission": "string",
    "vision": "string",
    "values": ["string"],
    "social_media": {},
    "created_at": "string",
    "updated_at": "string"
  }
}
```

#### Error Responses
- `400 Bad Request`: Invalid input data or missing required fields
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions (not CEO or Admin)
- `500 Internal Server Error`: Server error during profile update

## Security Features
- Role-based access control (CEO and Admin only for updates)
- Input validation and sanitization for all fields
- Authentication verification via `authenticateUser` utility
- Permission checking via `hasRole` utility
- SQL injection protection through parameterized queries
- XSS protection through input sanitization

## Implementation Notes
- Uses Supabase `company_profiles` table for data storage
- Automatically creates new profile if none exists for the tenant
- All string inputs are sanitized using `sanitizeString` utility
- Values array is filtered to remove empty strings
- Social media field accepts any JSON object structure
- Updates include automatic `updated_at` timestamp
- Upsert functionality: updates existing profile or creates new one

## Database Schema
References the `company_profiles` table with the following key fields:
- `tenant_id`: Primary key, foreign key to tenants table
- `company_name`: Company display name (required)
- `industry`: Business industry category
- `website`: Company website URL
- `phone`: Company contact phone
- `email`: Company contact email
- `address`: Company physical address
- `description`: Company description text
- `logo_url`: Company logo image URL
- `cover_image_url`: Company cover/banner image URL
- `mission`: Company mission statement
- `vision`: Company vision statement
- `values`: Array of company values
- `social_media`: JSON object with social media links