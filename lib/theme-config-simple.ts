// Simplified theme configuration - uses only tenant IDs, no domains/subdomains
export interface TenantTheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  gradientFrom: string;
  gradientTo: string;
  gradientVia?: string;
}

// Map tenant IDs to themes
const TENANT_THEMES: Record<string, TenantTheme> = {
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': {
    name: 'SIGA Turismo',
    primary: '#00508A',
    secondary: '#3B82F6',
    accent: '#0EA5E9',
    background: '#F8FBFD',
    gradientFrom: '#00508A',
    gradientTo: '#0EA5E9',
    gradientVia: '#3B82F6'
  },
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12': {
    name: 'FEMA Electricidad',
    primary: '#059669',
    secondary: '#FCD34D',
    accent: '#10B981',
    background: '#F9FDF9',
    gradientFrom: '#047857',
    gradientTo: '#FCD34D',
    gradientVia: '#10B981'
  },
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13': {
    name: 'Stratix Platform',
    primary: '#A855F7',
    secondary: '#EC4899',
    accent: '#8B5CF6',
    background: '#FDFCFE',
    gradientFrom: '#9333EA',
    gradientTo: '#EC4899',
    gradientVia: '#A855F7'
  }
};

// Default theme
const DEFAULT_THEME: TenantTheme = {
  name: 'Default',
  primary: '#3B4956',
  secondary: '#E5E7EB',
  accent: '#10B981',
  background: '#FEFEFE',
  gradientFrom: '#1F2937',
  gradientTo: '#10B981',
  gradientVia: '#3B4956'
};

// Get theme by tenant ID
export function getThemeByTenantId(tenantId: string): TenantTheme {
  return TENANT_THEMES[tenantId] || DEFAULT_THEME;
}

// Get theme for current tenant (alias for consistency)
export function getThemeForTenant(tenantId: string): TenantTheme {
  return getThemeByTenantId(tenantId);
}

// Apply theme CSS variables to document
export function applyThemeToDocument(tenantId: string): void {
  if (typeof window === 'undefined') return;
  
  const theme = getThemeByTenantId(tenantId);
  const root = document.documentElement;
  
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-secondary', theme.secondary);
  root.style.setProperty('--theme-accent', theme.accent);
  root.style.setProperty('--theme-background', theme.background);
  root.style.setProperty('--theme-gradient-from', theme.gradientFrom);
  root.style.setProperty('--theme-gradient-to', theme.gradientTo);
  if (theme.gradientVia) {
    root.style.setProperty('--theme-gradient-via', theme.gradientVia);
  }
}

// Export default tenant ID for convenience
export const DEFAULT_TENANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // SIGA