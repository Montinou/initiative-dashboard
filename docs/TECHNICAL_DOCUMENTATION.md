# Initiative Dashboard - Technical Documentation

## 📋 Overview

This document provides comprehensive technical documentation for the Initiative Dashboard application, including the complete data model migration from legacy schema to the new multi-tenant architecture with enhanced features.

**Version:** 2.0.0  
**Last Updated:** 2025-08-08  
**Migration Status:** ✅ COMPLETE

---

## 🏗️ Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 14)                    │
├─────────────────────────────────────────────────────────────┤
│                    Components & Hooks Layer                  │
│  - ObjectivesView    - useObjectives    - useAuditLog       │
│  - QuartersView      - useQuarters      - useProgressTrack  │
│  - InitiativeForm    - useInitiatives   - useManagerViews   │
├─────────────────────────────────────────────────────────────┤
│                      API Routes Layer                        │
│  /api/objectives  /api/quarters  /api/audit-log             │
│  /api/initiatives /api/areas     /api/manager-dashboard     │
├─────────────────────────────────────────────────────────────┤
│                    Supabase Backend                          │
│  - PostgreSQL Database with RLS                             │
│  - Real-time subscriptions                                  │
│  - Authentication (Supabase Auth)                           │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

- **Multi-Tenancy**: Complete tenant isolation with organization support
- **Row Level Security (RLS)**: Database-level security policies
- **Audit Logging**: Comprehensive activity tracking
- **Strategic Planning**: Objectives and Quarters management
- **Progress Tracking**: Historical progress with analytics
- **Role-Based Access**: CEO, Admin, Manager roles with specific permissions

---

## 📊 Database Schema

### Core Tables Structure

#### 1. **Organizations & Tenants**
```sql
organizations
├── id (uuid, PK)
├── name (text)
├── description (text)
└── timestamps

tenants
├── id (uuid, PK)
├── organization_id (uuid, FK)
├── subdomain (text, UNIQUE)
└── timestamps
```

#### 2. **User Management**
```sql
user_profiles
├── id (uuid, PK)
├── user_id (uuid, FK -> auth.users)
├── tenant_id (uuid, FK)
├── email (text)
├── full_name (text)
├── role (user_role: CEO/Admin/Manager)
├── area_id (uuid, FK, nullable)
└── timestamps
```

#### 3. **Strategic Planning**
```sql
objectives
├── id (uuid, PK)
├── tenant_id (uuid, FK)
├── title (text)
├── description (text)
├── area_id (uuid, FK)
├── created_by (uuid, FK)
└── timestamps

quarters
├── id (uuid, PK)
├── tenant_id (uuid, FK)
├── quarter_name (Q1/Q2/Q3/Q4)
├── start_date (date)
├── end_date (date)
└── timestamps
```

#### 4. **Execution**
```sql
initiatives
├── id (uuid, PK)
├── tenant_id (uuid, FK)
├── area_id (uuid, FK)
├── title (text) -- Changed from 'name'
├── description (text)
├── progress (integer, 0-100)
├── created_by (uuid, FK)
├── start_date (date)
├── due_date (date) -- Changed from 'target_date'
├── completion_date (date)
└── timestamps

activities
├── id (uuid, PK)
├── initiative_id (uuid, FK)
├── title (text)
├── description (text)
├── is_completed (boolean) -- Changed from 'completed'
├── assigned_to (uuid, FK) -- New field
└── timestamps
```

#### 5. **Tracking & Auditing**
```sql
audit_log
├── id (uuid, PK)
├── tenant_id (uuid, FK)
├── user_id (uuid, FK)
├── entity_type (text)
├── entity_id (uuid)
├── action (create/update/delete)
├── changes (jsonb)
├── metadata (jsonb)
├── ip_address (text)
├── user_agent (text)
└── created_at

initiative_progress_history
├── id (uuid, PK)
├── initiative_id (uuid, FK)
├── progress_value (integer)
├── previous_value (integer)
├── changed_by (uuid, FK)
├── change_notes (text)
└── changed_at
```

### Database Views

```sql
manager_dashboard_view  -- Optimized view for manager dashboard
initiative_statistics   -- Aggregated initiative metrics
quarter_performance     -- Quarter-based performance metrics
```

---

## 🔐 Security Model

### Row Level Security (RLS) Policies

#### Tenant Isolation
All data access is automatically filtered by tenant_id:
```sql
-- Example policy for initiatives
CREATE POLICY "Initiatives: Tenant isolation"
  ON public.initiatives FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles 
    WHERE user_id = auth.uid()
  ));
```

#### Role-Based Access
- **CEO**: Full access to all tenant data
- **Admin**: Full access to all tenant data
- **Manager**: Access limited to their assigned area

### Permission Matrix

| Resource | CEO | Admin | Manager |
|----------|-----|-------|---------|
| Organizations | Read | Read | Read |
| All Areas | Full | Full | Read |
| Own Area | Full | Full | Full |
| All Initiatives | Full | Full | Read |
| Own Area Initiatives | Full | Full | Full |
| Objectives | Full | Full | Create/Edit Own |
| Quarters | Full | Full | Read |
| Audit Log | Full | Full | Limited |

---

## 🔄 API Endpoints

### Core APIs

#### Objectives API
```typescript
GET    /api/objectives?tenant_id=x&area_id=y&quarter_id=z
POST   /api/objectives
PATCH  /api/objectives/[id]
DELETE /api/objectives/[id]
```

#### Quarters API
```typescript
GET    /api/quarters?year=2025&include_stats=true
POST   /api/quarters
PATCH  /api/quarters/[id]
DELETE /api/quarters/[id]
```

#### Initiatives API
```typescript
GET    /api/initiatives?tenant_id=x&area_id=y
POST   /api/initiatives
PATCH  /api/initiatives/[id]
DELETE /api/initiatives/[id]
POST   /api/initiatives/[id]/activities
```

#### Audit Log API
```typescript
GET    /api/audit-log?entity_type=x&date_from=y
POST   /api/audit-log
GET    /api/audit-log/export?format=csv
GET    /api/audit-log/[entity_type]/[entity_id]
```

#### Manager Dashboard API
```typescript
GET    /api/manager-dashboard?area_id=x&quarter_id=y
GET    /api/manager-dashboard/team-performance?period=month
POST   /api/activities/[id]/assign
POST   /api/activities/bulk-assign
```

#### Progress Tracking API
```typescript
GET    /api/progress-tracking?initiative_id=x
POST   /api/progress-tracking
POST   /api/progress-tracking/batch
GET    /api/progress-tracking/report?format=csv
```

---

## 🎣 React Hooks

### Data Fetching Hooks

#### useObjectives
```typescript
const { 
  objectives, 
  loading, 
  error, 
  createObjective, 
  updateObjective, 
  deleteObjective,
  linkObjectiveToQuarters,
  linkObjectiveToInitiative
} = useObjectives({ 
  area_id?: string, 
  quarter_id?: string 
})
```

#### useQuarters
```typescript
const { 
  quarters, 
  loading, 
  error, 
  createQuarter, 
  updateQuarter, 
  deleteQuarter,
  createYearQuarters,
  getCurrentQuarter,
  getQuarterByDate
} = useQuarters({ 
  year?: number, 
  include_stats?: boolean 
})
```

#### useInitiatives
```typescript
const { 
  initiatives, 
  loading, 
  error, 
  createInitiative, 
  updateInitiative, 
  deleteInitiative,
  addActivity,
  updateActivity
} = useInitiatives()
```

#### useAuditLog
```typescript
const { 
  entries, 
  loading, 
  error, 
  hasMore,
  logAction, 
  exportToCSV, 
  getEntityAuditTrail
} = useAuditLog({ 
  entity_type?: string,
  entity_id?: string,
  date_from?: string,
  date_to?: string
})
```

#### useProgressTracking
```typescript
const { 
  history, 
  statistics, 
  loading, 
  error,
  recordProgress,
  getProgressTrend,
  getProjectedCompletionDate,
  generateProgressReport,
  batchUpdateProgress
} = useProgressTracking({ 
  initiative_id?: string,
  area_id?: string
})
```

#### useManagerViews
```typescript
const { 
  dashboardData, 
  loading, 
  error,
  getTeamPerformance,
  assignActivity,
  bulkAssignActivities,
  getWorkloadAnalysis,
  getAtRiskInitiatives,
  generateTeamReport
} = useManagerViews({ 
  area_id?: string,
  quarter_id?: string
})
```

#### useTenantContext
```typescript
const { 
  tenant_id,
  organization_id,
  subdomain,
  user_profile,
  permissions,
  refreshContext
} = useTenantContext()

// Permission checking
const canEdit = usePermission('can_edit_all_initiatives')
const canAccessArea = useCanAccessArea(areaId)
const canEditInitiative = useCanEditInitiative(initiativeAreaId)
```

---

## 🧩 Components

### Strategic Planning Components

#### ObjectivesView
- Display and manage strategic objectives
- Filter by quarter and area
- Track progress across linked initiatives
- Support for bulk operations

#### QuartersView
- Quarter planning and management
- Visual timeline with progress indicators
- Auto-creation of year quarters
- Statistics and performance metrics

### Initiative Management

#### EnhancedInitiativeCard
- Updated to support new schema fields
- Displays objective linkage
- Shows activity completion status
- Progress visualization with historical data

#### InitiativeForm
- Create/Edit initiatives with new fields
- Objective selection
- Date range picking (start_date, due_date)
- Activity management integration

### Dashboard Components

#### ManagerDashboard
- Comprehensive manager view
- Team performance metrics
- Workload analysis
- At-risk initiative identification

---

## 🔄 Migration Guide

### Database Migration Steps

1. **Apply migrations in order:**
```bash
# Migrations must be applied sequentially
20240101000001_create_base_tables_and_types.sql
20240101000002_create_auth_sync_trigger.sql
20240101000003_add_foreign_key_constraints.sql
20240101000004_add_audit_function_and_triggers.sql
20240101000005_enable_rls_and_policies.sql
20240101000006_create_optimized_views.sql
20240101000007_create_performance_indexes.sql
20240101000008_populate_test_data.sql
20240101000009_fix_rls_auth_uid.sql
```

2. **Run Supabase migration:**
```bash
supabase db push
```

### Code Migration Changes

#### Field Name Changes
```typescript
// Before
initiative.name → initiative.title
activity.completed → activity.is_completed
initiative.target_date → initiative.due_date

// New fields added
activity.assigned_to
initiative.start_date
initiative.completion_date
initiative.created_by
```

#### Hook Updates
```typescript
// Old
import { useInitiatives } from '@/hooks/useInitiatives'

// New - with additional features
import { useInitiatives } from '@/hooks/useInitiatives'
import { useObjectives } from '@/hooks/useObjectives'
import { useQuarters } from '@/hooks/useQuarters'
import { useTenantContext } from '@/hooks/useTenantContext'
```

---

## 🧪 Testing

### Test Coverage Areas

1. **Multi-tenancy Isolation**
   - Verify tenant data separation
   - Test cross-tenant access prevention
   - Validate RLS policies

2. **Role-Based Access**
   - Test CEO full access
   - Test Manager area restrictions
   - Verify permission boundaries

3. **Audit Trail**
   - Verify all CRUD operations logged
   - Test audit export functionality
   - Validate audit data integrity

4. **Progress Tracking**
   - Test historical tracking
   - Verify statistics calculations
   - Test trend analysis

### Test Commands
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Test database migrations
npm run test:migrations
```

---

## 📈 Performance Optimizations

### Database Indexes
```sql
-- Performance indexes created
idx_initiatives_tenant_area
idx_activities_initiative
idx_audit_log_tenant_entity
idx_progress_history_initiative
idx_user_profiles_tenant_role
```

### Query Optimizations
- Materialized views for dashboard data
- Indexed foreign keys
- Optimized JOIN queries
- Batch operations for bulk updates

### Frontend Optimizations
- React Query caching
- Optimistic updates
- Lazy loading of components
- Memoization of expensive calculations

---

## 🚀 Deployment

### Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

### Production Checklist
- [ ] All migrations applied
- [ ] RLS policies enabled
- [ ] Audit logging active
- [ ] Performance indexes created
- [ ] Environment variables set
- [ ] SSL certificates configured
- [ ] Backup strategy implemented
- [ ] Monitoring enabled

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Tenant Context Not Loading
```typescript
// Ensure user profile has tenant_id
// Check RLS policies for user_profiles table
// Verify auth token is valid
```

#### 2. Permission Denied Errors
```typescript
// Verify user role in user_profiles
// Check RLS policies for affected table
// Ensure tenant_id matches
```

#### 3. Audit Log Not Recording
```typescript
// Check audit_log trigger is enabled
// Verify user has INSERT permission
// Check audit_log table RLS policies
```

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 📝 Change Log

### Version 2.0.0 (2025-08-08)
- Complete schema migration to multi-tenant architecture
- Added strategic objectives and quarters management
- Implemented comprehensive audit logging
- Added progress tracking with history
- Created specialized manager dashboard
- Updated all components to new schema
- Added RLS policies for security
- Implemented role-based permissions

---

**Document maintained by:** Development Team  
**Last reviewed:** 2025-08-08  
**Next review:** 2025-09-08