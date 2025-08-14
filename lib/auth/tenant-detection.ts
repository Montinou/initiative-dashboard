/**
 * Tenant Detection Utilities
 * Uses tenant_id from user profile, no subdomain validation
 */

export interface TenantInfo {
  id: string
  name: string
  isValid: boolean
}

// Tenant configuration mapping by ID
const TENANT_CONFIG: Record<string, { name: string }> = {
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': {
    name: 'SIGA Turismo'
  },
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12': {
    name: 'FEMA Electricidad'
  },
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13': {
    name: 'Stratix Platform'
  }
}

// Default tenant
const DEFAULT_TENANT: TenantInfo = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  name: 'SIGA Turismo',
  isValid: true
}

/**
 * Get tenant information from tenant ID
 */
export function getTenantFromId(tenantId: string): TenantInfo {
  const config = TENANT_CONFIG[tenantId]
  
  if (config) {
    return {
      id: tenantId,
      name: config.name,
      isValid: true
    }
  }
  
  // Unknown tenant, return default
  return DEFAULT_TENANT
}

/**
 * Validate if a tenant ID is valid
 */
export function isValidTenant(tenantId: string): boolean {
  return tenantId in TENANT_CONFIG
}

/**
 * Get all configured tenants
 */
export function getAllTenants(): Array<{ id: string; name: string }> {
  return Object.entries(TENANT_CONFIG).map(([id, config]) => ({
    id,
    name: config.name
  }))
}

/**
 * Check if current user belongs to the tenant
 */
export async function validateUserTenant(
  userTenantId: string,
  tenantId: string
): Promise<boolean> {
  return userTenantId === tenantId
}

/**
 * Get tenant-specific API endpoint
 */
export function getTenantApiEndpoint(endpoint: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
  return `${baseUrl}${endpoint}`
}

/**
 * Storage key helpers for tenant-specific data
 */
export function getTenantStorageKey(key: string, tenantId?: string): string {
  const tenant = tenantId || DEFAULT_TENANT.id
  return `${tenant}_${key}`
}

export function getTenantLocalStorage(key: string, tenantId?: string): any {
  if (typeof window === 'undefined') return null
  
  const storageKey = getTenantStorageKey(key, tenantId)
  const item = localStorage.getItem(storageKey)
  
  if (!item) return null
  
  try {
    return JSON.parse(item)
  } catch {
    return item
  }
}

export function setTenantLocalStorage(key: string, value: any, tenantId?: string): void {
  if (typeof window === 'undefined') return
  
  const storageKey = getTenantStorageKey(key, tenantId)
  const valueToStore = typeof value === 'string' ? value : JSON.stringify(value)
  
  localStorage.setItem(storageKey, valueToStore)
}

export function removeTenantLocalStorage(key: string, tenantId?: string): void {
  if (typeof window === 'undefined') return
  
  const storageKey = getTenantStorageKey(key, tenantId)
  localStorage.removeItem(storageKey)
}