/**
 * Comprehensive Permission Validation System
 * Validates permissions at all levels: UI, API, Database, and Route
 */

import { UserRole, hasPermission, canAccessArea, ROLE_HIERARCHY } from './role-permissions';
import { 
  canManagerAccessData, 
  validateManagerAreaAccess, 
  getManagerDataScope,
  canManagerUploadFiles,
  canManagerCreateInitiative,
  canManagerEditInitiative,
  canManagerManageActivities,
  canManagerUpdateProgress
} from './manager-permissions';

export interface ValidationContext {
  userId: string;
  userRole: UserRole;
  userTenantId: string | null;
  userAreaId: string | null;
  requestPath?: string;
  requestMethod?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  level: 'UI' | 'API' | 'Database' | 'Route';
  permission?: string;
}

export interface PermissionValidationSuite {
  ui: ValidationResult[];
  api: ValidationResult[];
  database: ValidationResult[];
  route: ValidationResult[];
  overall: {
    isValid: boolean;
    failedChecks: number;
    totalChecks: number;
    criticalFailures: number;
  };
}

/**
 * UI Level Permission Validation
 * Validates component-level access controls
 */
export function validateUIPermissions(context: ValidationContext): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Dashboard access validation
  results.push({
    isValid: hasPermission(context.userRole, 'viewDashboards'),
    error: hasPermission(context.userRole, 'viewDashboards') ? undefined : 'User cannot access dashboards',
    level: 'UI',
    permission: 'viewDashboards'
  });

  // Manager dashboard specific access
  if (context.userRole === 'Manager') {
    results.push({
      isValid: !!context.userAreaId,
      error: !context.userAreaId ? 'Manager must be assigned to an area' : undefined,
      level: 'UI',
      permission: 'managerAreaAssignment'
    });

    results.push({
      isValid: canManagerUploadFiles(context.userRole, context.userAreaId),
      error: !canManagerUploadFiles(context.userRole, context.userAreaId) ? 'Manager cannot upload files' : undefined,
      level: 'UI',
      permission: 'uploadFiles'
    });
  }

  // Initiative management UI validation
  results.push({
    isValid: context.userRole === 'Manager' ? hasPermission(context.userRole, 'createInitiatives') : true,
    error: context.userRole === 'Manager' && !hasPermission(context.userRole, 'createInitiatives') ? 'Manager cannot create initiatives' : undefined,
    level: 'UI',
    permission: 'createInitiatives'
  });

  results.push({
    isValid: context.userRole === 'Manager' ? hasPermission(context.userRole, 'editInitiatives') : true,
    error: context.userRole === 'Manager' && !hasPermission(context.userRole, 'editInitiatives') ? 'Manager cannot edit initiatives' : undefined,
    level: 'UI',
    permission: 'editInitiatives'
  });

  // Analytics access validation
  results.push({
    isValid: context.userRole === 'Manager' ? !hasPermission(context.userRole, 'accessAnalytics') : hasPermission(context.userRole, 'accessAnalytics'),
    error: context.userRole === 'Manager' && hasPermission(context.userRole, 'accessAnalytics') ? 'Manager should not have analytics access' : undefined,
    level: 'UI',
    permission: 'accessAnalytics'
  });

  return results;
}

/**
 * API Level Permission Validation
 * Validates endpoint-level access controls
 */
export function validateAPIPermissions(context: ValidationContext): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Tenant isolation validation
  results.push({
    isValid: !!context.userTenantId,
    error: !context.userTenantId ? 'User must be associated with a tenant' : undefined,
    level: 'API',
    permission: 'tenantIsolation'
  });

  // Manager API endpoints validation
  if (context.userRole === 'Manager') {
    // Manager area data access
    results.push({
      isValid: !!context.userAreaId,
      error: !context.userAreaId ? 'Manager API access requires area assignment' : undefined,
      level: 'API',
      permission: 'managerAreaAPI'
    });

    // Manager file upload endpoint
    const uploadAccess = canManagerUploadFiles(context.userRole, context.userAreaId);
    results.push({
      isValid: uploadAccess,
      error: !uploadAccess ? 'Manager cannot access file upload API' : undefined,
      level: 'API',
      permission: 'uploadAPI'
    });

    // Manager initiatives API
    results.push({
      isValid: hasPermission(context.userRole, 'createInitiatives'),
      error: !hasPermission(context.userRole, 'createInitiatives') ? 'Manager cannot access initiative creation API' : undefined,
      level: 'API',
      permission: 'initiativeAPI'
    });

    // Manager metrics API (should be restricted)
    results.push({
      isValid: !hasPermission(context.userRole, 'accessAnalytics'),
      error: hasPermission(context.userRole, 'accessAnalytics') ? 'Manager should not access analytics API' : undefined,
      level: 'API',
      permission: 'analyticsAPI'
    });
  }

  // Role hierarchy validation for user management APIs
  if (context.requestPath?.includes('/api/users')) {
    results.push({
      isValid: hasPermission(context.userRole, 'manageUsers'),
      error: !hasPermission(context.userRole, 'manageUsers') ? 'User cannot access user management API' : undefined,
      level: 'API',
      permission: 'userManagementAPI'
    });
  }

  return results;
}

/**
 * Database Level Permission Validation
 * Validates data access controls and filters
 */
export function validateDatabasePermissions(context: ValidationContext): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Data scope validation
  const dataScope = getManagerDataScope(context.userRole, context.userTenantId, context.userAreaId);
  
  results.push({
    isValid: !!dataScope,
    error: !dataScope ? 'Cannot determine data access scope' : undefined,
    level: 'Database',
    permission: 'dataScope'
  });

  if (dataScope) {
    // Tenant filtering validation
    results.push({
      isValid: dataScope.tenantId === context.userTenantId,
      error: dataScope.tenantId !== context.userTenantId ? 'Data scope tenant mismatch' : undefined,
      level: 'Database',
      permission: 'tenantFiltering'
    });

    // Manager area filtering validation
    if (context.userRole === 'Manager') {
      results.push({
        isValid: dataScope.areaId === context.userAreaId && !dataScope.canViewAllAreas,
        error: dataScope.areaId !== context.userAreaId || dataScope.canViewAllAreas ? 'Manager data scope should be area-restricted' : undefined,
        level: 'Database',
        permission: 'areaFiltering'
      });

      results.push({
        isValid: dataScope.dataFilters.area_id === context.userAreaId,
        error: dataScope.dataFilters.area_id !== context.userAreaId ? 'Database filters must include manager area restriction' : undefined,
        level: 'Database',
        permission: 'databaseFilters'
      });
    }
  }

  // Cross-area data access validation for managers
  if (context.userRole === 'Manager') {
    if (context.userAreaId) {
      const mockTargetAreaId = 'different-area-id';
      const crossAreaAccess = canManagerAccessData(context.userRole, context.userAreaId, mockTargetAreaId);
      
      results.push({
        isValid: !crossAreaAccess,
        error: crossAreaAccess ? 'Manager should not access data from other areas' : undefined,
        level: 'Database',
        permission: 'crossAreaRestriction'
      });
    } else {
      // Manager without area should fail this check
      results.push({
        isValid: false,
        error: 'Manager without area assignment cannot access any data',
        level: 'Database',
        permission: 'crossAreaRestriction'
      });
    }
  }

  return results;
}

/**
 * Route Level Permission Validation
 * Validates page and route access controls
 */
export function validateRoutePermissions(context: ValidationContext): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Manager dashboard route validation
  if (context.requestPath === '/manager-dashboard') {
    results.push({
      isValid: context.userRole === 'Manager',
      error: context.userRole !== 'Manager' ? 'Only managers can access manager dashboard' : undefined,
      level: 'Route',
      permission: 'managerDashboardRoute'
    });

    results.push({
      isValid: hasPermission(context.userRole, 'viewDashboards'),
      error: !hasPermission(context.userRole, 'viewDashboards') ? 'User lacks dashboard viewing permission' : undefined,
      level: 'Route',
      permission: 'dashboardPermission'
    });
  }

  // Manager upload route validation
  if (context.requestPath === '/manager-dashboard/upload') {
    results.push({
      isValid: context.userRole === 'Manager' && canManagerUploadFiles(context.userRole, context.userAreaId),
      error: !(context.userRole === 'Manager' && canManagerUploadFiles(context.userRole, context.userAreaId)) ? 'Manager cannot access upload route' : undefined,
      level: 'Route',
      permission: 'uploadRoute'
    });
  }

  // Analytics route validation (should be restricted for managers)
  if (context.requestPath?.includes('/analytics')) {
    results.push({
      isValid: context.userRole !== 'Manager' || !hasPermission(context.userRole, 'accessAnalytics'),
      error: context.userRole === 'Manager' && hasPermission(context.userRole, 'accessAnalytics') ? 'Manager should not access analytics routes' : undefined,
      level: 'Route',
      permission: 'analyticsRoute'
    });
  }

  // Admin routes validation
  if (context.requestPath?.includes('/admin')) {
    results.push({
      isValid: ['CEO', 'Admin'].includes(context.userRole),
      error: !['CEO', 'Admin'].includes(context.userRole) ? 'Only CEO and Admin can access admin routes' : undefined,
      level: 'Route',
      permission: 'adminRoute'
    });
  }

  return results;
}

/**
 * Comprehensive Permission Validation Suite
 * Runs all validation levels and provides summary
 */
export function runPermissionValidationSuite(context: ValidationContext): PermissionValidationSuite {
  const ui = validateUIPermissions(context);
  const api = validateAPIPermissions(context);
  const database = validateDatabasePermissions(context);
  const route = validateRoutePermissions(context);

  const allResults = [...ui, ...api, ...database, ...route];
  const failedChecks = allResults.filter(r => !r.isValid).length;
  const criticalFailures = allResults.filter(r => !r.isValid && (
    r.permission?.includes('tenant') || 
    r.permission?.includes('area') ||
    r.permission?.includes('managerArea') ||
    r.permission?.includes('crossArea')
  )).length;

  return {
    ui,
    api,
    database,
    route,
    overall: {
      isValid: failedChecks === 0,
      failedChecks,
      totalChecks: allResults.length,
      criticalFailures
    }
  };
}

/**
 * Quick permission check for specific operations
 */
export function validateSpecificPermission(
  context: ValidationContext,
  operation: string,
  targetAreaId?: string
): ValidationResult {
  switch (operation) {
    case 'createInitiative':
      if (context.userRole === 'Manager') {
        if (!context.userAreaId) {
          return {
            isValid: false,
            error: 'Manager must be assigned to an area to create initiatives',
            level: 'API',
            permission: 'createInitiative'
          };
        }
        if (targetAreaId) {
          return {
            isValid: canManagerCreateInitiative(context.userRole, context.userAreaId, targetAreaId),
            error: !canManagerCreateInitiative(context.userRole, context.userAreaId, targetAreaId) ? 'Manager cannot create initiative in this area' : undefined,
            level: 'API',
            permission: 'createInitiative'
          };
        }
      }
      break;

    case 'editInitiative':
      if (context.userRole === 'Manager' && targetAreaId) {
        return {
          isValid: canManagerEditInitiative(context.userRole, context.userAreaId, targetAreaId),
          error: !canManagerEditInitiative(context.userRole, context.userAreaId, targetAreaId) ? 'Manager cannot edit initiative in this area' : undefined,
          level: 'API',
          permission: 'editInitiative'
        };
      }
      break;

    case 'manageActivities':
      if (context.userRole === 'Manager' && targetAreaId) {
        return {
          isValid: canManagerManageActivities(context.userRole, context.userAreaId, targetAreaId),
          error: !canManagerManageActivities(context.userRole, context.userAreaId, targetAreaId) ? 'Manager cannot manage activities in this area' : undefined,
          level: 'API',
          permission: 'manageActivities'
        };
      }
      break;

    case 'updateProgress':
      if (context.userRole === 'Manager' && targetAreaId) {
        return {
          isValid: canManagerUpdateProgress(context.userRole, context.userAreaId, targetAreaId),
          error: !canManagerUpdateProgress(context.userRole, context.userAreaId, targetAreaId) ? 'Manager cannot update progress in this area' : undefined,
          level: 'API',
          permission: 'updateProgress'
        };
      }
      break;

    default:
      return {
        isValid: false,
        error: `Unknown operation: ${operation}`,
        level: 'API',
        permission: 'unknown'
      };
  }

  return {
    isValid: hasPermission(context.userRole, operation as any),
    error: !hasPermission(context.userRole, operation as any) ? `User lacks permission: ${operation}` : undefined,
    level: 'API',
    permission: operation
  };
}

/**
 * Permission validation middleware helper
 */
export function createPermissionValidator(requiredPermission: keyof import('./role-permissions').RolePermissions) {
  return (context: ValidationContext): ValidationResult => {
    return {
      isValid: hasPermission(context.userRole, requiredPermission),
      error: !hasPermission(context.userRole, requiredPermission) ? `Missing required permission: ${requiredPermission}` : undefined,
      level: 'API',
      permission: requiredPermission
    };
  };
}

/**
 * Area access validation helper
 */
export function validateAreaAccess(
  context: ValidationContext,
  targetAreaId: string
): ValidationResult {
  const managerValidation = validateManagerAreaAccess(context.userRole, context.userAreaId, targetAreaId);
  
  return {
    isValid: managerValidation.isValid && canAccessArea(context.userRole, context.userAreaId, targetAreaId),
    error: managerValidation.error || (!canAccessArea(context.userRole, context.userAreaId, targetAreaId) ? 'User cannot access this area' : undefined),
    level: 'Database',
    permission: 'areaAccess'
  };
}

/**
 * Get validation summary for logging
 */
export function getValidationSummary(suite: PermissionValidationSuite): string {
  const { overall } = suite;
  const status = overall.isValid ? 'PASS' : 'FAIL';
  const criticalNote = overall.criticalFailures > 0 ? ` (${overall.criticalFailures} critical)` : '';
  
  return `Permission Validation: ${status} - ${overall.failedChecks}/${overall.totalChecks} failed${criticalNote}`;
}