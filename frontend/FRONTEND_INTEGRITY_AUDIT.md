# Frontend Integrity Audit and Remediation Plan

Fecha: 2025-08-09
Ámbito: Next.js 15 App Router (TypeScript), React 19, Supabase (Postgres + RLS)

Este documento detalla hallazgos, riesgos, evidencias (archivos/líneas), impacto, y un plan de remediación para alcanzar integridad funcional y consistencia de UX en el frontend. Se alinea con las convenciones definidas en `.github/copilot-instructions.md`.

---

## Resumen Ejecutivo

- Estado general: Funcional con riesgos medios-altos por duplicación de contextos de auth/perfil, theming inconsistente y clases Tailwind dinámicas sin safelist.
- Bloqueantes: 2 bugs en endpoints de upload usados por UI (carga de OKR simple y multi-hoja) que pueden romper flujos.
- Prioridades:
  1) Corregir endpoints de upload (críticos).
  2) Consolidar Auth/Profile Provider a una sola fuente de verdad.
  3) Normalizar theming por tenantSlug y consumir desde TenantProvider.
  4) Safelist Tailwind para clases dinámicas de marca.
  5) Limpieza de componentes legacy y llamadas inconsistentes.

---

## Hallazgos Detallados

### 1) Bugs críticos en endpoints de Upload

1.1 `app/api/upload/okr-file/route.ts` (carga OKR para área del manager)
- Problema: Uso incorrecto de getUserProfile. La función exportada retorna `{ user, userProfile }`, pero el handler usa `const userProfile = await getUserProfile(request);` y luego accede `userProfile.role`.
- Riesgo: `userProfile` es un objeto contenedor (o `null`), acceso de propiedades rompe el flujo de validación de rol/área.
- Evidencia: Archivo completo revisado; ver cabecera del handler POST.
- Fix sugerido:
  - Desestructurar: `const { user, userProfile } = await getUserProfile(request);`
  - Validar `!user || !userProfile` → 401; continuar con `userProfile.role` y `userProfile.area_id`.

1.2 `app/api/upload/route.ts` (carga legacy multi-hoja/tablero)
- Problema: Variable de matching de área inconsistente: se define `_areaMatchResult` y más abajo se usa `areaMatchResult` (no existe), lo que dispara ReferenceError.
- Riesgo: Procesamiento aborta mid-request; UI recibe 400/500.
- Evidencia: Función `processTableroDataBySheet` (logs y branches que refieren `areaMatchResult`).
- Fix sugerido: Renombrar todas las referencias a una sola (`areaMatchResult`).

Impacto en UI:
- `components/OKRFileUpload.tsx` usa `/api/upload/okr-file`.
- `components/file-upload.tsx` (legacy, no referenciado) usa `/api/upload`.

---

### 2) Duplicación de contexto de Auth/Profile y listeners Supabase

- Archivos:
  - `lib/auth-context.tsx` (provee user, session, profile, permisos, signOut con limpieza y persistencia).
  - `lib/profile-context.tsx` + `lib/user-profile-service.ts` (otro provider con su propio listener y cache local `user_profile_v2`).
  - `app/providers.tsx` monta ambos: `<AuthProvider>` y dentro `<ProfileProvider>`.
- Problemas:
  - Doble suscripción a `supabase.auth.onAuthStateChange` → riesgo de dobles fetches y estados divergentes.
  - Doble origen de `useAuth()` (auth-context y profile-context exportan variantes), inducen imports inconsistentes.
- Riesgos: flicker de auth, condiciones de carrera, costos de red innecesarios, bugs intermitentes.
- Fix sugerido:
  - Definir un único Owner de sesión (recomendado: `AuthProvider`).
  - Hacer que `ProfileProvider` consuma el estado de `AuthProvider` (sin listener) o consolidar a un solo provider con responsabilidades claras.
  - Unificar `useAuth` público a uno solo y ajustar imports en componentes/hook.

---

### 3) Theming inconsistente por uso de `theme.slug` y APIs incorrectas

- Fuente de verdad de tema: `TenantProvider` en `lib/tenant-context.tsx` expone `theme: CompanyTheme` (contiene `tenantSlug`).
- Problemas detectados:
  - Componentes comparan `theme.slug === 'siga'|'fema'` (no existe `slug` en CompanyTheme; los slugs reales son `tenantSlug` como `siga-turismo`, `fema-electricidad`). Ejemplos:
    - `components/file-upload.tsx`
    - `components/template-download.tsx`
    - `components/DashboardNavigation.tsx`
  - Uso de `getThemeFromTenant(tenantId)` pasando UUID: esa API espera slug. Debería usarse `getThemeFromTenantUUID(tenantId)` o `useTenantTheme()`.
- Riesgo: ramas de estilos de marca no se activan; experiencia visual incorrecta.
- Fix sugerido:
  - Reemplazar comparaciones a `theme.tenantSlug === 'siga-turismo' | 'fema-electricidad'`.
  - En componentes clientes, preferir `const theme = useTenantTheme()`.
  - Donde sólo hay tenantId (UUID), usar `getThemeFromTenantUUID(tenantId)`.

---

### 4) Tailwind: clases dinámicas sin safelist

- Archivos: `components/OKRFileUpload.tsx` y otros generan clases como `bg-${colors.primary}`/`text-${colors.primary}`.
- Problema: Tailwind purga clases no detectadas en análisis estático si no hay `safelist` en `tailwind.config.ts`.
- Riesgo: estilos faltantes en producción.
- Fix sugerido (una de dos):
  - a) Añadir `safelist` con patrones para `bg-`, `text-`, `border-`, `ring-` para valores usados (`primary`, `secondary`, `destructive`, `siga-green`, `fema-blue`, `siga-yellow`, etc.).
  - b) Evitar interpolaciones y mapear a clases estáticas mediante diccionarios (más seguro para purga).

---

### 5) Cierre de sesión inconsistente

- `components/profile-dropdown.tsx` usa `supabase.auth.signOut()` directo y redirige, saltándose la limpieza de `AuthProvider.signOut` (que borra caches y hace redirect seguro).
- Riesgo: residuos en localStorage/session, estado UI inconsistente post logout.
- Fix sugerido: inyectar `signOut` de `useAuth()` (del provider elegido) y usarlo.

---

### 6) Componente de carga legacy no referenciado

- `components/file-upload.tsx` usa `/api/upload` y no aparece importado por la UI actual.
- Riesgo: deuda técnica y confusión; mantiene endpoint legacy defectuoso en uso potencial.
- Fix sugerido: eliminar o mover a `components/legacy/` con nota deprecada; o migrarlo a `/api/upload/okr-file` si se requiere.

---

### 7) Detalles adicionales

- `utils/session-persistence.ts`: imports colocados al final del archivo. Estándar TypeScript sugiere imports al comienzo; no funcional pero mejora legibilidad.
- `tailwind.config.ts`: patrón `"*.{js,ts,jsx,tsx,mdx}"` en content puede escanear archivos raíz innecesarios; no crítico.
- Dialogflow widget (`components/dialogflow-chat-widget.tsx`) se inyecta cuando `tenantId` existe en `app/layout.tsx`. Evaluar feature flag por entorno/tenant para rendimiento.

---

## Plan de Remediación

Orden recomendado con esfuerzo estimado:

1) Hotfix endpoints (0.5d)
- `app/api/upload/okr-file/route.ts`: desestructurar `getUserProfile` y validar `user`/`userProfile`.
- `app/api/upload/route.ts`: unificar `areaMatchResult`.
- Agregar tests mínimos de integración (hay suite en `automation/integration/api/file-upload-api.integration.test.ts`).

2) Consolidación de Auth/Profile (1–1.5d)
- Definir `AuthProvider` como fuente única de sesión.
- Adaptar `ProfileProvider` para consumir `AuthProvider` o unificar lógica (preferible: extender `AuthProvider` con servicios de perfil y cache ya existentes en `user-profile-service.ts`).
- Cambiar imports de `useAuth` en componentes/hook a una sola definición.
- Unificar `signOut` (usar el de `AuthProvider` en `profile-dropdown.tsx`).

3) Theming unificado (0.5–1d)
- Reemplazar `theme.slug` por `theme.tenantSlug` y usar `useTenantTheme()`.
- Reemplazar `getThemeFromTenant(tenantId)` por `getThemeFromTenantUUID(tenantId)` donde aplique.
- Validar rutas críticas: navegación, upload UI, templates.

4) Tailwind safelist o clases estáticas (0.5d)
- Añadir `safelist` en `tailwind.config.ts` para valores de marca utilizados.
- Alternativa: refactor a mapas de clases estáticas.

5) Limpieza (0.5d)
- Deprecar `components/file-upload.tsx` si no se usa.
- Reubicar imports y limpiar logs excesivos.

---

## Verificación con prácticas actuales (Next.js 15, React 19 RC)

- Async Request APIs: El plan no requiere cambios funcionales, pero se recomienda migrar gradualmente a `await cookies()`/`await headers()` en App Router. Impacto: bajo, con codemod disponible.
- Caching por defecto: `GET` en Route Handlers sin cache por defecto y Router Cache sin cachear Pages; nuestro uso de SWR en cliente y RLS en servidor sigue alineado. Si se desea caching en APIs de solo lectura, optar por `export const dynamic = 'force-static'` o `fetch(..., { next: { revalidate: n } })` en RSC.
- Invalidation: usar `revalidatePath`/`revalidateTag` en Server Actions para invalidar Router Cache al instante. Desde Route Handlers, la invalidación no impacta inmediato en Router Cache; complementar con `router.refresh` desde el cliente.
- Middleware: evitar fetch de datos de negocio; solo auth/cookies y headers de seguridad. Nuestro middleware actual cumple.
- UI Data fetching: mantener SWR en componentes cliente; para RSC preferir `fetch` con memoización o `cache()` si se usan SDKs.
- Tailwind y safelist: sin cambios; la recomendación de safelist/variables CSS sigue vigente.
- Multi-tenant: seguir `TenantProvider` + lookups por UUID/dominio; sin cambios.

Conclusión: La arquitectura y remediación propuesta siguen recomendadas y compatibles con Next.js 15. Se agregan notas operativas de caching/invalidation y migración a Async Request APIs.

---

## Checklists de Validación

Funcional
- [ ] Login/Logout: sin flicker, cache limpiado al salir, redirect correcto.
- [ ] Carga OKR: OK con archivos .xlsx/.xls; errores claros de validación.
- [ ] Historial/Stats de upload funcionando (componentes manager).

Theming
- [ ] `siga-turismo`: colores verde/amarillo aplicados en secciones marcadas.
- [ ] `fema-electricidad`: azul/amarillo aplicados.
- [ ] Localhost/default mantiene tema profesional.

Estilos
- [ ] Clases dinámicas renderizadas en build de producción (verificar tras `pnpm build`).

Rendimiento
- [ ] Sin dobles requests de perfil tras consolidación.
- [ ] SWR respeta `x-tenant-id` cuando hay cache de perfil.

Seguridad/RLS
- [ ] Todos los endpoints que usan datos validan sesión con server client y perfil RLS.
- [ ] Ningún admin client importado en cliente.

---

## Cambios Concretos Recomendados (resumen)

- Upload OKR (área):
  - `const { user, userProfile } = await getUserProfile(request)`.
  - `if (!user || !userProfile) return 401`.
- Upload tablero legacy:
  - Renombrar `_areaMatchResult` → `areaMatchResult` y usar consistentemente.
- Logout:
  - `components/profile-dropdown.tsx` → usar `const { signOut } = useAuth()` y llamarlo.
- Theming:
  - Reemplazar `theme.slug` por `theme.tenantSlug` en componentes.
  - `getThemeFromTenantUUID(tenantId)` en vez de `getThemeFromTenant(tenantId)` o usar `useTenantTheme()`.
- Tailwind:
  - Añadir `safelist` para `bg-(primary|secondary|destructive|siga-green|fema-blue|siga-yellow)`, `text-...`, `border-...`, `ring-...`.

---

## Notas sobre cumplimiento con convenciones del repo

- API client:
  - Cliente server: `utils/supabase/server.ts` (correcto en layouts/APIs).
  - Cliente browser: `utils/supabase/client.ts` (correcto en contextos client-only).
- Middleware: `middleware.ts` delega a `utils/supabase/middleware.ts` para proteger rutas, añade headers de seguridad y redirige a login cuando aplica.
- SSR Hydration: `app/layout.tsx` obtiene `tenantId` y lo propaga a `Providers`/`ThemeWrapper`. Falta todavía hidratar sesión/perfil inicial si se quiere evitar “auth flicker” del todo; el `AuthProvider` soporta iniciales.

---

## Anexos: Mapa de piezas relevantes

- Proveedores/Contexto:
  - `app/providers.tsx`
  - `lib/auth-context.tsx`
  - `lib/profile-context.tsx`
  - `lib/tenant-context.tsx`
  - `lib/user-profile-service.ts`
- Theming:
  - `lib/theme-config.ts`
  - `components/dynamic-theme.tsx`
  - `components/theme-wrapper.tsx`
- Carga OKR:
  - `components/OKRFileUpload.tsx`
  - `components/manager/OKRFileManager.tsx`
  - `app/api/upload/okr-file/*`
  - `app/api/upload/*` (legacy)
- SWR y Fetcher:
  - `lib/swr-config.ts`
- Seguridad/Auth server:
  - `utils/supabase/server.ts`
  - `utils/supabase/middleware.ts`
  - `middleware.ts`

---

## Próximos Pasos

1) Aprobación del plan y secuencia de cambios.
2) Aplicar hotfixes de endpoints y publicar patch.
3) Refactor de providers y theming, luego QA visual por tenant.
4) Agregar safelist Tailwind y validar build prod.
5) Depuración de componentes legacy.

Contacto: Equipo Frontend / Arquitectura
