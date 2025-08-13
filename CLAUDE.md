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
- `/lib/api-auth-helper.ts`: Core authentication utilities with getUser() pattern
- `/lib/server-user-profile.ts`: Server-side user profile fetching
- `/utils/supabase/middleware.ts`: Auth middleware for protected routes
- `/docs/supabase-sesion.md`: Complete authentication implementation guide

### Database Migrations
- `/supabase/migrations/`: Sequential migration files
- Migration order is critical - never skip migrations
- RLS policies are enabled in migration 5

### Testing Framework
- `/automation/config/`: Test configuration files
- `/automation/docs/testing-principles.md`: Testing philosophy and standards
- Coverage thresholds: 70% general, 85% for critical components

### AI Integration (Stratix)
- `/hooks/useStratixAssistant.ts`: AI assistant integration hook
- `/app/api/stratix/`: AI-related API endpoints
- Streaming responses implemented via Server-Sent Events

## Environment Variables

Required for development:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # Required for seeding
```

## Node.js Requirements

This project requires Node.js version 22.x. The project has been updated with the latest dependencies compatible with Node.js 22.

## Common Development Patterns

### Adding a New API Endpoint
1. Create route in `/app/api/[resource]/route.ts`
2. Implement authentication check using `authenticateRequest()` from `/lib/api-auth-helper.ts`
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
- Always follow @docs/schema-public.sql for database structure

### Authentication
- Always validate user role before operations
- Session refresh handled automatically by Supabase client
- JWT claims include user ID, not profile ID
- ALWAYS use `getUser()` on server-side, NEVER `getSession()`

### Performance
- Bundle size monitored via webpack-bundle-analyzer
- Images optimized through Next.js Image component
- Implement pagination for large datasets

## API Documentation

The system provides comprehensive REST APIs documented in `/docs/API_REFERENCE.md`. Key endpoints include:
- `/api/objectives`: Strategic objectives management
- `/api/initiatives`: Initiative tracking
- `/api/quarters`: Quarter management
- `/api/progress-tracking`: Progress history and analytics
- `/api/audit-log`: Activity tracking
- `/api/manager-dashboard`: Manager-specific views

## Deployment Considerations

- Database migrations must run before deployment
- Environment variables differ per environment
- Redis required for production caching
- Supabase project required with proper configuration
- Use Vercel CLI to validate deployment status after pushing to main
- Test production deployment at siga-turismo.vercel.app using Playwright MCP

## Development Workflow

1. Read proper documentation from @docs/README.md before starting any task
2. Keep all @docs/ files updated after making changes
3. Follow @docs/supabase-sesion.md for auth and session management
4. Follow @docs/API_REFERENCE.md and @docs/TECHNICAL_DOCUMENTATION.md for core structures
5. Run lint and typecheck commands before committing
6. Clean up temporary test files after use

## Sensitive Credentials

- Supabase CLI Password: `bWSg6ONuXWdZsDVP`



## Adding to Your CLAUDE.md File

To enable intelligent agent orchestration during task execution, add the following instructions to your CLAUDE.md:

```markdown
## Agent Orchestration System

### Automatic Agent Selection and Orchestration

When executing tasks, automatically orchestrate multiple specialized agents based on the task type and complexity. Use the Task tool with the following orchestration patterns:

### Task Analysis and Agent Assignment

For each user request, perform this analysis:
1. **Identify task type** (feature, bug fix, optimization, security, etc.)
2. **Determine complexity** (simple, moderate, complex)
3. **Select primary agent** (main implementer)
4. **Assign supporting agents** (reviewers, validators)
5. **Define orchestration sequence**

### Orchestration Patterns by Task Type

#### Pattern 1: Feature Implementation
```
Orchestration Sequence:
1. Launch database-architect Agent (if DB changes needed)
   - Design schema changes
   - Plan migrations
   - Define RLS policies
   
2. Launch Developer Agent
   - Implement feature following patterns
   - Create/update API endpoints
   - Build UI components
   
3. Launch qa-code-reviewer
   - Review implementation
   - Check edge cases
   - Validate business logic
   
4. Launch security-auditor Agent (if sensitive data involved)
   - Audit security measures
   - Validate authentication/authorization
   
5. Launch test-coverage-specialist Agent
   - Write/update tests
   - Ensure coverage targets
```

#### Pattern 2: Bug Fix
```
Orchestration Sequence:
1. Launch qa-code-reviewer
   - Reproduce and analyze bug
   - Identify root cause
   - Define fix requirements
   
2. Launch Developer Agent
   - Implement fix
   - Handle edge cases
   
3. Launch test-coverage-specialist Agent
   - Write regression tests
   - Verify fix doesn't break existing functionality
```

#### Pattern 3: Performance Optimization
```
Orchestration Sequence:
1. Launch Performance Agent
   - Profile and identify bottlenecks
   - Define optimization strategy
   
2. Launch database-architect Agent (if query optimization needed)
   - Optimize queries
   - Add indexes
   
3. Launch Developer Agent
   - Implement optimizations
   - Add caching layers
   
4. Launch qa-code-reviewer
   - Verify functionality preserved
   - Validate performance improvements
```

#### Pattern 4: Security Audit
```
Orchestration Sequence:
1. Launch security-auditor Agent
   - Perform security scan
   - Identify vulnerabilities
   
2. Launch database-architect Agent
   - Review RLS policies
   - Audit data access patterns
   
3. Launch Developer Agent
   - Fix identified issues
   - Implement security measures
   
4. Launch test-coverage-specialist Agent
   - Write security tests
   - Validate fixes
```

### Agent Launch Templates

Use these templates when launching agents with the Task tool:

#### Developer Agent Launch
```javascript
{
  "subagent_type": "general-purpose",
  "description": "Implement feature",
  "prompt": "As a Developer Agent specializing in React/Next.js/TypeScript:
    1. Review the codebase patterns in [relevant files]
    2. Implement [specific feature]
    3. Follow existing conventions for:
       - Component structure
       - API patterns
       - Error handling
       - TypeScript types
    4. Ensure code is clean, maintainable, and DRY
    Report back with: implemented files, key decisions, any blockers"
}
```

#### qa-code-reviewer Launch
```javascript
{
  "subagent_type": "general-purpose",
  "description": "Review code quality",
  "prompt": "As a qa-code-reviewer:
    1. Review the implementation in [files]
    2. Check for:
       - Proper error handling
       - Edge case coverage
       - Security vulnerabilities
       - Performance issues
       - Type safety
       - Business logic correctness
    3. Test the feature manually if possible
    4. Identify any bugs or improvements
    Report back with: issues found, suggestions, approval status"
}
```

#### database-architect Agent Launch
```javascript
{
  "subagent_type": "general-purpose",
  "description": "Design database schema",
  "prompt": "As a database-architect Agent:
    1. Review current schema in /docs/schema-public.sql
    2. Design changes for [requirement]
    3. Ensure:
       - Proper normalization
       - RLS policies maintained
       - Tenant isolation preserved
       - Indexes for performance
       - Migration safety
    4. Create migration scripts
    Report back with: schema changes, migration plan, performance considerations"
}
```

### Orchestration Decision Tree

```
User Request Received
    ↓
Analyze Request Complexity
    ↓
┌─────────────────────────────────┐
│ Simple Task (< 30 min)          │ → Single Agent Execution
│ - Minor text changes             │
│ - Simple queries                 │
│ - Documentation updates          │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ Moderate Task (30 min - 2 hrs)  │ → Two-Agent Pattern
│ - Single feature                 │   (Implementer + Reviewer)
│ - Bug fixes                      │
│ - Component updates              │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ Complex Task (> 2 hrs)          │ → Multi-Agent Orchestra
│ - Multiple features              │   (3+ agents in sequence)
│ - System redesign                │
│ - Performance overhaul           │
│ - Security implementation        │
└─────────────────────────────────┘
```

### Parallel vs Sequential Orchestration

#### Parallel Execution (when independent)
```
Launch simultaneously:
- database-architect (schema design)
- UI/UX Designer (interface design)
- Documentation Agent (API docs)

Then converge:
- Developer Agent (implementation using all designs)
```

#### Sequential Execution (when dependent)
```
Step 1: security-auditor (define requirements)
    ↓
Step 2: database-architect (secure schema)
    ↓
Step 3: Developer Agent (implement)
    ↓
Step 4: QA Engineer (validate)
    ↓
Step 5: test-coverage-specialist (test coverage)
```

### Agent Communication Protocol

Agents must share:
1. **Context**: What they're working on
2. **Findings**: Issues discovered
3. **Decisions**: Architectural choices
4. **Handoffs**: What the next agent needs to know
5. **Blockers**: Issues preventing progress

Example handoff:
```
database-architect → Developer:
"Schema updated with new 'user_permissions' table.
Migration 001_add_permissions.sql created.
RLS policies defined for tenant isolation.
Use the getUserPermissions() helper for queries."
```

### Quality Gate Orchestration

Before marking task complete, orchestrate final validation:

```javascript
// Launch parallel quality checks
await Promise.all([
  launchAgent('QA Engineer', 'Final quality check'),
  launchAgent('security-auditor', 'Security validation'),
  launchAgent('Performance Agent', 'Performance verification'),
  launchAgent('test-coverage-specialist', 'Test coverage check')
])

// Only proceed if all agents approve
if (allAgentsApprove) {
  markTaskComplete()
} else {
  orchestrateRemediationAgents()
}
```

### Monitoring and Adjustment

During execution:
1. Monitor agent progress
2. Detect when agents are blocked
3. Launch additional specialized agents as needed
4. Adjust orchestration based on findings

Example dynamic adjustment:
```
if (qaAgent.foundSecurityIssue) {
  launchAgent('security-auditor', 'Address security concern')
}

if (performanceAgent.foundBottleneck) {
  launchAgent('database-architect', 'Optimize queries')
}
```

### Agent Performance Metrics

Track for each orchestration:
- Task completion time
- Number of agents used
- Issues found/fixed
- Code quality scores
- Test coverage achieved
- Performance improvements

Use metrics to improve orchestration patterns over time.


### Concise CLAUDE.md Instructions

Add this to your CLAUDE.md for automatic agent orchestration:

```markdown
## Agent Orchestration for Task Execution

### Automatic Multi-Agent Workflow
When receiving tasks, orchestrate specialized agents using the Task tool based on complexity:

**Simple Tasks (< 30 min)**: Single agent execution
**Moderate Tasks (30 min - 2 hrs)**: Two-agent pattern (implement + review)
**Complex Tasks (> 2 hrs)**: Full multi-agent orchestration

### Standard Orchestration Sequences

**Feature Implementation:**
1. database-architect (if DB changes) → 2. Developer → 3. QA Engineer → 4. Security (if sensitive) → 5. Testing

**Bug Fixes:**
1. QA Engineer (analyze) → 2. Developer (fix) → 3. Testing (regression)

**Performance:**
1. Performance Agent (profile) → 2. database-architect (optimize) → 3. Developer (implement) → 4. QA (validate)

**Security:**
1. Security Agent (scan) → 2. Database (RLS audit) → 3. Developer (fix) → 4. Testing (validate)

### Agent Launch Protocol
```javascript
// Example: Feature requiring DB changes
await Task.launch({
  subagent_type: "general-purpose",
  description: "Design database schema",
  prompt: `As database-architect: Review /docs/schema-public.sql, design changes for [feature], ensure RLS/tenant isolation, create migrations. Report: changes, migration plan, performance impact.`
})

// After DB design, launch Developer
await Task.launch({
  subagent_type: "general-purpose",
  description: "Implement feature",
  prompt: `As Developer: Using DB design from previous agent, implement [feature] following codebase patterns. Report: files created/modified, key decisions, test coverage.`
})

// Finally, QA validation
await Task.launch({
  subagent_type: "general-purpose",
  description: "Review implementation",
  prompt: `As QA Engineer: Review implementation for bugs, security issues, edge cases. Test manually if possible. Report: issues found, suggestions, approval status.`
})
```

### Dynamic Orchestration Rules
- If QA finds security issues → Launch security-auditor
- If Performance degrades → Launch Performance Agent
- If DB queries slow → Launch database-architect
- If UI/UX concerns → Launch UI/UX Designer
- If documentation lacking → Launch Documentation Agent

### Quality Gates Before Completion
Run parallel validation agents:
- QA Engineer: Code quality check
- Security: Vulnerability scan
- Performance: Speed verification
- Testing: Coverage validation

Only mark complete when all agents approve.

### Agent Communication
Each agent must provide structured handoff:
1. What was done
2. Key decisions made
3. Issues found
4. What next agent needs to know
5. Any blockers

Monitor agent progress and adjust orchestration dynamically based on findings.