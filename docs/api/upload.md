# File Upload API Documentation

## Purpose
Handles Excel file uploads and processing for data import functionality.

## Overview
The File Upload API handles Excel file uploads and processing for the application. It supports XLSX file parsing, data validation, and storage integration with Supabase.

## Base URL
```
/api/upload
```

## Authentication
All endpoints require authentication via Bearer token:
```
Authorization: Bearer <access_token>
```

## Endpoints

### POST /api/upload

Uploads and processes an Excel file.

#### Request
- **Method**: POST
- **Content-Type**: `multipart/form-data`
- **Headers**: 
  - `Authorization: Bearer <token>` (required)

#### Request Body
Form data with file upload:
```typescript
FormData {
  file: File; // Excel file (.xlsx, .xls)
}
```

#### Response

**Success (200)**
```json
{
  "success": true,
  "message": "File uploaded and processed successfully",
  "data": {
    "filename": "string",
    "rowsProcessed": number,
    "processedAt": "string",
    "summary": {
      "totalRows": number,
      "validRows": number,
      "errorRows": number
    }
  }
}
```

**Error Responses**

- **401 Unauthorized**: Missing or invalid authentication
  ```json
  {
    "error": "Authentication required"
  }
  ```
  ```json
  {
    "error": "Invalid authentication token"
  }
  ```

- **400 Bad Request**: Invalid file or file format
  ```json
  {
    "error": "No file provided"
  }
  ```
  ```json
  {
    "error": "Invalid file format. Please upload an Excel file (.xlsx or .xls)"
  }
  ```

- **413 Payload Too Large**: File size exceeds limit
  ```json
  {
    "error": "File size exceeds maximum limit (10MB)"
  }
  ```

- **422 Unprocessable Entity**: Data validation errors
  ```json
  {
    "error": "File processing failed",
    "details": {
      "invalidRows": [
        {
          "row": number,
          "errors": ["error message 1", "error message 2"]
        }
      ]
    }
  }
  ```

- **500 Internal Server Error**: Server processing error
  ```json
  {
    "error": "File processing failed"
  }
  ```

## File Processing

### Supported Formats
- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97-2003)

### File Size Limits
- Maximum file size: 10MB
- Maximum rows: 10,000 per upload

### Data Validation
The API performs the following validations:
- Required field presence
- Data type validation
- Format validation (dates, emails, etc.)
- Business rule validation
- Duplicate detection

### Processing Steps
1. **Authentication**: Verify user token and permissions
2. **File Validation**: Check file format and size
3. **Excel Parsing**: Extract data using XLSX library
4. **Data Validation**: Validate each row against schema
5. **Database Storage**: Store valid data in Supabase
6. **Response Generation**: Return processing summary

## Dependencies

### @sync Dependencies
- `xlsx` library for Excel file parsing
- `@supabase/supabase-js` for database operations
- `@/lib/supabase` for authentication and storage
- Next.js `NextRequest`/`NextResponse` for API handling

### External Services
- **Supabase**: Data storage and user authentication
- **File System**: Temporary file handling during processing

### Security Integrations
- JWT token validation through Supabase Auth
- Service role key for administrative operations
- Row Level Security (RLS) for data access control

## Usage Examples

### JavaScript/TypeScript
```typescript
async function uploadExcelFile(file: File, accessToken: string) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData
  });

  const result = await response.json();
  
  if (response.ok) {
    console.log('Upload successful:', result);
    return result;
  } else {
    console.error('Upload failed:', result.error);
    throw new Error(result.error);
  }
}
```

### React Component Example
```typescript
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

function FileUploader() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const { session } = useAuth();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadResult = await uploadExcelFile(file, session.access_token);
      setResult(uploadResult);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept=".xlsx,.xls" 
        onChange={handleFileUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {result && (
        <div>
          <p>Processed {result.data.rowsProcessed} rows</p>
          <p>Valid: {result.data.summary.validRows}</p>
          <p>Errors: {result.data.summary.errorRows}</p>
        </div>
      )}
    </div>
  );
}
```

### cURL Example
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/your/file.xlsx" \
  http://localhost:3000/api/upload
```

## Error Handling

### Client-Side Error Handling
```typescript
async function handleUpload(file: File) {
  try {
    const result = await uploadExcelFile(file, accessToken);
    // Handle success
  } catch (error) {
    if (error.message.includes('Authentication')) {
      // Redirect to login
      router.push('/auth/login');
    } else if (error.message.includes('file format')) {
      // Show file format error
      setErrorMessage('Please upload a valid Excel file');
    } else if (error.message.includes('size')) {
      // Show size error
      setErrorMessage('File is too large. Maximum size is 10MB');
    } else {
      // Generic error
      setErrorMessage('Upload failed. Please try again');
    }
  }
}
```

### Retry Logic
```typescript
async function uploadWithRetry(file: File, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadExcelFile(file, accessToken);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

## Performance Considerations

### File Size Optimization
- Large files are processed in chunks
- Memory usage is optimized during parsing
- Temporary files are cleaned up automatically

### Processing Time
- Small files (< 1MB): ~1-2 seconds
- Medium files (1-5MB): ~3-10 seconds  
- Large files (5-10MB): ~10-30 seconds

### Concurrent Uploads
- Rate limiting prevents abuse
- Multiple users can upload simultaneously
- Queue system for high-volume processing

## Security Considerations

### File Validation
- MIME type verification
- File extension checking
- Content scanning for malicious code
- Size limits to prevent DoS attacks

### Data Protection
- Files are not permanently stored on server
- Temporary files are encrypted
- Processing logs are sanitized
- User data is isolated through RLS

### Access Control
- User authentication required
- Permission-based processing
- Audit logging of all operations
- Secure token handling

## Monitoring and Logging

### Success Metrics
- Upload success rate
- Average processing time
- Data quality scores
- User activity patterns

### Error Tracking
- Failed upload attempts
- Validation error patterns
- Performance bottlenecks
- Security incidents

### Alerting
- High error rates
- Unusual file sizes
- Processing delays
- Authentication failures

---

*File: `/app/api/upload/route.ts`*
*Dependencies: XLSX, Supabase, Next.js API routes*
*Used by: File upload components, data import workflows*
*Last updated: Auto-generated from source code*