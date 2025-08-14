# Guía de manejo de issues por tecnología (Frontend)

Este documento estandariza cómo abordar los issues detectados según la tecnología usada en el proyecto. Aplica a Next.js 15 (App Router), React 19, Supabase (Postgres + RLS), SWR y Tailwind CSS, en un contexto multi‑tenant con RBAC.

Referencias base:
- Instrucciones del proyecto: `.github/copilot-instructions.md`
- Patrones API: `CLAUDE.md` y handlers en `app/api/**/*/route.ts`
- Proveedores y contexto: `app/providers.tsx`, `lib/auth-context.tsx`, `lib/tenant-context.tsx`
- Theming: `lib/theme-config.ts`, `components/dynamic-theme.tsx`, `components/theme-wrapper.tsx`
- Supabase utils: `utils/supabase/{client,server,admin,middleware}.ts`
- SWR config y hooks: `lib/swr-config`, `hooks/*`

---

## 1) Next.js (App Router) y SSR

Do:
- En RSC o rutas API, crear cliente server: `const supabase = await createClient()` desde `utils/supabase/server.ts`.
- Validar sesión en cada API: `auth.getUser()`, cargar `user_profiles`, chequear rol/tenant y responder 401/403 cuando aplique.
- Hidratar `AuthProvider` con `initialSession` y `initialProfile` desde layout/página servidor. Ver `app/layout.tsx` y `app/providers.tsx`.
- Mantener pública vs protegida vía `middleware.ts` (`utils/supabase/middleware.ts`).

Don’t:
- No usar el cliente admin en componentes cliente o RSC.
- No confiar sólo en redirecciones del cliente para proteger rutas.

Patrón Handler (resumen):
1) `createClient()`
2) `auth.getUser()`
3) cargar perfil y validar permisos/tenant
4) querys con RLS y `tenant_id`
5) JSON con shape consistente `{ data, error?: { code, message }, details? }`

---

## 2) Supabase (Auth, RLS y clientes)

Do:
- Clientes según contexto:
  - Browser: `utils/supabase/client.ts`
  - Server (SSR/API): `utils/supabase/server.ts`
  - Admin (sólo jobs server): `utils/supabase/admin.ts`
- Respetar RLS siempre. Filtrar por `tenant_id` en UI, pero confiar en RLS para seguridad.
- Llamadas internas desde el browser a API autenticadas deben enviar `Authorization: Bearer ${session.access_token}`. Ej.: `components/file-upload.tsx`, `components/OKRFileUpload.tsx`.
- Centralizar `onAuthStateChange` y `signOut` en `AuthProvider` (usar `useAuth().signOut()`).

Don’t:
- No duplicar ownership de sesión/perfil en múltiples providers. Preferir `AuthProvider` + hooks de `lib/auth-context.tsx`.
- No llamar `supabase.auth.signOut()` directo desde componentes UI; usar el método del provider.

Checks de issue típicos:
- 401/403 ausentes → agregar validación `auth.getUser()` y verificación de perfil/rol.
- Fugas de tenant → revisar queries sin `tenant_id` y reforzar RLS.

---

## 3) SWR (data fetching cliente)

Do:
- Usar hooks en `hooks/*` y el `SWRConfig` global (ver `lib/swr-config`).
- Inyectar `Authorization` y `X-Tenant-Id` (si aplica) en el fetcher global. Las keys deben incluir `tenantId` cuando corresponda.
- Revalidar al cambiar tenant o al cerrar sesión.

Don’t:
- No hacer fetches ad‑hoc sin token/tenant; preferir hooks tipados.

Checks de issue típicos:
- Datos de otro tenant → falta tenant en key o cabecera.
- Falsos 401 → token no incluido por fetcher/hook.

---

## 4) Tailwind CSS (branding dinámico)

Do:
- Para clases dinámicas, definir `safelist` en `tailwind.config.ts` (bg/text/border para paletas SIGA/FEMA). Alternativa: usar CSS variables via `dynamic-theme.tsx` y evitar clases completamente dinámicas.
- Mantener `content` globs actualizados para App Router.

Don’t:
- No depender de strings arbitrarios sin `safelist`; causan purgado en build.

Checks de issue típicos:
- Colores perdidos en prod → falta `safelist` o migrar a variables CSS.

---

## 5) Theming y Multi‑Tenant

Do:
- Obtener theme por UUID o dominio usando `lib/theme-config.ts`:
  - Por UUID: `getThemeFromTenantUUID(tenantId)`
  - Por dominio: `getThemeFromDomain(host)` / `getTenantIdFromDomain(host)`
- Usar `TenantProvider` y hooks (`useTenantId`, `useTenantTheme`).
- Aplicar branding con `components/dynamic-theme.tsx` y/o `theme-wrapper.tsx`.

Don’t:
- No usar `theme.slug` inexistente; usar el objeto de theme válido.
- No mezclar lookups por dominio con UUID de forma intercambiada.

Checks de issue típicos:
- Mismatch de theme → función de lookup incorrecta o param equivocado (UUID vs slug vs dominio).

---

## 6) Flujos de Upload (OKR y legacy)

Do:
- UI: `components/OKRFileUpload.tsx` debe enviar `Authorization` y metadatos (p.ej. `areaId`).
- API `/api/upload/okr-file`:
  - Patrón auth+perfil+RLS.
  - Validar que `areaId` pertenece al scope del usuario.
  - Manejar tamaños/tipos de archivo y errores con shape consistente.
- Mantener compatibilidad temporal con `/api/upload` legacy y marcar UI legacy como `@deprecated`.

Don’t:
- No asumir que `getUserProfile()` retorna objeto sin destructurar. Usar el contrato real de utilidad.
- No mezclar nombres de variables para match de área.

Checks de issue típicos (hotfix Stage 1):
- `okr-file`: destructurar correctamente el retorno del helper de perfil y validar faltantes.
- `upload` legacy: unificar nombre de variable de `areaMatch` y normalizar comparaciones.

---

## 7) Middleware y seguridad

Do:
- Usar `utils/supabase/middleware.ts` para proteger rutas, sincronizar cookies y aplicar security headers (CSP, HSTS, COOP/COEP si procede).
- Mantener lista de rutas públicas explícita.

Don’t:
- No dejar endpoints sin verificación de usuario aun con middleware activo.

Checks de issue típicos:
- Rutas API sin 401 → falta `auth.getUser()` y early return.

---

## 8) AI (Stratix)

Do:
- Dev: endpoint test `POST /api/stratix/chat/test` (no auth).
- Prod con datos: `POST /api/stratix/chat` con `Authorization` y scoping por tenant.
- UI: `hooks/useGeminiAssistant.ts` con `endpoint: '/api/stratix/chat'` cuando se requieren respuestas con datos.

Don’t:
- No enviar PII sin necesidad; remover datos sensibles del prompt.

---

## 9) Testing y QA

Do:
- Unit/integration (Vitest): `pnpm test`, `test:unit`, `test:integration`.
- E2E (Playwright): escenarios de auth, upload y theming por tenant.
- Agregar pruebas para: redirecciones de auth, headers de Authorization, safelist de Tailwind (snapshot de CSS), selección de theme por UUID/dom.

---

## 10) Logging y errores

Do:
- Estandarizar logs server con tags `{ tenantId, userId, route }` y evitar secretos.
- Usar `auth-error-boundary` y toasts para feedback en UI.

---

## 11) Procedimiento recomendado por issue

- Auth/Providers duplicados:
  - Consolidar en `AuthProvider`; migrar `ProfileProvider` a helpers o integrarlo; actualizar `components/profile-dropdown.tsx` a `useAuth().signOut()`.
- Theming:
  - Reemplazar lookups incorrectos por `getThemeFromTenantUUID()` o dominio. Quitar usos de `theme.slug`.
- Upload APIs:
  - Hotfix de destructuring/variables; validar scope de áreas; shape de errores uniforme.
- Tailwind:
  - Añadir `safelist` o migrar branding a variables CSS.

Criterios de aceptación (por categoría):
- Auth: un solo listener `onAuthStateChange`; `signOut` único; SSR sin flicker.
- Theming: selección correcta por UUID/dom; sin clases purgadas.
- Upload: 401/403 correctos; archivos procesados por tenant/área.
- SWR: tokens y tenant en headers/keys; revalidación al cambiar tenant.

---

## 12) Checklist previa a merge

- [ ] Handlers API siguen el patrón de autenticación y RLS.
- [ ] Hooks SWR usan fetcher global con Authorization y tenant.
- [ ] Providers sin duplicación de sesión/perfil; `signOut` unificado.
- [ ] Theming correcto (UUID/dom) y sin `theme.slug`.
- [ ] Tailwind con `safelist` o variables CSS para branding dinámico.
- [ ] Uploads validados por área y con errores consistentes.
- [ ] Middleware con públicas/protegidas bien definidas.
- [ ] Pruebas actualizadas y pasando en CI.

---

## 13) Política de eliminación de código reemplazado (Clean-as-you-go)

Do:
- Eliminar en el mismo PR/etapa el código antiguo que haya sido reemplazado (componentes, hooks, providers, rutas API, utilidades, estilos).
- Actualizar imports y referencias; ejecutar búsqueda global para evitar usos residuales.
- Si se requiere coexistencia temporal, encapsular con feature flag y fijar fecha de retiro (<= 1 sprint), documentada en el PR.
- Habilitar reglas que ayuden a detectar residuos: TypeScript `noUnusedLocals`/`noUnusedParameters`, ESLint `no-unused-vars`.

Don’t:
- No dejar implementaciones duplicadas en árbol activo (p. ej., dos providers de auth, dos endpoints de upload).
- No marcar como `@deprecated` sin plan y fecha de retiro.

Checklist por PR:
- [ ] Código antiguo eliminado y archivos obsoletos movidos/eliminados (no `legacy` indefinido).
- [ ] Búsqueda global de símbolos/paths renombrados (endpoints, exports, componentes) sin referencias restantes.
- [ ] Build, lint y tests verdes tras la eliminación.
- [ ] Documentación/README y ejemplos actualizados.
