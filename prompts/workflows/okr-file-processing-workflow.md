<task name="OKR File Processing Workflow">

<task_objective>
Implement a secure, multi-tenant OKR file upload and processing pipeline that accepts CSV/XLSX files containing objectives, initiatives, and activities. The system uses Google Cloud Storage (GCS) signed URLs for secure uploads with tenant-scoped metadata, processes files server-side with validation and upserts to the database, maintains RLS compliance, and provides comprehensive job tracking and history APIs for UI consumption.
</task_objective>

<detailed_sequence_steps>
# OKR File Processing Implementation - Detailed Sequence of Steps

## 1. Environment Setup, Bucket CORS and GCS Authentication

Tooling availability
- Supabase CLI is available (`supabase ...`) for local migrations and DB workflows (per project docs).
- Google Cloud SDK is available (`gcloud`, `gsutil`) for bucket/CORS/lifecycle operations.
- Provide credentials via environment (GCP_SERVICE_ACCOUNT_JSON_BASE64 or GOOGLE_APPLICATION_CREDENTIALS). Never commit secrets.

1. Use the `Read` tool to check `docs/deployment/environment.md` for existing environment variable documentation.

2. Use the `Bash` tool to verify the following environment variables are set:
   - `GCP_PROJECT_ID`
   - `GCS_BUCKET_NAME`
   - `GCP_SERVICE_ACCOUNT_JSON_BASE64` or `GOOGLE_APPLICATION_CREDENTIALS`
   - `GCS_SIGNED_URL_TTL_SECONDS` (optional, defaults to 1800)
   - `MAX_UPLOAD_SIZE_MB` (optional, defaults to 50)

3. Configure GCS CORS for browser uploads (origins = your app domains). Create `cors.json`:
   ```json
   [
     {
       "origin": ["http://localhost:3000", "https://yourapp.vercel.app"],
       "method": ["POST"],
       "responseHeader": ["Content-Type", "x-goog-meta-tenant-id", "x-goog-meta-user-id", "x-goog-meta-area-id", "x-goog-meta-checksum", "x-goog-meta-source"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
   Apply CORS:
   ```bash
   gsutil cors set cors.json gs://${GCS_BUCKET_NAME}
   ```

4. (Optional) Create a logical prefix for uploads (GCS is flat):
   ```bash
   gsutil ls -p ${GCP_PROJECT_ID} gs://${GCS_BUCKET_NAME} || echo "Bucket reachable"
   ```

5. Document any missing environment variables in `docs/deployment/environment.md`.

## 2. Database Schema and RLS Setup

1. Use the `Write` tool to create a new migration file `supabase/migrations/[timestamp]_create_okr_import_tables.sql` with:
   ```sql
   -- Create enum for import job status
   CREATE TYPE import_job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'partial');
   
   -- Create enum for import item status
   CREATE TYPE import_item_status AS ENUM ('pending', 'success', 'error', 'skipped');
   
   -- Create enum for entity types
   CREATE TYPE import_entity_type AS ENUM ('objective', 'initiative', 'activity');
   
   -- Main job tracking table
   CREATE TABLE public.okr_import_jobs (
     id uuid NOT NULL DEFAULT gen_random_uuid(),
     tenant_id uuid NOT NULL,
     user_id uuid NOT NULL,
     area_id uuid,
     object_path text NOT NULL,
     original_filename text NOT NULL,
     file_checksum text NOT NULL,
     file_size_bytes bigint,
     content_type text,
     status import_job_status DEFAULT 'pending',
     total_rows integer DEFAULT 0,
     processed_rows integer DEFAULT 0,
     success_rows integer DEFAULT 0,
     error_rows integer DEFAULT 0,
     job_metadata jsonb DEFAULT '{}',
     error_summary text,
     started_at timestamp with time zone,
     completed_at timestamp with time zone,
     created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
     updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT okr_import_jobs_pkey PRIMARY KEY (id),
     CONSTRAINT okr_import_jobs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
     CONSTRAINT okr_import_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
     CONSTRAINT okr_import_jobs_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id)
   );
   
   -- Per-row processing results
   CREATE TABLE public.okr_import_job_items (
     id uuid NOT NULL DEFAULT gen_random_uuid(),
     job_id uuid NOT NULL,
     row_number integer NOT NULL,
     entity_type import_entity_type NOT NULL,
     entity_key text NOT NULL,
     entity_id uuid,
     action text CHECK (action IN ('create', 'update', 'skip')),
     status import_item_status DEFAULT 'pending',
     error_message text,
     row_data jsonb,
     processed_at timestamp with time zone,
     created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT okr_import_job_items_pkey PRIMARY KEY (id),
     CONSTRAINT okr_import_job_items_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.okr_import_jobs(id) ON DELETE CASCADE
   );
   
   -- Create indexes for performance
   CREATE INDEX idx_okr_import_jobs_tenant_status ON public.okr_import_jobs(tenant_id, status);
   CREATE INDEX idx_okr_import_jobs_user ON public.okr_import_jobs(user_id);
   CREATE INDEX idx_okr_import_jobs_checksum ON public.okr_import_jobs(file_checksum);
   CREATE INDEX idx_okr_import_job_items_job ON public.okr_import_job_items(job_id);
   CREATE INDEX idx_okr_import_job_items_entity ON public.okr_import_job_items(entity_type, entity_key);
   ```

2. Use the `Write` tool to create RLS policies migration `supabase/migrations/[timestamp]_okr_import_rls_policies.sql`:
   ```sql
   -- Enable RLS
   ALTER TABLE public.okr_import_jobs ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.okr_import_job_items ENABLE ROW LEVEL SECURITY;
   
   -- Policies for okr_import_jobs
   CREATE POLICY "Users can view their tenant's import jobs"
     ON public.okr_import_jobs FOR SELECT
     TO authenticated
     USING (tenant_id IN (
       SELECT tenant_id FROM public.user_profiles 
       WHERE user_id = auth.uid()
     ));
   
   CREATE POLICY "Users can create import jobs for their tenant"
     ON public.okr_import_jobs FOR INSERT
     TO authenticated
     WITH CHECK (tenant_id IN (
       SELECT tenant_id FROM public.user_profiles 
       WHERE user_id = auth.uid()
     ));
   
   -- Policies for okr_import_job_items (inherit from parent job)
   CREATE POLICY "Users can view items for their tenant's jobs"
     ON public.okr_import_job_items FOR SELECT
     TO authenticated
     USING (job_id IN (
       SELECT id FROM public.okr_import_jobs
       WHERE tenant_id IN (
         SELECT tenant_id FROM public.user_profiles 
         WHERE user_id = auth.uid()
       )
     ));
   ```

3. Use the `Bash` tool to apply migrations:
   ```bash
   pnpm supabase db push
   ```

## 3. GCS Integration Layer (Signed POST Policy V4)

Standardize on GCS Signed POST Policy v4 (HTML form POST). This avoids mixing PUT/resumable flows. For >50MB in future, we can switch to resumable sessions without changing API shapes.

1. Use the `Write` tool to create `utils/gcs.ts`:
   ```typescript
   import { Storage } from '@google-cloud/storage';

   export interface GCSMetadata {
     tenant_id: string;
     user_id: string;
     area_id?: string;
     filename: string;
     checksum: string;
     content_type: string;
     session_id: string;
     source: 'web_upload' | 'api' | 'bot';
   }

   function getCredentials() {
     if (process.env.GCP_SERVICE_ACCOUNT_JSON_BASE64) {
       const json = Buffer.from(process.env.GCP_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf8');
       return JSON.parse(json);
     }
     return undefined; // fallback to GOOGLE_APPLICATION_CREDENTIALS or default
   }

   export function getGCSClient(): Storage {
     const creds = getCredentials();
     return new Storage({
       projectId: process.env.GCP_PROJECT_ID,
       ...(creds ? { credentials: creds } : {}),
     });
   }

   export function buildObjectKey(params: {
     tenantId: string;
     userId: string;
     timestamp: number;
     checksum: string;
     filename: string;
   }): string {
     const date = new Date(params.timestamp);
     const yyyy = date.getFullYear();
     const mm = String(date.getMonth() + 1).padStart(2, '0');
     const dd = String(date.getDate()).padStart(2, '0');
     const sanitizedFilename = params.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
     return `okr-uploads/${params.tenantId}/${yyyy}/${mm}/${dd}/${params.userId}/${params.timestamp}-${params.checksum}-${sanitizedFilename}`;
   }

   export async function generateSignedPostPolicy(params: {
     objectKey: string;
     contentType: string;
     metadata: GCSMetadata;
   }): Promise<{ url: string; fields: Record<string, string> } > {
     const storage = getGCSClient();
     const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);
     const file = bucket.file(params.objectKey);
     const maxSize = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50') * 1024 * 1024;
     const ttlMs = parseInt(process.env.GCS_SIGNED_URL_TTL_SECONDS || '1800') * 1000;

     const [policy] = await file.generateSignedPostPolicyV4({
       expires: Date.now() + ttlMs,
       conditions: [
         ['content-length-range', 0, maxSize],
         ['eq', '$Content-Type', params.contentType],
       ],
       fields: {
         'Content-Type': params.contentType,
         'x-goog-meta-tenant-id': params.metadata.tenant_id,
         'x-goog-meta-user-id': params.metadata.user_id,
         'x-goog-meta-area-id': params.metadata.area_id || '',
         'x-goog-meta-filename': params.metadata.filename,
         'x-goog-meta-checksum': params.metadata.checksum,
         'x-goog-meta-source': params.metadata.source,
         'x-goog-meta-session-id': params.metadata.session_id,
       },
     });

     return { url: policy.url, fields: policy.fields };
   }

   export async function getObjectHead(objectKey: string) {
     const storage = getGCSClient();
     const [metadata] = await storage.bucket(process.env.GCS_BUCKET_NAME!).file(objectKey).getMetadata();
     return metadata; // includes size, contentType, metadata
   }
   ```

## 4. API Implementation - Upload Endpoints

1. Use the `Write` tool to create `app/api/upload/okr-file/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { createClient } from '@/utils/supabase/server';
   import { buildObjectKey, generateSignedPostPolicy } from '@/utils/gcs';
   import crypto from 'crypto';

   export async function POST(req: NextRequest) {
     const supabase = await createClient();
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

     const { data: profile } = await supabase
       .from('user_profiles')
       .select('id, tenant_id, area_id, role')
       .eq('user_id', user.id)
       .single();
     if (!profile) return NextResponse.json({ error: 'User profile not found' }, { status: 403 });

     const { filename, contentType, checksum, size } = await req.json();

     const allowed = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
     if (!allowed.includes(contentType)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });

     const maxSize = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50') * 1024 * 1024;
     if (size > maxSize) return NextResponse.json({ error: 'File too large' }, { status: 400 });

     const objectKey = buildObjectKey({
       tenantId: profile.tenant_id,
       userId: profile.id,
       timestamp: Date.now(),
       checksum,
       filename,
     });

     const { url, fields } = await generateSignedPostPolicy({
       objectKey,
       contentType,
       metadata: {
         tenant_id: profile.tenant_id,
         user_id: profile.id,
         area_id: profile.area_id,
         filename,
         checksum,
         content_type: contentType,
         session_id: crypto.randomUUID(),
         source: 'web_upload',
       },
     });

     return NextResponse.json({
       uploadUrl: url,
       fields,
       objectPath: objectKey,
       maxSizeMB: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50'),
     });
   }
   ```

2. Use the `Write` tool to create `app/api/upload/okr-file/notify/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { createClient } from '@/utils/supabase/server';
   import { getObjectHead } from '@/utils/gcs';

   function parseKeyParts(objectPath: string) {
     const name = objectPath.split('/').pop()!; // {timestamp}-{checksum}-{sanitized_filename}
     const [tsStr, checksum, ...rest] = name.split('-');
     const original_filename = rest.join('-');
     return { checksum, original_filename };
   }

   export async function POST(req: NextRequest) {
     const supabase = await createClient();
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

     const { data: profile } = await supabase
       .from('user_profiles')
       .select('id, tenant_id, area_id')
       .eq('user_id', user.id)
       .single();
     if (!profile) return NextResponse.json({ error: 'User profile not found' }, { status: 403 });

     const { objectPath } = await req.json();
     if (!objectPath) return NextResponse.json({ error: 'Missing objectPath' }, { status: 400 });

     const head = await getObjectHead(objectPath);
     const { checksum, original_filename } = parseKeyParts(objectPath);

     // Idempotency: check duplicate by checksum + tenant within time window (example simplistic)
     const { data: dup } = await supabase
       .from('okr_import_jobs')
       .select('id')
       .eq('tenant_id', profile.tenant_id)
       .eq('file_checksum', checksum)
       .order('created_at', { ascending: false })
       .limit(1)
       .maybeSingle();

     if (dup) {
       return NextResponse.json({ jobId: dup.id, status: 'duplicate' });
     }

     const { data: job, error } = await supabase
       .from('okr_import_jobs')
       .insert({
         tenant_id: profile.tenant_id,
         user_id: profile.id,
         area_id: profile.area_id,
         object_path: objectPath,
         original_filename,
         file_checksum: checksum,
         file_size_bytes: parseInt(head.size || '0'),
         content_type: head.contentType || null,
         status: 'pending',
       })
       .select()
       .single();

     if (error || !job) return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });

     // Trigger processing asynchronously (implementation wired in Stage 1 service)
     // processOKRImportJob(job.id).catch(console.error);

     return NextResponse.json({ jobId: job.id, status: 'pending' });
   }
   ```

## 5. File Processing Service

1. Use the `Write` tool to create `services/okrImportProcessor.ts`:
   ```typescript
   import { createClient } from '@/utils/supabase/server';
   import { getGCSClient } from '@/utils/gcs';
   import * as XLSX from 'xlsx';
   import { parse } from 'csv-parse/sync';

   export async function processOKRImportJob(jobId: string) {
     const supabase = await createClient();
     await supabase.from('okr_import_jobs').update({ status: 'processing', started_at: new Date() }).eq('id', jobId);

     try {
       const { data: job } = await supabase.from('okr_import_jobs').select('*').eq('id', jobId).single();
       const storage = getGCSClient();
       const [buffer] = await storage.bucket(process.env.GCS_BUCKET_NAME!).file(job.object_path).download();

       const contentType = job.content_type || 'application/octet-stream';
       let rows: any[] = [];
       if (contentType === 'text/csv') {
         rows = parse(buffer, { columns: true, skip_empty_lines: true });
       } else {
         const workbook = XLSX.read(buffer);
         const sheet = workbook.Sheets['OKR_Bulk'] || workbook.Sheets[workbook.SheetNames[0]];
         rows = XLSX.utils.sheet_to_json(sheet);
       }

       let successCount = 0, errorCount = 0;
       for (let i = 0; i < rows.length; i++) {
         const row = rows[i];
         try {
           await processRow(row, job, i + 1);
           successCount++;
         } catch (e: any) {
           errorCount++;
           await recordRowError(jobId, i + 1, e.message || 'Unknown error', row);
         }
       }

       await supabase.from('okr_import_jobs').update({
         status: errorCount === 0 ? 'completed' : 'partial',
         total_rows: rows.length,
         processed_rows: rows.length,
         success_rows: successCount,
         error_rows: errorCount,
         completed_at: new Date(),
       }).eq('id', jobId);
     } catch (e: any) {
       await supabase.from('okr_import_jobs').update({
         status: 'failed', error_summary: e.message || 'Processing failed', completed_at: new Date(),
       }).eq('id', jobId);
     }
   }

   async function processRow(row: any, job: any, rowNumber: number) {
     // TODO: implement domain upserts (use existing services/hooks). Placeholders:
     // await upsertObjective(...); await upsertInitiative(...); await upsertActivity(...);
     // Record success example:
     // await recordRowSuccess(job.id, rowNumber, 'objective', row.objective_key, objective.id);
   }

   async function recordRowError(jobId: string, rowNumber: number, message: string, row: any) {
     const supabase = await createClient();
     await supabase.from('okr_import_job_items').insert({
       job_id: jobId,
       row_number: rowNumber,
       entity_type: 'objective',
       entity_key: row?.objective_key || 'unknown',
       status: 'error',
       error_message: message,
       row_data: row,
       processed_at: new Date(),
     });
   }
   ```

## 6. Client Component Update (Form POST)

1. Use the `Edit` tool to update `components/OKRFileUpload.tsx`:
   - Validar tipo y tamaño
   - Calcular SHA256 client-side
   - Pedir `uploadUrl` y `fields` a `/api/upload/okr-file`
   - Construir un `FormData()` con todos los `fields` devueltos + `file` (como último campo)
   - Hacer `fetch(uploadUrl, { method: 'POST', body: formData })`
   - Llamar `/api/upload/okr-file/notify` con `objectPath` en éxito
   - Mostrar progreso y errores

## 7. Status and History Endpoints (Auth + RLS)

1. Use the `Write` tool to create `app/api/upload/okr-file/jobs/[id]/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { createClient } from '@/utils/supabase/server';

   export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
     const supabase = await createClient();
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

     const { data: job } = await supabase
       .from('okr_import_jobs')
       .select('*, items:okr_import_job_items(*)')
       .eq('id', params.id)
       .single();
     if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
     return NextResponse.json(job);
   }
   ```

2. Use the `Write` tool to create `app/api/upload/okr-file/history/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { createClient } from '@/utils/supabase/server';

   export async function GET(req: NextRequest) {
     const supabase = await createClient();
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

     const { searchParams } = new URL(req.url);
     const limit = parseInt(searchParams.get('limit') || '10');
     const offset = parseInt(searchParams.get('offset') || '0');

     const { data: jobs } = await supabase
       .from('okr_import_jobs')
       .select('*')
       .order('created_at', { ascending: false })
       .range(offset, offset + limit - 1);

     return NextResponse.json({ jobs, total: jobs?.length || 0 });
   }
   ```

3. Use the `Write` tool to create `app/api/upload/okr-file/stats/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { createClient } from '@/utils/supabase/server';

   export async function GET(_req: NextRequest) {
     const supabase = await createClient();
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

     const { data } = await supabase.from('okr_import_jobs').select('status');
     const counts: Record<string, number> = {};
     (data || []).forEach((j: any) => { counts[j.status] = (counts[j.status] || 0) + 1; });
     return NextResponse.json({ total: data?.length || 0, byStatus: counts });
   }
   ```

## 8. Health Check Extension and Post-Upload Verification

1. Use the `Edit` tool to update `app/api/health/route.ts`:
   - Add GCS connectivity check (list bucket metadata)
   - Verify bucket exists and is accessible
   - Return status in health response

2. Post-upload verification step (server): Fetch object head and validate `size`, `contentType` and metadata before encolar el job.

## 9. Bucket Lifecycle, Labels and Documentation

1. Add bucket lifecycle rule suggestion (doc only): expire objects under `okr-uploads/*` older than N days.
2. Suggest adding labels (tenant, env) for cost and observability.
3. Provide request/response examples for both endpoints in the doc `docs/data-import/okr-file-processing-and-bot-integration.md`.

## 10. Testing and Verification

1. Use the `Bash` tool to run lint and build:
   ```bash
   pnpm lint && pnpm build
   ```
2. Create a test CSV/XLSX and run manual flow end-to-end.
3. Update docs with any nuances found.

</detailed_sequence_steps>

</task>