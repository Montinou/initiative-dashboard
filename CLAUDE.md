# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Initiative Dashboard is a multi-tenant OKR (Objectives and Key Results) management system built with Next.js 15, React 19, TypeScript, and Supabase. It supports three tenants (SIGA, FEMA, Stratix) with role-based access control (CEO, Admin, Manager).

## Essential Commands

### Development
```bash
pnpm dev                    # Start development server
pnpm build                  # Build for production
pnpm start                  # Start production server
pnpm lint                   # Run ESLint
```

### Database Operations
```bash
pnpm db:migrate            # Run database migrations
pnpm db:seed              # Seed database with test data (requires SUPABASE_SERVICE_ROLE_KEY)
pnpm db:reset-cache       # Reset materialized views cache
```

### Testing
```bash
pnpm test                  # Run Vitest in watch mode
pnpm test:run             # Run all tests once
pnpm test:coverage        # Run tests with coverage report
pnpm test:unit            # Run unit tests only
pnpm test:integration     # Run integration tests only
pnpm test:e2e             # Run Playwright E2E tests
pnpm test:e2e:fema        # Run E2E tests for FEMA tenant
pnpm test:e2e:siga        # Run E2E tests for SIGA tenant
pnpm test:visual          # Run visual regression tests
```

### Documentation & Analysis
```bash
pnpm docs:serve           # Serve documentation on port 3001
pnpm perf:analyze         # Analyze bundle size
pnpm perf:monitor         # Monitor performance metrics
```

## Architecture & Code Organization

### Multi-Tenant Architecture
The system implements tenant isolation through:
- **Database**: Row Level Security (RLS) policies filter data by `tenant_id`
- **Authentication**: Users belong to specific tenants via `user_profiles` table
- **Frontend**: Tenant detection via subdomain (fema.localhost, siga.localhost, stratix.localhost)
- **Theming**: Each tenant has custom theme configuration in `/lib/tenant-config.ts`

### Database Schema Relationships
```
organizations (1) → (N) tenants (1) → (N) user_profiles
                           ↓
                         areas (1) → (N) initiatives (1) → (N) activities
                           ↓
                      objectives (N) ← → (N) initiatives (via objective_initiatives)
```

### API Layer Pattern
All API routes follow this pattern:
1. Authentication check via `createClient()` from `@/utils/supabase/server`
2. User profile fetch with role validation
3. Tenant-scoped queries using RLS
4. Standardized error responses

Example pattern in `/app/api/*/route.ts`:
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
const userProfile = await getUserProfile(supabase, user.id);
// Queries automatically filtered by tenant via RLS
```

### State Management & Data Fetching
- **SWR**: Used for all client-side data fetching with automatic revalidation
- **Custom Hooks**: All data fetching encapsulated in `/hooks/use*.ts` files
- **Cache Strategy**: Redis for server-side caching, SWR for client-side

### Component Architecture
- **UI Components**: Radix UI primitives wrapped in `/components/ui/`
- **Dashboard Components**: Role-specific components in `/components/dashboard/`
- **Manager Components**: Manager-specific UI in `/components/manager/`
- **Forms**: All forms use `react-hook-form` with Zod validation

## Critical Files & Their Purpose

### Authentication & Session Management
- `/lib/api-auth-helper.ts`: Core authentication utilities
- `/lib/server-user-profile.ts`: Server-side user profile fetching
- `/utils/supabase/middleware.ts`: Auth middleware for protected routes
- `/docs/supabase-sesion.md`: Complete authentication implementation guide

### Database Migrations
- `/supabase/migrations/`: Sequential migration files
- Migration order is critical - never skip migrations
- RLS policies are enabled in migration 5

### Testing Framework
- `/automation/config/`: Test configuration files
- `/automation/principles.md`: Testing philosophy and standards
- Coverage thresholds: 70% general, 85% for critical components

### AI Integration (Stratix)
- `/lib/stratix-service.ts`: AI service integration
- `/app/api/stratix/`: AI-related API endpoints
- Streaming responses implemented via Server-Sent Events

## Environment Variables

Required for development:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # Required for seeding
```

## Common Development Patterns

### Adding a New API Endpoint
1. Create route in `/app/api/[resource]/route.ts`
2. Implement authentication check
3. Add role-based validation
4. Create corresponding hook in `/hooks/`
5. Add types in the same file or create a types file

### Creating New Database Tables
1. Create migration in `/supabase/migrations/`
2. Add RLS policies in separate migration
3. Update seed script if needed
4. Create corresponding API routes
5. Add hooks for data fetching

### Adding New UI Components
1. Use shadcn/ui CLI or create in `/components/ui/`
2. Follow existing patterns for variants and styling
3. Ensure tenant theme compatibility
4. Add to component exports if reusable

## Testing Requirements

### Unit Tests
- Test files colocated with source files as `*.test.ts(x)`
- Mock Supabase client for database operations
- Test both success and error scenarios

### E2E Tests
- Separate test files per tenant
- Use page object pattern for maintainability
- Test critical user journeys

## Important Constraints

### Database
- All queries must respect tenant isolation
- Never bypass RLS policies except in admin operations
- Use transactions for multi-table operations

### Authentication
- Always validate user role before operations
- Session refresh handled automatically by Supabase client
- JWT claims include user ID, not profile ID

### Performance
- Bundle size monitored via webpack-bundle-analyzer
- Images optimized through Next.js Image component
- Implement pagination for large datasets

## Deployment Considerations

- Database migrations must run before deployment
- Environment variables differ per environment
- Redis required for production caching
- Supabase project required with proper configuration
- usa vercel cli para validar el deployment status siempre que hagas un push to main. Una vez que confirmas que fue exitoso usa playwright mcp para validar que todo funciona correctamente en siga-turismo.vercel.app

## Sensitive Credentials

- Supabase CLI Password: `bWSg6ONuXWdZsDVP`