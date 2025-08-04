import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isManagerOfArea,
  canManagerAccessData,
  getManagerDataFilters,
  canManagerUploadFiles,
  canManagerCreateInitiative,
  canManagerEditInitiative,
  canManagerManageActivities,
  canManagerUpdateProgress,
  createManagerAuditLog,
  validateManagerAreaAccess,
  getManagerDataScope,
  canAccessManagerDashboard,
  canAccessManagerUpload,
  canAccessManagerInitiatives
} from '@/lib/manager-permissions';
import { UserRole } from '@/lib/role-permissions';

// Mock the hasPermission function
vi.mock('@/lib/role-permissions', async () => {
  const actual = await vi.importActual('@/lib/role-permissions');
  return {
    ...actual,
    hasPermission: vi.fn((role: UserRole, permission: string) => {
      // Mock permissions for Manager role
      if (role === 'Manager') {
        const managerPermissions = ['viewDashboards', 'createInitiatives', 'editInitiatives', 'manageActivities', 'updateProgress'];
        return managerPermissions.includes(permission);
      }
      // CEO, Admin, Analyst have more permissions
      if (['CEO', 'Admin', 'Analyst'].includes(role)) {
        return true;
      }
      return false;
    })
  };
});

describe('Manager Permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isManagerOfArea', () => {
    it('should return true when manager is assigned to target area', () => {
      const result = isManagerOfArea('Manager', 'area-123', 'area-123');
      expect(result).toBe(true);
    });

    it('should return false when manager is assigned to different area', () => {
      const result = isManagerOfArea('Manager', 'area-123', 'area-456');
      expect(result).toBe(false);
    });

    it('should return false when user is not a manager', () => {
      const result = isManagerOfArea('Analyst', 'area-123', 'area-123');
      expect(result).toBe(false);
    });

    it('should return false when manager has no area assigned', () => {
      const result = isManagerOfArea('Manager', null, 'area-123');
      expect(result).toBe(false);
    });
  });

  describe('canManagerAccessData', () => {
    it('should return true for CEO accessing any area', () => {
      const result = canManagerAccessData('CEO', null, 'area-123');
      expect(result).toBe(true);
    });

    it('should return true for Admin accessing any area', () => {
      const result = canManagerAccessData('Admin', null, 'area-123');
      expect(result).toBe(true);
    });

    it('should return true for Analyst accessing any area', () => {
      const result = canManagerAccessData('Analyst', null, 'area-123');
      expect(result).toBe(true);
    });

    it('should return true for Manager accessing their own area', () => {
      const result = canManagerAccessData('Manager', 'area-123', 'area-123');
      expect(result).toBe(true);
    });

    it('should return false for Manager accessing different area', () => {
      const result = canManagerAccessData('Manager', 'area-123', 'area-456');
      expect(result).toBe(false);
    });

    it('should return false for Manager with null area', () => {
      const result = canManagerAccessData('Manager', null, 'area-123');
      expect(result).toBe(false);
    });
  });

  describe('getManagerDataFilters', () => {
    it('should return tenant filter only for CEO', () => {
      const result = getManagerDataFilters('CEO', 'tenant-123', null);
      expect(result).toEqual({ tenant_id: 'tenant-123' });
    });

    it('should return tenant filter only for Admin', () => {
      const result = getManagerDataFilters('Admin', 'tenant-123', null);
      expect(result).toEqual({ tenant_id: 'tenant-123' });
    });

    it('should return tenant filter only for Analyst', () => {
      const result = getManagerDataFilters('Analyst', 'tenant-123', null);
      expect(result).toEqual({ tenant_id: 'tenant-123' });
    });

    it('should return tenant and area filters for Manager', () => {
      const result = getManagerDataFilters('Manager', 'tenant-123', 'area-456');
      expect(result).toEqual({ 
        tenant_id: 'tenant-123',
        area_id: 'area-456'
      });
    });

    it('should return null when no tenant ID', () => {
      const result = getManagerDataFilters('Manager', null, 'area-123');
      expect(result).toBeNull();
    });

    it('should return null for unknown role', () => {
      const result = getManagerDataFilters('Unknown' as UserRole, 'tenant-123', 'area-123');
      expect(result).toBeNull();
    });
  });

  describe('canManagerUploadFiles', () => {
    it('should return true when manager has area and permission', () => {
      const result = canManagerUploadFiles('Manager', 'area-123');
      expect(result).toBe(true);
    });

    it('should return false when manager has no area', () => {
      const result = canManagerUploadFiles('Manager', null);
      expect(result).toBe(false);
    });

    it('should return false for non-manager role', () => {
      const result = canManagerUploadFiles('Analyst', 'area-123');
      expect(result).toBe(false);
    });

    it('should return false for empty area ID', () => {
      const result = canManagerUploadFiles('Manager', '');
      expect(result).toBe(false);
    });
  });

  describe('canManagerCreateInitiative', () => {
    it('should return true when manager creates in their area', () => {
      const result = canManagerCreateInitiative('Manager', 'area-123', 'area-123');
      expect(result).toBe(true);
    });

    it('should return false when manager creates in different area', () => {
      const result = canManagerCreateInitiative('Manager', 'area-123', 'area-456');
      expect(result).toBe(false);
    });

    it('should return false for non-manager role', () => {
      const result = canManagerCreateInitiative('Analyst', 'area-123', 'area-123');
      expect(result).toBe(false);
    });
  });

  describe('canManagerEditInitiative', () => {
    it('should return true when manager edits in their area', () => {
      const result = canManagerEditInitiative('Manager', 'area-123', 'area-123');
      expect(result).toBe(true);
    });

    it('should return false when manager edits in different area', () => {
      const result = canManagerEditInitiative('Manager', 'area-123', 'area-456');
      expect(result).toBe(false);
    });

    it('should return false for non-manager role', () => {
      const result = canManagerEditInitiative('Analyst', 'area-123', 'area-123');
      expect(result).toBe(false);
    });
  });

  describe('canManagerManageActivities', () => {
    it('should return true when manager manages activities in their area', () => {
      const result = canManagerManageActivities('Manager', 'area-123', 'area-123');
      expect(result).toBe(true);
    });

    it('should return false when manager manages activities in different area', () => {
      const result = canManagerManageActivities('Manager', 'area-123', 'area-456');
      expect(result).toBe(false);
    });
  });

  describe('canManagerUpdateProgress', () => {
    it('should return true when manager updates progress in their area', () => {
      const result = canManagerUpdateProgress('Manager', 'area-123', 'area-123');
      expect(result).toBe(true);
    });

    it('should return false when manager updates progress in different area', () => {
      const result = canManagerUpdateProgress('Manager', 'area-123', 'area-456');
      expect(result).toBe(false);
    });
  });

  describe('createManagerAuditLog', () => {
    it('should create audit log for manager with area', () => {
      const context = {
        isManager: true,
        areaId: 'area-123',
        areaName: 'Sales',
        tenantId: 'tenant-456'
      };
      
      const result = createManagerAuditLog(
        context,
        'create_initiative',
        'initiative',
        'init-789',
        { title: 'New Initiative' }
      );
      
      expect(result).toEqual({
        managerId: '',
        managerAreaId: 'area-123',
        action: 'create_initiative',
        resourceType: 'initiative',
        resourceId: 'init-789',
        details: { title: 'New Initiative' }
      });
    });

    it('should return null for non-manager', () => {
      const context = {
        isManager: false,
        areaId: 'area-123',
        areaName: 'Sales',
        tenantId: 'tenant-456'
      };
      
      const result = createManagerAuditLog(
        context,
        'create_initiative',
        'initiative'
      );
      
      expect(result).toBeNull();
    });

    it('should return null for manager without area', () => {
      const context = {
        isManager: true,
        areaId: null,
        areaName: null,
        tenantId: 'tenant-456'
      };
      
      const result = createManagerAuditLog(
        context,
        'create_initiative',
        'initiative'
      );
      
      expect(result).toBeNull();
    });
  });

  describe('validateManagerAreaAccess', () => {
    it('should return valid for non-manager roles', () => {
      const result = validateManagerAreaAccess('CEO', null, 'area-123');
      expect(result).toEqual({ isValid: true });
    });

    it('should return invalid when manager has no area', () => {
      const result = validateManagerAreaAccess('Manager', null, 'area-123');
      expect(result).toEqual({
        isValid: false,
        error: 'Manager user has no assigned area'
      });
    });

    it('should return invalid when manager accesses different area', () => {
      const result = validateManagerAreaAccess('Manager', 'area-123', 'area-456');
      expect(result).toEqual({
        isValid: false,
        error: 'Manager can only access their assigned area'
      });
    });

    it('should return valid when manager accesses their area', () => {
      const result = validateManagerAreaAccess('Manager', 'area-123', 'area-123');
      expect(result).toEqual({ isValid: true });
    });
  });

  describe('getManagerDataScope', () => {
    it('should return full scope for CEO', () => {
      const result = getManagerDataScope('CEO', 'tenant-123', null);
      expect(result).toEqual({
        tenantId: 'tenant-123',
        areaId: null,
        canViewAllAreas: true,
        dataFilters: { tenant_id: 'tenant-123' }
      });
    });

    it('should return full scope for Admin', () => {
      const result = getManagerDataScope('Admin', 'tenant-123', null);
      expect(result).toEqual({
        tenantId: 'tenant-123',
        areaId: null,
        canViewAllAreas: true,
        dataFilters: { tenant_id: 'tenant-123' }
      });
    });

    it('should return full scope for Analyst', () => {
      const result = getManagerDataScope('Analyst', 'tenant-123', null);
      expect(result).toEqual({
        tenantId: 'tenant-123',
        areaId: null,
        canViewAllAreas: true,
        dataFilters: { tenant_id: 'tenant-123' }
      });
    });

    it('should return limited scope for Manager', () => {
      const result = getManagerDataScope('Manager', 'tenant-123', 'area-456');
      expect(result).toEqual({
        tenantId: 'tenant-123',
        areaId: 'area-456',
        canViewAllAreas: false,
        dataFilters: { 
          tenant_id: 'tenant-123',
          area_id: 'area-456'
        }
      });
    });

    it('should return null when no tenant ID', () => {
      const result = getManagerDataScope('Manager', null, 'area-123');
      expect(result).toBeNull();
    });
  });

  describe('canAccessManagerDashboard', () => {
    it('should return true for Manager with permissions', () => {
      const result = canAccessManagerDashboard('Manager');
      expect(result).toBe(true);
    });

    it('should return false for non-Manager role', () => {
      const result = canAccessManagerDashboard('Analyst');
      expect(result).toBe(false);
    });
  });

  describe('canAccessManagerUpload', () => {
    it('should return true for Manager with area', () => {
      const result = canAccessManagerUpload('Manager', 'area-123');
      expect(result).toBe(true);
    });

    it('should return false for Manager without area', () => {
      const result = canAccessManagerUpload('Manager', null);
      expect(result).toBe(false);
    });

    it('should return false for non-Manager role', () => {
      const result = canAccessManagerUpload('Analyst', 'area-123');
      expect(result).toBe(false);
    });
  });

  describe('canAccessManagerInitiatives', () => {
    it('should return true for Manager with permissions', () => {
      const result = canAccessManagerInitiatives('Manager');
      expect(result).toBe(true);
    });

    it('should return false for non-Manager role', () => {
      const result = canAccessManagerInitiatives('Analyst');
      expect(result).toBe(false);
    });
  });
});