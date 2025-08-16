# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant OKR management system built with Next.js 15, React 19, TypeScript, and Supabase. Enterprise-grade initiative tracking with AI-powered insights.

## Tech Stack

- **Frontend**: Next.js 15.4.6, React 19, TypeScript 5.9.2
- **Styling**: Tailwind CSS + Radix UI components (shadcn/ui)
- **Database**: PostgreSQL 15+ via Supabase with Row Level Security (RLS)
- **Authentication**: Supabase Auth with cookie-based sessions
- **State Management**: SWR for data fetching and caching
- **AI Services**: Google Gemini, Vertex AI, Dialogflow CX
- **Storage**: Google Cloud Storage for file uploads
- **Caching**: Redis/Upstash for performance optimization
- **Testing**: Vitest + Playwright
- **Deployment**: Vercel

## Key Commands

```bash
# Development
pnpm dev                    # Start development server (port 3000)
pnpm build                  # Build for production
pnpm start                  # Start production server
pnpm lint                   # Run ESLint

# Testing
pnpm test                   # Run all tests with Vitest
pnpm test:run              # Run tests once (CI mode)
pnpm test:watch            # Watch mode for tests
pnpm test:coverage         # Generate coverage report
pnpm test:e2e              # Run Playwright E2E tests
pnpm test:e2e:headed       # Run E2E tests with browser
pnpm test:e2e:debug        # Debug E2E tests

# Database
pnpm db:migrate            # Run database migrations
pnpm db:seed               # Seed database with test data
pnpm db:reset-cache        # Reset materialized views

# Documentation
pnpm docs:serve            # Serve documentation locally
pnpm docs:validate         # Validate documentation links
```

## Architecture

### Directory Structure
```
/app                  # Next.js app router pages
  /api               # API routes with middleware
  /ceo               # CEO dashboard
  /dashboard         # Main dashboard
  /org-admin         # Admin panel
  /manager           # Manager dashboard
/components          # Reusable React components
  /ui                # shadcn/ui components
/lib                 # Core business logic
  /adapters          # Data adapters
  /auth              # Authentication utilities
  /cache             # Caching strategies
  /types             # TypeScript type definitions
/hooks               # Custom React hooks
/utils               # Utility functions
/supabase           
  /migrations        # Database migrations
/docs                # Comprehensive documentation
```

### Key Architectural Patterns

1. **Multi-Tenant Architecture**: All data isolation through RLS policies at database level
2. **Authentication Flow**: Always use `getUser()` on server-side, never `getSession()`
3. **API Pattern**: All API routes check authentication and tenant context
4. **Component Pattern**: Follow existing shadcn/ui patterns for consistency
5. **Error Handling**: Graceful fallbacks with user-friendly messages

## Database Schema

Core tables (all with tenant_id for isolation):
- `tenants` - Organization accounts
- `user_profiles` - User profiles linked to auth.users
- `areas` - Organizational areas/departments
- `objectives` - Strategic objectives (OKRs)
- `initiatives` - Tactical initiatives
- `activities` - Task-level activities

## Critical Configuration

### Environment Variables
```env
# Required for local development
NEXT_PUBLIC_SUPABASE_URL=https://zkkdnslupqnpioltjpeu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# Google Cloud (for AI features)
GCP_PROJECT_ID=insaight-backend
GOOGLE_CLIENT_EMAIL=<service_account_email>
GOOGLE_PRIVATE_KEY=<private_key>
```

### Supabase Configuration
- Project URL: `https://zkkdnslupqnpioltjpeu.supabase.co`
- Always use cookies for auth in SSR
- RLS policies handle tenant isolation automatically
- Never manually filter by tenant_id in queries

## Development Guidelines

### Authentication Best Practices
1. Always verify user on server-side with `await supabase.auth.getUser()`
2. Use service role key only for admin operations
3. Session refresh handled automatically with cookies
4. Check user profile exists after auth

### Database Query Patterns
```typescript
// Good - RLS handles tenant isolation
const { data } = await supabase
  .from('initiatives')
  .select('*')

// Bad - Don't manually filter by tenant_id
const { data } = await supabase
  .from('initiatives')
  .select('*')
  .eq('tenant_id', tenantId)  // RLS already does this
```

### Component Development
1. Check existing components before creating new ones
2. Follow shadcn/ui patterns for consistency
3. Use existing theme configuration from `lib/theme-config-simple.ts`
4. Implement proper loading and error states

### API Development
1. All routes must verify authentication
2. Use proper error codes and messages
3. Implement rate limiting for sensitive endpoints
4. Cache frequently accessed data

## Testing Strategy

- **Unit Tests**: Components and utilities with Vitest
- **Integration Tests**: API routes and database operations
- **E2E Tests**: Critical user flows with Playwright
- **Coverage Target**: 70% minimum for all metrics

## Deployment

### Vercel Deployment
- Automatic deployments on push to main
- Preview deployments for PRs
- Production URL: `siga-turismo.vercel.app`

### Pre-deployment Checklist
1. Run `pnpm build` locally
2. Run `pnpm test:run` to ensure tests pass
3. Verify environment variables in Vercel dashboard
4. Check database migrations are applied

## Common Issues & Solutions

### Auth Issues
- Always read `docs/integrations/supabase.md` for auth troubleshooting
- Ensure cookies are properly set in middleware
- Verify user profile exists after authentication

### RLS Policy Violations
- Check user has tenant_id in profile
- Verify RLS policies are enabled on all tables
- Use service role key for admin operations only

### Performance Issues
- Implement caching with Redis for repeated queries
- Use SWR for client-side data fetching
- Optimize database queries with proper indexes

## Important Notes

1. **Translations**: All user-facing text must use i18n variables for ES/EN support
2. **Security**: Never expose service keys to client, always validate permissions
3. **Testing**: Run tests before committing, especially for auth-related changes
4. **Documentation**: Keep docs updated when changing core functionality

## Quick Reference

- Main documentation hub: `/docs/README.md`
- API documentation: `/docs/api/overview.md`
- Database schema: `/docs/database/schema-public.sql`
- Supabase integration: `/docs/integrations/supabase.md`
- Development setup: `/docs/development/setup-guide.md`