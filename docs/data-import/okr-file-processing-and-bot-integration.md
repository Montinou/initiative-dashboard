# OKR File Processing and Bot Integration

This plan details the end-to-end implementation for server-side OKR file processing stored in Cloud Storage, and a later phase where the Dialogflow CX bot can front the same process. Processing is always done on the backend. Files are uploaded with required metadata and stored in a GCS bucket.

Guiding rules
- All data writes pass Supabase RLS checks or use server-side admin client only in trusted server routes/jobs.
- Client never parses files. It only uploads to a signed URL with metadata; server processes and writes results.
- Multi-tenant and RBAC are enforced at every step. Object metadata mirrors tenant_id, user_id, and area scope.

Related code areas
- Supabase clients: `utils/supabase/{client,server,admin}.ts`
- Middleware and providers: `middleware.ts`, `app/providers.tsx`
- Upload endpoints: `app/api/upload/okr-file/*`
- Existing components: `components/OKRFileUpload*.tsx`
- Bot endpoint(s): `app/api/stratix/chat` (authenticated), `app/api/stratix/chat/test` (unauth)

Environment prerequisites
- See `docs/deployment/environment.md` for DF and GCS variables. Required: `GCP_PROJECT_ID`, `GCS_BUCKET_NAME`, service account credentials.

---

Stage 1 — Backend OKR File Processing (no bot) ✅ IMPLEMENTED

Goal: Implement robust, server-only processing of uploaded OKR files. The UI uploads files; the server stores them in GCS with metadata and kicks off processing, persisting results into Postgres.

1) API surface (✅ Implemented)
- POST `/api/upload/okr-file/signed-url` — Initialize upload, returns a signed URL and required object metadata keys to set.
- POST `/api/upload/okr-file/notify` — Triggers processing after successful upload.
- GET `/api/upload/okr-file/jobs/[id]` — Get job status and details.
- GET `/api/upload/okr-file/history` — List past uploads for the current user/tenant (RLS scoped).
- GET `/api/upload/okr-file/stats` — Aggregated stats (processed, failed, by area).
- GET `/api/health` — Health check including GCS connectivity.

2) Upload flow
- Client requests POST `/api/upload/okr-file` with filename, size, checksum (sha256), and contentType.
- Server validates auth, infers tenant_id, user_id, optional area_id.
- Server creates an object key:
  `okr-uploads/{tenant_id}/{yyyy}/{mm}/{dd}/{user_id}/{timestamp}-{checksum}-{sanitized_filename}`
- Server generates a resumable signed URL (or v4 signed PUT) and returns:
  - uploadUrl
  - requiredMetadata: { tenant_id, user_id, area_id?, filename, checksum, contentType, session_id }
  - objectPath
  - maxSizeMB
- Client uploads directly to GCS using the signed URL, setting all metadata.

3) Processing trigger
- Preferred: A lightweight POST `/api/upload/okr-file/notify` from client after successful upload with `objectPath`.
- Alternative: Cloud Storage notification (Pub/Sub) to trigger a background job endpoint `/api/jobs/okr-import`.
- The processing job must:
  - Read object and metadata
  - Parse file (CSV/XLSX)
  - Validate rows and map to DB shape
  - Upsert objectives, key results, initiatives, and activities adhering to RLS/tenant scoping
  - Record per-row results (inserted/updated/skipped/errors) into a `okr_import_jobs` table with `okr_import_job_items` details
  - Emit activity events for dashboards

4) Data model additions
- `okr_import_jobs` (id, tenant_id, user_id, area_id?, object_path, status, totals, started_at, finished_at, error)
- `okr_import_job_items` (job_id, row_index, entity_type, entity_id?, status, error, raw_payload JSONB)
- Ensure RLS: rows visible only to same tenant and to scoped managers.

5) Error handling and idempotency
- Use `checksum` + `objectPath` to dedupe re-uploads.
- If a job exists for same `checksum` and `tenant_id` within a window, mark as duplicate and link to existing job.
- Every validation error is captured in `job_items` with actionable messages.

6) Observability
- Log structured events with correlationId = job.id.
- Add `/api/upload/okr-file/jobs/[id]` for job status polling.
- Include health checks in `/api/health` (gcs reachable, bucket exists).

7) Security and limits
- Enforce `MAX_UPLOAD_SIZE_MB` server-side when issuing signed URLs.
- Only accept whitelisted content types (text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet).
- Metadata is required; reject uploads without tenant/user metadata on processing.

8) UI changes
- `components/OKRFileUpload.tsx` should request the signed URL, upload with metadata, then POST notify.
- `components/OKRFileUploadHistory.tsx` lists `okr_import_jobs` with filters by status/date/area.
- `components/okr-dashboard.tsx` surfaces import stats and recent results.

Deliverables for Stage 1
- API routes implemented with server Supabase client and RLS-safe queries.
- GCS signed upload and processing job endpoint(s).
- New tables and migrations for job tracking.
- Updated upload components and history screens.
- Docs updated (this document, environment).

---

Stage 2 — Dialogflow CX Bot Integration

Goal: Allow the bot to initiate the same server processing pipeline. The bot collects the file or references an already uploaded file, then calls an authenticated backend endpoint that enqueues a job identical to Stage 1.

1) Bot interaction patterns
- Option A (User uploads via app UI; bot monitors): Bot asks user to upload file in the dashboard; once uploaded, the bot can query job status by `objectPath` or latest job.
- Option B (Direct bot upload link): Backend issues a short-lived signed upload URL on demand to the bot via External Tool. The web messenger then uses a secure handoff to the browser to upload (still client → GCS, not bot server). Processing remains in backend.

2) Dialogflow CX configuration
- BigQuery Tool remains read-only (analytics, checks).
- External Tool/Webhook handles write actions:
  - `createOkrImportJob` → returns signed upload URL and metadata.
  - `notifyUploadComplete` → enqueues processing for `objectPath`.
  - `getOkrImportJobStatus` → report job state and summary.
- Payload schema: always JSON with `{ name, value }` for parameters; include `tenant_id`, `user_id`, `area_id` from session params.

3) Session mapping
- Ensure `/api/ai/session-map` returns `{ sessionId, params: { userId, tenantId, areaId, role } }` for the messenger to set as `session-params`.
- Allowed domains: configure exact hosts in DF CX Web integration.

4) Backend endpoints for bot
- POST `/api/ai/bot/okr-import/create` → authenticated; returns signed upload URL and metadata.
- POST `/api/ai/bot/okr-import/notify` → authenticated; triggers processing.
- GET `/api/ai/bot/okr-import/status?jobId=...` → authenticated; returns job status; RLS-scoped.

5) Security
- Require `Authorization: Bearer ${session.access_token}` on all bot → app API calls.
- Derive `tenant_id` and roles from profile; do not trust bot-provided values beyond session params.

6) UX and messaging
- Bot messages should summarize job outcomes with counts and link to the history page filtered by the job id.
- Provide retry instructions and a link to download per-row error CSV.

7) Testing (manual + later E2E)
- Manual: upload via UI, then ask bot for status.
- Verify RLS: bot can only see tenant data.

Deliverables for Stage 2
- Bot-intended authenticated API endpoints wired to Stage 1 processing functions.
- Dialogflow CX External Tool intents configured to call these endpoints.
- Session mapping confirmed; allowed domains configured.
- Dashboard links from bot messages.

---

Implementation checklists

Shared libs
- [x] GCS client wrapper with signed URL generation and metadata helpers (`utils/gcs.ts`)
- [x] File type sniffing and safe parsing utilities (CSV/XLSX) (`services/okrImportProcessor.ts`)
- [x] Common import validator and mapper to DB entities (`services/okrImportProcessor.ts`)
- [x] Service for creating and updating import jobs and items (`services/okrImportProcessor.ts`)

Stage 1 ✅ COMPLETE
- [x] POST /api/upload/okr-file/signed-url → returns signed URL and metadata
- [x] POST /api/upload/okr-file/notify → triggers processing
- [x] Job processor (`services/okrImportProcessor.ts`)
- [x] Tables + migrations: okr_import_jobs, okr_import_job_items
- [x] Update OKR upload component (`components/okr-upload/OKRFileUpload.tsx`)
- [x] Job status endpoint (`/api/upload/okr-file/jobs/[id]`)
- [x] History endpoint (`/api/upload/okr-file/history`)
- [x] Stats endpoint (`/api/upload/okr-file/stats`)
- [x] Health check with GCS (`/api/health`)

Stage 2
- [ ] POST /api/ai/bot/okr-import/create
- [ ] POST /api/ai/bot/okr-import/notify
- [ ] GET  /api/ai/bot/okr-import/status
- [ ] Dialogflow CX External Tool actions configured

Appendix A — Object metadata keys
- tenant_id
- user_id
- area_id (optional)
- filename
- checksum (sha256)
- content_type
- session_id
- source: "dashboard" | "bot"

Appendix B — Error schema (API responses)
```json
{
  "error": {
    "code": "VALIDATION_ERROR|AUTH_ERROR|NOT_FOUND|DUPLICATE|INTERNAL",
    "message": "Human readable",
    "details": { "field": "row", "index": 12 }
  }
}
```

Appendix C — RLS reminder
- All queries use server `createClient()` and respect tenant scopes.
- Admin client is allowed only in server jobs where necessary and safe.
