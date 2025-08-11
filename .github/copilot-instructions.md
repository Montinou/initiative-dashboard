# Copilot Instructions for initiative-dashboard

Use these project-specific rules to be productive immediately. Follow the referenced patterns and files exactly.

## Architecture and Auth
- Stack: Next.js 15 App Router (TypeScript), React 19, Supabase (Postgres + RLS), multi-tenant OKR app.
- Supabase clients:
  - Browser: `utils/supabase/client.ts` (createBrowserClient)
  - Server (SSR/API): `utils/supabase/server.ts` (createServerClient + cookie bridge)
  - Admin (service role, server-only): `utils/supabase/admin.ts`
- Session enforcement: `middleware.ts` → `utils/supabase/middleware.ts` protects app routes, adds security headers, and redirects unauthenticated users.
- App providers: `app/providers.tsx` wires `AuthProvider`, `TenantProvider`, theming, and SWR config.

## Core Conventions
- Always scope backend data via Supabase RLS; never bypass except with `admin` client on server jobs.
- API route pattern (`app/api/*/route.ts`):
  1) `const supabase = await createClient()` (server client)
  2) `const { data: { user } } = await supabase.auth.getUser()`
  3) Fetch `user_profiles` and enforce role/tenant
  4) Query data (RLS applies) and return JSON
  See examples in dashboard/profile APIs and `CLAUDE.md` “API Layer Pattern”.
- Client data fetching uses SWR (see `lib/swr-config`, hooks under `/hooks`). Prefer hooks over ad‑hoc fetches.
- Auth context: `lib/auth-context.tsx` exposes `{ user, session, profile, tenantId, hasPermission }`. Use `useAuth()` and helpers (`useTenantId`, `useAreaDataFilter`) in components.
- File uploads and internal API calls that require auth must send `Authorization: Bearer ${session.access_token}` (see `components/file-upload.tsx`).

## AI (Stratix) Integration
- Endpoints: unauth test → `app/api/stratix/chat/test/route.ts`; authenticated/data-enriched → `app/api/stratix/chat/route.ts`.
- UI: components in `components/stratix/` and page `app/stratix-assistant/`. Custom hook `hooks/useGeminiAssistant.ts` defaults to test endpoint.
- Use authenticated AI by passing `endpoint: '/api/stratix/chat'` to the hook (see updated `components/stratix/dashboard-ai-widget-gemini.tsx`).

## Multi‑Tenant & RBAC
- Tenancy via `tenant_id` on records; RLS enforces isolation. Derive tenant with `useTenantId()` or `profile.tenant_id`.
- Role/area checks via `lib/role-permissions` and helpers in `auth-context`. Managers are area-scoped; CEOs/Admins are broader.

## Developer Workflows
- Dev/build/test (see `package.json`, `CLAUDE.md`):
  - `pnpm dev | build | start | lint`
  - Tests: `pnpm test`, `test:unit`, `test:integration`, `test:e2e` (Playwright). E2E docs in `automation/README.md`.
- Database: migrations under `supabase/migrations/`. Seed with `pnpm db:seed` (requires `SUPABASE_SERVICE_ROLE_KEY`). Don’t skip migration order.
- Docs: `docs/README.md` indexes architecture, schema, API, deployment.

## CLI Tooling Availability
- Supabase CLI is available (`supabase ...`). Use it for local migrations and DB workflows where documented.
- Google Cloud SDK is available (`gcloud`, `gsutil`). Use it for bucket/CORS/lifecycle operations as per docs.
- Credentials must be provided via environment (service account/ADC); never commit secrets.

## Gotchas
- Middleware protects app pages by default, but some `api/*` routes may need explicit auth checks; validate `auth.getUser()` in each handler and return 401 when missing.
- Use the correct Supabase client per context (browser vs server). Don’t import the admin client in client code.
- Keep queries RLS-compliant; add tenant/area filters in UI for UX, but rely on RLS for security.
- For Stratix, ensure components use the authenticated endpoint when you need data-aware answers.

## Examples
- Auth sign-out and redirect: `components/profile-dropdown.tsx`, manager layout/header files.
- Real-time patterns and subscriptions: see manager feeds in `components/manager/ManagerActivityFeed.tsx`.
- Dashboard data patterns and filters: `components/dashboard/*`, hooks reference tenant/area helpers.

## Dashboard API Endpoints (real usage)
- Profile: `GET /api/profile/user` → loads `user_profiles` with tenant/area; used across dashboard.
- Analytics:
  - `GET /api/analytics` (overview counts by tenant)
  - `GET /api/analytics/kpi` and `GET /api/analytics/trends`
- Initiatives & Activities:
  - `GET /api/initiatives`, `POST /api/activities`
  - Manager dashboard summary: `GET /api/manager-dashboard?areaId=...`
- Files & OKR import:
  - `POST /api/files/upload`, `GET /api/files`, `GET /api/files/[id]/download`
  - OKR upload flow: `POST /api/upload/okr-file`, `GET /api/upload/okr-file/history`, `GET /api/upload/okr-file/stats`, `GET /api/upload/okr-file/template`
- Org Admin:
  - `GET /api/org-admin/stats`, `GET /api/org-admin/users`, `POST /api/org-admin/invitations`
- AI Stratix:
  - Test: `POST /api/stratix/chat/test`
  - Auth data-enriched: `POST /api/stratix/chat`

All handlers follow: server `createClient()` → `auth.getUser()` → fetch profile → RLS-scoped queries → JSON. See `CLAUDE.md` and the route files above for concrete patterns and error shapes.

## SSR hydration for AuthProvider (initialSession)
To avoid client auth flicker, hydrate `AuthProvider` with server-fetched session/profile.

- Server fetch in a layout or page (App Router):
  - Use `utils/supabase/server.ts`:
    - `const supabase = await createClient()`
    - `const { data: { user }, error } = await supabase.auth.getUser()`
    - If `user`, fetch profile from `user_profiles` by `user.id`.
- Pass down via Providers:
  - Update `app/providers.tsx` to accept `initialSession` and `initialProfile` props and forward to `AuthProvider` (already supported by `AuthProvider` signature).
  - In `app/layout.tsx`, after fetching, render:
    - `<Providers initialTenantId={tenantId} /* also pass initialSession/profile when available */>`

Notes:
- Keep all server auth calls in RSC using the server client; never import admin client in client code.
- Middleware already refreshes cookies; keep `updateSession` early in the request chain.
