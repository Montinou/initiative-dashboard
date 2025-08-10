# Plan de Remediación de Endpoints API — Agosto 2025

Este documento consolida el análisis de los endpoints (`app/api/**/route.ts`) y define un plan de remediación para alinear código, esquema público de Postgres (Supabase), RLS multi‑tenant, e integraciones (BigQuery y Stratix/Vertex AI).

Última revisión: 2025‑08‑09

---

## 1) Patrón unificado para handlers API

Aplicar en todos los handlers (GET/POST/PUT/PATCH/DELETE):

1. Crear cliente de servidor
   - `const supabase = await createClient()` desde `utils/supabase/server.ts`.
2. Autenticación
   - `const { data: { user } } = await supabase.auth.getUser()`.
   - Si no hay `user`, retornar 401.
3. Perfil y tenant
   - Cargar `user_profiles` por `user_id = user.id`.
   - Derivar `tenant_id`, `role`, `area_id` según el perfil.
4. RLS y scoping de datos
   - Todas las consultas deben respetar RLS y filtrar por `tenant_id` (y por `area_id` si corresponde a Managers).
5. Autorización
   - Usar roles canónicos: `CEO`, `Admin`, `Manager`. Evitar "Executive".
6. Respuestas JSON consistentes
   - Estructuras de error claras: `{ error: string, details?: any }` y códigos HTTP precisos.

Notas:
- Para llamadas desde el navegador que requieren auth, enviar `Authorization: Bearer ${session.access_token}`.
- Nunca usar el cliente admin en código cliente; sólo en jobs/servidor.

---

## 2) Reglas de multi‑tenancy y RBAC

- Tenancy: `tenant_id` en todos los registros; RLS aísla datos por tenant.
- Managers: acceso acotado al/los `area_id` de su ámbito.
- CEOs/Admins: alcance de tenant completo (no cross‑tenant).
- Centralizar permisos en `lib/role-permissions` y `lib/auth-context`.

---

## 3) Esquema como fuente de verdad

- Relaciones objetivos ↔ iniciativas: usar la tabla de unión `objective_initiatives` (N:M). No asumir `initiatives.objective_id`.
- Historial de progreso: usar `progress_history` (evitar `initiative_progress_history` si no existe).
- Evitar seleccionar columnas inexistentes (p.ej., en algunas rutas se usaron `is_strategic`, `budget`, `actual_cost`, `target_date` en `initiatives`, o `status/progress/due_date` en `activities`). Confirmar migraciones antes de usar.
- Invitaciones: alinear estados con el enum real. Confirmar existencia de RPC `expire_old_invitations`.

Si se requieren columnas adicionales, agregar migraciones en `supabase/migrations/` y actualizar documentación.

---

## 4) Hallazgos por endpoint (resumen)

- Analytics
  - `/api/analytics`: corregir scoping de `activities` vía `initiatives` o filtro por `tenant_id`; eliminar variables no definidas y columnas inexistentes.
  - `/api/analytics/trends`: evitar campos no presentes en el esquema o introducir migración; documentar qué métricas son posibles hoy.
- Dashboard
  - `/api/dashboard/overview`: asegurar `activities` filtradas por tenant mediante join con `initiatives` o vista RLS.
  - `status-distribution` y `progress-distribution`: patrón correcto; mantener.
- Initiatives/Activities
  - `/api/initiatives`: mantener filtros por `tenant_id`; cuando se pidan objetivos, usar `objective_initiatives`.
  - `/api/activities`: RLS y progreso OK; verificar que los campos referenciados existan.
- Areas
  - `/api/areas`: uso correcto de `getUserProfile` (retorna `{ user, userProfile }`); ajustar donde se trató como perfil directo.
- Objectives
  - `/api/objectives`: GET no debe hacer `initiatives(*)` directo; usar la tabla de unión. Remplazar rol "Executive" por `CEO`.
- Profile
  - `/api/profile/user`: alineado; mantener.
- Org Admin
  - `/api/org-admin/users`: validar `getUserProfile` y usar `area_id` (no `area` string). Mantener zod schemas.
  - `/api/org-admin/areas`: correcto; conservar validaciones de manager.
  - `/api/org-admin/invitations`: estados y RPC a confirmar.
  - `/api/org-admin/stats`: alinear estados de invitación.
- Progress Tracking
  - `/api/progress-tracking`: usar `progress_history`; actualizar nombres de columnas según esquema real; rol `CEO/Admin/Manager`.
- Quarters
  - `/api/quarters`: leer perfil con `eq('user_id', user.id)`; evitar asumir `initiatives.objective_id`.
- Stratix (AI)
  - `/api/stratix/chat`: seleccionar sólo columnas reales; preferir vistas `manager_*` RLS; usar endpoint autenticado cuando se requiera contexto de datos.
- BigQuery
  - `/api/sync/bigquery`: mapear sólo columnas existentes o marcar opcionales. Documentar contrato de payload.

---

## 5) Acciones de remediación

1) Estándar de auth/perfil
- Sustituir patrones incorrectos por el flujo unificado (sección 1).

2) Limpieza de columnas inexistentes
- Quitar o proteger accesos a campos no migrados. Crear migraciones si son requeridos por negocio.

3) Relaciones objetivos‑iniciativas
- Reescribir consultas para usar `objective_initiatives`.

4) Roles y permisos
- Reemplazar "Executive" -> `CEO`. Unificar checks con `hasPermission` y helpers.

5) Invitaciones
- Confirmar enum/estados; ajustar endpoints y docs. Verificar RPC `expire_old_invitations`.

6) Stratix/AI
- Forzar uso del endpoint autenticado (`/api/stratix/chat`) cuando se requiera contexto; limitar selects a columnas reales; reutilizar vistas RLS.

7) BigQuery
- Definir mapping oficial y marcar campos opcionales. Si se necesitan nuevos campos, agregar migraciones y tipos.

---

## 6) Checklist por endpoint (prioridad alta)

- [ ] `/api/analytics`
- [ ] `/api/analytics/trends`
- [ ] `/api/dashboard/overview`
- [ ] `/api/objectives`
- [ ] `/api/quarters`
- [ ] `/api/progress-tracking`
- [ ] `/api/org-admin/users`
- [ ] `/api/stratix/chat`
- [ ] `/api/sync/bigquery`

---

## 7) Actualizaciones de documentación

- `docs/architecture/endpoints/*` (core, dashboard, admin, integrations, files):
  - Añadir patrón unificado de handler.
  - Aclarar scoping por tenant y RLS.
  - Normalizar roles (CEO/Admin/Manager).
  - Documentar relaciones via `objective_initiatives` y `progress_history`.
  - Especificar contrato de BigQuery y uso de vistas para Stratix.

---

## 8) Plan de pruebas

- Unit: validar helpers de filtrado por tenant/área y cálculo de métricas.
- Integración: rutas críticas con seeds por tenant (`pnpm test:integration`).
- E2E: flujos de dashboards/admin/upload (`pnpm test:e2e`).
- Verificar con usuarios de roles distintos y múltiples tenants.

---

## 9) Convenciones rápidas

- Siempre usar `getUserProfile()` y tomar `userProfile.tenant_id` como filtro base.
- En cliente, enviar `Authorization: Bearer ${session.access_token}` en llamadas internas que lo requieran.
- No usar el cliente admin fuera de procesos server‑only.
- Preferir hooks SWR para el cliente (ver `/hooks`).
