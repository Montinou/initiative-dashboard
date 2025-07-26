export interface RolePermissions {
  viewDashboards: boolean;
  manageUsers: boolean;
  manageAreas: boolean;
  createInitiatives: boolean;
  editInitiatives: boolean;
  exportData: boolean;
  viewAllAreas: boolean;
  deleteUsers?: boolean;
  deleteAreas?: boolean;
  deleteInitiatives?: boolean;
  accessAnalytics?: boolean;
  configureSystem?: boolean;
  manageManagerUsers?: boolean;
  manageAnalystUsers?: boolean;
  viewUserList?: boolean;
  editUserProfiles?: boolean;
  filterData?: boolean;
  generateReports?: boolean;
  viewHistoricalData?: boolean;
  viewOwnAreaOnly?: boolean;
  updateProgress?: boolean;
  manageActivities?: boolean;
  assignTasks?: boolean;
  viewTeamMetrics?: boolean;
}

export interface RoleRestrictions {
  cannotManageRoles?: string[];
  cannotAccessStrategicData?: boolean;
  cannotViewReports?: boolean;
  readOnlyAccess?: boolean;
  cannotModifyData?: boolean;
  cannotCreateContent?: boolean;
  scopeLimitedToOwnArea?: boolean;
  cannotViewOtherAreas?: boolean;
  cannotModifySystemSettings?: boolean;
  canOnlyEditOwnInitiatives?: boolean;
}

export interface OrganizationalContext {
  suitableFor: string[];
  accessLevel: string;
  dataScope: string;
  areas?: string[];
}

export interface RoleDefinition {
  role: string;
  description: string;
  permissions: RolePermissions;
  restrictions: RoleRestrictions;
  organizationalContext: OrganizationalContext;
}

export type UserRole = 'CEO' | 'Admin' | 'Analyst' | 'Manager';

export const FEMA_DIVISIONS = [
  'División Iluminación',
  'División Electricidad', 
  'División Industria',
  'Administración',
  'E-commerce',
  'Logística'
] as const;

export const ROLE_HIERARCHY = {
  CEO: 4,
  Admin: 3,
  Analyst: 2,
  Manager: 1
} as const;

export function hasPermission(userRole: UserRole, permission: keyof RolePermissions): boolean {
  // TODO: Implement with actual role data fetching from database/auth system
  const roleHierarchy = ROLE_HIERARCHY[userRole];
  
  switch (permission) {
    case 'viewDashboards':
      return userRole !== 'Admin';
    case 'manageUsers':
      return userRole === 'CEO' || userRole === 'Admin';
    case 'manageAreas':
      return userRole === 'CEO' || userRole === 'Admin';
    case 'exportData':
      return userRole === 'CEO' || userRole === 'Analyst';
    case 'viewAllAreas':
      return userRole === 'CEO' || userRole === 'Analyst';
    default:
      return roleHierarchy >= 3; // CEO and Admin by default
  }
}

export function canAccessArea(userRole: UserRole, userArea: string | null, targetArea: string): boolean {
  if (userRole === 'CEO' || userRole === 'Analyst') {
    return true;
  }
  
  if (userRole === 'Manager') {
    return userArea === targetArea;
  }
  
  return false;
}