# Superadmin Auth Login API

## Overview
The Superadmin Auth Login API provides secure authentication for superadmin users to access the administrative interface. This endpoint includes rate limiting, session management, and comprehensive security features.

**Base URL:** `/api/superadmin/auth/login`

## Endpoints

### POST /api/superadmin/auth/login
Authenticates a superadmin user and creates a secure session.

#### Request Body
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

#### Response
```json
{
  "success": true,
  "superadmin": {
    "id": "string",
    "name": "string", 
    "email": "string"
  }
}
```

#### Session Cookie
Upon successful authentication, sets a secure HTTP-only cookie:
- **Name**: `superadmin-session`
- **Value**: Encrypted session token
- **Options**:
  - `httpOnly: true` - Prevents JavaScript access
  - `secure: true` (production) - HTTPS only
  - `sameSite: 'strict'` - CSRF protection
  - `maxAge: 1800` - 30 minute expiration
  - `path: '/'` - Available to all routes

#### Error Responses
- `400 Bad Request`: Missing email or password
- `401 Unauthorized`: Invalid credentials or authentication failed
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error during authentication

## Security Features

### Rate Limiting
- Applied via `withRateLimit` middleware
- Prevents brute force attacks
- Client IP-based throttling
- Configurable limits and timeouts

### Session Management
- Secure token generation via `edgeCompatibleAuth`
- 30-minute session expiration
- HTTP-only cookies prevent XSS attacks
- Strict same-site policy prevents CSRF

### Authentication Process
1. Input validation (email/password required)
2. Rate limit check
3. Client IP and User-Agent collection
4. Credential verification via `edgeCompatibleAuth`
5. Secure session token generation
6. HTTP-only cookie setting
7. Response with user information

### Client Information Tracking
- IP address logging via `getClientIP`
- User-Agent string capture
- Session metadata for audit purposes

## Implementation Notes
- Uses `edgeCompatibleAuth.authenticate()` for credential verification
- Comprehensive error handling and logging
- Client information passed to authentication system
- Cookie options adjusted based on environment (production vs development)
- Detailed console logging for debugging and audit

## Usage Example

### Login Request
```javascript
fetch('/api/superadmin/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'admin@company.com',
    password: 'securePassword123'
  })
});
```

### Successful Response
```json
{
  "success": true,
  "superadmin": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Super Admin",
    "email": "admin@company.com"
  }
}
```

## Security Considerations
- Passwords are never logged or returned
- Session tokens are cryptographically secure
- Client information helps with suspicious activity detection
- Rate limiting prevents automated attacks
- Secure cookie settings follow OWASP recommendations

## Error Handling
The API provides specific error messages while avoiding information disclosure:
- Generic "Authentication failed" for invalid credentials
- Detailed logging for administrators
- Rate limit messages without exposing limits
- No user enumeration through error messages

## Method Restrictions
- `GET`: Not allowed (405 Method Not Allowed)
- Only `POST` method is supported for security reasons

## Dependencies
- `edgeCompatibleAuth` for authentication logic
- `withRateLimit` middleware for rate limiting
- `getClientIP` utility for client identification
- Next.js response/cookie APIs for session management

## Session Validation
After login, the session token can be validated using:
- Cookie name: `superadmin-session`
- Validation endpoint: Check other superadmin API endpoints
- Automatic expiration after 30 minutes of inactivity