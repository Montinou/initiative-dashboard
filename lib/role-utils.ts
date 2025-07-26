// Role utilities - imports from consolidated role-permissions.ts
// This file maintains backward compatibility while using the consolidated system

export {
  type UserRole,
  type RolePermissions,
  type RoleRestrictions,
  type OrganizationalContext,
  type RoleDefinition,
  FEMA_DIVISIONS,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  ROLE_DEFINITIONS,
  hasPermission,
  canAccessArea,
  canAccessOKRs,
  canManageOKRs,
  hasHigherOrEqualRole,
  getRoleDefinition,
  canManageUser,
  getPermittedAreas,
} from './role-permissions';

// Re-export for backward compatibility
export const canAccessOKR = canAccessOKRs;
export const canManageOKR = canManageOKRs;