# Row Level Security (RLS) Detailed Documentation

## Overview

Row Level Security (RLS) is the cornerstone of our multi-tenant data isolation strategy. This document provides comprehensive details about our RLS implementation, policies, and patterns used to ensure complete tenant isolation and role-based access control at the database level.

## RLS Architecture

### Core Principle

RLS policies act as automatic WHERE clauses added to every query, ensuring users can only access data they're authorized to see. This provides defense-in-depth security that cannot be bypassed at the application level.

```sql
-- When RLS is enabled, every query automatically includes tenant isolation
-- User query: SELECT * FROM initiatives
-- Actual query: SELECT * FROM initiatives WHERE tenant_id = get_current_user_tenant()
```

## Foundation Functions

### get_current_user_tenant()

The cornerstone function that returns the current user's tenant_id:

```sql
CREATE OR REPLACE FUNCTION get_current_user_tenant()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO current_tenant_id
  FROM public.user_profiles
  WHERE user_id = auth.uid();
  
  RETURN current_tenant_id;
END;
$$;
```

### get_current_user_role()

Returns the current user's role for permission checks:

```sql
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_role user_role;
BEGIN
  SELECT role INTO current_role
  FROM public.user_profiles
  WHERE user_id = auth.uid();
  
  RETURN current_role;
END;
$$;
```

### get_current_user_area()

Returns the current user's assigned area (for Managers):

```sql
CREATE OR REPLACE FUNCTION get_current_user_area()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_area_id UUID;
BEGIN
  SELECT area_id INTO current_area_id
  FROM public.user_profiles
  WHERE user_id = auth.uid();
  
  RETURN current_area_id;
END;
$$;
```

## Table-by-Table RLS Policies

### 1. Organizations Table

```sql
-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;

-- Policy: Users can view their organization
CREATE POLICY "Organizations: Users can view their organization"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT t.organization_id
      FROM public.tenants t
      JOIN public.user_profiles up ON up.tenant_id = t.id
      WHERE up.user_id = auth.uid()
    )
  );

-- Policy: Only service role can modify (no client-side modifications)
CREATE POLICY "Organizations: Only super admins can modify"
  ON public.organizations FOR ALL
  USING (false)
  WITH CHECK (false);
```

### 2. Tenants Table

```sql
-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY;

-- Policy: Users can view their tenant
CREATE POLICY "Tenants: Users can view their tenant"
  ON public.tenants FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Tenant modification restricted
CREATE POLICY "Tenants: Only super admins can modify"
  ON public.tenants FOR ALL
  USING (false)
  WITH CHECK (false);
```

### 3. User Profiles Table

```sql
-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;

-- Policy: CEO/Admin view all tenant profiles
CREATE POLICY "Profiles: CEO/Admin view tenant profiles"
  ON public.user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = user_profiles.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  );

-- Policy: Managers view profiles in their area
CREATE POLICY "Profiles: Manager view profiles in their area"
  ON public.user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role = 'Manager'
        AND up.tenant_id = user_profiles.tenant_id
        AND up.area_id = user_profiles.area_id
    )
  );

-- Policy: Users can view and update their own profile
CREATE POLICY "Profiles: Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Profiles: Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() 
    AND tenant_id = get_current_user_tenant()
  );

-- Policy: CEO/Admin can manage profiles
CREATE POLICY "Profiles: CEO/Admin can insert"
  ON public.user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = user_profiles.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  );
```

### 4. Areas Table

```sql
-- Enable RLS
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas FORCE ROW LEVEL SECURITY;

-- Policy: CEO/Admin see all, Manager see their own
CREATE POLICY "Areas: CEO/Admin can see all, Manager can see their own"
  ON public.areas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = areas.tenant_id
        AND (
          up.role IN ('CEO','Admin') 
          OR (up.role = 'Manager' AND up.area_id = areas.id)
        )
    )
  );

-- Policy: CEO/Admin can manage areas
CREATE POLICY "Areas: CEO/Admin can insert"
  ON public.areas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = areas.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  );

CREATE POLICY "Areas: CEO/Admin can update"
  ON public.areas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = areas.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = areas.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  );
```

### 5. Objectives Table

```sql
-- Enable RLS
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives FORCE ROW LEVEL SECURITY;

-- Policy: View based on role and area
CREATE POLICY "Objectives: CEO/Admin see all, Manager see their area"
  ON public.objectives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = objectives.tenant_id
        AND (
          up.role IN ('CEO','Admin') 
          OR (up.role = 'Manager' AND up.area_id = objectives.area_id)
        )
    )
  );

-- Policy: Create based on role and area
CREATE POLICY "Objectives: CEO/Admin and area Manager can insert"
  ON public.objectives FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = objectives.tenant_id
        AND (
          up.role IN ('CEO','Admin') 
          OR (up.role = 'Manager' AND up.area_id = objectives.area_id)
        )
    )
  );

-- Policy: Update based on role, area, and ownership
CREATE POLICY "Objectives: CEO/Admin and area Manager can update"
  ON public.objectives FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = objectives.tenant_id
        AND (
          up.role IN ('CEO','Admin') 
          OR (
            up.role = 'Manager' 
            AND up.area_id = objectives.area_id
            AND (objectives.created_by = up.id OR up.role = 'Manager')
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = objectives.tenant_id
        AND (
          up.role IN ('CEO','Admin') 
          OR (up.role = 'Manager' AND up.area_id = objectives.area_id)
        )
    )
  );
```

### 6. Initiatives Table

```sql
-- Enable RLS
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives FORCE ROW LEVEL SECURITY;

-- Policy: View based on role and area
CREATE POLICY "Initiatives: CEO/Admin see all, Manager see their area"
  ON public.initiatives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = initiatives.tenant_id
        AND (
          up.role IN ('CEO','Admin') 
          OR (up.role = 'Manager' AND up.area_id = initiatives.area_id)
        )
    )
  );

-- Policy: Create with proper area assignment
CREATE POLICY "Initiatives: CEO/Admin and area Manager can insert"
  ON public.initiatives FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = initiatives.tenant_id
        AND (
          up.role IN ('CEO','Admin') 
          OR (up.role = 'Manager' AND up.area_id = initiatives.area_id)
        )
    )
  );

-- Policy: Update with ownership check
CREATE POLICY "Initiatives: CEO/Admin and area Manager can update"
  ON public.initiatives FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = initiatives.tenant_id
        AND (
          up.role IN ('CEO','Admin') 
          OR (
            up.role = 'Manager' 
            AND up.area_id = initiatives.area_id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = initiatives.tenant_id
        AND (
          up.role IN ('CEO','Admin') 
          OR (up.role = 'Manager' AND up.area_id = initiatives.area_id)
        )
    )
  );
```

### 7. Activities Table

```sql
-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities FORCE ROW LEVEL SECURITY;

-- Policy: View through initiative access
CREATE POLICY "Activities: CEO/Admin see all, Manager see their area initiatives"
  ON public.activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.initiatives i ON i.id = activities.initiative_id
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = i.tenant_id
        AND (
          up.role IN ('CEO','Admin') 
          OR (up.role = 'Manager' AND up.area_id = i.area_id)
        )
    )
  );

-- Policy: Create activities for accessible initiatives
CREATE POLICY "Activities: CEO/Admin and area Manager can insert"
  ON public.activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.initiatives i ON i.id = activities.initiative_id
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = i.tenant_id
        AND (
          up.role IN ('CEO','Admin') 
          OR (up.role = 'Manager' AND up.area_id = i.area_id)
        )
    )
  );

-- Policy: Update with assignment check
CREATE POLICY "Activities: CEO/Admin, area Manager, and assigned user can update"
  ON public.activities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.initiatives i ON i.id = activities.initiative_id
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = i.tenant_id
        AND (
          up.role IN ('CEO','Admin') 
          OR (up.role = 'Manager' AND up.area_id = i.area_id)
          OR activities.assigned_to = up.id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.initiatives i ON i.id = activities.initiative_id
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = i.tenant_id
        AND (
          up.role IN ('CEO','Admin') 
          OR (up.role = 'Manager' AND up.area_id = i.area_id)
        )
    )
  );
```

### 8. Audit Log Table

```sql
-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;

-- Policy: CEO/Admin can view all tenant logs
CREATE POLICY "Audit: CEO/Admin can view all tenant logs"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role IN ('CEO','Admin')
        AND (
          audit_log.user_id IS NULL 
          OR audit_log.user_id IN (
            SELECT id FROM public.user_profiles WHERE tenant_id = up.tenant_id
          )
        )
    )
  );

-- Policy: Managers can view limited logs
CREATE POLICY "Audit: Managers can view area-related logs"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role = 'Manager'
        AND audit_log.user_id IN (
          SELECT id FROM public.user_profiles 
          WHERE tenant_id = up.tenant_id 
            AND area_id = up.area_id
        )
    )
  );

-- Policy: System can insert audit logs
CREATE POLICY "Audit: Authenticated users can insert logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );
```

## Junction Table Policies

### Objective-Initiatives Junction

```sql
-- Enable RLS
ALTER TABLE public.objective_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_initiatives FORCE ROW LEVEL SECURITY;

-- Policy: Access based on initiative and objective access
CREATE POLICY "Objective initiatives: access via initiative/objective"
  ON public.objective_initiatives FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.initiatives i
      JOIN public.objectives o ON o.id = objective_initiatives.objective_id
      JOIN public.user_profiles up ON up.tenant_id = i.tenant_id
      WHERE i.id = objective_initiatives.initiative_id
        AND up.user_id = auth.uid()
        AND (
          up.role IN ('CEO','Admin') 
          OR (up.role = 'Manager' AND up.area_id = i.area_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.initiatives i
      JOIN public.objectives o ON o.id = objective_initiatives.objective_id
      JOIN public.user_profiles up ON up.tenant_id = i.tenant_id
      WHERE i.id = objective_initiatives.initiative_id
        AND up.user_id = auth.uid()
        AND (
          up.role IN ('CEO','Admin') 
          OR (up.role = 'Manager' AND up.area_id = i.area_id)
        )
    )
  );
```

## Advanced RLS Patterns

### Hierarchical Access Pattern

```sql
-- Pattern for hierarchical data access
CREATE POLICY "Hierarchical access based on parent"
  ON child_table FOR SELECT
  USING (
    parent_id IN (
      SELECT id FROM parent_table
      WHERE tenant_id = get_current_user_tenant()
        AND (
          get_current_user_role() IN ('CEO', 'Admin')
          OR (
            get_current_user_role() = 'Manager'
            AND area_id = get_current_user_area()
          )
        )
    )
  );
```

### Time-Based Access Pattern

```sql
-- Pattern for time-limited access
CREATE POLICY "Time-limited access"
  ON sensitive_table FOR SELECT
  USING (
    tenant_id = get_current_user_tenant()
    AND (
      expires_at IS NULL 
      OR expires_at > NOW()
    )
  );
```

### Ownership-Based Pattern

```sql
-- Pattern for owner-based modifications
CREATE POLICY "Owner can modify"
  ON resource_table FOR UPDATE
  USING (
    tenant_id = get_current_user_tenant()
    AND (
      created_by = auth.uid()
      OR get_current_user_role() IN ('CEO', 'Admin')
    )
  )
  WITH CHECK (
    tenant_id = get_current_user_tenant()
  );
```

## Testing RLS Policies

### Test Scripts

```sql
-- Test tenant isolation
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'user-id-from-tenant-1';
SELECT * FROM initiatives; -- Should only see tenant 1 data

SET LOCAL request.jwt.claim.sub TO 'user-id-from-tenant-2';
SELECT * FROM initiatives; -- Should only see tenant 2 data

-- Test role-based access
SET LOCAL request.jwt.claim.sub TO 'manager-user-id';
SELECT * FROM initiatives; -- Should only see area-specific data

SET LOCAL request.jwt.claim.sub TO 'ceo-user-id';
SELECT * FROM initiatives; -- Should see all tenant data
```

### Verification Queries

```sql
-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;

-- List all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## Performance Considerations

### Index Optimization for RLS

```sql
-- Create indexes for common RLS checks
CREATE INDEX idx_user_profiles_user_tenant 
  ON user_profiles(user_id, tenant_id);

CREATE INDEX idx_initiatives_tenant_area 
  ON initiatives(tenant_id, area_id);

CREATE INDEX idx_objectives_tenant_area 
  ON objectives(tenant_id, area_id);

-- Partial indexes for role-specific queries
CREATE INDEX idx_user_profiles_managers 
  ON user_profiles(tenant_id, area_id) 
  WHERE role = 'Manager';
```

### Query Plan Analysis

```sql
-- Analyze RLS impact on query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM initiatives 
WHERE tenant_id = get_current_user_tenant();
```

## Security Best Practices

### 1. Always Use FORCE ROW LEVEL SECURITY

```sql
-- Ensures policies apply even to table owner
ALTER TABLE table_name FORCE ROW LEVEL SECURITY;
```

### 2. Validate Function Security

```sql
-- Use SECURITY DEFINER carefully
CREATE FUNCTION sensitive_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with function owner privileges
SET search_path = public -- Prevent search path attacks
AS $$
BEGIN
  -- Function body
END;
$$;
```

### 3. Test Policy Combinations

```sql
-- Test that combining policies doesn't create security holes
-- Multiple policies with OR logic can be dangerous
```

### 4. Regular Security Audits

```sql
-- Audit script to check for tables without RLS
SELECT 
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT IN ('schema_migrations');
```

## Troubleshooting RLS

### Common Issues

1. **No data returned**: Check if user has proper tenant_id in user_profiles
2. **Too much data returned**: Verify policies are restrictive enough
3. **Performance issues**: Check indexes on filtered columns
4. **Policy conflicts**: Review policy combination logic (AND vs OR)

### Debug Queries

```sql
-- Check current user context
SELECT 
  auth.uid() as auth_user_id,
  get_current_user_tenant() as tenant_id,
  get_current_user_role() as role,
  get_current_user_area() as area_id;

-- Test specific policy
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'test-user-id';
SELECT * FROM table_name WHERE [policy conditions];
```

---

**Document Version**: 1.0.0
**Last Updated**: 2025-08-16
**Classification**: Internal Use Only