# Setup Guide

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- PostgreSQL database

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd initiative-dashboard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Database Setup

#### Run Migrations

Execute migrations in Supabase SQL Editor in order:

1. `supabase/migrations/20240101000001_create_base_tables_and_types.sql`
2. `supabase/migrations/20240101000002_create_auth_sync_trigger.sql`
3. `supabase/migrations/20240101000003_add_foreign_key_constraints.sql`
4. `supabase/migrations/20240101000004_add_audit_function_and_triggers.sql`
5. `supabase/migrations/20240101000005_enable_rls_and_policies.sql`
6. `supabase/migrations/20240101000006_create_optimized_views.sql`
7. `supabase/migrations/20240101000007_create_performance_indexes.sql`
8. `supabase/migrations/20240101000008_populate_test_data.sql`
9. `supabase/migrations/20240101000009_fix_rls_auth_uid.sql`

### 5. Test Users

Default test users (password: `demo123456`):

#### SEGA Tenant
- CEO: `ceo@sega.com`
- Admin: `admin@sega.com`
- Manager: `manager@sega.com`

#### MF Tenant
- CEO: `ceo@mf.com`
- Admin: `admin@mf.com`
- Manager: `manager@mf.com`

### 6. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Verification

### Check Database Connection

```bash
npm run db:test
```

### Verify Authentication

1. Navigate to http://localhost:3000/login
2. Login with test credentials
3. Verify redirect to dashboard

### Test API Endpoints

```bash
# Test KPI endpoint
curl http://localhost:3000/api/analytics/kpi?time_range=month

# Test initiatives endpoint
curl http://localhost:3000/api/initiatives
```

## Common Issues

### Database Connection Failed

1. Check Supabase URL and keys
2. Verify network connectivity
3. Check Supabase project status

### Authentication Issues

1. Clear browser cookies
2. Check auth.users table in Supabase
3. Verify user_profiles sync

### Missing Data

1. Run test data migration
2. Check tenant_id in queries
3. Verify RLS policies (if enabled)

## Next Steps

- [Environment Variables](./environment.md)
- [Production Deployment](./production.md)
- [API Documentation](../api/endpoints.md)