# Profile API Documentation

## Overview
The Profile API provides endpoints for retrieving and updating user profile information. All endpoints require authentication via Bearer token.

## Base URL
```
/api/profile/user
```

## Authentication
All endpoints require a valid authorization header:
```
Authorization: Bearer <access_token>
```

## Endpoints

### GET /api/profile/user

Retrieves the current user's profile information.

#### Request
- **Method**: GET
- **Headers**: 
  - `Authorization: Bearer <token>` (required)

#### Response

**Success (200)**
```json
{
  "profile": {
    "id": "string",
    "name": "string",
    "email": "string",
    "phone": "string|null",
    "title": "string|null",
    "bio": "string|null",
    "avatar_url": "string|null",
    "created_at": "string",
    "updated_at": "string"
  }
}
```

**Error Responses**
- **401 Unauthorized**: Missing or invalid authorization header
  ```json
  {
    "error": "Missing or invalid authorization header"
  }
  ```
- **401 Unauthorized**: Invalid token
  ```json
  {
    "error": "Invalid token or user not found"
  }
  ```
- **404 Not Found**: User profile not found
  ```json
  {
    "error": "User profile not found"
  }
  ```
- **500 Internal Server Error**: Server error
  ```json
  {
    "error": "Internal server error"
  }
  ```

#### Example Usage
```typescript
// Fetch user profile
const response = await fetch('/api/profile/user', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
if (response.ok) {
  console.log('User profile:', data.profile);
} else {
  console.error('Error:', data.error);
}
```

### PUT /api/profile/user

Updates the current user's profile information.

#### Request
- **Method**: PUT
- **Headers**: 
  - `Authorization: Bearer <token>` (required)
  - `Content-Type: application/json`

#### Request Body
```json
{
  "name": "string",
  "phone": "string|null",
  "title": "string|null", 
  "bio": "string|null",
  "avatar_url": "string|null"
}
```

#### Field Validation
- `name`: Required, non-empty string (whitespace trimmed)
- `phone`: Optional string (whitespace trimmed, null if empty)
- `title`: Optional string (whitespace trimmed, null if empty)
- `bio`: Optional string (whitespace trimmed, null if empty)
- `avatar_url`: Optional string (whitespace trimmed, null if empty)

#### Response

**Success (200)**
```json
{
  "message": "Profile updated successfully",
  "profile": {
    "id": "string",
    "name": "string",
    "email": "string",
    "phone": "string|null",
    "title": "string|null",
    "bio": "string|null",
    "avatar_url": "string|null",
    "created_at": "string",
    "updated_at": "string"
  }
}
```

**Error Responses**
- **400 Bad Request**: Invalid input
  ```json
  {
    "error": "Name is required"
  }
  ```
- **401 Unauthorized**: Authentication errors
  ```json
  {
    "error": "Missing or invalid authorization header"
  }
  ```
- **500 Internal Server Error**: Update failed
  ```json
  {
    "error": "Failed to update profile"
  }
  ```

#### Example Usage
```typescript
// Update user profile
const profileData = {
  name: "John Doe",
  title: "Software Engineer",
  bio: "Experienced developer with a passion for clean code",
  phone: "+1234567890",
  avatar_url: "https://example.com/avatar.jpg"
};

const response = await fetch('/api/profile/user', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(profileData)
});

const data = await response.json();
if (response.ok) {
  console.log('Profile updated:', data.profile);
} else {
  console.error('Update failed:', data.error);
}
```

## Data Schema

### User Profile Object
```typescript
interface UserProfile {
  id: string;                    // Unique user identifier
  name: string;                  // Full name (required)
  email: string;                 // Email address (read-only)
  phone?: string | null;         // Phone number (optional)
  title?: string | null;         // Job title (optional)
  bio?: string | null;           // Biography/description (optional)
  avatar_url?: string | null;    // Profile picture URL (optional)
  created_at: string;            // Account creation timestamp
  updated_at: string;            // Last update timestamp
}
```

## Dependencies

### @sync Dependencies
- **Database**: Supabase `users` table
- **Authentication**: Supabase Auth with JWT tokens
- **Middleware**: Next.js API route handlers

### Database Schema
The endpoint interacts with the `users` table:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  title TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Security Considerations

### Authentication
- JWT tokens validated on every request
- User identity verified through Supabase Auth
- No access to other users' profiles

### Input Sanitization
- All string inputs are trimmed of whitespace
- Empty strings converted to null values
- SQL injection protection through Supabase parameterized queries

### Error Handling
- Sensitive information not exposed in error messages
- All errors logged server-side for debugging
- Consistent error response format

## Rate Limiting
No explicit rate limiting implemented. Consider adding rate limiting for production use:
```typescript
// Example rate limiting middleware
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});
```

## Testing Examples

### Unit Test Example
```typescript
import { GET, PUT } from '@/app/api/profile/user/route';
import { NextRequest } from 'next/server';

describe('Profile API', () => {
  it('should return profile for authenticated user', async () => {
    const request = new NextRequest('http://localhost/api/profile/user', {
      headers: { 'Authorization': 'Bearer valid-token' }
    });
    
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.profile).toBeDefined();
  });
  
  it('should update profile with valid data', async () => {
    const request = new NextRequest('http://localhost/api/profile/user', {
      method: 'PUT',
      headers: { 
        'Authorization': 'Bearer valid-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Updated Name' })
    });
    
    const response = await PUT(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.message).toBe('Profile updated successfully');
  });
});
```

### Integration Test Example
```typescript
// Using a test client
async function testProfileFlow() {
  // Login to get token
  const authResponse = await login('test@example.com', 'password');
  const { access_token } = authResponse;
  
  // Fetch profile
  const profile = await fetch('/api/profile/user', {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  
  // Update profile
  const updated = await fetch('/api/profile/user', {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: 'New Name' })
  });
  
  expect(updated.ok).toBe(true);
}
```

## Related Endpoints

### @sync Relations
- **Used by**: 
  - `useUserProfile` hook for data fetching
  - Profile management components
  - User settings forms

- **Related APIs**:
  - `/api/profile/company` - Company profile management
  - `/api/profile/upload-image` - Avatar image upload
  - `/api/auth/*` - Authentication endpoints

### Component Integration
```typescript
// Used in components like:
import { useUserProfile } from '@/hooks/useUserProfile';

function ProfileComponent() {
  const { profile, updateProfile, loading } = useUserProfile();
  // Component implementation
}
```

---

*File: `/app/api/profile/user/route.ts`*
*Database: Supabase users table*
*Authentication: JWT Bearer tokens*
*Last updated: Auto-generated from source code*