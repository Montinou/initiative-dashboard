/**
 * Simple client-side theme configuration
 * Works with shadcn CSS variables approach
 */

export interface CompanyTheme {
  companyName: string
  fullName: string
  domain: string
  tenantSlug?: string
  tenantId?: string
  colors?: {
    primary: string
    secondary: string
    accent: string
    background: string
    gradientFrom: string
    gradientTo: string
    gradientVia: string
  }
  logo?: {
    text: string
    icon: 'zap' | 'map' | 'building'
  }
  industry: string
  description: string
}

// Theme configurations that match our CSS variables
const THEMES: Record<string, CompanyTheme> = {
  'siga': {
    companyName: 'SIGA',
    fullName: 'Sistema Integrado de Gestión Administrativa',
    domain: 'siga.localhost',
    tenantSlug: 'siga',
    tenantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    colors: {
      primary: 'hsl(142 100% 36%)', // Verde original
      secondary: 'hsl(45 100% 51%)', // Amarillo original
      accent: 'hsl(142 100% 36%)',
      background: 'hsl(0 0% 100%)', // Fondo blanco original
      gradientFrom: 'from-green-50',
      gradientTo: 'to-yellow-50',
      gradientVia: 'via-emerald-50/30'
    },
    logo: {
      text: 'SIGA',
      icon: 'map'
    },
    industry: 'Gestión Turística',
    description: 'Optimiza tus operaciones turísticas con herramientas inteligentes'
  },
  'fema': {
    companyName: 'FEMA',
    fullName: 'Federal Emergency Management Agency',
    domain: 'fema.localhost',
    tenantSlug: 'fema',
    tenantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    colors: {
      primary: 'hsl(32 93% 64%)', // Naranja original
      secondary: 'hsl(250 71% 26%)', // Morado original
      accent: 'hsl(32 93% 64%)',
      background: 'hsl(0 0% 100%)', // Fondo blanco original
      gradientFrom: 'from-orange-50',
      gradientTo: 'to-purple-50',
      gradientVia: 'via-amber-50/30'
    },
    logo: {
      text: 'FEMA',
      icon: 'zap'
    },
    industry: 'Gestión de Emergencias',
    description: 'Coordina respuestas rápidas y eficientes ante situaciones críticas'
  },
  'stratix': {
    companyName: 'Stratix',
    fullName: 'Strategic Management Platform',
    domain: 'stratix.localhost',
    tenantSlug: 'stratix',
    tenantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    colors: {
      primary: 'hsl(245 59% 52%)', // Púrpura original
      secondary: 'hsl(17 80% 61%)', // Coral original
      accent: 'hsl(245 59% 52%)',
      background: 'hsl(0 0% 100%)', // Fondo blanco original
      gradientFrom: 'from-purple-50',
      gradientTo: 'to-orange-50',
      gradientVia: 'via-pink-50/30'
    },
    logo: {
      text: 'STRATIX',
      icon: 'building'
    },
    industry: 'Plataforma Estratégica',
    description: 'Transforma tu organización con análisis estratégico avanzado'
  }
}

// Default theme fallback - usa Stratix como base para login sin tenant
const DEFAULT_THEME: CompanyTheme = {
  companyName: 'STRATIX',
  fullName: 'Plataforma de Gestión Empresarial',
  domain: 'localhost',
  tenantSlug: 'default',
  colors: {
    primary: 'hsl(245 59% 52%)', // Púrpura de Stratix
    secondary: 'hsl(17 80% 61%)', // Coral de Stratix
    accent: 'hsl(245 59% 52%)', // Mismo púrpura
    background: 'hsl(0 0% 100%)', // Fondo blanco por defecto
    gradientFrom: 'from-purple-50',
    gradientTo: 'to-orange-50',
    gradientVia: 'via-pink-50/30'
  },
  logo: {
    text: 'STRATIX',
    icon: 'building'
  },
  industry: 'Plataforma de Gestión',
  description: 'Transforma tu organización con elegancia y eficiencia'
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
 * Generate CSS variables for theme following shadcn pattern exactly
 */
export function generateThemeCSS(theme: CompanyTheme, isDark: boolean = false): string {
  const colors = theme.colors || DEFAULT_THEME.colors!;
  const isDefaultTheme = theme.tenantSlug === 'default' || !theme.tenantSlug;
  
  // Para temas específicos (SIGA, etc.), siempre usar modo claro, para default permitir toggle
  const useDarkMode = isDefaultTheme && isDark;
  
  if (useDarkMode) {
    // shadcn dark theme - siguiendo exactamente las variables de shadcn
    return `
      /* shadcn Dark Theme with custom accent colors */
      :root {
        --background: 222.2 84% 4.9%;
        --foreground: 210 40% 98%;
        --card: 222.2 84% 4.9%;
        --card-foreground: 210 40% 98%;
        --popover: 222.2 84% 4.9%;
        --popover-foreground: 210 40% 98%;
        --primary: 210 40% 98%;
        --primary-foreground: 222.2 84% 4.9%;
        --secondary: 217.2 32.6% 17.5%;
        --secondary-foreground: 210 40% 98%;
        --muted: 217.2 32.6% 17.5%;
        --muted-foreground: 215 20.2% 65.1%;
        --accent: 217.2 32.6% 17.5%;
        --accent-foreground: 210 40% 98%;
        --destructive: 0 62.8% 30.6%;
        --destructive-foreground: 210 40% 98%;
        --border: 217.2 32.6% 17.5%;
        --input: 217.2 32.6% 17.5%;
        --ring: 212.7 26.8% 83.9%;
        --chart-1: 220 70% 50%;
        --chart-2: 160 60% 45%;
        --chart-3: 30 80% 55%;
        --chart-4: 280 65% 60%;
        --chart-5: 340 75% 55%;
        
        /* Custom theme colors as CSS variables */
        --theme-primary: ${colors.primary};
        --theme-secondary: ${colors.secondary};
        --theme-accent: ${colors.accent};
      }
    `
  } else {
    // shadcn light theme - siguiendo exactamente las variables de shadcn
    return `
      /* shadcn Light Theme with custom accent colors */
      :root {
        --background: 0 0% 97%;
        --foreground: 222.2 84% 4.9%;
        --card: 0 0% 100%;
        --card-foreground: 222.2 84% 4.9%;
        --popover: 0 0% 100%;
        --popover-foreground: 222.2 84% 4.9%;
        --primary: 222.2 47.4% 11.2%;
        --primary-foreground: 210 40% 98%;
        --secondary: 210 40% 96%;
        --secondary-foreground: 222.2 84% 4.9%;
        --muted: 210 40% 96%;
        --muted-foreground: 215.4 16.3% 46.9%;
        --accent: 210 40% 96%;
        --accent-foreground: 222.2 84% 4.9%;
        --destructive: 0 84.2% 60.2%;
        --destructive-foreground: 210 40% 98%;
        --border: 214.3 31.8% 91.4%;
        --input: 214.3 31.8% 91.4%;
        --ring: 222.2 84% 4.9%;
        --chart-1: 12 76% 61%;
        --chart-2: 173 58% 39%;
        --chart-3: 197 37% 24%;
        --chart-4: 43 74% 66%;
        --chart-5: 27 87% 67%;
        
        /* Custom theme colors as CSS variables */
        --theme-primary: ${colors.primary};
        --theme-secondary: ${colors.secondary};
        --theme-accent: ${colors.accent};
      }
    `
  }
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