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
  tenantSlug: string;
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

// Static theme configurations based on tenant slugs from database
// These use tenant slugs instead of UUIDs for better maintainability
export const COMPANY_THEMES: Record<string, CompanyTheme> = {
  'default': {
    companyName: 'Default',
    fullName: 'Default Professional Theme',
    domain: 'default',
    tenantSlug: 'default',
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
    tenantSlug: 'stratix-platform',
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
    tenantSlug: 'fema-electricidad',
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
    tenantSlug: 'siga-turismo',
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

// Get tenant slug from domain mapping (uses tenant slugs instead of UUIDs)
export function getTenantSlugFromDomain(hostname: string): string {
  console.log('🔍 getTenantSlugFromDomain: Looking up tenant for hostname:', hostname);
  
  // Map hostnames to tenant slugs
  if (hostname.includes('fema-electricidad') || hostname.includes('femaelectricidad')) {
    console.log('🏭 getTenantSlugFromDomain: Matched FEMA domain');
    return 'fema-electricidad';
  } else if (hostname.includes('siga-turismo') || hostname.includes('sigaturismo')) {
    console.log('🗺️ getTenantSlugFromDomain: Matched SIGA domain');
    return 'siga-turismo';
  } else if (hostname.includes('stratix-platform')) {
    console.log('🏢 getTenantSlugFromDomain: Matched Stratix domain');
    return 'stratix-platform';
  } else {
    console.log('🏢 getTenantSlugFromDomain: Using default tenant for:', hostname);
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

// Get theme from tenant slug (organization-based theming after login)
export function getThemeFromTenant(tenantSlug: string): CompanyTheme {
  console.log('🎨 getThemeFromTenant: Getting theme for tenant slug:', tenantSlug);
  
  // Direct mapping using tenant slug
  const theme = { ...COMPANY_THEMES[tenantSlug] };
  
  // If no theme found for the slug, use default
  if (!theme.companyName) {
    console.log('🎨 getThemeFromTenant: No theme found for slug:', tenantSlug, '- using default');
    return { ...COMPANY_THEMES['default'] };
  }
  
  console.log('🎨 getThemeFromTenant: Final theme:', {
    companyName: theme.companyName,
    tenantSlug: theme.tenantSlug
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
    return 'fema-electricidad';
  }
  if (hostname.includes('siga-turismo') || hostname.includes('sigaturismo')) {
    console.log('SIGA tenant restriction applied');
    return 'siga-turismo';
  }
  // stratix-platform allows access to all tenants (demo)
  console.log('No tenant restriction (Stratix demo)');
  return null;
}

// Utility function to get theme by slug or domain
export function getThemeBySlugOrDomain(identifier: string): CompanyTheme {
  console.log('🎨 getThemeBySlugOrDomain: Looking up theme for:', identifier);
  
  // First try direct slug lookup
  if (COMPANY_THEMES[identifier]) {
    console.log('🎨 getThemeBySlugOrDomain: Found theme by slug:', identifier);
    return { ...COMPANY_THEMES[identifier] };
  }
  
  // Then try domain-based lookup
  if (identifier.includes('.')) {
    console.log('🎨 getThemeBySlugOrDomain: Treating as domain, using domain lookup');
    return getThemeFromDomain(identifier);
  }
  
  // Default fallback
  console.log('🎨 getThemeBySlugOrDomain: No match found, using default theme');
  return { ...COMPANY_THEMES['default'] };
}

// Get all tenant slugs for dropdown/selection purposes
export function getAllTenantSlugs(): string[] {
  return Object.keys(COMPANY_THEMES).filter(key => key !== 'default');
}

// Mapping from domains to actual tenant UUIDs from database
// This bridges the gap between domain-based theme selection and database tenant IDs
const DOMAIN_TO_TENANT_ID: Record<string, string> = {
  'fema-electricidad': '550e8400-e29b-41d4-a716-446655440000', // FEMA UUID from database
  'siga-turismo': '550e8400-e29b-41d4-a716-446655440001', // SIGA UUID from database
  'stratix-platform': '550e8400-e29b-41d4-a716-446655440002', // Stratix UUID from database
  'default': null // No specific tenant ID for default theme
};

/**
 * Get tenant ID (UUID) from domain hostname
 * This function bridges domain-based routing to database tenant IDs
 * @param domain - The domain hostname to look up
 * @returns Actual tenant UUID from database, or null for default
 */
export function getTenantIdFromDomain(domain: string): string | null {
  console.log('🔍 getTenantIdFromDomain: Looking up tenant ID for domain:', domain);
  
  // Get tenant slug from domain first
  const tenantSlug = getTenantSlugFromDomain(domain);
  
  // Map slug to actual database UUID
  const tenantId = DOMAIN_TO_TENANT_ID[tenantSlug];
  
  console.log('🔍 getTenantIdFromDomain: Mapped', tenantSlug, 'to tenant ID:', tenantId);
  
  return tenantId;
}

// Note: Server-only function getTenantIdFromDomainAsync() has been moved to
// @/lib/server/theme-config.ts to avoid client/server conflicts

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