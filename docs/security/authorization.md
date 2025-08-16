# Role-Based Access Control (RBAC)

## Overview

The Initiative Dashboard implements a comprehensive Role-Based Access Control system with three primary roles (CEO, Admin, Manager) and area-based permissions. This document details the authorization model, permission matrices, and implementation patterns.

## Role Hierarchy

```
┌─────────────┐
│     CEO     │  Full system access
└──────┬──────┘  Can manage all areas and users
       │
┌──────▼──────┐
│    Admin    │  Administrative access
└──────┬──────┘  Can manage users and settings
       │
┌──────▼──────┐
│   Manager   │  Area-specific access
└─────────────┘  Limited to assigned area
```

## User Roles

### CEO Role
**Purpose**: Strategic oversight and full system control
**Key Permissions**:
- View all tenant data across all areas
- Create/modify/delete objectives and initiatives
- Access all analytics and reports
- Manage organization settings
- View complete audit logs
- Export all data

### Admin Role
**Purpose**: System administration and user management
**Key Permissions**:
- Manage user accounts and invitations
- Configure organization settings
- Access all areas within tenant
- View audit logs
- Manage integrations
- Cannot delete organization

### Manager Role
**Purpose**: Operational management of specific areas
**Key Permissions**:
- Full control within assigned area
- Create/modify initiatives and activities
- Assign tasks to team members
- View area-specific analytics
- Limited audit log access
- Cannot access other areas

## Permission Matrix

### Core Entities Permissions

| Entity | CEO | Admin | Manager (Own Area) | Manager (Other Area) |
|--------|-----|-------|-------------------|---------------------|
| **Organizations** | | | | |
| View | ✅ | ✅ | ✅ | ✅ |
| Edit | ✅ | ✅ | ❌ | ❌ |
| Delete | ❌ | ❌ | ❌ | ❌ |
| **Areas** | | | | |
| View All | ✅ | ✅ | ❌ | ❌ |
| View Own | ✅ | ✅ | ✅ | N/A |
| Create | ✅ | ✅ | ❌ | ❌ |
| Edit | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |
| **Objectives** | | | | |
| View All | ✅ | ✅ | ❌ | ❌ |
| View Area | ✅ | ✅ | ✅ | ❌ |
| Create | ✅ | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅ | ✅* | ❌ |
| Delete | ✅ | ✅ | ✅* | ❌ |
| **Initiatives** | | | | |
| View All | ✅ | ✅ | ❌ | ❌ |
| View Area | ✅ | ✅ | ✅ | ❌ |
| Create | ✅ | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ✅* | ❌ |
| **Activities** | | | | |
| View | ✅ | ✅ | ✅ | ❌ |
| Create | ✅ | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅ | ✅ | ❌ |
| Assign | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ✅* | ❌ |

*Only if created by them

### System Features Permissions

| Feature | CEO | Admin | Manager |
|---------|-----|-------|---------|
| **User Management** | | | |
| View Users | ✅ | ✅ | ✅ (Area only) |
| Create Users | ✅ | ✅ | ❌ |
| Edit Users | ✅ | ✅ | ❌ |
| Delete Users | ✅ | ✅ | ❌ |
| Send Invitations | ✅ | ✅ | ❌ |
| **Analytics** | | | |
| Organization Analytics | ✅ | ✅ | ❌ |
| Area Analytics | ✅ | ✅ | ✅ (Own area) |
| Export Reports | ✅ | ✅ | ✅ (Limited) |
| **Settings** | | | |
| Organization Settings | ✅ | ✅ | ❌ |
| Area Settings | ✅ | ✅ | ✅ (Own area) |
| Integration Settings | ✅ | ✅ | ❌ |
| **Audit Logs** | | | |
| View All Logs | ✅ | ✅ | ❌ |
| View Area Logs | ✅ | ✅ | ✅ |
| Export Logs | ✅ | ✅ | ❌ |

## Implementation

### Database Schema

```sql
-- User profiles table with role definition
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL, -- ENUM: 'CEO', 'Admin', 'Manager'
  area_id UUID REFERENCES areas(id), -- NULL for CEO/Admin
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role enum type
CREATE TYPE user_role AS ENUM ('CEO', 'Admin', 'Manager');
```

### Authorization Helpers

```typescript
// /lib/auth/authorization.ts

export function hasPermission(
  userRole: string,
  resource: string,
  action: string,
  context?: { areaId?: string, ownerId?: string }
): boolean {
  // CEO has all permissions
  if (userRole === 'CEO') return true
  
  // Admin has most permissions except org deletion
  if (userRole === 'Admin') {
    if (resource === 'organization' && action === 'delete') {
      return false
    }
    return true
  }
  
  // Manager permissions are context-dependent
  if (userRole === 'Manager') {
    return checkManagerPermission(resource, action, context)
  }
  
  return false
}

export function checkManagerPermission(
  resource: string,
  action: string,
  context?: { areaId?: string, ownerId?: string, userAreaId?: string }
): boolean {
  // Managers can only access their own area
  if (context?.areaId && context?.userAreaId) {
    if (context.areaId !== context.userAreaId) {
      return false
    }
  }
  
  // Check specific resource permissions
  const managerPermissions = {
    'area': ['view'],
    'objective': ['view', 'create', 'edit'],
    'initiative': ['view', 'create', 'edit', 'delete'],
    'activity': ['view', 'create', 'edit', 'assign', 'delete'],
    'user': ['view'], // Only in their area
    'report': ['view', 'export'], // Limited to their area
  }
  
  return managerPermissions[resource]?.includes(action) ?? false
}
```

### API Route Protection

```typescript
// /app/api/protected-route/route.ts

export async function POST(request: NextRequest) {
  // 1. Authenticate user
  const { user, userProfile, error } = await authenticateRequest(request)
  
  if (error || !userProfile) {
    return unauthorizedResponse()
  }
  
  // 2. Check role-based permission
  const { resource, action } = await request.json()
  
  if (!hasPermission(userProfile.role, resource, action)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    )
  }
  
  // 3. Additional area-based check for managers
  if (userProfile.role === 'Manager') {
    const { area_id } = await request.json()
    
    if (area_id !== userProfile.area_id) {
      return NextResponse.json(
        { error: 'Access denied to this area' },
        { status: 403 }
      )
    }
  }
  
  // 4. Proceed with operation
  // ...
}
```

### React Hook for Permissions

```typescript
// /hooks/usePermissions.ts

export function usePermissions() {
  const { userProfile } = useAuth()
  
  const can = useCallback(
    (action: string, resource: string, context?: any) => {
      if (!userProfile) return false
      
      return hasPermission(
        userProfile.role,
        resource,
        action,
        {
          ...context,
          userAreaId: userProfile.area_id
        }
      )
    },
    [userProfile]
  )
  
  const canAccessArea = useCallback(
    (areaId: string) => {
      if (!userProfile) return false
      
      // CEO and Admin can access all areas
      if (['CEO', 'Admin'].includes(userProfile.role)) {
        return true
      }
      
      // Managers can only access their own area
      return userProfile.area_id === areaId
    },
    [userProfile]
  )
  
  const canEditResource = useCallback(
    (resource: any) => {
      if (!userProfile) return false
      
      // Check ownership
      if (resource.created_by === userProfile.id) {
        return true
      }
      
      // Check role-based permissions
      return can('edit', resource.type, { 
        areaId: resource.area_id,
        ownerId: resource.created_by 
      })
    },
    [userProfile, can]
  )
  
  return {
    can,
    canAccessArea,
    canEditResource,
    isCEO: userProfile?.role === 'CEO',
    isAdmin: userProfile?.role === 'Admin',
    isManager: userProfile?.role === 'Manager',
    userRole: userProfile?.role,
    userAreaId: userProfile?.area_id
  }
}
```

### UI Component Protection

```typescript
// /components/ProtectedComponent.tsx

export function ProtectedComponent({ 
  children, 
  resource, 
  action,
  fallback = null 
}) {
  const { can } = usePermissions()
  
  if (!can(action, resource)) {
    return fallback
  }
  
  return children
}

// Usage
<ProtectedComponent resource="user" action="create">
  <Button onClick={createUser}>Create User</Button>
</ProtectedComponent>
```

## Area-Based Access Control

### Area Assignment

```typescript
// Managers are assigned to specific areas
interface ManagerAssignment {
  user_id: string
  area_id: string
  assigned_at: Date
  assigned_by: string
}

// Area access validation
export function validateAreaAccess(
  userProfile: UserProfile,
  requestedAreaId: string
): boolean {
  // CEO and Admin have universal access
  if (['CEO', 'Admin'].includes(userProfile.role)) {
    return true
  }
  
  // Managers can only access their assigned area
  if (userProfile.role === 'Manager') {
    return userProfile.area_id === requestedAreaId
  }
  
  return false
}
```

### Cross-Area Restrictions

```typescript
// Enforce area boundaries in queries
export async function getInitiatives(userProfile: UserProfile) {
  let query = supabase
    .from('initiatives')
    .select('*')
    .eq('tenant_id', userProfile.tenant_id)
  
  // Apply area filter for managers
  if (userProfile.role === 'Manager') {
    query = query.eq('area_id', userProfile.area_id)
  }
  
  return await query
}
```

## Dynamic Permissions

### Permission Evaluation Flow

```
User Request
    ↓
Authentication Check
    ↓
Role Identification
    ↓
┌─────────────────────┐
│ Is CEO?             │ → Yes → Allow
└──────┬──────────────┘
       │ No
       ↓
┌─────────────────────┐
│ Is Admin?           │ → Yes → Check Admin Permissions
└──────┬──────────────┘
       │ No
       ↓
┌─────────────────────┐
│ Is Manager?         │ → Yes → Check Area & Resource
└──────┬──────────────┘
       │ No
       ↓
    Deny Access
```

### Contextual Permissions

```typescript
// Dynamic permission checking based on context
export function evaluatePermission(
  user: UserProfile,
  action: string,
  resource: any
): PermissionResult {
  // Build context
  const context = {
    userRole: user.role,
    userAreaId: user.area_id,
    resourceAreaId: resource.area_id,
    resourceOwnerId: resource.created_by,
    resourceType: resource.type,
    action: action
  }
  
  // Evaluate rules
  const rules = [
    checkRolePermission,
    checkAreaPermission,
    checkOwnershipPermission,
    checkResourceTypePermission
  ]
  
  for (const rule of rules) {
    const result = rule(context)
    if (result.denied) {
      return { allowed: false, reason: result.reason }
    }
  }
  
  return { allowed: true }
}
```

## Security Considerations

### Principle of Least Privilege

- Users start with minimal permissions
- Permissions are explicitly granted, not assumed
- Regular permission audits conducted
- Temporary elevated permissions supported

### Permission Caching

```typescript
// Cache permissions to reduce database queries
const permissionCache = new Map<string, boolean>()

export function getCachedPermission(
  userId: string,
  permission: string
): boolean | undefined {
  const key = `${userId}:${permission}`
  return permissionCache.get(key)
}

export function setCachedPermission(
  userId: string,
  permission: string,
  value: boolean
): void {
  const key = `${userId}:${permission}`
  permissionCache.set(key, value)
  
  // Expire after 5 minutes
  setTimeout(() => {
    permissionCache.delete(key)
  }, 5 * 60 * 1000)
}
```

### Audit Trail

```typescript
// Log all authorization decisions
export function logAuthorizationDecision(
  user: UserProfile,
  resource: string,
  action: string,
  decision: boolean,
  reason?: string
): void {
  auditLog.create({
    user_id: user.id,
    action: 'authorization_check',
    details: {
      resource,
      action,
      decision,
      reason,
      role: user.role,
      area_id: user.area_id
    },
    timestamp: new Date()
  })
}
```

## Testing Authorization

### Unit Tests

```typescript
describe('Authorization', () => {
  it('CEO should have full access', () => {
    const user = { role: 'CEO' }
    expect(hasPermission(user, 'any_resource', 'any_action')).toBe(true)
  })
  
  it('Manager should only access own area', () => {
    const user = { role: 'Manager', area_id: 'area-1' }
    const resource = { area_id: 'area-2' }
    
    expect(canAccessResource(user, resource)).toBe(false)
  })
  
  it('Admin cannot delete organization', () => {
    const user = { role: 'Admin' }
    
    expect(hasPermission(user, 'organization', 'delete')).toBe(false)
  })
})
```

## Best Practices

1. **Always verify permissions server-side**
2. **Use RLS as the final security layer**
3. **Log all permission checks for audit**
4. **Implement permission caching carefully**
5. **Regular permission audits**
6. **Clear permission denial messages**
7. **Test permission edge cases**
8. **Document permission changes**

---

**Document Version**: 1.0.0
**Last Updated**: 2025-08-16
**Classification**: Internal Use Only