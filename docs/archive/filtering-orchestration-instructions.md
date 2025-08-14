# Dashboard Filtering Implementation - Agent Orchestration Instructions

## Reference: FILTER-IMPL-2025
**Shared Context**: All agents must use `@docs/filtering-agent-context.md` as reference

---

## PHASE 1: Infrastructure Enhancement (Parallel Execution)
**Timeline**: Day 1-2
**Spawn all agents simultaneously for parallel work**

### Task 1.1: Filter State Enhancement
**Agent**: Developer-Agent
```javascript
Task.launch({
  subagent_type: "Developer-Agent",
  description: "Enhance filter infrastructure",
  prompt: `As Developer Agent working on FILTER-IMPL-2025:
    1. Review @docs/filtering-agent-context.md for GlobalFilterState structure
    2. Enhance /hooks/useFilters.tsx to include:
       - objectiveIds, initiativeIds, assignedTo arrays
       - quarterIds for backward compatibility
       - searchQuery string field
    3. Create /lib/types/filters.ts with centralized filter types
    4. Update FilterState interface to EnhancedFilterState
    5. Ensure URL persistence and localStorage sync work
    Report: Modified files, new types created, any breaking changes`
})
```

### Task 1.2: Database Index Optimization
**Agent**: Database Architect
```javascript
Task.launch({
  subagent_type: "database-architect",
  description: "Optimize DB for filtering",
  prompt: `As Database Architect for FILTER-IMPL-2025:
    1. Review @docs/filtering-agent-context.md database considerations
    2. Create migration script for filter indexes:
       - idx_initiatives_dates ON initiatives(start_date, due_date)
       - idx_objectives_dates ON objectives(start_date, end_date)
       - idx_initiatives_status ON initiatives(status)
       - idx_objectives_priority ON objectives(priority)
       - Search indexes using gin/tsvector
    3. Add composite indexes for tenant_id + common filters
    4. Document query performance impact
    Report: Migration file created, expected performance gains, index strategy`
})
```

### Task 1.3: UI Component Creation
**Agent**: UI/UX Designer
```javascript
Task.launch({
  subagent_type: "ui-ux-designer",
  description: "Create filter components",
  prompt: `As UI/UX Designer for FILTER-IMPL-2025:
    1. Review @docs/filtering-agent-context.md component conventions
    2. Create missing filter components in /components/filters/:
       - UserFilter.tsx (assignee selection with search)
       - ObjectiveFilter.tsx (multi-select with hierarchy)
       - InitiativeFilter.tsx (grouped by area)
       - QuarterFilter.tsx (quarter selector)
       - SearchFilter.tsx (debounced text search)
       - FilterChips.tsx (active filter display)
    3. Follow dark theme with glass morphism
    4. Ensure responsive design and accessibility
    Report: Components created, design decisions, accessibility features`
})
```

### Task 1.4: Filter Utilities Development
**Agent**: Developer Agent (Second Instance)
```javascript
Task.launch({
  subagent_type: "general-purpose",
  description: "Create filter utilities",
  prompt: `As Developer Agent for FILTER-IMPL-2025 utilities:
    1. Review @docs/filtering-agent-context.md for standards
    2. Enhance /lib/utils/filterUtils.ts with:
       - applyFilters() for client-side filtering
       - buildQueryString() for API calls
       - validateFilters() for input validation
    3. Create /lib/utils/filter-url-sync.ts for URL persistence
    4. Create /lib/utils/filter-presets.ts for saved filters
    5. Add debounce utilities for search inputs
    Report: Utility functions created, API patterns, validation rules`
})
```

---

## PHASE 2: API Standardization (Parallel Execution)
**Timeline**: Day 3-4
**Spawn all agents simultaneously**

### Task 2.1: API Enhancement - Objectives & Initiatives
**Agent**: Developer Agent
```javascript
Task.launch({
  subagent_type: "general-purpose",
  description: "Standardize objectives/initiatives APIs",
  prompt: `As Developer Agent for FILTER-IMPL-2025 API standardization:
    1. Review @docs/filtering-agent-context.md StandardQueryParams
    2. Update /app/api/objectives/route.ts:
       - Add status, priority, search filters
       - Implement date range filtering
       - Add pagination and sorting
    3. Update /app/api/initiatives/route.ts:
       - Add date ranges (start_date, due_date)
       - Add status filter with enum validation
       - Add search functionality
    4. Ensure consistent error responses
    5. Maintain backward compatibility
    Report: API changes, new query params, breaking changes if any`
})
```

### Task 2.2: API Enhancement - Activities & Areas
**Agent**: Developer Agent (Second Instance)
```javascript
Task.launch({
  subagent_type: "general-purpose",
  description: "Standardize activities/areas APIs",
  prompt: `As Developer Agent for FILTER-IMPL-2025 API standardization:
    1. Review @docs/filtering-agent-context.md StandardQueryParams
    2. Update /app/api/activities/route.ts:
       - Add date range filtering on created_at
       - Add search by title/description
       - Enhance assigned_to filter
    3. Update /app/api/areas/route.ts:
       - Add is_active filter
       - Add manager filter
       - Add search capability
    4. Implement consistent pagination
    Report: API changes, query optimizations, response formats`
})
```

### Task 2.3: Security Audit for Filters
**Agent**: Security Auditor
```javascript
Task.launch({
  subagent_type: "security-auditor",
  description: "Audit filter security",
  prompt: `As Security Auditor for FILTER-IMPL-2025:
    1. Review @docs/filtering-agent-context.md for context
    2. Audit filter implementations for:
       - SQL injection via search queries
       - XSS in filter display
       - Authorization bypass via filters
       - Tenant isolation in filtered queries
    3. Check input validation and sanitization
    4. Verify RLS policies work with filters
    5. Test for filter-based information disclosure
    Report: Vulnerabilities found, fixes required, security recommendations`
})
```

---

## PHASE 3: Page Integration (Sequential by Priority)
**Timeline**: Day 5-7

### Task 3.1: Priority 1 Pages - Batch 1 (Parallel)
**Spawn all three agents for first batch of pages**

**Agent 1**: Developer Agent - Dashboard & Objectives
```javascript
Task.launch({
  subagent_type: "general-purpose",
  description: "Integrate filters in dashboard/objectives",
  prompt: `As Developer Agent for FILTER-IMPL-2025 page integration:
    1. Review @docs/filtering-agent-context.md Priority 1 pages
    2. Update /dashboard/page.tsx:
       - Add FilterContainer at page header
       - Connect to useFilters hook
       - Apply filters to all data widgets
    3. Update /dashboard/objectives/page.tsx:
       - Add date range, area, status, priority filters
       - Implement quarter selection
       - Add search functionality
    4. Ensure filter persistence across navigation
    Report: Pages updated, filter integration complete, UI changes`
})
```

**Agent 2**: Developer Agent - Initiatives & Activities
```javascript
Task.launch({
  subagent_type: "general-purpose",
  description: "Integrate filters in initiatives/activities",
  prompt: `As Developer Agent for FILTER-IMPL-2025 page integration:
    1. Review @docs/filtering-agent-context.md Priority 1 pages
    2. Update /dashboard/initiatives/page.tsx:
       - Add comprehensive FilterBar
       - Implement progress range slider
       - Add status and created_by filters
    3. Update /dashboard/activities/page.tsx:
       - Replace dropdown with FilterBar
       - Add assigned user filter
       - Add completion status toggle
    4. Test filter combinations
    Report: Pages updated, old code removed, new features added`
})
```

**Agent 3**: Developer Agent - Analytics Pages
```javascript
Task.launch({
  subagent_type: "general-purpose",
  description: "Integrate filters in analytics",
  prompt: `As Developer Agent for FILTER-IMPL-2025 analytics integration:
    1. Review @docs/filtering-agent-context.md analytics pages
    2. Update analytics pages:
       - /dashboard/analytics/area-comparison
       - /dashboard/analytics/progress-distribution
       - /dashboard/analytics/status-distribution
       - /dashboard/analytics/trend-analytics
    3. Add date range and area filters to all
    4. Update charts to respect filters
    5. Add filter-aware data export
    Report: Analytics pages updated, chart changes, export capabilities`
})
```

### Task 3.2: Priority 2 Pages (Parallel)
**Timeline**: Day 8-9

**Agent 1**: Developer Agent - Manager Dashboard
```javascript
Task.launch({
  subagent_type: "general-purpose",
  description: "Add filters to manager dashboard",
  prompt: `As Developer Agent for FILTER-IMPL-2025 manager pages:
    1. Review @docs/filtering-agent-context.md Priority 2 pages
    2. Update /manager-dashboard pages:
       - Add team member selection filter
       - Add initiative status filter
       - Add date range filtering
    3. Implement role-based filter restrictions
    4. Test manager-specific filter logic
    Report: Manager pages updated, role restrictions, filter logic`
})
```

**Agent 2**: Developer Agent - Org Admin Pages
```javascript
Task.launch({
  subagent_type: "general-purpose",
  description: "Add filters to org-admin pages",
  prompt: `As Developer Agent for FILTER-IMPL-2025 admin pages:
    1. Review @docs/filtering-agent-context.md Priority 2 pages
    2. Update /org-admin pages:
       - Users: role, area, status, search filters
       - Invitations: status, date range, email search
       - Areas: active status, manager, metrics
    3. Add admin-only filter options
    4. Implement bulk operations with filters
    Report: Admin pages updated, bulk operations, special filters`
})
```

---

## PHASE 4: Testing & Quality Assurance (Parallel)
**Timeline**: Day 10-11

### Task 4.1: Test Coverage
**Agent**: Test Coverage Specialist
```javascript
Task.launch({
  subagent_type: "test-coverage-specialist",
  description: "Create filter tests",
  prompt: `As Test Coverage Specialist for FILTER-IMPL-2025:
    1. Review @docs/filtering-agent-context.md testing requirements
    2. Create unit tests for:
       - Filter utilities in /lib/utils/
       - Filter hooks in /hooks/
       - Filter components in /components/filters/
    3. Create integration tests for:
       - API endpoints with filters
       - Filter persistence (URL, localStorage)
    4. Create E2E tests for filter workflows
    5. Ensure 70%+ coverage for filter code
    Report: Test files created, coverage report, failing tests`
})
```

### Task 4.2: Performance Testing
**Agent**: Performance Agent
```javascript
Task.launch({
  subagent_type: "general-purpose",
  description: "Test filter performance",
  prompt: `As Performance Agent for FILTER-IMPL-2025:
    1. Review @docs/filtering-agent-context.md performance targets
    2. Test filter query performance:
       - Measure API response times with complex filters
       - Test with large datasets (10k+ records)
       - Check database query execution plans
    3. Test frontend performance:
       - Filter rendering performance
       - Debounce effectiveness
       - Memory usage with many filters
    4. Identify bottlenecks and optimization opportunities
    Report: Performance metrics, bottlenecks found, optimization suggestions`
})
```

### Task 4.3: Final QA Review
**Agent**: QA Engineer
```javascript
Task.launch({
  subagent_type: "qa-code-reviewer",
  description: "Final QA review",
  prompt: `As QA Engineer for FILTER-IMPL-2025 final review:
    1. Review all filter implementations across 20 pages
    2. Test filter combinations and edge cases:
       - Empty results handling
       - Invalid filter values
       - Filter conflicts
       - Cross-page filter persistence
    3. Verify accessibility compliance
    4. Check responsive design on mobile
    5. Test browser compatibility
    Report: Issues found, test results, ready for production status`
})
```

---

## PHASE 5: Documentation & Deployment Prep (Parallel)
**Timeline**: Day 12

### Task 5.1: Technical Documentation
**Agent**: Documentation Agent
```javascript
Task.launch({
  subagent_type: "technical-documentation-writer",
  description: "Document filter system",
  prompt: `As Documentation Agent for FILTER-IMPL-2025:
    1. Create /docs/filtering-system.md with:
       - Architecture overview
       - Component API reference
       - Hook usage examples
       - Filter URL parameters
    2. Update API documentation with filter params
    3. Create user guide for filtering
    4. Document migration from old to new system
    Report: Documentation created, examples provided, migration guide`
})
```

### Task 5.2: Deployment Preparation
**Agent**: DevOps Specialist
```javascript
Task.launch({
  subagent_type: "devops-deployment-specialist",
  description: "Prepare deployment",
  prompt: `As DevOps Specialist for FILTER-IMPL-2025:
    1. Review all changes for deployment readiness
    2. Create deployment checklist:
       - Database migrations to run
       - Environment variables needed
       - Feature flags configuration
       - Rollback procedures
    3. Set up monitoring for filter performance
    4. Configure caching for filter queries
    5. Plan gradual rollout strategy
    Report: Deployment plan, rollback strategy, monitoring setup`
})
```

---

## Orchestration Summary

### Parallel Execution Groups:
1. **Phase 1**: 4 agents working on infrastructure (Day 1-2)
2. **Phase 2**: 3 agents working on API standardization (Day 3-4)
3. **Phase 3.1**: 3 agents on Priority 1 pages (Day 5-7)
4. **Phase 3.2**: 2 agents on Priority 2 pages (Day 8-9)
5. **Phase 4**: 3 agents on testing (Day 10-11)
6. **Phase 5**: 2 agents on documentation/deployment (Day 12)

### Total Timeline: 12 working days
### Total Agent Instances: 19 tasks (some agents used multiple times)

### Success Criteria:
✅ All 20 pages have filtering capability
✅ API response times < 200ms
✅ 70%+ test coverage
✅ Zero security vulnerabilities
✅ Complete documentation
✅ Production-ready deployment plan

### Communication Rules:
1. All agents reference `@docs/filtering-agent-context.md`
2. Update findings section after each task
3. Report blockers immediately
4. Parallel agents coordinate through shared context
5. Sequential phases wait for previous phase completion

---
**Document Version**: 1.0.0
**Created**: 2025-08-13
**Status**: Ready for Execution