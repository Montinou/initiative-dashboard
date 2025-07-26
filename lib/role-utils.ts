// Role-based access control utilities
export type UserRole = 'CEO' | 'Admin' | 'Manager' | 'Analyst';

export interface RolePermissions {
  viewDashboards: boolean;
  manageUsers: boolean;
  manageAreas: boolean;
  createInitiatives: boolean;
  editInitiatives: boolean;
  exportData: boolean;
  viewAllAreas: boolean;
  deleteUsers: boolean;
  deleteAreas: boolean;
  deleteInitiatives: boolean;
  accessAnalytics: boolean;
  configureSystem: boolean;
  viewOKRs: boolean;
  manageOKRs: boolean;
  trackDepartmentProgress: boolean;
}

// Role permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  CEO: {
    viewDashboards: true,
    manageUsers: true,
    manageAreas: true,
    createInitiatives: true,
    editInitiatives: true,
    exportData: true,
    viewAllAreas: true,
    deleteUsers: true,
    deleteAreas: true,
    deleteInitiatives: true,
    accessAnalytics: true,
    configureSystem: true,
    viewOKRs: true,
    manageOKRs: true,
    trackDepartmentProgress: true,
  },
  Admin: {
    viewDashboards: true,
    manageUsers: true,
    manageAreas: true,
    createInitiatives: false,
    editInitiatives: false,
    exportData: false,
    viewAllAreas: true,
    deleteUsers: false,
    deleteAreas: false,
    deleteInitiatives: false,
    accessAnalytics: true,
    configureSystem: false,
    viewOKRs: true,
    manageOKRs: true,
    trackDepartmentProgress: true,
  },
  Manager: {
    viewDashboards: true,
    manageUsers: false,
    manageAreas: false,
    createInitiatives: true,
    editInitiatives: true,
    exportData: false,
    viewAllAreas: false,
    deleteUsers: false,
    deleteAreas: false,
    deleteInitiatives: false,
    accessAnalytics: false,
    configureSystem: false,
    viewOKRs: false,
    manageOKRs: false,
    trackDepartmentProgress: false,
  },
  Analyst: {
    viewDashboards: true,
    manageUsers: false,
    manageAreas: false,
    createInitiatives: false,
    editInitiatives: false,
    exportData: true,
    viewAllAreas: false,
    deleteUsers: false,
    deleteAreas: false,
    deleteInitiatives: false,
    accessAnalytics: true,
    configureSystem: false,
    viewOKRs: false,
    manageOKRs: false,
    trackDepartmentProgress: false,
  },
};

export function hasPermission(userRole: UserRole, permission: keyof RolePermissions): boolean {
  // TODO: Replace with actual user role from authentication context
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  return rolePermissions[permission];
}

export function canAccessOKRs(userRole: UserRole): boolean {
  return hasPermission(userRole, 'viewOKRs');
}

export function canManageOKRs(userRole: UserRole): boolean {
  return hasPermission(userRole, 'manageOKRs');
}

// These functions are deprecated - use the auth hooks instead
// Keeping for backward compatibility during migration
export function getCurrentUserRole(): UserRole {
  // Deprecated: Use useUserRole() hook instead
  console.warn('getCurrentUserRole is deprecated. Use useUserRole() hook instead.');
  return 'CEO'; // Fallback for non-hook contexts
}

export function getCurrentTenantId(): string {
  // Deprecated: Use useTenantId() hook instead  
  console.warn('getCurrentTenantId is deprecated. Use useTenantId() hook instead.');
  return 'fema-electricidad'; // Fallback for non-hook contexts
}