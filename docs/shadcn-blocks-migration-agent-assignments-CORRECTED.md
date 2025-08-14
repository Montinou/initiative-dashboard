# CORRECTED Agent Assignments for shadcn Blocks Migration

## Available Agents in Project
1. **ui-ux-designer**
2. **migration-specialist**
3. **ai-ml-integration-specialist**
4. **integration-specialist**
5. **devops-deployment-specialist**
6. **security-auditor**
7. **data-analytics-specialist**
8. **qa-code-reviewer**
9. **database-architect**
10. **test-coverage-specialist**
11. **technical-documentation-writer**
12. **Developer-Agent**

---

## 🎯 CORRECTED Phase-by-Phase Agent Assignments

### Phase 0: Foundation & Setup (Day 1 Morning)

#### Step 0.1: Initialize Project Structure
**Agent**: `devops-deployment-specialist`
```bash
Task: "Create v2 migration structure and deployment pipeline"
1. Create feature branch 'feature/shadcn-blocks-migration'
2. Create /app/v2 directory structure
3. Set up environment variables for feature flags
4. Configure deployment pipeline for v2
5. Set up parallel routing
Report: Branch created, structure ready, deployment configured
```

#### Step 0.2: Install shadcn and Initialize
**Agent**: `Developer-Agent`
```bash
Task: "Initialize shadcn with proper configuration"
1. Run: pnpm dlx shadcn@latest init
2. Configure with new-york style, slate colors, CSS variables
3. Create components.json
4. Verify installation with test component
Report: shadcn initialized, configuration verified
```

#### Step 0.3: Create API Compatibility Layer
**Agent**: `integration-specialist`
```typescript
Task: "Create API adapter layer for v2 components"
1. Create /lib/api/v2/adapters.ts
2. Map current API responses to block data structures
3. Create type definitions for block props
4. Implement data transformation functions
Report: API adapters created, transformations tested
```

#### Step 0.4: Set Up Testing Infrastructure
**Agents**: `qa-code-reviewer` + `test-coverage-specialist` (PARALLEL)
```bash
# qa-code-reviewer
Task: "Set up v2 code quality and testing infrastructure"
1. Create /tests/v2 directory
2. Set up code review checklist for v2
3. Create visual regression tests
4. Implement E2E test structure
Report: QA infrastructure ready

# test-coverage-specialist (PARALLEL)
Task: "Create test coverage framework for v2"
1. Set up unit test structure for blocks
2. Create integration test suite
3. Define coverage requirements (min 80%)
4. Create comparison tests v1 vs v2
Report: Test coverage framework ready
```

---

### Phase 1: Core Layout & Navigation (Day 1 Afternoon - Day 2 Morning)

#### Step 1.1: Install Core Layout Blocks
**Agent**: `Developer-Agent`
```bash
Task: "Install and configure core layout blocks"
Commands:
pnpm dlx shadcn@latest add shell-01 sidebar-01 navbar-01 breadcrumb-01

1. Create /app/v2/layout.tsx using shell-01
2. Configure sidebar with navigation
3. Add tenant switcher to navbar
Report: Layout blocks configured
```

#### Step 1.2: Connect Authentication
**Agent**: `security-auditor`
```typescript
Task: "Audit and integrate authentication with v2 layout"
1. Review current auth in /lib/api-auth-helper.ts
2. Create secure /app/v2/lib/auth.ts adapter
3. Implement RLS compliance checks
4. Verify role-based access controls
5. Test authentication flow security
Report: Auth secured and integrated
```

#### Step 1.3: Implement Navigation & UI
**Agents**: `Developer-Agent` + `ui-ux-designer` (PARALLEL)
```typescript
# Developer-Agent
Task: "Implement v2 navigation structure"
1. Create navigation config
2. Map routes to v2
3. Implement role filtering
Report: Navigation implemented

# ui-ux-designer (PARALLEL)
Task: "Design and verify navigation UX"
1. Review navigation flow and usability
2. Verify mobile responsiveness
3. Check accessibility compliance (WCAG 2.1)
4. Validate touch targets (44x44px minimum)
5. Test with screen reader
Report: UX verified, accessibility compliant
```

#### Step 1.4: Apply Multi-Tenant Theming
**Agent**: `Developer-Agent`
```typescript
Task: "Implement multi-tenant theming system"
1. Create /app/v2/providers/theme-provider.tsx
2. Implement tenant detection
3. Apply dynamic CSS variables
4. Test SIGA, FEMA, Stratix themes
Report: Multi-tenant theming implemented
```

#### Step 1.5: Verify Layout Migration
**Agents**: `qa-code-reviewer` + `migration-specialist` (PARALLEL)
```bash
# qa-code-reviewer
Task: "Review v2 layout code quality"
1. Review code structure and patterns
2. Check for best practices
3. Verify type safety
4. Document code issues
Report: Code review complete

# migration-specialist (PARALLEL)
Task: "Verify layout migration completeness"
1. Compare v1 and v2 layouts
2. Document migration gaps
3. Create rollback plan
4. Verify data flow
Report: Migration verification complete
```

---

### Phase 2: Dashboard Implementation (Day 2 Afternoon - Day 3)

#### Step 2.1: Install Dashboard Blocks
**Agent**: `Developer-Agent`
```bash
Task: "Install dashboard blocks"
pnpm dlx shadcn@latest add dashboard-01 dashboard-02 card-01 metric-01 chart-01
Report: Dashboard blocks installed
```

#### Step 2.2: Create Data Adapters
**Agents**: `integration-specialist` + `database-architect` (PARALLEL)
```typescript
# integration-specialist
Task: "Create dashboard data integration adapters"
1. Create /app/v2/lib/adapters/dashboard.ts
2. Map useKPIs() to dashboard props
3. Transform data formats for blocks
4. Handle state management
Report: Integration adapters ready

# database-architect (PARALLEL)
Task: "Optimize database for v2 dashboard"
1. Review dashboard queries
2. Create materialized views for performance
3. Add necessary indexes
4. Optimize for real-time updates
5. Document schema changes
Report: Database optimized for v2
```

#### Step 2.3: Implement CEO Dashboard
**Agent**: `Developer-Agent`
```typescript
Task: "Build CEO dashboard with real data"
1. Create /app/v2/dashboard/page.tsx
2. Integrate KPI cards with live data
3. Add charts and visualizations
4. Connect to real-time updates
Report: CEO dashboard complete
```

#### Step 2.4: Implement Manager Dashboard
**Agents**: `Developer-Agent` + `ui-ux-designer` (PARALLEL)
```typescript
# Developer-Agent
Task: "Build manager dashboard"
1. Create /app/v2/manager/page.tsx
2. Implement area filtering
3. Add team management views
Report: Manager dashboard built

# ui-ux-designer (PARALLEL)
Task: "Optimize manager dashboard UX"
1. Review manager workflows
2. Optimize information hierarchy
3. Verify data visualization clarity
Report: Manager UX optimized
```

#### Step 2.5: Data Analytics Verification
**Agents**: `data-analytics-specialist` + `qa-code-reviewer` (PARALLEL)
```typescript
# data-analytics-specialist
Task: "Verify analytics and KPI calculations"
1. Validate all KPI formulas
2. Verify aggregation logic
3. Check trend calculations
4. Test statistical accuracy
Report: Analytics verified accurate

# qa-code-reviewer (PARALLEL)
Task: "Review dashboard implementation"
1. Code quality review
2. Performance analysis
3. Security check
4. Test data consistency
Report: Dashboard code reviewed
```

---

### Phase 3: Data Tables & Lists (Day 4)

#### Step 3.1: Install Table Blocks
**Agent**: `Developer-Agent`
```bash
Task: "Install table and list blocks"
pnpm dlx shadcn@latest add table-01 table-02 list-01 grid-01
Report: Table blocks installed
```

#### Step 3.2: Create Table Integration
**Agent**: `integration-specialist`
```typescript
Task: "Create table data integration"
1. Create /app/v2/lib/adapters/tables.ts
2. Map initiative/activity data
3. Implement sorting/filtering
4. Handle pagination
Report: Table integration ready
```

#### Step 3.3: Implement Data Tables
**Agents**: `Developer-Agent` + `ui-ux-designer` (PARALLEL)
```typescript
# Developer-Agent
Task: "Implement initiative and activity tables"
1. Create initiative table with table-01
2. Add filtering and sorting
3. Implement bulk actions
Report: Tables implemented

# ui-ux-designer (PARALLEL)
Task: "Optimize table UX and accessibility"
1. Verify table responsiveness
2. Check mobile scrolling
3. Validate keyboard navigation
Report: Table UX optimized
```

---

### Phase 4: Forms & Input (Day 5)

#### Step 4.1: Install Form Blocks
**Agent**: `Developer-Agent`
```bash
Task: "Install form blocks"
pnpm dlx shadcn@latest add form-01 form-02 form-03
Report: Form blocks installed
```

#### Step 4.2: Form Integration & Security
**Agents**: `integration-specialist` + `security-auditor` (PARALLEL)
```typescript
# integration-specialist
Task: "Create form submission integration"
1. Create form adapters
2. Map to API payloads
3. Handle validation
Report: Form integration ready

# security-auditor (PARALLEL)
Task: "Audit form security"
1. Review input validation
2. Check XSS prevention
3. Verify CSRF protection
4. Test injection prevention
Report: Forms secured
```

#### Step 4.3: Implement Forms
**Agent**: `Developer-Agent`
```typescript
Task: "Build initiative creation and file upload forms"
1. Implement multi-step initiative form
2. Add file upload with GCS integration
3. Connect to APIs
Report: Forms implemented
```

---

### Phase 5: Charts & Analytics (Day 6)

#### Step 5.1: Install Chart Blocks
**Agent**: `Developer-Agent`
```bash
Task: "Install chart blocks"
pnpm dlx shadcn@latest add chart-01 chart-02 chart-03
Report: Chart blocks installed
```

#### Step 5.2: Analytics Implementation
**Agents**: `Developer-Agent` + `data-analytics-specialist` (PARALLEL)
```typescript
# Developer-Agent
Task: "Implement analytics dashboard"
1. Create /app/v2/dashboard/analytics/page.tsx
2. Integrate all chart types
3. Add filters and controls
Report: Analytics dashboard built

# data-analytics-specialist (PARALLEL)
Task: "Validate analytics accuracy"
1. Verify calculations
2. Test data aggregations
3. Validate visualizations
4. Check statistical methods
Report: Analytics validated
```

---

### Phase 6: Integration & Testing (Day 7-8)

#### Step 6.1: Complete Integration Testing
**Agents**: `qa-code-reviewer` + `test-coverage-specialist` + `Developer-Agent` (PARALLEL)
```bash
# qa-code-reviewer
Task: "Comprehensive code review and testing"
1. Review all v2 code
2. Test user flows
3. Check code quality
Report: Code review complete

# test-coverage-specialist (PARALLEL)
Task: "Verify test coverage"
1. Run coverage analysis
2. Write missing tests
3. Ensure 80% minimum coverage
Report: Coverage verified

# Developer-Agent (PARALLEL)
Task: "Fix identified issues"
1. Address review findings
2. Fix bugs
3. Optimize code
Report: Issues resolved
```

#### Step 6.2: Performance & Security
**Agents**: `devops-deployment-specialist` + `security-auditor` (PARALLEL)
```typescript
# devops-deployment-specialist
Task: "Optimize performance and monitoring"
1. Run performance audits
2. Optimize bundle size
3. Set up monitoring
4. Configure logging
Report: Performance optimized

# security-auditor (PARALLEL)
Task: "Final security audit"
1. Complete security scan
2. Verify authentication
3. Check data isolation
4. Test authorization
Report: Security verified
```

#### Step 6.3: Migration Validation
**Agent**: `migration-specialist`
```typescript
Task: "Validate complete migration"
1. Verify feature parity
2. Check data consistency
3. Validate rollback plan
4. Document migration gaps
Report: Migration validated
```

---

### Phase 7: Documentation & Rollout (Day 9-10)

#### Step 7.1: Documentation
**Agent**: `technical-documentation-writer`
```typescript
Task: "Create comprehensive v2 documentation"
1. Document architecture changes
2. Create migration guide
3. Write API documentation
4. Create user guides
5. Document rollback procedures
Report: Documentation complete
```

#### Step 7.2: Deployment Setup
**Agent**: `devops-deployment-specialist`
```bash
Task: "Set up deployment pipeline"
1. Create feature flags
2. Configure staging deployment
3. Set up gradual rollout
4. Implement monitoring
Report: Deployment ready
```

#### Step 7.3: Final QA
**Agents**: `qa-code-reviewer` + `test-coverage-specialist` (PARALLEL)
```bash
# qa-code-reviewer
Task: "Final quality assurance"
1. Run final tests
2. Verify all features
3. Check performance
Report: QA complete

# test-coverage-specialist (PARALLEL)
Task: "Final test verification"
1. Run all test suites
2. Verify coverage
3. Test edge cases
Report: Tests passing
```

---

## 📊 Agent Workload Distribution

| Agent | Tasks | Phases | Parallel Opportunities |
|-------|-------|--------|----------------------|
| **Developer-Agent** | 12 | All | 6 parallel tasks |
| **integration-specialist** | 5 | 0,2,3,4 | 4 parallel tasks |
| **ui-ux-designer** | 4 | 1,2,3 | All parallel |
| **qa-code-reviewer** | 5 | 0,2,6,7 | 4 parallel tasks |
| **security-auditor** | 3 | 1,4,6 | 2 parallel tasks |
| **database-architect** | 1 | 2 | Parallel |
| **devops-deployment-specialist** | 3 | 0,6,7 | 2 parallel tasks |
| **data-analytics-specialist** | 2 | 2,5 | All parallel |
| **test-coverage-specialist** | 3 | 0,6,7 | All parallel |
| **migration-specialist** | 2 | 1,6 | 1 parallel |
| **technical-documentation-writer** | 1 | 7 | Solo task |

---

## 🚀 Parallel Execution Matrix

### Maximum Parallel Agents per Phase

| Phase | Parallel Agents | Time Saved |
|-------|----------------|------------|
| Phase 0 | qa-code-reviewer + test-coverage-specialist | 2 hours |
| Phase 1 | Developer + ui-ux-designer, qa-code-reviewer + migration-specialist | 3 hours |
| Phase 2 | integration-specialist + database-architect, Developer + ui-ux-designer, data-analytics-specialist + qa-code-reviewer | 4 hours |
| Phase 3 | Developer + ui-ux-designer | 1 hour |
| Phase 4 | integration-specialist + security-auditor | 1.5 hours |
| Phase 5 | Developer + data-analytics-specialist | 1.5 hours |
| Phase 6 | 3 parallel groups | 4 hours |
| Phase 7 | qa-code-reviewer + test-coverage-specialist | 2 hours |
| **Total** | | **19 hours saved** |

---

## 📝 Agent Spawning Commands

### Example: Spawning Parallel Agents for Phase 2

```typescript
// Spawn integration-specialist and database-architect in parallel
await Promise.all([
  spawnAgent({
    type: 'integration-specialist',
    task: 'Create dashboard data integration adapters',
    context: {
      apiDocs: '/docs/API_REFERENCE.md',
      currentHooks: '/hooks/useKPIs.ts',
      targetBlock: 'dashboard-02'
    }
  }),
  
  spawnAgent({
    type: 'database-architect',
    task: 'Optimize database for v2 dashboard',
    context: {
      schema: '/docs/schema-public.sql',
      queries: '/app/api/kpis/route.ts',
      performanceRequirements: '< 100ms response'
    }
  })
])
```

---

## 🔄 Agent Communication Protocol

### Each Agent Must Report

```typescript
interface AgentReport {
  agent: 'Developer-Agent' | 'ui-ux-designer' | 'integration-specialist' | ...
  phase: number
  task: string
  status: 'started' | 'in-progress' | 'completed' | 'blocked'
  startTime: Date
  endTime?: Date
  filesCreated: string[]
  filesModified: string[]
  dependencies: string[] // Other agents this depends on
  blockers?: string[]
  nextAgent?: string // Who should continue this work
  handoffNotes?: string // What the next agent needs to know
}
```

### Central Coordination Document

```markdown
# docs/v2-migration-coordination.md

## Phase 2 Status
### Active Agents
- integration-specialist: Creating adapters (50% complete)
- database-architect: Optimizing queries (75% complete)

### Completed
- Developer-Agent: Dashboard blocks installed ✅

### Waiting
- ui-ux-designer: Waiting for Developer-Agent

### Handoffs
- integration-specialist → Developer-Agent: "Adapters ready at /lib/v2/adapters/"
```

---

## ✅ Verification Checklist

### After Each Agent Completes

- [ ] Files created/modified documented
- [ ] Tests written and passing
- [ ] Code reviewed by qa-code-reviewer
- [ ] Security checked by security-auditor
- [ ] Documentation updated by technical-documentation-writer
- [ ] Handoff to next agent clear

---

**This corrected version uses only the agents available in your project, with proper task distribution and parallel execution opportunities!**