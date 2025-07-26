// Domain-based theme configuration for multi-tenant deployment

export interface CompanyTheme {
  companyName: string;
  fullName: string;
  domain: string;
  tenantId: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    gradientFrom: string;
    gradientTo: string;
    gradientVia?: string;
  };
  logo?: {
    text: string;
    icon?: string;
  };
  industry: string;
  description: string;
}

export const COMPANY_THEMES: Record<string, CompanyTheme> = {
  'stratix-platform': {
    companyName: 'Stratix',
    fullName: 'Stratix Platform',
    domain: 'stratix-platform.vercel.app',
    tenantId: 'stratix-demo',
    colors: {
      primary: '#6366f1', // indigo-500
      secondary: '#ec4899', // pink-500
      accent: '#14b8a6', // teal-500
      background: '#0f172a', // slate-900
      gradientFrom: 'from-indigo-950',
      gradientTo: 'to-pink-950',
      gradientVia: 'via-purple-950'
    },
    logo: {
      text: 'STRATIX',
      icon: 'building' // Corporate icon
    },
    industry: 'Enterprise Management Platform',
    description: 'Transform your organization with our comprehensive management suite'
  },
  'fema-electricidad': {
    companyName: 'FEMA',
    fullName: 'FEMA Electricidad',
    domain: 'fema-electricidad.vercel.app',
    tenantId: 'fema-electricidad',
    colors: {
      primary: '#8b5cf6', // purple-500
      secondary: '#06b6d4', // cyan-500
      accent: '#3b82f6', // blue-500
      background: '#1e1b4b', // indigo-900
      gradientFrom: 'from-purple-900',
      gradientTo: 'to-cyan-900',
      gradientVia: 'via-blue-900'
    },
    logo: {
      text: 'FEMA',
      icon: 'zap' // Electric/power icon
    },
    industry: 'Electricidad y Energía',
    description: 'Soluciones eléctricas integrales para el sector industrial y doméstico'
  },
  'siga-turismo': {
    companyName: 'SIGA',
    fullName: 'SIGA Turismo',
    domain: 'siga-turismo.vercel.app',
    tenantId: 'siga-turismo',
    colors: {
      primary: '#10b981', // emerald-500
      secondary: '#f59e0b', // amber-500
      accent: '#06b6d4', // cyan-500
      background: '#064e3b', // emerald-900
      gradientFrom: 'from-emerald-900',
      gradientTo: 'to-amber-900',
      gradientVia: 'via-teal-900'
    },
    logo: {
      text: 'SIGA',
      icon: 'map' // Travel/tourism icon
    },
    industry: 'Turismo y Viajes',
    description: 'Gestión integral de servicios turísticos y experiencias de viaje'
  }
};

// Get theme based on current domain
export function getThemeFromDomain(hostname: string): CompanyTheme {
  console.log('Getting theme for hostname:', hostname);
  
  // Handle specific domain matching
  if (hostname.includes('fema-electricidad')) {
    console.log('Matched FEMA domain');
    return COMPANY_THEMES['fema-electricidad'];
  }
  
  if (hostname.includes('siga-turismo')) {
    console.log('Matched SIGA domain');
    return COMPANY_THEMES['siga-turismo'];
  }
  
  if (hostname.includes('stratix-platform')) {
    console.log('Matched Stratix domain');
    return COMPANY_THEMES['stratix-platform'];
  }
  
  // Default to Stratix for localhost and unknown domains
  console.log('Using default Stratix theme for:', hostname);
  return COMPANY_THEMES['stratix-platform'];
}

// Get theme from tenant ID (organization-based theming after login)
export function getThemeFromTenant(tenantId: string): CompanyTheme {
  // Map tenant IDs to theme keys
  const tenantToTheme: Record<string, string> = {
    'fema-electricidad': 'fema-electricidad',
    'siga-turismo': 'siga-turismo',
    'stratix-demo': 'stratix-platform'
  };
  
  const themeKey = tenantToTheme[tenantId] || 'stratix-platform';
  return COMPANY_THEMES[themeKey];
}

// Get available themes for demo purposes
export function getAllThemes(): CompanyTheme[] {
  return Object.values(COMPANY_THEMES);
}

// Check if domain should restrict to specific tenant
export function getDomainTenantRestriction(hostname: string): string | null {
  console.log('Getting tenant restriction for hostname:', hostname);
  
  if (hostname.includes('fema-electricidad')) {
    console.log('FEMA tenant restriction applied');
    return 'fema-electricidad';
  }
  if (hostname.includes('siga-turismo')) {
    console.log('SIGA tenant restriction applied');
    return 'siga-turismo';
  }
  // stratix-platform allows access to all tenants (demo)
  console.log('No tenant restriction (Stratix demo)');
  return null;
}

// Generate CSS variables for theme
export function generateThemeCSS(theme: CompanyTheme): string {
  return `
    :root {
      --theme-primary: ${theme.colors.primary};
      --theme-secondary: ${theme.colors.secondary};
      --theme-accent: ${theme.colors.accent};
      --theme-background: ${theme.colors.background};
    }
    
    .theme-gradient {
      background: linear-gradient(135deg, 
        ${theme.colors.primary}22, 
        ${theme.colors.secondary}22, 
        ${theme.colors.accent}22
      );
    }
    
    .theme-text-primary {
      color: ${theme.colors.primary};
    }
    
    .theme-text-secondary {
      color: ${theme.colors.secondary};
    }
    
    .theme-bg-primary {
      background-color: ${theme.colors.primary};
    }
    
    .theme-border-primary {
      border-color: ${theme.colors.primary};
    }
  `;
}