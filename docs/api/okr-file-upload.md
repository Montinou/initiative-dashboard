# OKR File Upload API Documentation

## Overview
The OKR File Upload API provides secure, multi-tenant file upload capabilities for bulk importing objectives, initiatives, and activities. Files are uploaded directly to Google Cloud Storage using signed URLs, then processed asynchronously on the server.

## Architecture
- **Direct Upload**: Files are uploaded directly from the browser to GCS using signed POST policies
- **Multi-tenant Isolation**: All data is scoped by tenant using Row Level Security (RLS)
- **Async Processing**: Files are processed asynchronously after upload
- **Comprehensive Tracking**: Every import job and individual row is tracked in the database

## API Endpoints

### 1. Generate Signed Upload URL
**POST** `/api/upload/okr-file/signed-url`

Generates a signed URL for direct upload to Google Cloud Storage.

#### Request Body
```json
{
  "filename": "okr-import.csv",
  "fileSize": 102400,
  "contentType": "text/csv",
  "checksum": "sha256_hash_here"
}
```

#### Response
```json
{
  "uploadUrl": "https://storage.googleapis.com/bucket-name",
  "fields": {
    "key": "okr-uploads/tenant_id/2025/01/11/user_id/timestamp-checksum-filename.csv",
    "Content-Type": "text/csv",
    "x-goog-meta-tenant-id": "tenant_uuid",
    "x-goog-meta-user-id": "user_profile_uuid",
    "x-goog-meta-checksum": "sha256_hash",
    "policy": "base64_encoded_policy",
    "x-goog-signature": "signature"
  },
  "objectPath": "okr-uploads/tenant_id/2025/01/11/user_id/timestamp-checksum-filename.csv",
  "maxSizeMB": 10,
  "expiresIn": 3600
}
```

### 2. Notify Upload Complete
**POST** `/api/upload/okr-file/notify`

Notifies the server that upload is complete and triggers processing.

#### Request Body
```json
{
  "objectPath": "okr-uploads/tenant_id/2025/01/11/user_id/timestamp-checksum-filename.csv"
}
```

#### Response
```json
{
  "jobId": "job_uuid",
  "status": "pending",
  "message": "Import job created successfully"
}
```

### 3. Get Job Status
**GET** `/api/upload/okr-file/jobs/{id}`

Gets the status and details of a specific import job.

#### Response
```json
{
  "job": {
    "id": "job_uuid",
    "status": "completed|processing|failed|partial",
    "filename": "okr-import.csv",
    "fileSize": 102400,
    "contentType": "text/csv",
    "createdAt": "2025-01-11T10:00:00Z",
    "startedAt": "2025-01-11T10:00:05Z",
    "completedAt": "2025-01-11T10:00:30Z",
    "errorSummary": null,
    "metadata": {}
  },
  "summary": {
    "totalRows": 100,
    "processedRows": 100,
    "successRows": 95,
    "errorRows": 5,
    "progressPercentage": 100,
    "duration": 25000
  },
  "items": [
    {
      "id": "item_uuid",
      "row_number": 1,
      "entity_type": "objective",
      "entity_key": "OBJ-001",
      "entity_id": "entity_uuid",
      "action": "create",
      "status": "success",
      "error_message": null,
      "processed_at": "2025-01-11T10:00:10Z"
    }
  ]
}
```

### 4. Get Import History
**GET** `/api/upload/okr-file/history`

Gets the history of import jobs for the current tenant.

#### Query Parameters
- `limit` (number): Number of results per page (default: 10)
- `offset` (number): Pagination offset (default: 0)
- `status` (string): Filter by status (pending|processing|completed|failed|partial)
- `dateFrom` (string): Filter by start date (ISO 8601)
- `dateTo` (string): Filter by end date (ISO 8601)

#### Response
```json
{
  "jobs": [
    {
      "id": "job_uuid",
      "filename": "okr-import.csv",
      "status": "completed",
      "totalRows": 100,
      "processedRows": 100,
      "successRows": 95,
      "errorRows": 5,
      "fileSize": 102400,
      "createdAt": "2025-01-11T10:00:00Z",
      "completedAt": "2025-01-11T10:00:30Z",
      "duration": 25000
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

### 5. Get Import Statistics
**GET** `/api/upload/okr-file/stats`

Gets aggregated statistics for import jobs.

#### Response
```json
{
  "stats": {
    "totalJobs": 150,
    "byStatus": {
      "completed": 120,
      "partial": 20,
      "failed": 5,
      "processing": 2,
      "pending": 3
    },
    "totalRowsProcessed": 15000,
    "totalSuccessRows": 14500,
    "totalErrorRows": 500,
    "totalFileSizeBytes": 52428800,
    "averageSuccessRate": 97,
    "recentActivity": {
      "last24Hours": 10,
      "last7Days": 45,
      "last30Days": 150
    }
  },
  "topErrors": [
    {
      "message": "Missing required field: objective_title",
      "count": 50
    },
    {
      "message": "Invalid date format",
      "count": 25
    }
  ]
}
```

### 6. Health Check
**GET** `/api/health`

Checks the health of the system including GCS connectivity.

#### Response
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-01-11T10:00:00Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 15
    },
    "storage": {
      "status": "up",
      "bucket": "okr-uploads-bucket",
      "responseTime": 120
    },
    "auth": {
      "status": "up",
      "responseTime": 10
    }
  },
  "environment": {
    "nodeVersion": "v22.0.0",
    "environment": "production"
  }
}
```

## File Format Specifications

### CSV Format
Files must be UTF-8 encoded CSV with the following columns. **Note: No key columns are needed** - the system automatically matches records by name using case-insensitive comparison.

#### Required Columns
- `area_name` - Name of the area
- `objective_title` - Title of the objective
- `initiative_title` - Title of the initiative

#### Optional Columns
- `objective_description` - Description of the objective
- `objective_quarter` - Quarter (Q1, Q2, Q3, Q4)
- `objective_priority` - Priority (high, medium, low)
- `objective_status` - Status (planning, in_progress, completed, overdue)
- `objective_progress` - Progress percentage (0-100)
- `objective_target_date` - Target date (YYYY-MM-DD)
- `initiative_description` - Description of the initiative
- `initiative_start_date` - Start date (YYYY-MM-DD)
- `initiative_due_date` - Due date (YYYY-MM-DD)
- `initiative_completion_date` - Completion date (YYYY-MM-DD)
- `initiative_status` - Status (planning, in_progress, completed, on_hold)
- `initiative_progress` - Progress percentage (0-100)
- `activity_title` - Title of the activity
- `activity_description` - Description of the activity
- `activity_is_completed` - Completion status (true/false)
- `activity_assigned_to_email` - Email of assigned user

#### Matching Logic
The system uses intelligent hierarchical matching to determine whether to create new records or update existing ones:

1. **Objectives**: Matched by title (case-insensitive)
   - If an objective with the same title exists in the tenant, it will be updated
   - Otherwise, a new objective is created

2. **Initiatives**: Matched by title within the same objective
   - If an initiative with the same title exists AND belongs to the same objective, it will be updated
   - Otherwise, a new initiative is created and linked to the objective

3. **Activities**: Matched by title within the same initiative
   - If an activity with the same title exists AND belongs to the same initiative, it will be updated
   - Otherwise, a new activity is created and linked to the initiative

This ensures that:
- Multiple initiatives can have the same name if they belong to different objectives
- Multiple activities can have the same name if they belong to different initiatives
- The CSV format is simplified for easier data entry (no need to manage unique keys)

### Excel Format
Excel files (.xlsx) should have the same columns as CSV, with data in the first sheet or a sheet named "OKR_Bulk".

## Error Handling

### Error Response Format
```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

### Common Error Codes
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing or invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (job or resource not found)
- `413` - Payload Too Large (file exceeds size limit)
- `500` - Internal Server Error

## Security Considerations

1. **Authentication**: All endpoints require valid Supabase authentication
2. **Tenant Isolation**: Data is automatically filtered by tenant using RLS
3. **File Size Limits**: Maximum file size is 10MB
4. **Content Type Validation**: Only CSV and Excel files are accepted
5. **Checksum Verification**: SHA256 checksums prevent duplicate processing
6. **Signed URLs**: Upload URLs expire after 1 hour

## Implementation Details

### Database Tables
- `okr_import_jobs` - Tracks import jobs
- `okr_import_job_items` - Tracks individual row processing

### Processing Logic
1. File is downloaded from GCS
2. Content is parsed based on content type
3. Each row is validated and processed:
   - Objectives are upserted by `objective_key`
   - Initiatives are upserted by `initiative_key`
   - Activities are created or updated if `activity_key` is provided
   - Relationships are created between objectives and initiatives
4. Results are recorded in the database
5. Job status is updated

### Duplicate Detection
- Files with the same SHA256 checksum uploaded within 24 hours are considered duplicates
- Duplicate uploads return the existing job ID without reprocessing

## Client Integration Example

```typescript
// 1. Calculate file checksum
const checksum = await calculateSHA256(file);

// 2. Get signed URL
const { uploadUrl, fields, objectPath } = await fetch('/api/upload/okr-file/signed-url', {
  method: 'POST',
  body: JSON.stringify({
    filename: file.name,
    fileSize: file.size,
    contentType: file.type,
    checksum
  })
}).then(res => res.json());

// 3. Upload to GCS
const formData = new FormData();
Object.entries(fields).forEach(([key, value]) => {
  formData.append(key, value);
});
formData.append('file', file);

await fetch(uploadUrl, {
  method: 'POST',
  body: formData
});

// 4. Notify server
const { jobId } = await fetch('/api/upload/okr-file/notify', {
  method: 'POST',
  body: JSON.stringify({ objectPath })
}).then(res => res.json());

// 5. Poll for status
const status = await fetch(`/api/upload/okr-file/jobs/${jobId}`).then(res => res.json());
```

## Rate Limits
- Maximum 100 uploads per hour per tenant
- Maximum 10 concurrent processing jobs per tenant

## Monitoring
- All operations are logged with correlation IDs
- Processing times are tracked in job records
- Error rates are aggregated in stats endpoint
- Health checks monitor system availability