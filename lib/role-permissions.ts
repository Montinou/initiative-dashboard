// Consolidated Role-Based Access Control System
export type UserRole = 'CEO' | 'Admin' | 'Manager' | 'Analyst';

// Core permissions interface
export interface RolePermissions {
  // Dashboard and viewing permissions
  viewDashboards: boolean;
  viewAllAreas: boolean;
  viewOwnAreaOnly: boolean;
  accessAnalytics: boolean;
  viewOKRs: boolean;
  viewUserList: boolean;
  viewHistoricalData: boolean;
  viewTeamMetrics: boolean;
  
  // Management permissions
  manageUsers: boolean;
  manageAreas: boolean;
  manageOKRs: boolean;
  manageManagerUsers: boolean;
  manageAnalystUsers: boolean;
  manageActivities: boolean;
  
  // Initiative permissions
  createInitiatives: boolean;
  editInitiatives: boolean;
  deleteInitiatives: boolean;
  
  // Data permissions
  exportData: boolean;
  filterData: boolean;
  generateReports: boolean;
  updateProgress: boolean;
  
  // System permissions
  configureSystem: boolean;
  deleteUsers: boolean;
  deleteAreas: boolean;
  editUserProfiles: boolean;
  assignTasks: boolean;
  trackDepartmentProgress: boolean;
}

// Role restrictions interface
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

// Organizational context
export interface OrganizationalContext {
  suitableFor: string[];
  accessLevel: string;
  dataScope: string;
  areas?: string[];
}

// Complete role definition
export interface RoleDefinition {
  role: string;
  description: string;
  permissions: RolePermissions;
  restrictions: RoleRestrictions;
  organizationalContext: OrganizationalContext;
}

// Company specific areas/divisions
export const FEMA_DIVISIONS = [
  'División Iluminación',
  'División Electricidad', 
  'División Industria',
  'Administración',
  'E-commerce',
  'Logística'
] as const;

// SIGA specific areas (matches OKRFull.xlsx tabs)
export const SIGA_AREAS = [
  'Administración',
  'Producto',
  'Capital Humano',
  'Comercial'
] as const;

// Combined areas for all tenants
export const ALL_AREAS = [
  ...FEMA_DIVISIONS,
  ...SIGA_AREAS
] as const;

// Role hierarchy for fallback checks
export const ROLE_HIERARCHY = {
  CEO: 4,
  Admin: 3,
  Analyst: 2,
  Manager: 1
} as const;

// Comprehensive role permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  CEO: {
    // Dashboard and viewing permissions
    viewDashboards: true,
    viewAllAreas: true,
    viewOwnAreaOnly: false,
    accessAnalytics: true,
    viewOKRs: true,
    viewUserList: true,
    viewHistoricalData: true,
    viewTeamMetrics: true,
    
    // Management permissions
    manageUsers: true,
    manageAreas: true,
    manageOKRs: true,
    manageManagerUsers: true,
    manageAnalystUsers: true,
    manageActivities: true,
    
    // Initiative permissions
    createInitiatives: true,
    editInitiatives: true,
    deleteInitiatives: true,
    
    // Data permissions
    exportData: true,
    filterData: true,
    generateReports: true,
    updateProgress: true,
    
    // System permissions
    configureSystem: true,
    deleteUsers: true,
    deleteAreas: true,
    editUserProfiles: true,
    assignTasks: true,
    trackDepartmentProgress: true,
  },
  Admin: {
    // Dashboard and viewing permissions
    viewDashboards: true,
    viewAllAreas: true,
    viewOwnAreaOnly: false,
    accessAnalytics: true,
    viewOKRs: true,
    viewUserList: true,
    viewHistoricalData: true,
    viewTeamMetrics: true,
    
    // Management permissions
    manageUsers: true,
    manageAreas: true,
    manageOKRs: true,
    manageManagerUsers: true,
    manageAnalystUsers: true,
    manageActivities: true,
    
    // Initiative permissions
    createInitiatives: false,
    editInitiatives: false,
    deleteInitiatives: false,
    
    // Data permissions
    exportData: false,
    filterData: true,
    generateReports: true,
    updateProgress: true,
    
    // System permissions
    configureSystem: false,
    deleteUsers: false,
    deleteAreas: false,
    editUserProfiles: true,
    assignTasks: true,
    trackDepartmentProgress: true,
  },
  Manager: {
    // Dashboard and viewing permissions
    viewDashboards: true,
    viewAllAreas: false,
    viewOwnAreaOnly: true,
    accessAnalytics: false,
    viewOKRs: false,
    viewUserList: false,
    viewHistoricalData: false,
    viewTeamMetrics: true,
    
    // Management permissions
    manageUsers: false,
    manageAreas: false,
    manageOKRs: false,
    manageManagerUsers: false,
    manageAnalystUsers: false,
    manageActivities: true,
    
    // Initiative permissions
    createInitiatives: true,
    editInitiatives: true,
    deleteInitiatives: false,
    
    // Data permissions
    exportData: false,
    filterData: true,
    generateReports: false,
    updateProgress: true,
    
    // System permissions
    configureSystem: false,
    deleteUsers: false,
    deleteAreas: false,
    editUserProfiles: false,
    assignTasks: true,
    trackDepartmentProgress: false,
  },
  Analyst: {
    // Dashboard and viewing permissions
    viewDashboards: true,
    viewAllAreas: true,
    viewOwnAreaOnly: false,
    accessAnalytics: true,
    viewOKRs: false,
    viewUserList: false,
    viewHistoricalData: true,
    viewTeamMetrics: false,
    
    // Management permissions
    manageUsers: false,
    manageAreas: false,
    manageOKRs: false,
    manageManagerUsers: false,
    manageAnalystUsers: false,
    manageActivities: false,
    
    // Initiative permissions
    createInitiatives: false,
    editInitiatives: false,
    deleteInitiatives: false,
    
    // Data permissions
    exportData: true,
    filterData: true,
    generateReports: true,
    updateProgress: false,
    
    // System permissions
    configureSystem: false,
    deleteUsers: false,
    deleteAreas: false,
    editUserProfiles: false,
    assignTasks: false,
    trackDepartmentProgress: false,
  },
};

// Role definitions with complete context
export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  CEO: {
    role: 'CEO',
    description: 'Chief Executive Officer with full system access',
    permissions: ROLE_PERMISSIONS.CEO,
    restrictions: {
      cannotManageRoles: [],
      readOnlyAccess: false,
    },
    organizationalContext: {
      suitableFor: ['All organizations', 'Enterprise companies'],
      accessLevel: 'Full',
      dataScope: 'Global',
      areas: FEMA_DIVISIONS.slice(),
    },
  },
  Admin: {
    role: 'Admin',
    description: 'System administrator with user and area management rights',
    permissions: ROLE_PERMISSIONS.Admin,
    restrictions: {
      cannotManageRoles: ['CEO'],
      cannotAccessStrategicData: false,
      cannotModifySystemSettings: true,
    },
    organizationalContext: {
      suitableFor: ['Large teams', 'Multi-departmental organizations'],
      accessLevel: 'Administrative',
      dataScope: 'Global',
      areas: FEMA_DIVISIONS.slice(),
    },
  },
  Manager: {
    role: 'Manager',
    description: 'Department manager with area-specific permissions',
    permissions: ROLE_PERMISSIONS.Manager,
    restrictions: {
      cannotManageRoles: ['CEO', 'Admin', 'Manager'],
      scopeLimitedToOwnArea: true,
      cannotViewOtherAreas: true,
      canOnlyEditOwnInitiatives: true,
    },
    organizationalContext: {
      suitableFor: ['Department heads', 'Team leaders'],
      accessLevel: 'Departmental',
      dataScope: 'Area-specific',
    },
  },
  Analyst: {
    role: 'Analyst',
    description: 'Data analyst with reporting and export capabilities',
    permissions: ROLE_PERMISSIONS.Analyst,
    restrictions: {
      cannotManageRoles: ['CEO', 'Admin', 'Manager', 'Analyst'],
      cannotModifyData: true,
      readOnlyAccess: true,
    },
    organizationalContext: {
      suitableFor: ['Data analysts', 'Business intelligence teams'],
      accessLevel: 'Analytical',
      dataScope: 'Read-only global',
      areas: FEMA_DIVISIONS.slice(),
    },
  },
};

// Core permission checking function
export function hasPermission(userRole: UserRole, permission: keyof RolePermissions): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  return rolePermissions[permission];
}

// Area access control
export function canAccessArea(userRole: UserRole, userArea: string | null, targetArea: string): boolean {
  if (userRole === 'CEO' || userRole === 'Analyst') {
    return true;
  }
  
  if (userRole === 'Manager') {
    return userArea === targetArea;
  }
  
  // Admin can access all areas
  if (userRole === 'Admin') {
    return true;
  }
  
  return false;
}

// OKR access functions
export function canAccessOKRs(userRole: UserRole): boolean {
  return hasPermission(userRole, 'viewOKRs');
}

export function canManageOKRs(userRole: UserRole): boolean {
  return hasPermission(userRole, 'manageOKRs');
}

// Role hierarchy check
export function hasHigherOrEqualRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Get role definition
export function getRoleDefinition(role: UserRole): RoleDefinition {
  return ROLE_DEFINITIONS[role];
}

// Check if user can perform action on target user
export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  const managerHierarchy = ROLE_HIERARCHY[managerRole];
  const targetHierarchy = ROLE_HIERARCHY[targetRole];
  
  // Can only manage users with lower hierarchy
  return managerHierarchy > targetHierarchy;
}

// Get permitted areas for user
export function getPermittedAreas(userRole: UserRole, userArea?: string): string[] {
  if (userRole === 'CEO' || userRole === 'Admin' || userRole === 'Analyst') {
    return FEMA_DIVISIONS.slice();
  }
  
  if (userRole === 'Manager' && userArea) {
    return [userArea];
  }
  
  return [];
}