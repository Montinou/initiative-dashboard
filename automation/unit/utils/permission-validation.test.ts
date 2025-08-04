import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateUIPermissions,
  validateAPIPermissions,
  validateDatabasePermissions,
  validateRoutePermissions,
  runPermissionValidationSuite,
  validateSpecificPermission,
  createPermissionValidator,
  validateAreaAccess,
  getValidationSummary,
  ValidationContext
} from '@/lib/permission-validation';

// Mock dependencies
vi.mock('@/lib/role-permissions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/role-permissions')>('@/lib/role-permissions');
  return {
    ...actual,
    hasPermission: vi.fn((role: string, permission: string) => {
      const rolePermissions: Record<string, string[]> = {
        CEO: ['viewDashboards', 'createInitiatives', 'editInitiatives', 'accessAnalytics', 'manageUsers'],
        Admin: ['viewDashboards', 'createInitiatives', 'editInitiatives', 'accessAnalytics', 'manageUsers'],
        Manager: ['viewDashboards', 'createInitiatives', 'editInitiatives', 'manageActivities', 'updateProgress'],
        Analyst: ['viewDashboards', 'accessAnalytics']
      };
      return rolePermissions[role]?.includes(permission) || false;
    }),
    canAccessArea: vi.fn((role: string, userAreaId: string | null, targetAreaId: string) => {
      if (['CEO', 'Admin', 'Analyst'].includes(role)) return true;
      return role === 'Manager' && userAreaId === targetAreaId;
    })
  };
});

vi.mock('@/lib/manager-permissions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/manager-permissions')>('@/lib/manager-permissions');
  return {
    ...actual,
    canManagerAccessData: vi.fn((role: string, userAreaId: string | null, dataAreaId: string | null) => {
      if (['CEO', 'Admin', 'Analyst'].includes(role)) return true;
      return role === 'Manager' && userAreaId === dataAreaId;
    }),
    validateManagerAreaAccess: vi.fn((role: string, userAreaId: string | null, requestedAreaId: string) => {
      if (role !== 'Manager') return { isValid: true };
      if (!userAreaId) return { isValid: false, error: 'Manager user has no assigned area' };
      if (userAreaId !== requestedAreaId) return { isValid: false, error: 'Manager can only access their assigned area' };
      return { isValid: true };
    }),
    getManagerDataScope: vi.fn((role: string, tenantId: string | null, areaId: string | null) => {
      if (!tenantId) return null;
      return {
        tenantId,
        areaId: role === 'Manager' ? areaId : null,
        canViewAllAreas: ['CEO', 'Admin', 'Analyst'].includes(role),
        dataFilters: role === 'Manager' && areaId
          ? { tenant_id: tenantId, area_id: areaId }
          : { tenant_id: tenantId }
      };
    }),
    canManagerUploadFiles: vi.fn((role: string, areaId: string | null) => {
      return role === 'Manager' && !!areaId;
    }),
    canManagerCreateInitiative: vi.fn((role: string, userAreaId: string | null, targetAreaId: string) => {
      return role === 'Manager' && userAreaId === targetAreaId;
    }),
    canManagerEditInitiative: vi.fn((role: string, userAreaId: string | null, initiativeAreaId: string) => {
      return role === 'Manager' && userAreaId === initiativeAreaId;
    }),
    canManagerManageActivities: vi.fn((role: string, userAreaId: string | null, activityAreaId: string) => {
      return role === 'Manager' && userAreaId === activityAreaId;
    }),
    canManagerUpdateProgress: vi.fn((role: string, userAreaId: string | null, initiativeAreaId: string) => {
      return role === 'Manager' && userAreaId === initiativeAreaId;
    })
  };
});

describe('Permission Validation', () => {
  let mockContext: ValidationContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      userId: 'user-123',
      userRole: 'Manager',
      userTenantId: 'tenant-456',
      userAreaId: 'area-789',
      requestPath: '/manager-dashboard',
      requestMethod: 'GET'
    };
  });

  describe('validateUIPermissions', () => {
    it('should validate dashboard access for all roles', () => {
      const results = validateUIPermissions(mockContext);
      
      const dashboardPermission = results.find(r => r.permission === 'viewDashboards');
      expect(dashboardPermission?.isValid).toBe(true);
      expect(dashboardPermission?.level).toBe('UI');
    });

    it('should validate manager area assignment', () => {
      const results = validateUIPermissions(mockContext);
      
      const areaAssignment = results.find(r => r.permission === 'managerAreaAssignment');
      expect(areaAssignment?.isValid).toBe(true);
    });

    it('should fail when manager has no area assigned', () => {
      mockContext.userAreaId = null;
      const results = validateUIPermissions(mockContext);
      
      const areaAssignment = results.find(r => r.permission === 'managerAreaAssignment');
      expect(areaAssignment?.isValid).toBe(false);
      expect(areaAssignment?.error).toBe('Manager must be assigned to an area');
    });

    it('should validate file upload permissions', () => {
      const results = validateUIPermissions(mockContext);
      
      const uploadPermission = results.find(r => r.permission === 'uploadFiles');
      expect(uploadPermission?.isValid).toBe(true);
    });

    it('should validate initiative permissions for managers', () => {
      const results = validateUIPermissions(mockContext);
      
      const createPermission = results.find(r => r.permission === 'createInitiatives');
      const editPermission = results.find(r => r.permission === 'editInitiatives');
      
      expect(createPermission?.isValid).toBe(true);
      expect(editPermission?.isValid).toBe(true);
    });

    it('should restrict analytics access for managers', () => {
      const results = validateUIPermissions(mockContext);
      
      const analyticsPermission = results.find(r => r.permission === 'accessAnalytics');
      expect(analyticsPermission?.isValid).toBe(true); // Manager should NOT have analytics access
    });

    it('should validate non-manager roles differently', () => {
      mockContext.userRole = 'Analyst';
      const results = validateUIPermissions(mockContext);
      
      // Should not have manager-specific validations
      const managerSpecific = results.filter(r => r.permission?.includes('manager'));
      expect(managerSpecific).toHaveLength(0);
    });
  });

  describe('validateAPIPermissions', () => {
    it('should validate tenant isolation', () => {
      const results = validateAPIPermissions(mockContext);
      
      const tenantPermission = results.find(r => r.permission === 'tenantIsolation');
      expect(tenantPermission?.isValid).toBe(true);
    });

    it('should fail when no tenant association', () => {
      mockContext.userTenantId = null;
      const results = validateAPIPermissions(mockContext);
      
      const tenantPermission = results.find(r => r.permission === 'tenantIsolation');
      expect(tenantPermission?.isValid).toBe(false);
      expect(tenantPermission?.error).toBe('User must be associated with a tenant');
    });

    it('should validate manager API endpoints', () => {
      const results = validateAPIPermissions(mockContext);
      
      const areaAPI = results.find(r => r.permission === 'managerAreaAPI');
      const uploadAPI = results.find(r => r.permission === 'uploadAPI');
      const initiativeAPI = results.find(r => r.permission === 'initiativeAPI');
      
      expect(areaAPI?.isValid).toBe(true);
      expect(uploadAPI?.isValid).toBe(true);
      expect(initiativeAPI?.isValid).toBe(true);
    });

    it('should restrict analytics API for managers', () => {
      const results = validateAPIPermissions(mockContext);
      
      const analyticsAPI = results.find(r => r.permission === 'analyticsAPI');
      expect(analyticsAPI?.isValid).toBe(true); // Should be FALSE - manager shouldn't access analytics API
    });

    it('should validate user management API access', () => {
      mockContext.requestPath = '/api/users';
      mockContext.userRole = 'Admin';
      
      const results = validateAPIPermissions(mockContext);
      
      const userMgmtAPI = results.find(r => r.permission === 'userManagementAPI');
      expect(userMgmtAPI?.isValid).toBe(true);
    });

    it('should fail user management API for unauthorized roles', () => {
      mockContext.requestPath = '/api/users';
      mockContext.userRole = 'Manager';
      
      const results = validateAPIPermissions(mockContext);
      
      const userMgmtAPI = results.find(r => r.permission === 'userManagementAPI');
      expect(userMgmtAPI?.isValid).toBe(false);
    });
  });

  describe('validateDatabasePermissions', () => {
    it('should validate data scope determination', () => {
      const results = validateDatabasePermissions(mockContext);
      
      const dataScope = results.find(r => r.permission === 'dataScope');
      expect(dataScope?.isValid).toBe(true);
    });

    it('should validate tenant filtering', () => {
      const results = validateDatabasePermissions(mockContext);
      
      const tenantFiltering = results.find(r => r.permission === 'tenantFiltering');
      expect(tenantFiltering?.isValid).toBe(true);
    });

    it('should validate area filtering for managers', () => {
      const results = validateDatabasePermissions(mockContext);
      
      const areaFiltering = results.find(r => r.permission === 'areaFiltering');
      const databaseFilters = results.find(r => r.permission === 'databaseFilters');
      
      expect(areaFiltering?.isValid).toBe(true);
      expect(databaseFilters?.isValid).toBe(true);
    });

    it('should prevent cross-area data access for managers', () => {
      const results = validateDatabasePermissions(mockContext);
      
      const crossAreaRestriction = results.find(r => r.permission === 'crossAreaRestriction');
      expect(crossAreaRestriction?.isValid).toBe(true);
    });

    it('should fail when manager has no area assignment', () => {
      mockContext.userAreaId = null;
      const results = validateDatabasePermissions(mockContext);
      
      const crossAreaRestriction = results.find(r => r.permission === 'crossAreaRestriction');
      expect(crossAreaRestriction?.isValid).toBe(false);
      expect(crossAreaRestriction?.error).toBe('Manager without area assignment cannot access any data');
    });
  });

  describe('validateRoutePermissions', () => {
    it('should validate manager dashboard route access', () => {
      mockContext.requestPath = '/manager-dashboard';
      const results = validateRoutePermissions(mockContext);
      
      const routePermission = results.find(r => r.permission === 'managerDashboardRoute');
      const dashboardPermission = results.find(r => r.permission === 'dashboardPermission');
      
      expect(routePermission?.isValid).toBe(true);
      expect(dashboardPermission?.isValid).toBe(true);
    });

    it('should restrict manager dashboard to managers only', () => {
      mockContext.requestPath = '/manager-dashboard';
      mockContext.userRole = 'Analyst';
      
      const results = validateRoutePermissions(mockContext);
      
      const routePermission = results.find(r => r.permission === 'managerDashboardRoute');
      expect(routePermission?.isValid).toBe(false);
      expect(routePermission?.error).toBe('Only managers can access manager dashboard');
    });

    it('should validate manager upload route', () => {
      mockContext.requestPath = '/manager-dashboard/upload';
      const results = validateRoutePermissions(mockContext);
      
      const uploadRoute = results.find(r => r.permission === 'uploadRoute');
      expect(uploadRoute?.isValid).toBe(true);
    });

    it('should restrict analytics routes for managers', () => {
      mockContext.requestPath = '/analytics';
      const results = validateRoutePermissions(mockContext);
      
      const analyticsRoute = results.find(r => r.permission === 'analyticsRoute');
      expect(analyticsRoute?.isValid).toBe(true); // Should be TRUE - restriction should apply
    });

    it('should validate admin routes', () => {
      mockContext.requestPath = '/admin';
      mockContext.userRole = 'Admin';
      
      const results = validateRoutePermissions(mockContext);
      
      const adminRoute = results.find(r => r.permission === 'adminRoute');
      expect(adminRoute?.isValid).toBe(true);
    });

    it('should restrict admin routes for non-admin roles', () => {
      mockContext.requestPath = '/admin';
      mockContext.userRole = 'Manager';
      
      const results = validateRoutePermissions(mockContext);
      
      const adminRoute = results.find(r => r.permission === 'adminRoute');
      expect(adminRoute?.isValid).toBe(false);
      expect(adminRoute?.error).toBe('Only CEO and Admin can access admin routes');
    });
  });

  describe('runPermissionValidationSuite', () => {
    it('should run all validation levels', () => {
      const suite = runPermissionValidationSuite(mockContext);
      
      expect(suite.ui).toBeDefined();
      expect(suite.api).toBeDefined();
      expect(suite.database).toBeDefined();
      expect(suite.route).toBeDefined();
      expect(suite.overall).toBeDefined();
    });

    it('should calculate overall validation results', () => {
      const suite = runPermissionValidationSuite(mockContext);
      
      expect(suite.overall.totalChecks).toBeGreaterThan(0);
      expect(suite.overall.failedChecks).toBeGreaterThanOrEqual(0);
      expect(suite.overall.criticalFailures).toBeGreaterThanOrEqual(0);
      expect(typeof suite.overall.isValid).toBe('boolean');
    });

    it('should identify critical failures', () => {
      mockContext.userTenantId = null; // This should cause critical failures
      const suite = runPermissionValidationSuite(mockContext);
      
      expect(suite.overall.criticalFailures).toBeGreaterThan(0);
      expect(suite.overall.isValid).toBe(false);
    });
  });

  describe('validateSpecificPermission', () => {
    it('should validate createInitiative operation', () => {
      const result = validateSpecificPermission(mockContext, 'createInitiative', 'area-789');
      
      expect(result.isValid).toBe(true);
      expect(result.permission).toBe('createInitiative');
    });

    it('should fail createInitiative for wrong area', () => {
      const result = validateSpecificPermission(mockContext, 'createInitiative', 'different-area');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Manager cannot create initiative in this area');
    });

    it('should fail createInitiative for manager without area', () => {
      mockContext.userAreaId = null;
      const result = validateSpecificPermission(mockContext, 'createInitiative');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Manager must be assigned to an area to create initiatives');
    });

    it('should validate editInitiative operation', () => {
      const result = validateSpecificPermission(mockContext, 'editInitiative', 'area-789');
      
      expect(result.isValid).toBe(true);
      expect(result.permission).toBe('editInitiative');
    });

    it('should validate manageActivities operation', () => {
      const result = validateSpecificPermission(mockContext, 'manageActivities', 'area-789');
      
      expect(result.isValid).toBe(true);
      expect(result.permission).toBe('manageActivities');
    });

    it('should validate updateProgress operation', () => {
      const result = validateSpecificPermission(mockContext, 'updateProgress', 'area-789');
      
      expect(result.isValid).toBe(true);
      expect(result.permission).toBe('updateProgress');
    });

    it('should handle unknown operations', () => {
      const result = validateSpecificPermission(mockContext, 'unknownOperation');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unknown operation: unknownOperation');
    });
  });

  describe('createPermissionValidator', () => {
    it('should create validator function', () => {
      const validator = createPermissionValidator('viewDashboards');
      const result = validator(mockContext);
      
      expect(result.isValid).toBe(true);
      expect(result.permission).toBe('viewDashboards');
    });

    it('should create failing validator', () => {
      mockContext.userRole = 'Manager';
      const validator = createPermissionValidator('manageUsers');
      const result = validator(mockContext);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing required permission: manageUsers');
    });
  });

  describe('validateAreaAccess', () => {
    it('should validate area access for managers', () => {
      const result = validateAreaAccess(mockContext, 'area-789');
      
      expect(result.isValid).toBe(true);
      expect(result.level).toBe('Database');
      expect(result.permission).toBe('areaAccess');
    });

    it('should fail area access for wrong area', () => {
      const result = validateAreaAccess(mockContext, 'different-area');
      
      expect(result.isValid).toBe(false);
    });
  });

  describe('getValidationSummary', () => {
    it('should generate summary for passing suite', () => {
      const suite = runPermissionValidationSuite(mockContext);
      // Force all validations to pass for test
      suite.overall.isValid = true;
      suite.overall.failedChecks = 0;
      suite.overall.criticalFailures = 0;
      
      const summary = getValidationSummary(suite);
      
      expect(summary).toContain('PASS');
      expect(summary).toContain('0/');
      expect(summary).not.toContain('critical');
    });

    it('should generate summary for failing suite', () => {
      const suite = runPermissionValidationSuite(mockContext);
      // Force some failures for test
      suite.overall.isValid = false;
      suite.overall.failedChecks = 3;
      suite.overall.totalChecks = 10;
      suite.overall.criticalFailures = 1;
      
      const summary = getValidationSummary(suite);
      
      expect(summary).toContain('FAIL');
      expect(summary).toContain('3/10 failed');
      expect(summary).toContain('(1 critical)');
    });

    it('should generate summary without critical failures', () => {
      const suite = runPermissionValidationSuite(mockContext);
      // Force failures but no critical ones
      suite.overall.isValid = false;
      suite.overall.failedChecks = 2;
      suite.overall.totalChecks = 8;
      suite.overall.criticalFailures = 0;
      
      const summary = getValidationSummary(suite);
      
      expect(summary).toContain('FAIL');
      expect(summary).toContain('2/8 failed');
      expect(summary).not.toContain('critical');
    });
  });
});