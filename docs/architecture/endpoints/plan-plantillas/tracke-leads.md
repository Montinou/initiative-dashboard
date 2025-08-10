# Tracker de Leads — Refactorización de Endpoints API

Objetivo: centralizar el seguimiento de las remediaciones de endpoints (T1–T10) definidas en el plan, asegurar consistencia técnica, guardas de costos y cierre con QA.

## Definición de "lead"
- Hallazgo o micro‑tarea concreta por endpoint (o aspecto transversal) necesaria para cumplir el plan.

## Campos por lead
- ID, Endpoint/Componente, Descripción, Prioridad, Impacto, Estado, Responsable, Inicio, ETA, PR, Evidencia/Notas

Estados: backlog | in-progress | pr-open | qa | done | blocked

## Checklist por lead (calidad mínima)
- [ ] Auth con `supabase.auth.getUser()` y 401 en ausencia
- [ ] Perfil por `user_id` en `user_profiles`
- [ ] Filtro por `tenant_id` (+ `area_id` para Managers) y RLS activa
- [ ] Roles canónicos (CEO/Admin/Manager) y `hasPermission`
- [ ] Validación `zod` (query/body) y tipos
- [ ] Selecciones sólo de columnas existentes según esquema
- [ ] Errores/JSON consistentes y códigos HTTP correctos
- [ ] Pruebas (unit/integration/e2e) actualizadas
- [ ] Docs actualizadas (endpoint y arquitectura)

## Leads iniciales (según PLAN_TASK_ENDPOINTS.xml)

| ID | Endpoint/Componente | Descripción corta | Prioridad | Estado | Responsable | PR |
|----|----------------------|-------------------|-----------|--------|-------------|----|
| T1 | app/api/analytics/route.ts | Scoping activities, quitar campos inexistentes | high | backlog | — | — |
| T2 | app/api/analytics/trends/route.ts | Guardar/retirar campos no migrados | high | backlog | — | — |
| T3 | app/api/dashboard/overview/route.ts | Scope activities via initiatives/tenant | high | backlog | — | — |
| T4 | app/api/objectives/route.ts | Usar `objective_initiatives`, roles | high | backlog | — | — |
| T5 | app/api/quarters/route.ts | Perfil por `user_id`, evitar `objective_id` directo | high | backlog | — | — |
| T6 | app/api/progress-tracking/route.ts | Migrar a `progress_history` | high | backlog | — | — |
| T7 | app/api/org-admin/users/route.ts | `getUserProfile`, `area_id`, zod | high | backlog | — | — |
| T8 | app/api/stratix/chat/route.ts | Limitar selects y usar vistas RLS | high | backlog | — | — |
| T9 | app/api/sync/bigquery/route.ts | Mapping oficial y campos opcionales | high | backlog | — | — |
| T10 | lib/server-user-profile.ts | Cache Redis snapshot de perfil + invalidación | medium | backlog | — | — |

## Guardas de economía
- Reducir lecturas DB: filtros por tenant/área, selects mínimos.
- SWR: dedupe/cache; ajustar revalidateOnFocus en listas pesadas.
- Redis (T10): TTL 60–300s, objetivo hit‑rate ≥ 70%, sin PII ni tokens.
- BigQuery: lotes y sólo campos necesarios; backoff en reintentos.

## Flujo de trabajo
1) Crear/actualizar lead en esta tabla y abrir issue/PR
2) Aplicar template: `docs/architecture/endpoints/plan-plantillas/ENDPOINT_TEMPLATE.md`
3) Alinear con plan: `docs/architecture/endpoints/plan-plantillas/PLAN_TASK_ENDPOINTS.xml`
4) Pasar checklist; adjuntar evidencias (queries, capturas, pruebas)
5) QA multi‑tenant y roles; marcar done

## Referencias
- Plan: `docs/architecture/endpoints/PLAN_REMEDIACION_ENDPOINTS_2025-08-09.md`
- Template: `docs/architecture/endpoints/plan-plantillas/ENDPOINT_TEMPLATE.md`
- Tasks XML: `docs/architecture/endpoints/plan-plantillas/PLAN_TASK_ENDPOINTS.xml`
