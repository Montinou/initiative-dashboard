/**
 * Manager-specific permission utilities
 * Extends the base role permissions with manager-specific area isolation logic
 */

import { UserRole, hasPermission } from './role-permissions';

export interface ManagerAreaContext {
  isManager: boolean;
  areaId: string | null;
  areaName: string | null;
  tenantId: string | null;
}

/**
 * Check if a user has manager permissions for a specific area
 */
export function isManagerOfArea(
  userRole: UserRole,
  userAreaId: string | null,
  targetAreaId: string
): boolean {
  if (userRole !== 'Manager' || !userAreaId) {
    return false;
  }
  return userAreaId === targetAreaId;
}

/**
 * Check if a manager can access specific data based on area restriction
 */
export function canManagerAccessData(
  userRole: UserRole,
  userAreaId: string | null,
  dataAreaId: string | null
): boolean {
  // CEO, Admin, and Analyst can access all areas
  if (['CEO', 'Admin', 'Analyst'].includes(userRole)) {
    return true;
  }
  
  // Managers can only access their own area
  if (userRole === 'Manager') {
    return userAreaId === dataAreaId;
  }
  
  return false;
}

/**
 * Get database filters for area-based data access
 */
export function getManagerDataFilters(
  userRole: UserRole,
  userTenantId: string | null,
  userAreaId: string | null
): Record<string, any> | null {
  if (!userTenantId) return null;
  
  const baseFilter = { tenant_id: userTenantId };
  
  // Managers can only see their area's data
  if (userRole === 'Manager' && userAreaId) {
    return { ...baseFilter, area_id: userAreaId };
  }
  
  // CEO, Admin, and Analyst see all areas within tenant
  if (['CEO', 'Admin', 'Analyst'].includes(userRole)) {
    return baseFilter;
  }
  
  return null;
}

/**
 * Manager file upload permissions
 */
export function canManagerUploadFiles(
  userRole: UserRole,
  userAreaId: string | null
): boolean {
  return userRole === 'Manager' && 
         !!userAreaId && 
         hasPermission(userRole, 'createInitiatives');
}

/**
 * Manager initiative permissions
 */
export function canManagerCreateInitiative(
  userRole: UserRole,
  userAreaId: string | null,
  targetAreaId: string
): boolean {
  return userRole === 'Manager' && 
         userAreaId === targetAreaId && 
         hasPermission(userRole, 'createInitiatives');
}

export function canManagerEditInitiative(
  userRole: UserRole,
  userAreaId: string | null,
  initiativeAreaId: string
): boolean {
  return userRole === 'Manager' && 
         userAreaId === initiativeAreaId && 
         hasPermission(userRole, 'editInitiatives');
}

/**
 * Manager activity and progress permissions
 */
export function canManagerManageActivities(
  userRole: UserRole,
  userAreaId: string | null,
  activityAreaId: string
): boolean {
  return userRole === 'Manager' && 
         userAreaId === activityAreaId && 
         hasPermission(userRole, 'manageActivities');
}

export function canManagerUpdateProgress(
  userRole: UserRole,
  userAreaId: string | null,
  initiativeAreaId: string
): boolean {
  return userRole === 'Manager' && 
         userAreaId === initiativeAreaId && 
         hasPermission(userRole, 'updateProgress');
}

/**
 * Audit logging for manager actions
 */
export interface ManagerActionLog {
  managerId: string;
  managerAreaId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
}

export function createManagerAuditLog(
  context: ManagerAreaContext,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: any
): ManagerActionLog | null {
  if (!context.isManager || !context.areaId) {
    return null;
  }
  
  return {
    managerId: '', // Will be set by the calling code with actual user ID
    managerAreaId: context.areaId,
    action,
    resourceType,
    resourceId,
    details
  };
}

/**
 * Validate manager area access for API endpoints
 */
export function validateManagerAreaAccess(
  userRole: UserRole,
  userAreaId: string | null,
  requestedAreaId: string
): { isValid: boolean; error?: string } {
  if (userRole !== 'Manager') {
    // Non-managers are handled by regular role permissions
    return { isValid: true };
  }
  
  if (!userAreaId) {
    return { 
      isValid: false, 
      error: 'Manager user has no assigned area' 
    };
  }
  
  if (userAreaId !== requestedAreaId) {
    return { 
      isValid: false, 
      error: 'Manager can only access their assigned area' 
    };
  }
  
  return { isValid: true };
}

/**
 * Manager dashboard data scoping
 */
export interface ManagerDataScope {
  tenantId: string;
  areaId: string | null;
  canViewAllAreas: boolean;
  dataFilters: Record<string, any>;
}

export function getManagerDataScope(
  userRole: UserRole,
  userTenantId: string | null,
  userAreaId: string | null
): ManagerDataScope | null {
  if (!userTenantId) return null;
  
  const canViewAllAreas = ['CEO', 'Admin', 'Analyst'].includes(userRole);
  const dataFilters = getManagerDataFilters(userRole, userTenantId, userAreaId);
  
  if (!dataFilters) return null;
  
  return {
    tenantId: userTenantId,
    areaId: userRole === 'Manager' ? userAreaId : null,
    canViewAllAreas,
    dataFilters
  };
}

/**
 * Manager route protection helpers
 */
export function canAccessManagerDashboard(userRole: UserRole): boolean {
  return userRole === 'Manager' && hasPermission(userRole, 'viewDashboards');
}

export function canAccessManagerUpload(
  userRole: UserRole,
  userAreaId: string | null
): boolean {
  return canManagerUploadFiles(userRole, userAreaId);
}

export function canAccessManagerInitiatives(userRole: UserRole): boolean {
  return userRole === 'Manager' && 
         (hasPermission(userRole, 'createInitiatives') || 
          hasPermission(userRole, 'editInitiatives'));
}