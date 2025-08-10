# Plan por Etapas para Remediar y Alinear el Frontend

Fecha: 2025-08-09
Ámbito: Next.js 15 (App Router), React 19, Supabase (RLS)
Dependencias: pnpm, Node LTS

Nota: Todas las acciones deben respetar las reglas de .clinerules (./.clinerules). No introducir el cliente admin en código cliente. Mantener RLS como fuente de verdad.

---

## Etapa 0 — Preparación y Verificaciones
Objetivo: asegurar entorno saludable antes de tocar código.
- Verificar variables de entorno: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (solo server).
- Instalar dependencias y verificar build/lint/test locales.
- Confirmar que no hay procesos dev activos.
- Acordar rama de trabajo y estrategia de PR (pequeños, por etapa).

Aceptación:
- Build y lint sin errores. Tests base pasan.

### Nota de alineación con Next.js 15 (recomendado antes de Etapa 1)
- Async Request APIs: migrar usos de `cookies`, `headers`, `params` y `searchParams` en App Router a versiones asíncronas (e.g. `const cookieStore = await cookies()`). Se puede usar el codemod oficial (next-async-request-api) y completar manualmente donde sea necesario.
- Caching de Route Handlers y Router Cache: en Next.js 15 los `GET` de Route Handlers ya no se cachean por defecto y el Router Cache no cachea Page segments por defecto (staleTime=0). Ajustar expectativas de caching en UI (SWR sigue siendo la fuente de caching en cliente) y, si se requiere caching en servidor, optar explícitamente por `force-static`/`next.revalidate` o `revalidateTag`.
- Invalidaciones: recordar que revalidar desde Route Handlers no invalida inmediatamente el Router Cache; para reflejar cambios en cliente usar `router.refresh` o revalidaciones desde Server Actions.
- Middleware: cualquier fetch en middleware es no-cache por definición; evitar su uso para datos de negocio.

---

## Etapa 1 — Hotfix de Endpoints de Upload (Bloqueantes)
Objetivo: desbloquear flujos de carga de archivos.

1.1 app/api/upload/okr-file/route.ts
- Problema: uso incorrecto de `getUserProfile`.
- Acción: desestructurar retorno y validar usuario/perfil.
  - Cambiar a: obtener `{ user, userProfile }` y verificar ambos.
  - Si faltan, responder 401. Usar `userProfile.role` y `userProfile.area_id` con seguridad.
- Validar: subir un .xlsx válido y ver respuesta con `processed`, `sheetDetails` y `errors`.

1.2 app/api/upload/route.ts (legacy tablero multi-hoja)
- Problema: inconsistencia de nombre de variable (`_areaMatchResult` vs `areaMatchResult`).
- Acción: unificar a `areaMatchResult` en toda la función `processTableroDataBySheet` y sus logs/llamados.
- Validar: subir un .xlsx multi-hoja con nombres de áreas reconocibles.

Aceptación:
- Cargas OKR mediante UI de manager completan con 200, con conteos y errores legibles.
- No hay ReferenceError en logs.

---

## Etapa 2 — Consolidación de Auth/Profile
Objetivo: una sola fuente de verdad de sesión/perfil y un solo listener de Supabase.

- Decisión: `AuthProvider` será el owner de la sesión.
- `ProfileProvider`:
  - Opción A: consumir estado de `AuthProvider` sin listener propio (usar servicios de perfil como helper, no provider).
  - Opción B: deprecar y migrar selectores al contexto de `AuthProvider`.
- Ajustes concretos:
  - `app/providers.tsx`: montar solo el provider elegido como owner del estado. El otro, si se mantiene, sin suscripción.
  - Unificar `useAuth` expuesto públicamente (evitar duplicados en `lib/auth-context.tsx` y `lib/profile-context.tsx`).
  - `components/profile-dropdown.tsx`: usar `signOut` del provider (limpieza de caches y redirect consistente).
  - Confirmar persistencia optimista (`utils/session-persistence.ts`) integrada una única vez.

Aceptación:
- No hay dobles logs de `onAuthStateChange`.
- Navegación sin flicker. Logout limpia local/session storage y redirige.

---

## Etapa 3 — Normalización de Theming por Tenant
Objetivo: estilos de marca correctos en todos los tenants.

- Consumir tema desde `TenantProvider` con `useTenantTheme()` cuando sea posible.
- Sustituir referencias a `theme.slug` por `theme.tenantSlug` (company themes usan `tenantSlug`: `siga-turismo`, `fema-electricidad`, `stratix-platform`).
- Donde solo hay UUID: usar `getThemeFromTenantUUID(tenantId)` en vez de `getThemeFromTenant(tenantId)`.
- Archivos típicos a ajustar:
  - components/file-upload.tsx
  - components/template-download.tsx
  - components/DashboardNavigation.tsx
  - Otros que comparen `slug` con `siga`/`fema`.

Aceptación:
- QA visual: colores correctos por tenant. No hay ramas muertas de estilo.

---

## Etapa 4 — Tailwind Safelist para Clases Dinámicas
Objetivo: asegurar estilos dinámicos en build de producción.

- Añadir `safelist`/`safelistPatterns` en `tailwind.config.ts` para prefijos:
  - `bg-`, `text-`, `border-`, `ring-`
  - Valores usados: `primary`, `secondary`, `destructive`, `siga-green`, `fema-blue`, `siga-yellow` y variantes si aplican.
- Alternativa (preferible a largo plazo): reemplazar interpolaciones dinámicas (`bg-${colors.primary}`) por mapas de clases estáticas.

Aceptación:
- Build prod renderiza los estilos dinámicos. Verificado en UI.

---

## Etapa 5 — Unificar Logout
Objetivo: limpieza consistente y UX estable.

- `components/profile-dropdown.tsx`: reemplazar llamado directo a `supabase.auth.signOut()` por `const { signOut } = useAuth()` y usarlo.
- Validar: tras logout, no quedan claves `sb-` ni caches custom en storages.

Aceptación:
- Redirección a `/auth/login` y estado limpio.

---

## Etapa 6 — Limpieza y Deudas
Objetivo: reducir confusión y deuda técnica.

- `components/file-upload.tsx` (legacy):
  - Si no se usa, mover a `components/legacy/` con nota DEPRECATED o eliminar.
- Reducir logs ruidosos en producción; mantener sólo necesarios (debug bajo flag).
- Revisar imports finales en `utils/session-persistence.ts` (mover al inicio por estilo).

Aceptación:
- Sin componentes muertos en árbol activo. Consola limpia en prod.

---

## Etapa 7 — Validación Integral
Objetivo: garantías funcionales, visuales y de seguridad.

- Pruebas:
  - Unit, integration y e2e (Playwright) enfocadas en: login/logout, carga OKR, navegación por tenants, theming.
- Chequeos manuales:
  - Tema por tenant, assets y accesibilidad básica.
  - Autorización de rutas (middleware) y respuestas 401/403 donde aplique.

Aceptación:
- Suites verdes y checklist UX/RBAC cumplidos.

---

## Etapa 8 — Release
Objetivo: despliegue seguro.

- Generar PRs por etapa con descripción y evidencias (capturas/outputs).
- Aprobar y mergear secuencialmente.
- Post-deploy smoke test en cada tenant.

Aceptación:
- Sin regresiones reportadas en logs o monitoreo inicial.

---

## Criterios de Éxito Globales
- No hay dobles listeners de auth ni flicker apreciable.
- Theming correcto por tenant en toda la UI.
- Cargas OKR se procesan y reportan errores comprensibles.
- Build prod mantiene los estilos dinámicos.
- Cumplimiento estricto de .clinerules y patrones RLS.
