# Template de Endpoint (Next.js 15 + Supabase RLS)

> Usa este template para crear o refactorizar handlers en `app/api/**/route.ts`

## Principios
- Server-only: usa `utils/supabase/server.ts` y Web APIs (`Request`, `Response`).
- Auth primero: `auth.getUser()`; 401 si no hay usuario.
- Perfil/tenant: carga `user_profiles` por `user_id`; deriva `tenant_id`, `role`, `area_id`.
- RLS: todas las consultas respetan tenant/área; no uses admin client salvo en jobs.
- Roles canónicos: `CEO`, `Admin`, `Manager`; usa `hasPermission` si aplica.
- Validación: `zod` para payloads y query params.
- Errores consistentes: `{ error, details? }` con HTTP status correcto.
- Seguridad: limitar columnas seleccionadas; evita columnas inexistentes.
- Observabilidad: logs estructurados (nivel `error`) en catch.

## Estructura sugerida

```ts
// app/api/<segment>/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { hasPermission } from '@/lib/role-permissions'

// Schemas (query/body)
const QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const BodySchema = z.object({
  // define campos
})

function json(data: unknown, init?: number | ResponseInit) {
  return Response.json(data, typeof init === 'number' ? { status: init } : init)
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return json({ error: 'Authentication required' }, 401)

  // perfil
  const { data: profile, error: pErr } = await supabase
    .from('user_profiles')
    .select('id, user_id, tenant_id, role, area_id')
    .eq('user_id', auth.user.id)
    .single()
  if (pErr || !profile) return json({ error: 'Profile not found' }, 403)

  // permisos
  if (!hasPermission(profile.role, 'read:something'))
    return json({ error: 'Insufficient permissions' }, 403)

  // validar query
  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return json({ error: 'Invalid query', details: parsed.error.flatten() }, 400)
  const { page, limit } = parsed.data

  // consultas (RLS + filtros explícitos)
  const { data, error } = await supabase
    .from('some_table')
    .select('id, name, created_at')
    .eq('tenant_id', profile.tenant_id)
    .range((page - 1) * limit, page * limit - 1)

  if (error) return json({ error: 'Failed to fetch', details: error.message }, 500)
  return json({ data, pagination: { page, limit } })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return json({ error: 'Authentication required' }, 401)

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role, area_id')
    .eq('user_id', auth.user.id)
    .single()

  if (!profile) return json({ error: 'Profile not found' }, 403)
  if (!hasPermission(profile.role, 'create:something'))
    return json({ error: 'Insufficient permissions' }, 403)

  // body
  const bodyJson = await request.json().catch(() => undefined)
  const parsed = BodySchema.safeParse(bodyJson)
  if (!parsed.success) return json({ error: 'Invalid body', details: parsed.error.flatten() }, 400)

  const payload = { ...parsed.data, tenant_id: profile.tenant_id }

  const { data, error } = await supabase.from('some_table').insert(payload).select().single()
  if (error) return json({ error: 'Create failed', details: error.message }, 500)
  return json({ data }, 201)
}

export async function PATCH(request: NextRequest) {
  // Implementar igual patrón: validar auth, perfil, permisos, schema y RLS
  return json({ error: 'Not implemented' }, 501)
}

export async function DELETE(request: NextRequest) {
  // Implementar igual patrón
  return json({ error: 'Not implemented' }, 501)
}
```

### Variantes
- Managers: agrega filtro por `area_id`.
- Listas con orden: whitelist de columnas y ordén seguro.
- Webhooks: validar firma y limitar origen; no usar Supabase client si no aplica.
- Streaming: usar Web Streams o AI SDK cuando corresponda.

### Referencias
- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Supabase SSR + cookies: https://supabase.com/docs/guides/auth/server-side/nextjs
- RLS y políticas: https://supabase.com/docs/guides/database/postgres/row-level-security
- SWR (cliente): https://swr.vercel.app/docs/getting-started
- BigQuery Write API (integraciones): https://cloud.google.com/bigquery/docs/write-api
