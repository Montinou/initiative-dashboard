# Profile Upload Image API

## Overview
The Profile Upload Image API provides secure file upload functionality for user and company profile images. Supports avatar and company logo/banner uploads with file validation and processing.

**Base URL:** `/api/profile/upload-image`

## Endpoints

### POST /api/profile/upload-image
Uploads an image file for profile use (avatar, logo, or banner).

#### Authentication
Requires valid authentication token via `Authorization: Bearer <token>` header.

#### Request Format
Multipart form data with the following fields:
- `image`: Image file (required)
- `type`: Image type identifier (optional, defaults to "avatar")

#### Supported File Types
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

#### File Size Limits
- Maximum file size: 5MB

#### Response
```json
{
  "message": "Image uploaded successfully",
  "imageUrl": "/uploads/profiles/avatar_tenant-id_user-id_timestamp.jpg"
}
```

#### Error Responses
- `400 Bad Request`: 
  - No file uploaded
  - Invalid file type
  - File too large (>5MB)
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: User profile not found
- `500 Internal Server Error`: Server error during upload

## Security Features
- File type validation (whitelist approach)
- File size limits to prevent abuse
- Authentication verification
- Unique filename generation to prevent conflicts
- Secure file storage in designated upload directory

## Implementation Notes
- Files are stored in `/public/uploads/profiles/` directory
- Filename format: `{type}_{tenant_id}_{user_id}_{timestamp}.{extension}`
- Creates upload directory automatically if it doesn't exist
- Returns public URL path for immediate use
- Uses Node.js `fs/promises` for file system operations

## File Naming Convention
Generated filenames include:
- **type**: Image type (avatar, logo, banner, etc.)
- **tenant_id**: User's tenant identifier
- **user_id**: Authenticated user's ID
- **timestamp**: Upload timestamp for uniqueness
- **extension**: Original file extension

Example: `avatar_fema-electricidad_123e4567-e89b-12d3-a456-426614174000_1643723400000.jpg`

## Storage Structure
```
public/
└── uploads/
    └── profiles/
        ├── avatar_tenant1_user1_timestamp.jpg
        ├── logo_tenant1_user2_timestamp.png
        └── banner_tenant2_user3_timestamp.webp
```

## Usage Examples

### Avatar Upload
```javascript
const formData = new FormData();
formData.append('image', avatarFile);
formData.append('type', 'avatar');

fetch('/api/profile/upload-image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Company Logo Upload
```javascript
const formData = new FormData();
formData.append('image', logoFile);
formData.append('type', 'logo');

fetch('/api/profile/upload-image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

## Error Handling
The API provides specific error messages for common issues:
- File validation errors include details about requirements
- Authentication errors indicate token issues
- Server errors are logged for debugging while returning generic messages
- File system errors (directory creation, write permissions) are handled gracefully

## Database Dependencies
- Requires `users` table access to verify user profile and tenant information
- Uses user's `tenant_id` and `role` for filename generation and access control