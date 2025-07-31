// Role utilities - imports from consolidated role-permissions.ts
// This file maintains backward compatibility while using the consolidated system

import {
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
  canAccessOKRs as _canAccessOKRs,
  canManageOKRs as _canManageOKRs,
  hasHigherOrEqualRole,
  getRoleDefinition,
  canManageUser,
  getPermittedAreas,
} from './role-permissions';

// Re-export types and constants
export type {
  UserRole,
  RolePermissions,
  RoleRestrictions,
  OrganizationalContext,
  RoleDefinition,
};

export {
  FEMA_DIVISIONS,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  ROLE_DEFINITIONS,
  hasPermission,
  canAccessArea,
  hasHigherOrEqualRole,
  getRoleDefinition,
  canManageUser,
  getPermittedAreas,
};

// Export OKR functions
export const canAccessOKRs = _canAccessOKRs;
export const canManageOKRs = _canManageOKRs;

// Re-export for backward compatibility
export const canAccessOKR = _canAccessOKRs;
export const canManageOKR = _canManageOKRs;