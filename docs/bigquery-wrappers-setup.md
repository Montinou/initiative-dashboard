# BigQuery Wrappers (FDW) – Setup programático para sincronización inversa

Este documento explica cómo habilitar lectura desde BigQuery en Postgres (Supabase) usando Wrappers (FDW) de forma 100% programática: migraciones SQL + Supabase CLI. Esto habilita sincronización inversa (BigQuery → Supabase) complementando los webhooks actuales (Supabase → BigQuery).

Importante
- No guardes el JSON de la Service Account en el repo. Usa Vault para credenciales.
- Mantén las consultas con filtros y límites para controlar costos en BigQuery.
- Aplica RLS en objetos locales (vistas/tablas materializadas) que expongan datos a la app.

Prerequisitos
- Supabase Database con extensión wrappers disponible.
- Service Account en GCP con permisos: BigQuery Data Viewer y BigQuery Job User.
- Supabase CLI configurado (supabase link al proyecto si vas a desplegar remoto).

Pasos de alto nivel
1) Guardar credenciales en Vault (una sola vez)
2) Crear/actualizar el servidor FDW de BigQuery con sa_key_id (migración)
3) Crear foreign tables y (opcional) vistas/vistas materializadas (migración)
4) Consumir desde APIs SSR siguiendo el patrón RLS del proyecto

1) Guardar credenciales en Vault
- Ejecuta en el proyecto (SQL Editor o psql con service_role):

```sql
-- Reemplaza ... por el contenido completo del JSON de la Service Account
select vault.create_secret(
  '{
    "type": "service_account",
    "project_id": "insaight-backend",
    "private_key_id": "...",
    "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    "client_email": "...",
    "client_id": "...",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "..."
  }',
  'bigquery',
  'BigQuery service account json for Wrappers'
) as key_id;
```

- Copia el valor key_id devuelto.

2) Migración: servidor FDW con Vault
- Este repo incluye una migración plantilla: `supabase/migrations/20250809232000_bigquery_wrappers_vault_server.sql`.
- Edita ese archivo y reemplaza `REPLACE_WITH_VAULT_KEY_ID` por el key_id de Vault.
- Ejecuta:
  - Local: `supabase db push`
  - Remoto: `supabase link` (una vez) y luego `supabase db push`

Qué hace la migración
- Crea la extensión y el FDW si no existen
- Crea (o asegura) el servidor `bigquery_server` apuntando a tu Project ID y Dataset ID, usando `sa_key_id`
- Crea el esquema `bigquery`
- Crea foreign tables para `gestion_iniciativas.iniciativas` y `gestion_iniciativas.smart_initiative_suggestions`
- Opcional: deja ganchos para vistas/materializadas y RLS en vistas

3) Vistas y RLS (recomendado)
- Crea vistas locales que apliquen filtros de tenant/área y aplica RLS sobre esas vistas, no directamente sobre las foreign tables (más simple y seguro). Por ejemplo:

```sql
create or replace view public.bq_iniciativas as
select *
from bigquery.iniciativas;

-- RLS en la vista (ejemplo abierto; ajusta a tu modelo de tenant)
alter view public.bq_iniciativas owner to postgres;
-- create policy ... on public.bq_iniciativas for select using (...);
```

- Si necesitas performance: crea una materialized view o tablas locales vía job de upsert desde las foreign tables.

4) Consumo desde la app
- En handlers SSR/API usa el patrón del proyecto (createClient() server), auth.getUser(), cargar profile/tenant, y luego SELECT sobre vistas/foreign tables (RLS aplica si lo hiciste en vistas o tablas locales).
- Evita exponer foreign tables directo al cliente.

Testing
```sql
-- Prueba conexión básica
select count(*) from bigquery.iniciativas limit 1;

-- Ejemplos (ajusta nombres/columnas)
select * from bigquery.smart_initiative_suggestions limit 5;
```

Mantenimiento y costos
- Usa subqueries en la opción table si necesitas filtrar en origen y reducir bytes escaneados:
  options (table '(select col1, col2 from `insaight-backend.gestion_iniciativas.iniciativas` where _PARTITIONDATE >= "2025-08-01")')
- Considera vistas materializadas con refresh programado para dashboards.

Notas del repo
- Archivo con credenciales detectado: `supabase/insaight-backend-54fcd5338cc7.json`. Elimínalo del repo y de la historia de git (secret scanning) y usa Vault.
- `scripts/setup_bigquery_wrapper.sh` queda deprecado; migrar a migraciones SQL + Vault.
