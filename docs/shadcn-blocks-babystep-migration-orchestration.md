# shadcn Blocks Babystep Migration with Agent Orchestration Guide

## Executive Summary

This document provides a **detailed, step-by-step migration guide** with parallel agent orchestration to safely migrate from current UI to shadcn blocks. The strategy uses a **parallel v2 approach** where new UI runs alongside existing UI for verification before switching.

**Key Strategy**: Build `/v2` routes parallel to existing routes, verify data consistency, then switch.

---

## 🎯 Migration Strategy Overview

### Core Principles
1. **No Breaking Changes**: Current UI remains functional
2. **Parallel Development**: Build v2 alongside v1
3. **Data Verification**: Compare outputs before switching
4. **Agent Orchestration**: Multiple agents work in parallel
5. **Incremental Testing**: Test each component before moving forward
6. **Rollback Ready**: Can revert at any point

### Route Structure
```
Current Routes          →  New V2 Routes
/dashboard             →  /dashboardv2
/dashboard/objectives  →  /dashboardv2/objectives
/dashboard/initiatives →  /dashboardv2/initiatives
/manager              →  /managerv2
```

---

## 📋 Phase 0: Foundation & Setup (Day 1 Morning)

### Step 0.1: Initialize Project Structure
**Agent**: DevOps Engineer
**Time**: 30 minutes

```bash
# Agent Prompt for DevOps Engineer
Task: "Create v2 migration structure"
1. Create feature branch 'feature/shadcn-blocks-migration'
2. Create /app/v2 directory structure
3. Set up environment variables for feature flags
4. Create migration tracking document
5. Set up parallel routing

Report: Branch created, structure ready, routes configured
```

**Manual Steps**:
```bash
git checkout -b feature/shadcn-blocks-migration
mkdir -p app/v2/{dashboard,manager,api}
touch app/v2/layout.tsx
```

### Step 0.2: Install shadcn and Initialize
**Agent**: Developer-Agent
**Time**: 30 minutes

```bash
# Agent Prompt for Developer
Task: "Initialize shadcn with proper configuration"
1. Run: pnpm dlx shadcn@latest init
2. Configure with these options:
   - Style: new-york
   - Base color: slate
   - CSS variables: yes
   - RSC: yes
3. Create components.json
4. Verify installation
5. Test with one basic component

Report: shadcn initialized, config verified
```

### Step 0.3: Create API Compatibility Layer
**Agent**: Integration Specialist
**Time**: 1 hour

```typescript
# Agent Prompt for Integration Specialist
Task: "Create API adapter layer for v2 components"
1. Create /lib/api/v2/adapters.ts
2. Map current API responses to block data structures
3. Create type definitions for block props
4. Implement data transformation functions
5. Create tests for adapters

Example adapter needed:
- Current: useInitiatives() returns {id, title, progress}
- Block needs: {id, name, value, trend, status}

Report: Adapters created, types defined, transformations tested
```

### Step 0.4: Set Up Parallel Testing Infrastructure
**Agents**: QA Engineer + Test Specialist (PARALLEL)
**Time**: 1 hour

```bash
# Agent Prompt for QA Engineer
Task: "Set up v2 testing infrastructure"
1. Create /tests/v2 directory
2. Set up visual regression tests for v2
3. Create data consistency tests
4. Set up E2E test structure
Report: Testing infrastructure ready

# Agent Prompt for Test Specialist (PARALLEL)
Task: "Create comparison tests between v1 and v2"
1. Create side-by-side comparison tests
2. Set up data validation tests
3. Create performance benchmarks
4. Document test coverage requirements
Report: Comparison framework ready
```

---

## 📦 Phase 1: Core Layout & Navigation (Day 1 Afternoon - Day 2 Morning)

### Step 1.1: Install Core Layout Blocks
**Agent**: Developer-Agent
**Time**: 30 minutes

```bash
# Agent Prompt
Task: "Install and configure core layout blocks"
Commands to run:
pnpm dlx shadcn@latest add shell-01
pnpm dlx shadcn@latest add sidebar-01
pnpm dlx shadcn@latest add navbar-01
pnpm dlx shadcn@latest add breadcrumb-01

Then:
1. Create /app/v2/layout.tsx using shell-01
2. Configure sidebar-01 with our navigation items
3. Add tenant switcher to navbar-01
4. Test layout renders correctly

Report: Layout blocks installed and configured
```

### Step 1.2: Connect Authentication
**Agent**: Security Auditor
**Time**: 1 hour

```typescript
# Agent Prompt for Security Auditor
Task: "Integrate authentication with v2 layout"
1. Review current auth flow in /lib/api-auth-helper.ts
2. Create /app/v2/lib/auth.ts adapter
3. Connect shell-01 with authentication
4. Implement role-based guards
5. Test with different user roles

Critical: Maintain existing auth security
Report: Auth integrated, roles verified
```

### Step 1.3: Implement Navigation & Routing
**Agents**: Developer + UI/UX Designer (PARALLEL)
**Time**: 2 hours

```typescript
# Agent Prompt for Developer
Task: "Implement v2 navigation structure"
1. Create navigation config in /app/v2/config/navigation.ts
2. Map all current routes to v2 routes
3. Implement role-based menu filtering
4. Add breadcrumb generation
Report: Navigation implemented

# Agent Prompt for UI/UX Designer (PARALLEL)
Task: "Verify navigation UX and accessibility"
1. Test navigation flow
2. Verify mobile responsiveness
3. Check keyboard navigation
4. Validate ARIA labels
5. Test with screen reader
Report: UX verified, accessibility compliant
```

### Step 1.4: Apply Multi-Tenant Theming
**Agent**: Developer-Agent
**Time**: 2 hours

```typescript
# Agent Prompt
Task: "Implement multi-tenant theming for v2"
1. Create /app/v2/providers/theme-provider.tsx
2. Implement tenant detection from subdomain
3. Apply theme CSS variables dynamically
4. Create theme wrapper component
5. Test all tenant themes (SIGA, FEMA, Stratix)

Code structure needed:
- Detect tenant from window.location.hostname
- Apply data-theme attribute
- Override CSS variables
- Test theme switching

Report: Theming system implemented, all tenants verified
```

### Step 1.5: Verify Layout Parity
**Agents**: QA Engineer + Developer (PARALLEL)
**Time**: 1 hour

```bash
# Agent Prompt for QA Engineer
Task: "Compare v1 and v2 layouts"
1. Take screenshots of v1 layout
2. Take screenshots of v2 layout
3. Compare visual differences
4. Document any discrepancies
Report: Visual comparison complete

# Agent Prompt for Developer (PARALLEL)
Task: "Fix layout discrepancies"
1. Address issues found by QA
2. Ensure pixel-perfect match where needed
3. Document intentional improvements
Report: Layout parity achieved
```

---

## 🎯 Phase 2: Dashboard Implementation (Day 2 Afternoon - Day 3)

### Step 2.1: Install Dashboard Blocks
**Agent**: Developer-Agent
**Time**: 30 minutes

```bash
# Agent Prompt
Task: "Install all dashboard blocks"
Commands:
pnpm dlx shadcn@latest add dashboard-01
pnpm dlx shadcn@latest add dashboard-02
pnpm dlx shadcn@latest add card-01
pnpm dlx shadcn@latest add metric-01
pnpm dlx shadcn@latest add chart-01

Create /app/v2/dashboard/page.tsx
Report: Dashboard blocks installed
```

### Step 2.2: Create API Data Adapters
**Agents**: Integration Specialist + database-architect (PARALLEL)
**Time**: 2 hours

```typescript
# Agent Prompt for Integration Specialist
Task: "Create dashboard data adapters"
1. Create /app/v2/lib/adapters/dashboard.ts
2. Map useKPIs() to dashboard-02 props
3. Map useInitiatives() to card components
4. Transform chart data formats
5. Handle loading and error states

Example transformation:
Input: {initiatives: [{id, title, progress}]}
Output: {cards: [{id, title, value: progress, icon, trend}]}

Report: Adapters created and tested

# Agent Prompt for database-architect (PARALLEL)
Task: "Optimize dashboard queries for v2"
1. Review current dashboard queries
2. Create optimized views if needed
3. Add proper indexes
4. Test query performance
5. Document any schema changes
Report: Queries optimized, performance improved
```

### Step 2.3: Implement CEO Dashboard
**Agent**: Developer-Agent
**Time**: 3 hours

```typescript
# Agent Prompt
Task: "Build CEO dashboard at /v2/dashboard"
1. Create /app/v2/dashboard/page.tsx
2. Use dashboard-02 as base
3. Integrate KPI cards with real data
4. Add initiative overview section
5. Implement area comparison chart
6. Add recent activity feed

Connect to APIs:
- useKPIs() for metrics
- useInitiatives() for cards
- useActivities() for feed
- useAreas() for comparison

Test with real data
Report: CEO dashboard complete with live data
```

### Step 2.4: Implement Manager Dashboard
**Agents**: Developer + Manager Expert (PARALLEL)
**Time**: 3 hours

```typescript
# Agent Prompt for Developer
Task: "Build manager dashboard at /v2/manager"
1. Create /app/v2/manager/page.tsx
2. Use dashboard-04 block
3. Add area filtering
4. Implement team view
5. Add initiative management
Report: Manager dashboard implemented

# Agent Prompt for Manager Expert (PARALLEL)
Task: "Verify manager-specific features"
1. Test area-based data filtering
2. Verify permission boundaries
3. Test team member views
4. Validate initiative editing
Report: Manager features verified
```

### Step 2.5: Data Consistency Verification
**Agents**: QA Engineer + Data Analyst (PARALLEL)
**Time**: 2 hours

```typescript
# Agent Prompt for QA Engineer
Task: "Compare v1 and v2 dashboard data"
1. Create test script to fetch data from both
2. Compare all metrics
3. Verify calculations match
4. Test real-time updates
5. Document any differences
Report: Data consistency verified

# Agent Prompt for Data Analyst (PARALLEL)
Task: "Validate business logic"
1. Verify KPI calculations
2. Check progress aggregations
3. Validate trend calculations
4. Test edge cases
Report: Business logic validated
```

---

## 📊 Phase 3: Data Tables & Lists (Day 4)

### Step 3.1: Install Table Blocks
**Agent**: Developer-Agent
**Time**: 30 minutes

```bash
# Agent Prompt
Task: "Install table and list blocks"
Commands:
pnpm dlx shadcn@latest add table-01
pnpm dlx shadcn@latest add table-02
pnpm dlx shadcn@latest add list-01
pnpm dlx shadcn@latest add grid-01

Report: Table blocks installed
```

### Step 3.2: Create Table Adapters
**Agent**: Integration Specialist
**Time**: 2 hours

```typescript
# Agent Prompt
Task: "Create table data adapters"
1. Create /app/v2/lib/adapters/tables.ts
2. Map initiative data to table format
3. Map activity data to list format
4. Handle sorting and filtering
5. Implement pagination

Table column mapping needed:
- Initiative: id, title, progress, status, area, dueDate
- Activity: id, title, assignee, completed, initiative

Report: Table adapters ready
```

### Step 3.3: Implement Initiative Table
**Agents**: Developer + UI/UX Designer (PARALLEL)
**Time**: 2 hours

```typescript
# Agent Prompt for Developer
Task: "Implement initiatives table"
1. Create /app/v2/dashboard/initiatives/page.tsx
2. Use table-01 with our data
3. Add filtering (status, priority, area)
4. Implement sorting
5. Add bulk actions
Report: Initiative table complete

# Agent Prompt for UI/UX Designer (PARALLEL)
Task: "Optimize table UX"
1. Test table responsiveness
2. Verify mobile scroll
3. Check touch targets
4. Validate accessibility
Report: Table UX optimized
```

### Step 3.4: Implement Activity Lists
**Agent**: Developer-Agent
**Time**: 2 hours

```typescript
# Agent Prompt
Task: "Implement activity lists"
1. Create activity list component
2. Use list-01 block
3. Add completion toggling
4. Implement assignee display
5. Add edit/delete actions
6. Test with real data

Report: Activity lists implemented
```

---

## 📝 Phase 4: Forms & Input (Day 5)

### Step 4.1: Install Form Blocks
**Agent**: Developer-Agent
**Time**: 30 minutes

```bash
# Agent Prompt
Task: "Install form blocks"
Commands:
pnpm dlx shadcn@latest add form-01
pnpm dlx shadcn@latest add form-02
pnpm dlx shadcn@latest add form-03

Report: Form blocks installed
```

### Step 4.2: Create Form Adapters
**Agents**: Integration Specialist + Developer (PARALLEL)
**Time**: 3 hours

```typescript
# Agent Prompt for Integration Specialist
Task: "Create form submission adapters"
1. Create /app/v2/lib/adapters/forms.ts
2. Map form data to API payloads
3. Handle validation errors
4. Implement file upload adapter
5. Test all form submissions
Report: Form adapters ready

# Agent Prompt for Developer (PARALLEL)
Task: "Implement form validation"
1. Create Zod schemas for all forms
2. Implement client validation
3. Add server validation
4. Create error handling
Report: Validation implemented
```

### Step 4.3: Implement Initiative Creation Form
**Agent**: Developer-Agent
**Time**: 3 hours

```typescript
# Agent Prompt
Task: "Build initiative creation form"
1. Create /app/v2/dashboard/initiatives/new/page.tsx
2. Use form-01 for multi-step form
3. Implement:
   - Basic info step
   - Objectives linking step
   - Activities step
   - Review step
4. Connect to API
5. Test submission flow

Report: Initiative form complete
```

### Step 4.4: Implement File Upload
**Agents**: Developer + Integration Specialist (PARALLEL)
**Time**: 2 hours

```typescript
# Agent Prompt for Developer
Task: "Implement OKR file upload"
1. Use form-03 for file upload
2. Add drag-and-drop
3. Show upload progress
4. Handle CSV parsing
Report: File upload implemented

# Agent Prompt for Integration Specialist (PARALLEL)
Task: "Connect to GCS"
1. Implement GCS upload
2. Handle file validation
3. Process CSV data
4. Test with sample files
Report: GCS integration complete
```

---

## 📈 Phase 5: Charts & Analytics (Day 6)

### Step 5.1: Install Chart Blocks
**Agent**: Developer-Agent
**Time**: 30 minutes

```bash
# Agent Prompt
Task: "Install chart blocks"
Commands:
pnpm dlx shadcn@latest add chart-01
pnpm dlx shadcn@latest add chart-02
pnpm dlx shadcn@latest add chart-03

Report: Chart blocks installed
```

### Step 5.2: Create Chart Adapters
**Agent**: Data Analytics Specialist
**Time**: 2 hours

```typescript
# Agent Prompt
Task: "Create chart data adapters"
1. Create /app/v2/lib/adapters/charts.ts
2. Transform data for:
   - Progress charts
   - Area comparison
   - Status distribution
   - Trend analysis
3. Handle empty states
4. Test with real data

Report: Chart adapters ready
```

### Step 5.3: Implement Analytics Dashboard
**Agents**: Developer + Data Analytics Specialist (PARALLEL)
**Time**: 3 hours

```typescript
# Agent Prompt for Developer
Task: "Build analytics dashboard"
1. Create /app/v2/dashboard/analytics/page.tsx
2. Implement all chart types
3. Add date range filters
4. Connect to real data
Report: Analytics dashboard complete

# Agent Prompt for Data Analytics Specialist (PARALLEL)
Task: "Verify analytics accuracy"
1. Validate calculations
2. Check aggregations
3. Verify trends
4. Test edge cases
Report: Analytics verified
```

---

## 🔄 Phase 6: Integration & Testing (Day 7-8)

### Step 6.1: Complete Integration Testing
**Agents**: QA Engineer + Test Specialist + Developer (PARALLEL)
**Time**: 4 hours

```bash
# Agent Prompt for QA Engineer
Task: "Run comprehensive v2 tests"
1. Test all user flows
2. Test role-based access
3. Test tenant switching
4. Document issues
Report: Testing complete, issues logged

# Agent Prompt for Test Specialist (PARALLEL)
Task: "Run comparison tests"
1. Compare v1 vs v2 outputs
2. Verify data consistency
3. Check performance metrics
4. Create test report
Report: Comparison testing complete

# Agent Prompt for Developer (PARALLEL)
Task: "Fix identified issues"
1. Address QA findings
2. Fix data inconsistencies
3. Optimize performance issues
4. Verify fixes
Report: Issues resolved
```

### Step 6.2: Performance Optimization
**Agents**: Performance Agent + DevOps Engineer (PARALLEL)
**Time**: 3 hours

```typescript
# Agent Prompt for Performance Agent
Task: "Optimize v2 performance"
1. Run performance audits
2. Identify bottlenecks
3. Implement lazy loading
4. Optimize bundle size
5. Test improvements
Report: Performance optimized

# Agent Prompt for DevOps Engineer (PARALLEL)
Task: "Set up monitoring"
1. Add performance monitoring
2. Set up error tracking
3. Configure analytics
4. Create dashboards
Report: Monitoring configured
```

### Step 6.3: Security Audit
**Agent**: Security Auditor
**Time**: 2 hours

```typescript
# Agent Prompt
Task: "Security audit of v2"
1. Review authentication flow
2. Check authorization
3. Verify data isolation
4. Test XSS prevention
5. Check CSRF protection
6. Document findings

Report: Security audit complete
```

---

## 🚀 Phase 7: Staged Rollout (Day 9-10)

### Step 7.1: Create Feature Flags
**Agent**: DevOps Engineer
**Time**: 1 hour

```typescript
# Agent Prompt
Task: "Implement feature flags for v2"
1. Create feature flag system
2. Add user percentage rollout
3. Create override mechanism
4. Test flag toggling
5. Document usage

Report: Feature flags ready
```

### Step 7.2: Deploy to Staging
**Agents**: DevOps Engineer + QA Engineer (PARALLEL)
**Time**: 2 hours

```bash
# Agent Prompt for DevOps Engineer
Task: "Deploy v2 to staging"
1. Build v2 for staging
2. Deploy with feature flags
3. Configure monitoring
4. Test deployment
Report: Staging deployment complete

# Agent Prompt for QA Engineer (PARALLEL)
Task: "Test staging deployment"
1. Run smoke tests
2. Test all tenants
3. Verify data flow
4. Check performance
Report: Staging verified
```

### Step 7.3: Gradual Production Rollout
**Agent**: DevOps Engineer
**Time**: 4 hours (spread over days)

```bash
# Agent Prompt
Task: "Gradual production rollout"
Day 1: Enable for 5% of users
Day 2: Enable for 25% of users
Day 3: Enable for 50% of users
Day 4: Enable for 100% of users

Monitor metrics at each stage
Report: Rollout progress and metrics
```

---

## 📊 Agent Orchestration Matrix

### Parallel Execution Opportunities

| Phase | Parallel Agents | Tasks | Time Saved |
|-------|----------------|-------|------------|
| Setup | DevOps + Integration + QA | Infrastructure + API + Testing | 2 hours |
| Layout | Developer + UI/UX + Security | Build + Design + Auth | 3 hours |
| Dashboard | Integration + DB Architect | Adapters + Queries | 2 hours |
| Tables | Developer + UI/UX | Implementation + UX | 1 hour |
| Forms | Integration + Developer | Adapters + Validation | 2 hours |
| Testing | QA + Test + Developer | Testing + Fixes | 4 hours |
| **Total** | | | **14 hours saved** |

### Agent Communication Protocol

```typescript
// Each agent must document:
interface AgentReport {
  agent: string
  task: string
  startTime: Date
  endTime: Date
  filesCreated: string[]
  filesModified: string[]
  apisUsed: string[]
  blocksUsed: string[]
  issues: string[]
  decisions: string[]
  nextSteps: string[]
}

// Central tracking document
// docs/migration-progress.md
```

---

## 🔍 Data Verification Checklist

### For Each Component Migration

- [ ] Data fetching works
- [ ] Data transformation correct
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Empty states handled
- [ ] Real-time updates work
- [ ] Pagination works
- [ ] Sorting works
- [ ] Filtering works
- [ ] Search works

### Side-by-Side Testing

```typescript
// Test script for data comparison
async function compareV1V2Data(endpoint: string) {
  const v1Data = await fetch(`/api/${endpoint}`)
  const v2Data = await fetch(`/api/v2/${endpoint}`)
  
  return {
    match: JSON.stringify(v1Data) === JSON.stringify(v2Data),
    v1: v1Data,
    v2: v2Data,
    differences: findDifferences(v1Data, v2Data)
  }
}
```

---

## 🚦 Go/No-Go Decision Points

### After Each Phase

1. **Data Consistency**: Do v1 and v2 show same data?
2. **Feature Parity**: Are all features working?
3. **Performance**: Is v2 as fast or faster?
4. **User Experience**: Is UX maintained or improved?
5. **Security**: Are all security measures in place?

### Rollback Triggers

- Data inconsistency > 1%
- Performance degradation > 10%
- Critical bug in production
- Security vulnerability found
- User complaints > threshold

---

## 📝 Documentation Requirements

### Each Agent Must Document

1. **Approach Taken**
   - Why this approach
   - Alternatives considered
   - Trade-offs made

2. **Implementation Details**
   - Code structure
   - Patterns used
   - Dependencies added

3. **Testing Performed**
   - Test cases covered
   - Edge cases tested
   - Performance benchmarks

4. **Known Issues**
   - Limitations
   - Future improvements
   - Technical debt

### Central Documentation

```markdown
# docs/v2-migration-log.md

## Phase 1: Layout
**Date**: [Date]
**Agents**: Developer, UI/UX
**Status**: Complete

### Developer Report
- Implemented shell-01 for layout
- Added tenant theming
- Connected authentication
- Files: /app/v2/layout.tsx

### UI/UX Report
- Verified accessibility
- Tested responsive design
- Approved visual design
- Issues: None

### Data Verification
- [ ] Navigation items match
- [ ] User menu works
- [ ] Tenant switching works
```

---

## 🎯 Success Metrics

### Technical Metrics
- ✅ 100% feature parity with v1
- ✅ < 10ms difference in API response
- ✅ < 5% difference in bundle size
- ✅ 100% test coverage
- ✅ Zero critical bugs

### Business Metrics
- ✅ No increase in user complaints
- ✅ No decrease in user engagement
- ✅ Improved developer velocity
- ✅ Reduced maintenance time

### Rollout Metrics
- ✅ < 0.1% error rate increase
- ✅ < 5% performance degradation
- ✅ > 95% user satisfaction
- ✅ Zero data loss incidents

---

## 🚀 Quick Start Commands

```bash
# Day 1: Setup
git checkout -b feature/shadcn-blocks-migration
pnpm dlx shadcn@latest init
mkdir -p app/v2

# Install all blocks at once
pnpm dlx shadcn@latest add \
  shell-01 sidebar-01 navbar-01 \
  dashboard-01 dashboard-02 \
  table-01 form-01 chart-01

# Run v2 in parallel
pnpm dev
# Visit: http://localhost:3000/v2/dashboard

# Compare v1 and v2
open http://localhost:3000/dashboard
open http://localhost:3000/v2/dashboard
```

---

## 📋 Daily Standup Template

```markdown
## Day [X] Standup

### Yesterday's Progress
- Agent 1: Completed [task]
- Agent 2: Completed [task]
- Parallel work saved: [X hours]

### Today's Plan
- Agent 1: Will work on [task]
- Agent 2: Will work on [task]
- Parallel execution: [tasks]

### Blockers
- [Any blockers]

### Data Verification
- Components tested: [list]
- Data consistency: [pass/fail]
- Issues found: [count]
```

---

## 🔧 Troubleshooting Guide

### Common Issues & Solutions

| Issue | Solution | Agent |
|-------|----------|-------|
| Data mismatch v1/v2 | Check adapter transformations | Integration Specialist |
| Theme not applying | Verify CSS variables | Developer |
| Auth not working | Check middleware | Security Auditor |
| Slow performance | Analyze bundle | Performance Agent |
| Tests failing | Update test fixtures | QA Engineer |

---

## Final Cutover Plan

### Day 10: Final Switch

1. **Morning**: Final v2 testing
2. **Afternoon**: Update routes
   ```typescript
   // app/dashboard/page.tsx
   export { default } from '@/app/v2/dashboard/page'
   ```
3. **Evening**: Monitor metrics
4. **Next Day**: Remove v1 code

### Rollback Plan

```bash
# If issues arise
git revert [commit]
pnpm build
pnpm deploy
```

---

**Migration Success Formula**:
- Babysteps ✅
- Parallel agents ✅  
- Data verification ✅
- Gradual rollout ✅
- Documentation ✅
- Rollback ready ✅

**Result**: Safe, efficient migration with zero downtime!