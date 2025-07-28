// Domain-based theme configuration for multi-tenant deployment
// Note: This file is used in both server and client contexts, so we don't import a specific client here

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
      gradientFrom: 'from-slate-950',
      gradientTo: 'to-indigo-950',
      gradientVia: 'via-purple-950/50'
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
      primary: '#00539F', // FEMA Blue (from brand guide)
      secondary: '#FFC72C', // Accent Yellow (from brand guide)
      accent: '#F0F2F5', // Light Gray for subtle accents
      background: '#212529', // Dark Gray background
      gradientFrom: 'from-[#001f3d]', // Darker blue
      gradientTo: 'to-[#212529]', // Dark gray
      gradientVia: 'via-[#00539F]/20' // FEMA Blue with transparency
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
      primary: '#00A651', // Vibrant Green (from brand guide)
      secondary: '#FDC300', // Action Yellow (from brand guide)
      accent: '#F8F9FA', // Light Gray for subtle accents
      background: '#212529', // Dark background for contrast
      gradientFrom: 'from-[#004225]', // Darker green
      gradientTo: 'to-[#212529]', // Dark gray
      gradientVia: 'via-[#00A651]/20' // Vibrant Green with transparency
    },
    logo: {
      text: 'SIGA',
      icon: 'map' // Travel/tourism icon
    },
    industry: 'Turismo y Viajes',
    description: 'Gestión integral de servicios turísticos y experiencias de viaje'
  }
};

// Get tenant ID from domain mapping (static mapping, no database calls)
function getTenantIdFromDomain(hostname: string): string {
  console.log('Getting tenant ID for hostname:', hostname);
  
  // Map hostnames directly to tenant IDs
  if (hostname.includes('fema-electricidad') || hostname.includes('femaelectricidad')) {
    return 'c5a4dd96-6058-42b3-8268-997728a529bb';
  } else if (hostname.includes('siga-turismo') || hostname.includes('sigaturismo')) {
    return 'd1a3408c-a3d0-487e-a355-a321a07b5ae2';
  } else if (hostname.includes('stratix-platform')) {
    return '4f644c1f-0d57-4980-8eba-ecc9ed7b661e';
  } else {
    // Default for localhost/development - use Stratix
    return '4f644c1f-0d57-4980-8eba-ecc9ed7b661e';
  }
}

// Get theme based on current domain (synchronous for client-side compatibility)
export function getThemeFromDomain(hostname: string): CompanyTheme {
  console.log('Getting theme for hostname:', hostname);
  
  // Get tenant ID from static mapping
  const tenantId = getTenantIdFromDomain(hostname);
  
  // Handle specific domain matching and update with tenant ID
  if (hostname.includes('fema-electricidad') || hostname.includes('femaelectricidad')) {
    console.log('Matched FEMA domain');
    const theme = { ...COMPANY_THEMES['fema-electricidad'] };
    theme.tenantId = tenantId;
    return theme;
  }
  
  // Handle specific domain matching for SIGA (both variants)
  if (hostname.includes('siga-turismo') || hostname.includes('sigaturismo')) {
    console.log('Matched SIGA domain');
    const theme = { ...COMPANY_THEMES['siga-turismo'] };
    theme.tenantId = tenantId;
    return theme;
  }
  
  if (hostname.includes('stratix-platform')) {
    console.log('Matched Stratix domain');
    const theme = { ...COMPANY_THEMES['stratix-platform'] };
    theme.tenantId = tenantId;
    return theme;
  }
  
  // Default to Stratix for localhost and unknown domains
  console.log('Using default Stratix theme for:', hostname);
  const theme = { ...COMPANY_THEMES['stratix-platform'] };
  theme.tenantId = tenantId;
  return theme;
}

// Async version for server-side usage when needed
export async function getThemeFromDomainAsync(hostname: string): Promise<CompanyTheme> {
  // For now, just use the synchronous version
  // In the future, this could include database lookups for dynamic themes
  return getThemeFromDomain(hostname);
}

// Get theme from tenant ID (organization-based theming after login)
export function getThemeFromTenant(tenantId: string): CompanyTheme {
  // Map tenant UUIDs to theme keys
  const tenantToTheme: Record<string, string> = {
    'c5a4dd96-6058-42b3-8268-997728a529bb': 'fema-electricidad',
    'd1a3408c-a3d0-487e-a355-a321a07b5ae2': 'siga-turismo',
    '4f644c1f-0d57-4980-8eba-ecc9ed7b661e': 'stratix-platform'
  };
  
  const themeKey = tenantToTheme[tenantId] || 'stratix-platform';
  const theme = { ...COMPANY_THEMES[themeKey] };
  theme.tenantId = tenantId; // Use the actual UUID
  return theme;
}

// Get available themes for demo purposes
export function getAllThemes(): CompanyTheme[] {
  return Object.values(COMPANY_THEMES);
}

// Check if domain should restrict to specific tenant
export async function getDomainTenantRestriction(hostname: string): Promise<string | null> {
  console.log('Getting tenant restriction for hostname:', hostname);
  
  if (hostname.includes('fema-electricidad') || hostname.includes('femaelectricidad')) {
    console.log('FEMA tenant restriction applied');
    return 'c5a4dd96-6058-42b3-8268-997728a529bb';
  }
  if (hostname.includes('siga-turismo') || hostname.includes('sigaturismo')) {
    console.log('SIGA tenant restriction applied');
    return 'd1a3408c-a3d0-487e-a355-a321a07b5ae2';
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
    
    /* Enhanced glassmorphism for theme */
    .theme-glass {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .theme-glass-darker {
      background: rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    /* Company-specific button styles following brand guidelines */
    .theme-button-primary {
      background-color: ${theme.colors.secondary};
      color: ${theme.tenantId === 'fema-electricidad' ? '#212529' : theme.tenantId === 'siga-turismo' ? '#212529' : '#FFFFFF'};
      border: none;
      font-weight: 500;
    }
    
    .theme-button-secondary {
      background-color: ${theme.colors.primary};
      color: #FFFFFF;
      border: none;
      font-weight: 500;
    }
    
    .theme-button-tertiary {
      background-color: transparent;
      color: ${theme.colors.primary};
      border: 1px solid ${theme.colors.primary};
      font-weight: 500;
    }
    
    /* Text colors for each brand */
    .theme-text-dark {
      color: #212529;
    }
    
    .theme-text-medium {
      color: ${theme.tenantId === 'fema-electricidad' ? '#6C757D' : theme.tenantId === 'siga-turismo' ? '#6C757D' : '#9CA3AF'};
    }
    
    .theme-text-light {
      color: ${theme.tenantId === 'fema-electricidad' ? '#F0F2F5' : theme.tenantId === 'siga-turismo' ? '#F8F9FA' : '#F3F4F6'};
    }
  `;
}