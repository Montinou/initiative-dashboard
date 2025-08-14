/**
 * Simple client-side theme configuration
 * Works with shadcn CSS variables approach
 */

export interface CompanyTheme {
  name: string
  primary: string
  secondary: string
  accent: string
  logo?: string
  icon?: 'zap' | 'map' | 'building'
}

// Theme configurations that match our CSS variables
const THEMES: Record<string, CompanyTheme> = {
  'siga': {
    name: 'SIGA',
    primary: 'hsl(142 100% 36%)', // Verde
    secondary: 'hsl(45 100% 51%)', // Amarillo
    accent: 'hsl(142 100% 36%)',
    icon: 'map'
  },
  'fema': {
    name: 'FEMA',
    primary: 'hsl(32 93% 64%)', // Naranja
    secondary: 'hsl(250 71% 26%)', // Morado
    accent: 'hsl(32 93% 64%)',
    icon: 'zap'
  },
  'stratix': {
    name: 'Stratix',
    primary: 'hsl(245 59% 52%)', // Púrpura
    secondary: 'hsl(17 80% 61%)', // Coral
    accent: 'hsl(245 59% 52%)',
    icon: 'building'
  }
}

// Default theme fallback
const DEFAULT_THEME: CompanyTheme = {
  name: 'Default',
  primary: 'hsl(215 25% 27%)',
  secondary: 'hsl(220 14% 96%)',
  accent: 'hsl(215 25% 27%)',
  icon: 'building'
}

/**
 * Get theme from domain (client-side)
 */
export function getThemeFromDomain(domain?: string): CompanyTheme {
  if (!domain) {
    // If no domain, check if we're in the browser and use current host
    if (typeof window !== 'undefined') {
      domain = window.location.hostname
    } else {
      return DEFAULT_THEME
    }
  }
  
  // Extract subdomain
  const subdomain = domain.split('.')[0].toLowerCase()
  
  // Map subdomains to theme keys
  if (subdomain.includes('siga')) return THEMES['siga']
  if (subdomain.includes('fema')) return THEMES['fema']
  if (subdomain.includes('stratix')) return THEMES['stratix']
  
  return DEFAULT_THEME
}

/**
 * Generate CSS for theme (for dynamic use if needed)
 * Since we're using CSS variables, this is mainly for reference
 */
export function generateThemeCSS(theme: CompanyTheme): string {
  return `
    /* Dynamic theme CSS - ${theme.name} */
    :root {
      --primary: ${theme.primary};
      --secondary: ${theme.secondary};
      --accent: ${theme.accent};
    }
  `
}

/**
 * Apply theme to document (client-side only)
 */
export function applyTheme(themeName: string) {
  if (typeof window === 'undefined') return
  
  // Apply data-theme attribute for CSS variables
  document.documentElement.setAttribute('data-theme', themeName.toLowerCase())
}

/**
 * Get current theme name from document
 */
export function getCurrentTheme(): string {
  if (typeof window === 'undefined') return 'default'
  return document.documentElement.getAttribute('data-theme') || 'default'
}

/**
 * Get theme from tenant ID
 */
export function getThemeFromTenant(tenantId?: string | null): CompanyTheme {
  if (!tenantId) return DEFAULT_THEME
  
  // Map tenant IDs to themes
  const TENANT_THEME_MAP: Record<string, string> = {
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': 'siga',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12': 'fema',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13': 'stratix'
  }
  
  const themeName = TENANT_THEME_MAP[tenantId]
  return themeName ? THEMES[themeName] : DEFAULT_THEME
}