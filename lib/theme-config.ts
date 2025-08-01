// Multi-tenant theme configuration system
// 
// This system supports two theme selection modes:
// 1. DOMAIN-BASED: For login pages and pre-auth experiences (siga-turismo.vercel.app → SIGA theme)
// 2. USER-BASED: For dashboard and post-auth experiences (user's tenant_id → their organization's theme)
//
// This allows proper branding on login while respecting user's actual organization inside the app.
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

// Static theme configurations based on actual tenant database data
// These match the tenant UUIDs and settings from the database
export const COMPANY_THEMES: Record<string, CompanyTheme> = {
  'default': {
    companyName: 'Default',
    fullName: 'Default Professional Theme',
    domain: 'default',
    tenantId: 'default',
    colors: {
      primary: '#475569', // Professional slate blue
      secondary: '#E2E8F0', // Light slate gray
      accent: '#0F766E', // Cool teal accent
      background: '#FEFEFE', // Subtle warm white
      gradientFrom: 'from-slate-50',
      gradientTo: 'to-slate-100',
      gradientVia: 'via-teal-50/30'
    },
    logo: {
      text: 'APP',
      icon: 'building-2' // Generic business icon
    },
    industry: 'Business',
    description: 'Professional default theme for business applications'
  },
  'stratix-platform': {
    companyName: 'Stratix Platform',
    fullName: 'Stratix Platform',
    domain: 'stratix-platform.vercel.app',
    tenantId: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e', // Actual DB UUID
    colors: {
      primary: '#6366f1', // From DB: primary_color
      secondary: '#ec4899', // From DB: secondary_color  
      accent: '#14b8a6', // From DB: accent_color
      background: '#0f172a', // From DB: background_color
      gradientFrom: 'from-slate-950',
      gradientTo: 'to-indigo-950',
      gradientVia: 'via-purple-950/50'
    },
    logo: {
      text: 'STRATIX',
      icon: 'building' // Technology industry icon
    },
    industry: 'Technology', // From DB: industry
    description: 'Demo tenant for Stratix Platform' // From DB: description
  },
  'fema-electricidad': {
    companyName: 'FEMA Electricidad',
    fullName: 'FEMA Electricidad',
    domain: 'fema-electricidad.vercel.app',
    tenantId: 'c5a4dd96-6058-42b3-8268-997728a529bb', // Actual DB UUID
    colors: {
      primary: '#00539F', // From DB: primary_color
      secondary: '#FFC72C', // From DB: secondary_color
      accent: '#F0F2F5', // From DB: accent_color
      background: '#212529', // From DB: background_color
      gradientFrom: 'from-[#001f3d]', // Darker blue
      gradientTo: 'to-[#212529]', // Dark gray
      gradientVia: 'via-[#00539F]/20' // FEMA Blue with transparency
    },
    logo: {
      text: 'FEMA',
      icon: 'zap' // Electrical industry icon
    },
    industry: 'Electrical', // From DB: industry
    description: 'Empresa de materiales eléctricos' // From DB: description
  },
  'siga-turismo': {
    companyName: 'SIGA Turismo',
    fullName: 'SIGA Turismo',
    domain: 'siga-turismo.vercel.app',
    tenantId: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', // Actual DB UUID
    colors: {
      primary: '#00A651', // From DB: primary_color
      secondary: '#FDC300', // From DB: secondary_color
      accent: '#F8F9FA', // From DB: accent_color
      background: '#212529', // From DB: background_color
      gradientFrom: 'from-[#004225]', // Darker green
      gradientTo: 'to-[#212529]', // Dark gray
      gradientVia: 'via-[#00A651]/20' // SIGA Green with transparency
    },
    logo: {
      text: 'SIGA',
      icon: 'map' // Tourism industry icon
    },
    industry: 'Tourism', // From DB: industry
    description: 'Sistema de gestión turística' // From DB: description
  }
};

// Get tenant ID from domain mapping (matches actual database UUIDs)
export function getTenantIdFromDomain(hostname: string): string {
  console.log('🔍 getTenantIdFromDomain: Looking up tenant for hostname:', hostname);
  
  // Map hostnames to actual database tenant UUIDs
  if (hostname.includes('fema-electricidad') || hostname.includes('femaelectricidad')) {
    console.log('🏭 getTenantIdFromDomain: Matched FEMA domain');
    return 'c5a4dd96-6058-42b3-8268-997728a529bb'; // FEMA Electricidad UUID
  } else if (hostname.includes('siga-turismo') || hostname.includes('sigaturismo')) {
    console.log('🗺️ getTenantIdFromDomain: Matched SIGA domain');
    return 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'; // SIGA Turismo UUID
  } else if (hostname.includes('stratix-platform')) {
    console.log('🏢 getTenantIdFromDomain: Matched Stratix domain');
    return '4f644c1f-0d57-4980-8eba-ecc9ed7b661e'; // Stratix Platform UUID
  } else {
    console.log('🏢 getTenantIdFromDomain: Using default Stratix tenant for:', hostname);
    return 'default'; // Default to professional theme for localhost/development
  }
}

// Get theme based on current domain (used for login page and fallbacks)
// This ensures the correct branding is shown before user authentication
export function getThemeFromDomain(hostname: string): CompanyTheme {
  console.log('🌐 getThemeFromDomain: Getting theme for hostname:', hostname);
  
  // Handle specific domain matching (themes now have correct UUIDs)
  if (hostname.includes('fema-electricidad') || hostname.includes('femaelectricidad')) {
    console.log('🏭 getThemeFromDomain: Matched FEMA domain');
    return { ...COMPANY_THEMES['fema-electricidad'] };
  }
  
  if (hostname.includes('siga-turismo') || hostname.includes('sigaturismo')) {
    console.log('🗺️ getThemeFromDomain: Matched SIGA domain');
    return { ...COMPANY_THEMES['siga-turismo'] };
  }
  
  if (hostname.includes('stratix-platform')) {
    console.log('🏢 getThemeFromDomain: Matched Stratix domain');
    return { ...COMPANY_THEMES['stratix-platform'] };
  }
  
  // Default to professional theme for localhost and unknown domains
  console.log('🏢 getThemeFromDomain: Using default professional theme for:', hostname);
  return { ...COMPANY_THEMES['default'] };
}

// Async version for server-side usage when needed
export async function getThemeFromDomainAsync(hostname: string): Promise<CompanyTheme> {
  // For now, just use the synchronous version
  // In the future, this could include database lookups for dynamic themes
  return getThemeFromDomain(hostname);
}

// Get theme from tenant ID (organization-based theming after login)
export function getThemeFromTenant(tenantId: string): CompanyTheme {
  console.log('🎨 getThemeFromTenant: Mapping tenant ID to theme:', tenantId);
  
  // Map tenant UUIDs to theme keys
  const tenantToTheme: Record<string, string> = {
    'c5a4dd96-6058-42b3-8268-997728a529bb': 'fema-electricidad',
    'd1a3408c-a3d0-487e-a355-a321a07b5ae2': 'siga-turismo',
    '4f644c1f-0d57-4980-8eba-ecc9ed7b661e': 'stratix-platform'
  };
  
  const themeKey = tenantToTheme[tenantId] || 'default';
  console.log('🎨 getThemeFromTenant: Mapped to theme key:', themeKey);
  
  const theme = { ...COMPANY_THEMES[themeKey] };
  theme.tenantId = tenantId; // Use the actual UUID for API calls
  
  console.log('🎨 getThemeFromTenant: Final theme:', {
    companyName: theme.companyName,
    tenantId: theme.tenantId
  });
  
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
      color: ${theme.companyName === 'FEMA Electricidad' ? '#212529' : theme.companyName === 'SIGA Turismo' ? '#212529' : '#FFFFFF'};
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
      color: ${theme.companyName === 'FEMA Electricidad' ? '#6C757D' : theme.companyName === 'SIGA Turismo' ? '#6C757D' : '#9CA3AF'};
    }
    
    .theme-text-light {
      color: ${theme.companyName === 'FEMA Electricidad' ? '#F0F2F5' : theme.companyName === 'SIGA Turismo' ? '#F8F9FA' : '#F3F4F6'};
    }
  `;
}