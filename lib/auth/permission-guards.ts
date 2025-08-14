/**
 * Permission Guards
 * Utility functions for checking and enforcing permissions
 */

import { redirect } from 'next/navigation'
import { validateServerSession } from './session-validation'

export type UserRole = 'CEO' | 'Admin' | 'Manager' | 'Analyst'

export type Permission = 
  | 'view_all_data'
  | 'edit_all_data'
  | 'delete_all_data'
  | 'manage_users'
  | 'manage_areas'
  | 'manage_objectives'
  | 'manage_initiatives'
  | 'manage_activities'
  | 'view_analytics'
  | 'export_data'
  | 'view_audit_log'
  | 'manage_settings'
  | 'invite_users'
  | 'upload_files'
  | 'delete_files'

// Role-permission matrix
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  CEO: [
    'view_all_data',
    'edit_all_data',
    'delete_all_data',
    'manage_users',
    'manage_areas',
    'manage_objectives',
    'manage_initiatives',
    'manage_activities',
    'view_analytics',
    'export_data',
    'view_audit_log',
    'manage_settings',
    'invite_users',
    'upload_files',
    'delete_files'
  ],
  Admin: [
    'view_all_data',
    'edit_all_data',
    'delete_all_data',
    'manage_users',
    'manage_areas',
    'manage_objectives',
    'manage_initiatives',
    'manage_activities',
    'view_analytics',
    'export_data',
    'view_audit_log',
    'manage_settings',
    'invite_users',
    'upload_files',
    'delete_files'
  ],
  Manager: [
    'view_all_data', // Limited to their area
    'manage_initiatives', // Limited to their area
    'manage_activities', // Limited to their area
    'upload_files' // Limited to their area
  ],
  Analyst: [
    'view_all_data',
    'view_analytics',
    'export_data'
  ]
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions ? permissions.includes(permission) : false
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}

/**
 * Server-side permission guard for pages
 */
export async function requirePermission(
  permission: Permission,
  redirectTo: string = '/dashboard'
) {
  const user = await validateServerSession()
  
  if (!hasPermission(user.profile.role as UserRole, permission)) {
    redirect(redirectTo)
  }
  
  return user
}

/**
 * Server-side role guard for pages
 */
export async function requireRole(
  allowedRoles: UserRole[],
  redirectTo: string = '/dashboard'
) {
  const user = await validateServerSession()
  
  if (!allowedRoles.includes(user.profile.role as UserRole)) {
    redirect(redirectTo)
  }
  
  return user
}

/**
 * Server-side area access guard
 */
export async function requireAreaAccess(
  areaId: string,
  redirectTo: string = '/dashboard'
) {
  const user = await validateServerSession()
  const role = user.profile.role as UserRole
  
  // CEO and Admin can access all areas
  if (['CEO', 'Admin'].includes(role)) {
    return user
  }
  
  // Manager can only access their own area
  if (role === 'Manager' && user.profile.area_id !== areaId) {
    redirect(redirectTo)
  }
  
  // Analyst can view all areas (no redirect for view operations)
  if (role === 'Analyst') {
    return user
  }
  
  return user
}

/**
 * API route permission guard
 */
export function createApiGuard(requiredPermission: Permission) {
  return async function guard(
    user: { profile: { role: string } } | null
  ): Promise<boolean> {
    if (!user) return false
    
    return hasPermission(user.profile.role as UserRole, requiredPermission)
  }
}

/**
 * API route role guard
 */
export function createRoleGuard(allowedRoles: UserRole[]) {
  return async function guard(
    user: { profile: { role: string } } | null
  ): Promise<boolean> {
    if (!user) return false
    
    return allowedRoles.includes(user.profile.role as UserRole)
  }
}

/**
 * API route area access guard
 */
export function createAreaGuard(targetAreaId: string) {
  return async function guard(
    user: { profile: { role: string; area_id?: string | null } } | null
  ): Promise<boolean> {
    if (!user) return false
    
    const role = user.profile.role as UserRole
    
    // CEO and Admin can access all areas
    if (['CEO', 'Admin'].includes(role)) {
      return true
    }
    
    // Manager can only access their own area
    if (role === 'Manager') {
      return user.profile.area_id === targetAreaId
    }
    
    // Analyst can view all areas
    if (role === 'Analyst') {
      return true
    }
    
    return false
  }
}

/**
 * Check if user can perform action on resource
 */
export function canPerformAction(
  user: { profile: { role: string; area_id?: string | null } },
  action: 'view' | 'create' | 'edit' | 'delete',
  resourceType: 'initiative' | 'activity' | 'objective' | 'area' | 'user',
  resourceAreaId?: string
): boolean {
  const role = user.profile.role as UserRole
  
  // CEO and Admin can do everything
  if (['CEO', 'Admin'].includes(role)) {
    return true
  }
  
  // Analyst can only view
  if (role === 'Analyst') {
    return action === 'view'
  }
  
  // Manager permissions
  if (role === 'Manager') {
    // Can only work with their own area
    if (resourceAreaId && user.profile.area_id !== resourceAreaId) {
      return false
    }
    
    // Managers cannot manage users or areas
    if (['user', 'area'].includes(resourceType)) {
      return false
    }
    
    // Managers cannot manage objectives
    if (resourceType === 'objective') {
      return action === 'view'
    }
    
    // Managers can manage initiatives and activities in their area
    if (['initiative', 'activity'].includes(resourceType)) {
      return ['view', 'create', 'edit'].includes(action)
    }
  }
  
  return false
}

/**
 * Get filtered permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Check if role is leadership (CEO or Admin)
 */
export function isLeadershipRole(role: UserRole): boolean {
  return ['CEO', 'Admin'].includes(role)
}

/**
 * Check if role can manage resources
 */
export function isManagerialRole(role: UserRole): boolean {
  return ['CEO', 'Admin', 'Manager'].includes(role)
}

/**
 * Check if role is read-only
 */
export function isReadOnlyRole(role: UserRole): boolean {
  return role === 'Analyst'
}

/**
 * Get accessible menu items based on role
 */
export function getAccessibleMenuItems(role: UserRole): string[] {
  const menuItems: Record<UserRole, string[]> = {
    CEO: [
      'dashboard',
      'objectives',
      'initiatives', 
      'areas',
      'analytics',
      'users',
      'settings',
      'audit-log'
    ],
    Admin: [
      'dashboard',
      'objectives',
      'initiatives',
      'areas',
      'analytics',
      'users',
      'settings',
      'audit-log'
    ],
    Manager: [
      'dashboard',
      'objectives',
      'initiatives',
      'manager-dashboard'
    ],
    Analyst: [
      'dashboard',
      'objectives',
      'initiatives',
      'analytics'
    ]
  }
  
  return menuItems[role] || []
}

/**
 * Error messages for permission denials
 */
export const PERMISSION_ERRORS = {
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',
  AREA_ACCESS_DENIED: 'You do not have access to this area',
  ROLE_REQUIRED: 'This action requires a different role',
  VIEW_ONLY: 'You have view-only access to this resource',
  MANAGER_AREA_ONLY: 'Managers can only access their assigned area',
  LEADERSHIP_ONLY: 'This action is restricted to CEO and Admin roles',
  NOT_AUTHENTICATED: 'You must be signed in to perform this action'
}