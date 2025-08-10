# 📁 File Management & Import/Export Endpoints

> Endpoints para gestión de archivos, uploads, descargas y operaciones de importación/exportación

## 📤 Gestión de Archivos

### GET /api/files
**Descripción**: Obtiene lista de archivos subidos por el tenant

**Query Parameters**:
```typescript
{
  area_id?: string,
  initiative_id?: string,
  uploaded_by?: string,
  page?: number,
  limit?: number,
  sort?: "created_at" | "filename" | "size",
  order?: "asc" | "desc"
}
```

**Response**:
```typescript
// Success (200)
{
  files: Array<{
    id: string,
    tenant_id: string,
    uploaded_by: string,
    original_filename: string,
    stored_filename: string,
    file_size?: number,
    mime_type?: string,
    created_at: string,
    uploader?: {
      id: string,
      full_name: string,
      email: string
    },
    associations?: {
      areas: Area[],
      initiatives: Initiative[]
    }
  }>,
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  },
  storage_usage: {
    total_files: number,
    total_size_bytes: number,
    total_size_formatted: string
  }
}

// Errors
401: { error: "Authentication required" }
500: { error: "Failed to fetch files" }
```

---

### POST /api/files/upload
**Descripción**: Sube uno o múltiples archivos

**Headers**:
```typescript
{
  "Content-Type": "multipart/form-data"
}
```

**Request Body** (FormData):
```typescript
{
  files: File | File[],        // Archivos a subir
  area_id?: string,            // Asociar a área
  initiative_id?: string,      // Asociar a iniciativa
  description?: string
}
```

**Response**:
```typescript
// Success (201)
{
  uploaded: Array<{
    id: string,
    original_filename: string,
    stored_filename: string,
    size: number,
    mime_type: string,
    url?: string
  }>,
  failed: Array<{
    filename: string,
    error: string
  }>,
  message: "Files uploaded successfully",
  total_uploaded: number,
  total_failed: number
}

// Errors
400: { 
  error: "No files provided" |
         "File too large" |
         "Invalid file type"
}
401: { error: "Authentication required" }
413: { error: "Payload too large" }
500: { error: "Upload failed" }
```

**Funcionalidad Interna**:
- Validación de tamaño máximo por archivo (10MB default)
- Validación de tipos MIME permitidos
- Almacenamiento en Supabase Storage
- Generación de nombres únicos para evitar colisiones
- Asociación automática con áreas/iniciativas

---

### GET /api/files/[fileId]/download
**Descripción**: Descarga un archivo específico

**Response**:
```typescript
// Success (200)
// Headers:
{
  "Content-Type": "<mime-type>",
  "Content-Disposition": "attachment; filename=\"<filename>\"",
  "Content-Length": "<size>"
}
// Body: Binary data del archivo

// Errors
401: { error: "Authentication required" }
403: { error: "Access denied" }
404: { error: "File not found" }
500: { error: "Download failed" }
```

---

### DELETE /api/files/[fileId]
**Descripción**: Elimina un archivo

**Response**:
```typescript
// Success (200)
{
  message: "File deleted successfully"
}

// Errors
401: { error: "Authentication required" }
403: { error: "Cannot delete file uploaded by another user" }
404: { error: "File not found" }
500: { error: "Failed to delete file" }
```

---

## 📊 Excel Import/Export

### POST /api/excel/parse
**Descripción**: Parsea un archivo Excel y devuelve su contenido estructurado

**Request Body** (FormData):
```typescript
{
  file: File,                  // Archivo Excel (.xlsx, .xls)
  sheet?: string | number,     // Hoja específica (nombre o índice)
  hasHeaders?: boolean         // Default: true
}
```

**Response**:
```typescript
// Success (200)
{
  sheets: Array<{
    name: string,
    index: number,
    rows: number,
    columns: number
  }>,
  data: {
    headers?: string[],
    rows: Array<Record<string, any>>,
    raw?: any[][]
  },
  metadata: {
    filename: string,
    size: number,
    created: string,
    modified: string,
    author?: string
  }
}

// Errors
400: { 
  error: "Invalid file format" |
         "Sheet not found"
}
401: { error: "Authentication required" }
500: { error: "Failed to parse Excel file" }
```

---

### POST /api/excel/validate
**Descripción**: Valida datos de Excel contra el esquema esperado

**Request Body**:
```typescript
{
  data: Array<Record<string, any>>,
  schema: "initiatives" | "objectives" | "activities" | "custom",
  customSchema?: {              // Si schema = "custom"
    required: string[],
    fields: Record<string, {
      type: string,
      format?: string,
      min?: number,
      max?: number
    }>
  }
}
```

**Response**:
```typescript
// Success (200)
{
  valid: boolean,
  total_rows: number,
  valid_rows: number,
  invalid_rows: number,
  errors: Array<{
    row: number,
    field: string,
    value: any,
    error: string
  }>,
  warnings: Array<{
    row: number,
    field: string,
    message: string
  }>
}

// Errors
400: { error: "Invalid schema" }
401: { error: "Authentication required" }
500: { error: "Validation failed" }
```

---

### POST /api/excel/import
**Descripción**: Importa datos desde Excel al sistema

**Request Body**:
```typescript
{
  data: Array<Record<string, any>>,
  entity: "initiatives" | "objectives" | "activities",
  mapping: {                    // Mapeo de columnas Excel a campos BD
    [excelColumn: string]: string
  },
  options: {
    skipDuplicates?: boolean,
    updateExisting?: boolean,
    validateBeforeImport?: boolean,
    dryRun?: boolean           // Simular sin guardar
  }
}
```

**Response**:
```typescript
// Success (200)
{
  success: boolean,
  imported: {
    total: number,
    created: number,
    updated: number,
    skipped: number,
    failed: number
  },
  records: Array<{
    row: number,
    status: "created" | "updated" | "skipped" | "failed",
    id?: string,
    error?: string
  }>,
  dryRun: boolean
}

// Errors
400: { 
  error: "Invalid data format" |
         "Validation failed"
}
401: { error: "Authentication required" }
403: { error: "Insufficient permissions" }
500: { error: "Import failed" }
```

---

### GET /api/excel/export-error-report
**Descripción**: Exporta reporte de errores de importación

**Query Parameters**:
```typescript
{
  import_id: string,           // ID de importación previa
  format?: "excel" | "csv"     // Default: "excel"
}
```

**Response**:
```typescript
// Success (200)
// Headers:
{
  "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "Content-Disposition": "attachment; filename=\"error-report-YYYY-MM-DD.xlsx\""
}
// Body: Archivo Excel con errores detallados

// Errors
401: { error: "Authentication required" }
404: { error: "Import not found" }
500: { error: "Failed to generate report" }
```

---

## 📋 Templates

### GET /api/download-template
**Descripción**: Descarga plantilla Excel para importación

**Query Parameters**:
```typescript
{
  type: "initiatives" | "objectives" | "activities" | "okr",
  format?: "xlsx" | "csv",     // Default: "xlsx"
  include_sample?: boolean      // Incluir datos de ejemplo
}
```

**Response**:
```typescript
// Success (200)
// Headers:
{
  "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "Content-Disposition": "attachment; filename=\"template-<type>.xlsx\""
}
// Body: Archivo de plantilla

// Errors
400: { error: "Invalid template type" }
401: { error: "Authentication required" }
500: { error: "Failed to generate template" }
```

---

## 📈 OKR Files

### GET /api/upload/okr-file
**Descripción**: Obtiene archivos OKR subidos

**Query Parameters**:
```typescript
{
  area_id?: string,
  quarter?: string,
  status?: "pending" | "processed" | "failed",
  page?: number,
  limit?: number
}
```

**Response**:
```typescript
// Success (200)
{
  files: Array<{
    id: string,
    filename: string,
    uploaded_by: string,
    area_id?: string,
    quarter?: string,
    status: "pending" | "processed" | "failed",
    records_processed?: number,
    errors?: any[],
    created_at: string,
    processed_at?: string
  }>,
  pagination: {
    page: number,
    limit: number,
    total: number
  }
}

// Errors
401: { error: "Authentication required" }
500: { error: "Failed to fetch OKR files" }
```

---

### POST /api/upload/okr-file
**Descripción**: Sube y procesa archivo OKR

**Request Body** (FormData):
```typescript
{
  file: File,
  area_id?: string,
  quarter: string,
  auto_process?: boolean        // Default: true
}
```

**Response**:
```typescript
// Success (201)
{
  upload_id: string,
  filename: string,
  status: "pending" | "processing",
  message: "OKR file uploaded successfully",
  processing?: {
    started: boolean,
    estimated_time: number      // Segundos
  }
}

// Errors
400: { 
  error: "Invalid file format" |
         "Quarter required"
}
401: { error: "Authentication required" }
413: { error: "File too large" }
500: { error: "Upload failed" }
```

---

### GET /api/upload/okr-file/[uploadId]
**Descripción**: Obtiene estado de procesamiento de archivo OKR

**Response**:
```typescript
// Success (200)
{
  id: string,
  filename: string,
  status: "pending" | "processing" | "processed" | "failed",
  progress?: number,             // 0-100
  records_total?: number,
  records_processed?: number,
  records_created?: number,
  records_updated?: number,
  errors?: Array<{
    row: number,
    error: string
  }>,
  completed_at?: string
}

// Errors
401: { error: "Authentication required" }
404: { error: "Upload not found" }
500: { error: "Failed to fetch status" }
```

---

### GET /api/upload/okr-file/template
**Descripción**: Obtiene plantilla OKR específica

**Query Parameters**:
```typescript
{
  version?: string,             // Default: "latest"
  language?: "es" | "en"        // Default: "es"
}
```

**Response**:
```typescript
// Success (200)
// Archivo Excel con plantilla OKR

// Errors
401: { error: "Authentication required" }
404: { error: "Template not found" }
500: { error: "Failed to generate template" }
```

---

### GET /api/upload/okr-file/history
**Descripción**: Obtiene historial de uploads OKR

**Query Parameters**:
```typescript
{
  days?: number,                // Default: 30
  status?: string,
  user_id?: string
}
```

**Response**:
```typescript
// Success (200)
{
  history: Array<{
    id: string,
    filename: string,
    uploaded_by: string,
    uploaded_at: string,
    status: string,
    records_processed: number,
    success_rate: number
  }>,
  statistics: {
    total_uploads: number,
    successful: number,
    failed: number,
    average_processing_time: number
  }
}

// Errors
401: { error: "Authentication required" }
500: { error: "Failed to fetch history" }
```

---

### GET /api/upload/okr-file/stats
**Descripción**: Obtiene estadísticas de uploads OKR

**Response**:
```typescript
// Success (200)
{
  current_month: {
    uploads: number,
    records_imported: number,
    success_rate: number
  },
  by_area: Record<string, {
    uploads: number,
    records: number
  }>,
  by_user: Record<string, {
    uploads: number,
    last_upload: string
  }>,
  trends: Array<{
    month: string,
    uploads: number,
    records: number
  }>
}

// Errors
401: { error: "Authentication required" }
500: { error: "Failed to fetch statistics" }
```

---

### POST /api/upload/okr-multi-area
**Descripción**: Sube OKRs para múltiples áreas simultáneamente

**Request Body** (FormData):
```typescript
{
  file: File,
  quarter: string,
  area_mapping: {               // Mapeo de hojas a áreas
    [sheetName: string]: string  // area_id
  }
}
```

**Response**:
```typescript
// Success (201)
{
  uploads: Array<{
    area_id: string,
    area_name: string,
    status: "success" | "failed",
    records_imported?: number,
    errors?: string[]
  }>,
  summary: {
    total_areas: number,
    successful: number,
    failed: number,
    total_records: number
  }
}

// Errors
400: { error: "Invalid area mapping" }
401: { error: "Authentication required" }
403: { error: "Insufficient permissions for multi-area upload" }
500: { error: "Multi-area upload failed" }
```

---

*Última actualización: Enero 2025*