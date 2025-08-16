// Multi-tenant specific interfaces and types

import type { 
  UserRole, 
  Organization, 
  Tenant, 
  UserProfile,
  AuditLog 
} from './database'

// Tenant context for managing tenant-specific operations
export interface TenantContext {
  tenant_id: string
  organization_id: string
  subdomain: string
  user_profile: UserProfile
  organization?: Organization
  tenant?: Tenant
}

// Organization profile with extended data
export interface OrganizationProfile {
  organization: Organization
  tenants: Tenant[]
  total_users: number
  total_areas: number
  total_initiatives: number
  created_at: string
  updated_at: string
}

// Quarter planning interface removed - using date-based system

// Audit log entry with user details
export interface AuditLogEntry extends AuditLog {
  user_profile?: UserProfile
  user_email?: string
  user_full_name?: string
  user_role?: UserRole
}

// Tenant filter for queries
export interface TenantFilter {
  tenant_id: string
  include_inactive?: boolean
  date_range?: {
    start: string
    end: string
  }
}

// Multi-tenant query options
export interface MultiTenantQueryOptions {
  tenant_id: string
  user_id?: string
  role?: UserRole
  area_id?: string
  include_archived?: boolean
  include_audit?: boolean
  limit?: number
  offset?: number
  order_by?: string
  order_direction?: 'asc' | 'desc'
}

// Tenant-aware user profile
export interface TenantAwareUserProfile extends UserProfile {
  organization_name?: string
  tenant_subdomain?: string
  area_name?: string
  manager_name?: string
  permissions?: UserPermissions
}

// User permissions based on role and context
export interface UserPermissions {
  can_view_all_areas: boolean
  can_edit_all_areas: boolean
  can_manage_users: boolean
  can_view_all_initiatives: boolean
  can_edit_all_initiatives: boolean
  can_manage_objectives: boolean
  can_view_audit_log: boolean
  can_manage_organization: boolean
  can_manage_quarters: boolean
  is_area_manager: boolean
  managed_area_ids: string[]
}

// Tenant statistics
export interface TenantStatistics {
  tenant_id: string
  total_users: number
  total_areas: number
  total_objectives: number
  total_initiatives: number
  total_activities: number
  completed_initiatives: number
  completed_activities: number
  average_initiative_progress: number
  users_by_role: {
    ceo: number
    admin: number
    manager: number
  }
  initiatives_by_status: {
    in_progress: number
    completed: number
    overdue: number
    upcoming: number
  }
}


// Tenant configuration
export interface TenantConfiguration {
  tenant_id: string
  features: {
    objectives_enabled: boolean
    quarters_enabled: boolean
    audit_log_enabled: boolean
    file_upload_enabled: boolean
    ai_assistant_enabled: boolean
  }
  limits: {
    max_users: number
    max_areas: number
    max_initiatives: number
    max_file_size_mb: number
  }
  branding?: {
    primary_color?: string
    logo_url?: string
    custom_domain?: string
  }
}

// Cross-tenant data sharing (for future use)
export interface CrossTenantAccess {
  source_tenant_id: string
  target_tenant_id: string
  access_type: 'read' | 'write' | 'admin'
  resource_type: 'initiatives' | 'objectives' | 'reports'
  granted_by: string
  granted_at: string
  expires_at?: string
  is_active: boolean
}

// Helper function to get user permissions based on role
export function getUserPermissions(role: UserRole, is_area_manager: boolean = false, managed_area_ids: string[] = []): UserPermissions {
  switch (role) {
    case 'CEO':
      return {
        can_view_all_areas: true,
        can_edit_all_areas: true,
        can_manage_users: true,
        can_view_all_initiatives: true,
        can_edit_all_initiatives: true,
        can_manage_objectives: true,
        can_view_audit_log: true,
        can_manage_organization: true,
        can_manage_quarters: true,
        is_area_manager: false,
        managed_area_ids: []
      }
    case 'Admin':
      return {
        can_view_all_areas: true,
        can_edit_all_areas: true,
        can_manage_users: true,
        can_view_all_initiatives: true,
        can_edit_all_initiatives: true,
        can_manage_objectives: true,
        can_view_audit_log: true,
        can_manage_organization: false,
        can_manage_quarters: true,
        is_area_manager: false,
        managed_area_ids: []
      }
    case 'Manager':
      return {
        can_view_all_areas: false,
        can_edit_all_areas: false,
        can_manage_users: false,
        can_view_all_initiatives: false,
        can_edit_all_initiatives: false,
        can_manage_objectives: is_area_manager,
        can_view_audit_log: false,
        can_manage_organization: false,
        can_manage_quarters: false,
        is_area_manager,
        managed_area_ids
      }
    default:
      return {
        can_view_all_areas: false,
        can_edit_all_areas: false,
        can_manage_users: false,
        can_view_all_initiatives: false,
        can_edit_all_initiatives: false,
        can_manage_objectives: false,
        can_view_audit_log: false,
        can_manage_organization: false,
        can_manage_quarters: false,
        is_area_manager: false,
        managed_area_ids: []
      }
  }
}

// Helper to check if user can access a specific area
export function canAccessArea(userProfile: UserProfile, area_id: string): boolean {
  if (userProfile.role === 'CEO' || userProfile.role === 'Admin') {
    return true
  }
  return userProfile.area_id === area_id
}

// Helper to check if user can edit a specific initiative
export function canEditInitiative(userProfile: UserProfile, initiative_area_id: string): boolean {
  if (userProfile.role === 'CEO' || userProfile.role === 'Admin') {
    return true
  }
  if (userProfile.role === 'Manager' && userProfile.area_id === initiative_area_id) {
    return true
  }
  return false
}

// Helper to build tenant filter for Supabase queries
export function buildTenantFilter(tenant_id: string, additional_filters?: Record<string, any>) {
  return {
    tenant_id,
    ...additional_filters
  }
}

// Helper to validate tenant access
export function validateTenantAccess(user_tenant_id: string, requested_tenant_id: string): boolean {
  return user_tenant_id === requested_tenant_id
}

// Export all types for easy import
export type {
  UserRole
} from './database'