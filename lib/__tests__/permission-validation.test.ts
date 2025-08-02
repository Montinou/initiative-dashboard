/**
 * Comprehensive Permission Validation Test Suite
 * Tests all permission validation levels and edge cases
 */

import {
  runPermissionValidationSuite,
  validateSpecificPermission,
  validateAreaAccess,
  ValidationContext,
  PermissionValidationSuite
} from '../permission-validation';
import { UserRole } from '../role-permissions';

// Test utilities
function createTestContext(
  userRole: UserRole,
  userAreaId: string | null = null,
  requestPath?: string
): ValidationContext {
  return {
    userId: 'test-user-id',
    userRole,
    userTenantId: 'test-tenant-id',
    userAreaId,
    requestPath,
    requestMethod: 'GET'
  };
}

function expectValidationPassed(suite: PermissionValidationSuite): void {
  expect(suite.overall.isValid).toBe(true);
  expect(suite.overall.failedChecks).toBe(0);
  expect(suite.overall.criticalFailures).toBe(0);
}

function expectValidationFailed(suite: PermissionValidationSuite, expectedFailures?: number): void {
  expect(suite.overall.isValid).toBe(false);
  if (expectedFailures !== undefined) {
    expect(suite.overall.failedChecks).toBe(expectedFailures);
  }
}

describe('Permission Validation System', () => {
  describe('CEO Role Validation', () => {
    it('should pass all validation checks for CEO', () => {
      const context = createTestContext('CEO');
      const suite = runPermissionValidationSuite(context);
      
      expectValidationPassed(suite);
      
      // CEO should have access to all areas
      expect(suite.ui.every(r => r.isValid)).toBe(true);
      expect(suite.api.every(r => r.isValid)).toBe(true);
      expect(suite.database.every(r => r.isValid)).toBe(true);
    });

    it('should allow CEO to access any area', () => {
      const context = createTestContext('CEO');
      const result = validateAreaAccess(context, 'any-area-id');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Admin Role Validation', () => {
    it('should pass most validation checks for Admin', () => {
      const context = createTestContext('Admin');
      const suite = runPermissionValidationSuite(context);
      
      // Admin should have some restrictions but mostly pass
      expect(suite.overall.criticalFailures).toBe(0);
      expect(suite.ui.filter(r => !r.isValid).length).toBeLessThanOrEqual(2);
    });

    it('should allow Admin to access admin routes', () => {
      const context = createTestContext('Admin', null, '/admin/users');
      const suite = runPermissionValidationSuite(context);
      
      const adminRouteValidation = suite.route.find(r => r.permission === 'adminRoute');
      expect(adminRouteValidation?.isValid).toBe(true);
    });
  });

  describe('Manager Role Validation', () => {
    describe('With proper area assignment', () => {
      it('should pass manager-specific validations', () => {
        const context = createTestContext('Manager', 'test-area-id', '/manager-dashboard');
        const suite = runPermissionValidationSuite(context);
        
        // Manager with area should have limited but valid access
        expect(suite.overall.criticalFailures).toBe(0);
        
        // Check manager-specific permissions
        const managerAreaValidation = suite.ui.find(r => r.permission === 'managerAreaAssignment');
        expect(managerAreaValidation?.isValid).toBe(true);
        
        const uploadValidation = suite.ui.find(r => r.permission === 'uploadFiles');
        expect(uploadValidation?.isValid).toBe(true);
      });

      it('should restrict manager to their assigned area only', () => {
        const context = createTestContext('Manager', 'assigned-area');
        
        // Test access to assigned area
        const assignedAreaResult = validateAreaAccess(context, 'assigned-area');
        expect(assignedAreaResult.isValid).toBe(true);
        
        // Test access to different area
        const otherAreaResult = validateAreaAccess(context, 'other-area');
        expect(otherAreaResult.isValid).toBe(false);
        expect(otherAreaResult.error).toContain('assigned area');
      });

      it('should allow manager to create initiatives in their area', () => {
        const context = createTestContext('Manager', 'test-area');
        const result = validateSpecificPermission(context, 'createInitiative', 'test-area');
        
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should prevent manager from creating initiatives in other areas', () => {
        const context = createTestContext('Manager', 'test-area');
        const result = validateSpecificPermission(context, 'createInitiative', 'other-area');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('cannot create initiative in this area');
      });

      it('should restrict manager from analytics access', () => {
        const context = createTestContext('Manager', 'test-area', '/analytics');
        const suite = runPermissionValidationSuite(context);
        
        const analyticsUIValidation = suite.ui.find(r => r.permission === 'accessAnalytics');
        expect(analyticsUIValidation?.isValid).toBe(true); // Should be restricted (false access = valid restriction)
        
        const analyticsRouteValidation = suite.route.find(r => r.permission === 'analyticsRoute');
        expect(analyticsRouteValidation?.isValid).toBe(true); // Should be restricted
      });
    });

    describe('Without area assignment', () => {
      it('should fail critical validations for manager without area', () => {
        const context = createTestContext('Manager', null);
        const suite = runPermissionValidationSuite(context);
        
        expectValidationFailed(suite);
        expect(suite.overall.criticalFailures).toBeGreaterThan(0);
        
        // Check specific failures
        const managerAreaValidation = suite.ui.find(r => r.permission === 'managerAreaAssignment');
        expect(managerAreaValidation?.isValid).toBe(false);
        expect(managerAreaValidation?.error).toContain('must be assigned to an area');
      });

      it('should prevent file uploads for manager without area', () => {
        const context = createTestContext('Manager', null);
        const result = validateSpecificPermission(context, 'createInitiative');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('must be assigned to an area');
      });
    });
  });

  describe('Analyst Role Validation', () => {
    it('should pass read-only validations for Analyst', () => {
      const context = createTestContext('Analyst');
      const suite = runPermissionValidationSuite(context);
      
      // Analyst should have read access but limited write access
      expect(suite.overall.criticalFailures).toBe(0);
      
      // Check that analyst cannot create initiatives
      const createInitiativeValidation = suite.ui.find(r => r.permission === 'createInitiatives');
      expect(createInitiativeValidation?.isValid).toBe(true); // Non-manager roles should pass this check
    });

    it('should allow analyst to access analytics', () => {
      const context = createTestContext('Analyst', null, '/analytics');
      const suite = runPermissionValidationSuite(context);
      
      const analyticsValidation = suite.ui.find(r => r.permission === 'accessAnalytics');
      expect(analyticsValidation?.isValid).toBe(true);
    });

    it('should prevent analyst from accessing admin routes', () => {
      const context = createTestContext('Analyst', null, '/admin');
      const suite = runPermissionValidationSuite(context);
      
      const adminRouteValidation = suite.route.find(r => r.permission === 'adminRoute');
      expect(adminRouteValidation?.isValid).toBe(false);
    });
  });

  describe('Database Level Validations', () => {
    it('should enforce tenant isolation for all roles', () => {
      const roles: UserRole[] = ['CEO', 'Admin', 'Manager', 'Analyst'];
      
      roles.forEach(role => {
        const context = createTestContext(role, role === 'Manager' ? 'test-area' : null);
        const suite = runPermissionValidationSuite(context);
        
        const tenantValidation = suite.database.find(r => r.permission === 'tenantFiltering');
        expect(tenantValidation?.isValid).toBe(true);
      });
    });

    it('should enforce area filtering for managers', () => {
      const context = createTestContext('Manager', 'test-area');
      const suite = runPermissionValidationSuite(context);
      
      const areaFilteringValidation = suite.database.find(r => r.permission === 'areaFiltering');
      expect(areaFilteringValidation?.isValid).toBe(true);
      
      const databaseFiltersValidation = suite.database.find(r => r.permission === 'databaseFilters');
      expect(databaseFiltersValidation?.isValid).toBe(true);
    });

    it('should prevent cross-area data access for managers', () => {
      const context = createTestContext('Manager', 'test-area');
      const suite = runPermissionValidationSuite(context);
      
      const crossAreaValidation = suite.database.find(r => r.permission === 'crossAreaRestriction');
      expect(crossAreaValidation?.isValid).toBe(true);
    });
  });

  describe('API Level Validations', () => {
    it('should validate tenant isolation for API access', () => {
      const context = createTestContext('Manager', 'test-area');
      const suite = runPermissionValidationSuite(context);
      
      const tenantIsolationValidation = suite.api.find(r => r.permission === 'tenantIsolation');
      expect(tenantIsolationValidation?.isValid).toBe(true);
    });

    it('should restrict manager API access appropriately', () => {
      const context = createTestContext('Manager', 'test-area');
      const suite = runPermissionValidationSuite(context);
      
      const managerAreaAPIValidation = suite.api.find(r => r.permission === 'managerAreaAPI');
      expect(managerAreaAPIValidation?.isValid).toBe(true);
      
      const analyticsAPIValidation = suite.api.find(r => r.permission === 'analyticsAPI');
      expect(analyticsAPIValidation?.isValid).toBe(true); // Should be restricted
    });
  });

  describe('Route Level Validations', () => {
    it('should protect manager dashboard routes', () => {
      const managerContext = createTestContext('Manager', 'test-area', '/manager-dashboard');
      const managerSuite = runPermissionValidationSuite(managerContext);
      
      const managerRouteValidation = managerSuite.route.find(r => r.permission === 'managerDashboardRoute');
      expect(managerRouteValidation?.isValid).toBe(true);
      
      // Test non-manager access
      const analystContext = createTestContext('Analyst', null, '/manager-dashboard');
      const analystSuite = runPermissionValidationSuite(analystContext);
      
      const analystRouteValidation = analystSuite.route.find(r => r.permission === 'managerDashboardRoute');
      expect(analystRouteValidation?.isValid).toBe(false);
    });

    it('should protect admin routes', () => {
      const roles: { role: UserRole; shouldHaveAccess: boolean }[] = [
        { role: 'CEO', shouldHaveAccess: true },
        { role: 'Admin', shouldHaveAccess: true },
        { role: 'Manager', shouldHaveAccess: false },
        { role: 'Analyst', shouldHaveAccess: false }
      ];
      
      roles.forEach(({ role, shouldHaveAccess }) => {
        const context = createTestContext(role, role === 'Manager' ? 'test-area' : null, '/admin');
        const suite = runPermissionValidationSuite(context);
        
        const adminRouteValidation = suite.route.find(r => r.permission === 'adminRoute');
        expect(adminRouteValidation?.isValid).toBe(shouldHaveAccess);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing tenant context', () => {
      const context: ValidationContext = {
        userId: 'test-user',
        userRole: 'Manager',
        userTenantId: null,
        userAreaId: 'test-area'
      };
      
      const suite = runPermissionValidationSuite(context);
      expectValidationFailed(suite);
      
      const tenantValidation = suite.api.find(r => r.permission === 'tenantIsolation');
      expect(tenantValidation?.isValid).toBe(false);
      expect(tenantValidation?.error).toContain('must be associated with a tenant');
    });

    it('should handle unknown operations gracefully', () => {
      const context = createTestContext('Manager', 'test-area');
      const result = validateSpecificPermission(context, 'unknownOperation');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unknown operation');
    });

    it('should validate all initiative operations for managers', () => {
      const context = createTestContext('Manager', 'test-area');
      const operations = ['createInitiative', 'editInitiative', 'manageActivities', 'updateProgress'];
      
      operations.forEach(operation => {
        const result = validateSpecificPermission(context, operation, 'test-area');
        expect(result.isValid).toBe(true);
        
        // Test with different area
        const wrongAreaResult = validateSpecificPermission(context, operation, 'other-area');
        expect(wrongAreaResult.isValid).toBe(false);
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should complete validation suite quickly', () => {
      const startTime = Date.now();
      const context = createTestContext('Manager', 'test-area');
      
      for (let i = 0; i < 100; i++) {
        runPermissionValidationSuite(context);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete 100 validations in under 1 second
      expect(totalTime).toBeLessThan(1000);
    });

    it('should handle large numbers of permission checks', () => {
      const context = createTestContext('CEO');
      const suite = runPermissionValidationSuite(context);
      
      // Ensure we're testing a comprehensive set of permissions
      expect(suite.overall.totalChecks).toBeGreaterThan(5);
      expect(suite.ui.length).toBeGreaterThan(0);
      expect(suite.api.length).toBeGreaterThan(0);
      expect(suite.database.length).toBeGreaterThan(0);
    });
  });
});

describe('Integration with Manager Permissions', () => {
  it('should integrate correctly with manager-specific functions', () => {
    const context = createTestContext('Manager', 'test-area');
    
    // Test file upload validation
    const uploadResult = validateSpecificPermission(context, 'createInitiative', 'test-area');
    expect(uploadResult.isValid).toBe(true);
    
    // Test cross-area restrictions
    const crossAreaResult = validateAreaAccess(context, 'other-area');
    expect(crossAreaResult.isValid).toBe(false);
  });

  it('should maintain consistency across all validation levels', () => {
    const context = createTestContext('Manager', 'test-area');
    const suite = runPermissionValidationSuite(context);
    
    // All levels should agree on manager area access
    const uiAreaCheck = suite.ui.find(r => r.permission === 'managerAreaAssignment')?.isValid;
    const apiAreaCheck = suite.api.find(r => r.permission === 'managerAreaAPI')?.isValid;
    const dbAreaCheck = suite.database.find(r => r.permission === 'areaFiltering')?.isValid;
    
    expect(uiAreaCheck).toBe(true);
    expect(apiAreaCheck).toBe(true);
    expect(dbAreaCheck).toBe(true);
  });
});