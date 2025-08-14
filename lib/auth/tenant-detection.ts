/**
 * Tenant Detection Utilities
 * Detects tenant from subdomain and provides tenant-specific configuration
 */

export interface TenantInfo {
  id?: string
  subdomain: string
  name: string
  domain: string
  isValid: boolean
}

// Tenant configuration mapping
const TENANT_CONFIG: Record<string, { id: string; name: string }> = {
  'siga': {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'SIGA Turismo'
  },
  'fema': {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    name: 'FEMA Electricidad'
  },
  'stratix': {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    name: 'Stratix Platform'
  }
}

// Default tenant for localhost and main domain
const DEFAULT_TENANT: TenantInfo = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  subdomain: 'default',
  name: 'Initiative Dashboard',
  domain: 'localhost',
  isValid: true
}

/**
 * Extract subdomain from hostname
 */
export function extractSubdomain(hostname: string): string | null {
  // Handle localhost and IP addresses
  if (hostname === 'localhost' || hostname.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
    // Check for port-based tenant detection in development
    const port = typeof window !== 'undefined' ? window.location.port : ''
    
    // Map specific ports to tenants for local development
    const portTenantMap: Record<string, string> = {
      '3001': 'siga',
      '3002': 'fema',
      '3003': 'stratix'
    }
    
    if (port && portTenantMap[port]) {
      return portTenantMap[port]
    }
    
    return null
  }
  
  // Handle standard domains
  const parts = hostname.split('.')
  
  // Must have at least subdomain.domain.tld
  if (parts.length < 3) {
    return null
  }
  
  // Return the first part as subdomain
  const subdomain = parts[0]
  
  // Ignore www
  if (subdomain === 'www') {
    return null
  }
  
  return subdomain
}

/**
 * Get tenant information from domain
 */
export function getTenantFromDomain(hostname: string): TenantInfo {
  const subdomain = extractSubdomain(hostname)
  
  // No subdomain detected, return default
  if (!subdomain) {
    return DEFAULT_TENANT
  }
  
  // Check if subdomain matches a configured tenant
  const tenantConfig = TENANT_CONFIG[subdomain.toLowerCase()]
  
  if (tenantConfig) {
    return {
      id: tenantConfig.id,
      subdomain: subdomain.toLowerCase(),
      name: tenantConfig.name,
      domain: hostname,
      isValid: true
    }
  }
  
  // Unknown subdomain
  return {
    subdomain: subdomain.toLowerCase(),
    name: `Unknown Tenant (${subdomain})`,
    domain: hostname,
    isValid: false
  }
}

/**
 * Validate if a subdomain is valid
 */
export function isValidTenant(subdomain: string): boolean {
  return subdomain.toLowerCase() in TENANT_CONFIG
}

/**
 * Get tenant ID from subdomain
 */
export function getTenantId(subdomain: string): string | null {
  const config = TENANT_CONFIG[subdomain.toLowerCase()]
  return config?.id || null
}

/**
 * Get all configured tenants
 */
export function getAllTenants(): Array<{ subdomain: string; name: string; id: string }> {
  return Object.entries(TENANT_CONFIG).map(([subdomain, config]) => ({
    subdomain,
    name: config.name,
    id: config.id
  }))
}

/**
 * Get tenant URL for a specific tenant
 */
export function getTenantUrl(subdomain: string, baseDomain?: string): string {
  // Use current domain or provided base domain
  const domain = baseDomain || (typeof window !== 'undefined' ? window.location.hostname : 'localhost')
  
  // For localhost, use port-based routing
  if (domain === 'localhost' || domain.includes('localhost')) {
    const portMap: Record<string, string> = {
      'siga': '3001',
      'fema': '3002',
      'stratix': '3003'
    }
    
    const port = portMap[subdomain] || '3000'
    return `http://localhost:${port}`
  }
  
  // For production, use subdomain
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:'
  
  // Remove any existing subdomain from the domain
  const baseDomainClean = domain.replace(/^[^.]+\./, '')
  
  return `${protocol}//${subdomain}.${baseDomainClean}`
}

/**
 * Redirect to tenant-specific URL
 */
export function redirectToTenant(subdomain: string, path: string = '/'): void {
  if (typeof window === 'undefined') return
  
  const tenantUrl = getTenantUrl(subdomain)
  window.location.href = `${tenantUrl}${path}`
}

/**
 * Check if current user belongs to the detected tenant
 */
export async function validateUserTenant(
  userTenantId: string,
  detectedTenant: TenantInfo
): Promise<boolean> {
  // If no tenant ID in detected tenant, allow (development mode)
  if (!detectedTenant.id) {
    return true
  }
  
  // Check if user's tenant matches detected tenant
  return userTenantId === detectedTenant.id
}

/**
 * Get tenant-specific API endpoint
 */
export function getTenantApiEndpoint(subdomain: string, endpoint: string): string {
  // You can customize API endpoints per tenant if needed
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
  
  // Add tenant as a header or query param based on your API design
  return `${baseUrl}${endpoint}`
}

/**
 * Storage key helpers for tenant-specific data
 */
export function getTenantStorageKey(key: string, subdomain?: string): string {
  const tenant = subdomain || extractSubdomain(window.location.hostname) || 'default'
  return `${tenant}_${key}`
}

export function getTenantLocalStorage(key: string, subdomain?: string): any {
  if (typeof window === 'undefined') return null
  
  const storageKey = getTenantStorageKey(key, subdomain)
  const item = localStorage.getItem(storageKey)
  
  if (!item) return null
  
  try {
    return JSON.parse(item)
  } catch {
    return item
  }
}

export function setTenantLocalStorage(key: string, value: any, subdomain?: string): void {
  if (typeof window === 'undefined') return
  
  const storageKey = getTenantStorageKey(key, subdomain)
  const valueToStore = typeof value === 'string' ? value : JSON.stringify(value)
  
  localStorage.setItem(storageKey, valueToStore)
}

export function removeTenantLocalStorage(key: string, subdomain?: string): void {
  if (typeof window === 'undefined') return
  
  const storageKey = getTenantStorageKey(key, subdomain)
  localStorage.removeItem(storageKey)
}