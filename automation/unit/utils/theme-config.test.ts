import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTenantSlugFromDomain,
  getThemeFromDomain,
  getThemeFromTenant,
  getAllThemes,
  getDomainTenantRestriction,
  getThemeBySlugOrDomain,
  getAllTenantSlugs,
  getTenantIdFromDomain,
  getTenantIdFromDomainAsync,
  generateThemeCSS,
  COMPANY_THEMES,
  CompanyTheme
} from '@/lib/theme-config';

// Mock Supabase client
const mockSupabaseQuery = {
  from: vi.fn(() => mockSupabaseQuery),
  select: vi.fn(() => mockSupabaseQuery),
  eq: vi.fn(() => mockSupabaseQuery),
  single: vi.fn(() => mockSupabaseQuery)
};

const mockSupabase = {
  from: vi.fn(() => mockSupabaseQuery)
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase)
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({}))
}));

// Mock console.log
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Theme Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  describe('getTenantSlugFromDomain', () => {
    it('should return fema-electricidad for FEMA domains', () => {
      expect(getTenantSlugFromDomain('fema-electricidad.vercel.app')).toBe('fema-electricidad');
      expect(getTenantSlugFromDomain('femaelectricidad.com')).toBe('fema-electricidad');
      expect(getTenantSlugFromDomain('subdomain.fema-electricidad.example.com')).toBe('fema-electricidad');
    });

    it('should return siga-turismo for SIGA domains', () => {
      expect(getTenantSlugFromDomain('siga-turismo.vercel.app')).toBe('siga-turismo');
      expect(getTenantSlugFromDomain('sigaturismo.com')).toBe('siga-turismo');
      expect(getTenantSlugFromDomain('subdomain.siga-turismo.example.com')).toBe('siga-turismo');
    });

    it('should return stratix-platform for Stratix domains', () => {
      expect(getTenantSlugFromDomain('stratix-platform.vercel.app')).toBe('stratix-platform');
      expect(getTenantSlugFromDomain('dev.stratix-platform.com')).toBe('stratix-platform');
    });

    it('should return default for unknown domains', () => {
      expect(getTenantSlugFromDomain('localhost:3000')).toBe('default');
      expect(getTenantSlugFromDomain('example.com')).toBe('default');
      expect(getTenantSlugFromDomain('unknown-domain.vercel.app')).toBe('default');
    });

    it('should log domain matching decisions', () => {
      getTenantSlugFromDomain('fema-electricidad.vercel.app');
      expect(consoleLogSpy).toHaveBeenCalledWith('🔍 getTenantSlugFromDomain: Looking up tenant for hostname:', 'fema-electricidad.vercel.app');
      expect(consoleLogSpy).toHaveBeenCalledWith('🏭 getTenantSlugFromDomain: Matched FEMA domain');
    });
  });

  describe('getThemeFromDomain', () => {
    it('should return FEMA theme for FEMA domains', () => {
      const theme = getThemeFromDomain('fema-electricidad.vercel.app');
      
      expect(theme.companyName).toBe('FEMA Electricidad');
      expect(theme.tenantSlug).toBe('fema-electricidad');
      expect(theme.colors.primary).toBe('#00539F');
      expect(theme.industry).toBe('Electrical');
    });

    it('should return SIGA theme for SIGA domains', () => {
      const theme = getThemeFromDomain('siga-turismo.vercel.app');
      
      expect(theme.companyName).toBe('SIGA Turismo');
      expect(theme.tenantSlug).toBe('siga-turismo');
      expect(theme.colors.primary).toBe('#00A651');
      expect(theme.industry).toBe('Tourism');
    });

    it('should return Stratix theme for Stratix domains', () => {
      const theme = getThemeFromDomain('stratix-platform.vercel.app');
      
      expect(theme.companyName).toBe('Stratix Platform');
      expect(theme.tenantSlug).toBe('stratix-platform');
      expect(theme.colors.primary).toBe('#6366f1');
      expect(theme.industry).toBe('Technology');
    });

    it('should return default theme for unknown domains', () => {
      const theme = getThemeFromDomain('localhost:3000');
      
      expect(theme.companyName).toBe('Default');
      expect(theme.tenantSlug).toBe('default');
      expect(theme.colors.primary).toBe('#475569');
      expect(theme.industry).toBe('Business');
    });

    it('should return cloned theme objects', () => {
      const theme1 = getThemeFromDomain('fema-electricidad.vercel.app');
      const theme2 = getThemeFromDomain('fema-electricidad.vercel.app');
      
      expect(theme1).not.toBe(theme2); // Different objects
      expect(theme1).toEqual(theme2); // Same content
    });

    it('should log theme selection decisions', () => {
      getThemeFromDomain('siga-turismo.vercel.app');
      expect(consoleLogSpy).toHaveBeenCalledWith('🌐 getThemeFromDomain: Getting theme for hostname:', 'siga-turismo.vercel.app');
      expect(consoleLogSpy).toHaveBeenCalledWith('🗺️ getThemeFromDomain: Matched SIGA domain');
    });
  });

  describe('getThemeFromTenant', () => {
    it('should return theme for valid tenant slug', () => {
      const theme = getThemeFromTenant('fema-electricidad');
      
      expect(theme.companyName).toBe('FEMA Electricidad');
      expect(theme.tenantSlug).toBe('fema-electricidad');
      expect(theme.colors.primary).toBe('#00539F');
    });

    it('should return default theme for invalid tenant slug', () => {
      const theme = getThemeFromTenant('non-existent-tenant');
      
      expect(theme.companyName).toBe('Default');
      expect(theme.tenantSlug).toBe('default');
    });

    it('should return default theme for empty tenant slug', () => {
      const theme = getThemeFromTenant('');
      
      expect(theme.companyName).toBe('Default');
      expect(theme.tenantSlug).toBe('default');
    });

    it('should log theme resolution', () => {
      getThemeFromTenant('siga-turismo');
      expect(consoleLogSpy).toHaveBeenCalledWith('🎨 getThemeFromTenant: Getting theme for tenant slug:', 'siga-turismo');
      expect(consoleLogSpy).toHaveBeenCalledWith('🎨 getThemeFromTenant: Final theme:', {
        companyName: 'SIGA Turismo',
        tenantSlug: 'siga-turismo'
      });
    });

    it('should log fallback to default theme', () => {
      getThemeFromTenant('unknown-tenant');
      expect(consoleLogSpy).toHaveBeenCalledWith('🎨 getThemeFromTenant: No theme found for slug:', 'unknown-tenant', '- using default');
    });
  });

  describe('getAllThemes', () => {
    it('should return all available themes', () => {
      const themes = getAllThemes();
      
      expect(themes).toHaveLength(4); // default, stratix-platform, fema-electricidad, siga-turismo
      expect(themes.map(t => t.tenantSlug)).toContain('default');
      expect(themes.map(t => t.tenantSlug)).toContain('fema-electricidad');
      expect(themes.map(t => t.tenantSlug)).toContain('siga-turismo');
      expect(themes.map(t => t.tenantSlug)).toContain('stratix-platform');
    });

    it('should return array of theme objects', () => {
      const themes = getAllThemes();
      
      themes.forEach(theme => {
        expect(theme).toHaveProperty('companyName');
        expect(theme).toHaveProperty('colors');
        expect(theme).toHaveProperty('industry');
        expect(theme).toHaveProperty('tenantSlug');
      });
    });
  });

  describe('getDomainTenantRestriction', () => {
    it('should return fema-electricidad for FEMA domains', async () => {
      const restriction = await getDomainTenantRestriction('fema-electricidad.vercel.app');
      expect(restriction).toBe('fema-electricidad');
    });

    it('should return siga-turismo for SIGA domains', async () => {
      const restriction = await getDomainTenantRestriction('siga-turismo.vercel.app');
      expect(restriction).toBe('siga-turismo');
    });

    it('should return null for Stratix platform (demo)', async () => {
      const restriction = await getDomainTenantRestriction('stratix-platform.vercel.app');
      expect(restriction).toBeNull();
    });

    it('should return null for unknown domains', async () => {
      const restriction = await getDomainTenantRestriction('example.com');
      expect(restriction).toBeNull();
    });

    it('should log restriction decisions', async () => {
      await getDomainTenantRestriction('fema-electricidad.vercel.app');
      expect(consoleLogSpy).toHaveBeenCalledWith('Getting tenant restriction for hostname:', 'fema-electricidad.vercel.app');
      expect(consoleLogSpy).toHaveBeenCalledWith('FEMA tenant restriction applied');
    });
  });

  describe('getThemeBySlugOrDomain', () => {
    it('should return theme by slug when direct match exists', () => {
      const theme = getThemeBySlugOrDomain('fema-electricidad');
      
      expect(theme.companyName).toBe('FEMA Electricidad');
      expect(theme.tenantSlug).toBe('fema-electricidad');
    });

    it('should treat as domain when identifier contains dot', () => {
      const theme = getThemeBySlugOrDomain('siga-turismo.vercel.app');
      
      expect(theme.companyName).toBe('SIGA Turismo');
      expect(theme.tenantSlug).toBe('siga-turismo');
    });

    it('should return default theme for unknown identifier', () => {
      const theme = getThemeBySlugOrDomain('unknown-identifier');
      
      expect(theme.companyName).toBe('Default');
      expect(theme.tenantSlug).toBe('default');
    });

    it('should log lookup process', () => {
      getThemeBySlugOrDomain('fema-electricidad');
      expect(consoleLogSpy).toHaveBeenCalledWith('🎨 getThemeBySlugOrDomain: Looking up theme for:', 'fema-electricidad');
      expect(consoleLogSpy).toHaveBeenCalledWith('🎨 getThemeBySlugOrDomain: Found theme by slug:', 'fema-electricidad');
    });

    it('should log domain-based lookup', () => {
      getThemeBySlugOrDomain('example.com');
      expect(consoleLogSpy).toHaveBeenCalledWith('🎨 getThemeBySlugOrDomain: Treating as domain, using domain lookup');
    });
  });

  describe('getAllTenantSlugs', () => {
    it('should return all tenant slugs except default', () => {
      const slugs = getAllTenantSlugs();
      
      expect(slugs).not.toContain('default');
      expect(slugs).toContain('fema-electricidad');
      expect(slugs).toContain('siga-turismo');
      expect(slugs).toContain('stratix-platform');
    });

    it('should return array of strings', () => {
      const slugs = getAllTenantSlugs();
      
      slugs.forEach(slug => {
        expect(typeof slug).toBe('string');
        expect(slug.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getTenantIdFromDomain', () => {
    it('should return correct UUID for FEMA domain', () => {
      const tenantId = getTenantIdFromDomain('fema-electricidad.vercel.app');
      expect(tenantId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should return correct UUID for SIGA domain', () => {
      const tenantId = getTenantIdFromDomain('siga-turismo.vercel.app');
      expect(tenantId).toBe('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should return correct UUID for Stratix domain', () => {
      const tenantId = getTenantIdFromDomain('stratix-platform.vercel.app');
      expect(tenantId).toBe('550e8400-e29b-41d4-a716-446655440002');
    });

    it('should return null for default domain', () => {
      const tenantId = getTenantIdFromDomain('localhost:3000');
      expect(tenantId).toBeNull();
    });

    it('should log tenant ID mapping', () => {
      getTenantIdFromDomain('fema-electricidad.vercel.app');
      expect(consoleLogSpy).toHaveBeenCalledWith('🔍 getTenantIdFromDomain: Looking up tenant ID for domain:', 'fema-electricidad.vercel.app');
      expect(consoleLogSpy).toHaveBeenCalledWith('🔍 getTenantIdFromDomain: Mapped', 'fema-electricidad', 'to tenant ID:', '550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('getTenantIdFromDomainAsync', () => {
    const mockTenant = {
      id: '550e8400-e29b-41d4-a716-446655440000'
    };

    beforeEach(() => {
      mockSupabase.from.mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.select.mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.eq.mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.single.mockResolvedValue({ data: mockTenant, error: null });
    });

    it('should return tenant ID for valid subdomain', async () => {
      const tenantId = await getTenantIdFromDomainAsync('fema-electricidad.vercel.app');
      
      expect(tenantId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(mockSupabase.from).toHaveBeenCalledWith('tenants');
      expect(mockSupabaseQuery.select).toHaveBeenCalledWith('id');
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('subdomain', 'fema-electricidad');
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should extract subdomain correctly', async () => {
      await getTenantIdFromDomainAsync('test.example.com');
      
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('subdomain', 'test');
    });

    it('should return null when tenant not found', async () => {
      mockSupabaseQuery.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });
      
      const tenantId = await getTenantIdFromDomainAsync('unknown.vercel.app');
      expect(tenantId).toBeNull();
    });

    it('should return null when database error occurs', async () => {
      mockSupabaseQuery.single.mockRejectedValue(new Error('Database connection failed'));
      
      const tenantId = await getTenantIdFromDomainAsync('fema-electricidad.vercel.app');
      expect(tenantId).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error looking up tenant by domain:', expect.any(Error));
    });

    it('should log successful tenant lookup', async () => {
      await getTenantIdFromDomainAsync('fema-electricidad.vercel.app');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('🔍 getTenantIdFromDomainAsync: Found tenant ID:', '550e8400-e29b-41d4-a716-446655440000', 'for subdomain:', 'fema-electricidad');
    });

    it('should log when no tenant found', async () => {
      mockSupabaseQuery.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });
      
      await getTenantIdFromDomainAsync('unknown.vercel.app');
      expect(consoleLogSpy).toHaveBeenCalledWith('🔍 getTenantIdFromDomainAsync: No tenant found for subdomain:', 'unknown');
    });
  });

  describe('generateThemeCSS', () => {
    const femaTheme = COMPANY_THEMES['fema-electricidad'];

    it('should generate CSS variables for theme colors', () => {
      const css = generateThemeCSS(femaTheme);
      
      expect(css).toContain('--theme-primary: #00539F');
      expect(css).toContain('--theme-secondary: #FFC72C');
      expect(css).toContain('--theme-accent: #F0F2F5');
      expect(css).toContain('--theme-background: #212529');
    });

    it('should generate gradient classes', () => {
      const css = generateThemeCSS(femaTheme);
      
      expect(css).toContain('.theme-gradient');
      expect(css).toContain('linear-gradient(135deg');
    });

    it('should generate theme utility classes', () => {
      const css = generateThemeCSS(femaTheme);
      
      expect(css).toContain('.theme-text-primary');
      expect(css).toContain('.theme-text-secondary');
      expect(css).toContain('.theme-bg-primary');
      expect(css).toContain('.theme-border-primary');
    });

    it('should generate glassmorphism classes', () => {
      const css = generateThemeCSS(femaTheme);
      
      expect(css).toContain('.theme-glass');
      expect(css).toContain('.theme-glass-darker');
      expect(css).toContain('backdrop-filter: blur(10px)');
    });

    it('should generate button styles', () => {
      const css = generateThemeCSS(femaTheme);
      
      expect(css).toContain('.theme-button-primary');
      expect(css).toContain('.theme-button-secondary');
      expect(css).toContain('.theme-button-tertiary');
    });

    it('should handle FEMA-specific button colors', () => {
      const css = generateThemeCSS(femaTheme);
      
      expect(css).toContain('color: #212529'); // Dark text for FEMA yellow buttons
    });

    it('should handle SIGA-specific button colors', () => {
      const sigaTheme = COMPANY_THEMES['siga-turismo'];
      const css = generateThemeCSS(sigaTheme);
      
      expect(css).toContain('color: #212529'); // Dark text for SIGA yellow buttons
    });

    it('should generate text color utilities', () => {
      const css = generateThemeCSS(femaTheme);
      
      expect(css).toContain('.theme-text-dark');
      expect(css).toContain('.theme-text-medium');
      expect(css).toContain('.theme-text-light');
    });

    it('should handle company-specific text colors', () => {
      const css = generateThemeCSS(femaTheme);
      
      expect(css).toContain('color: #6C757D'); // FEMA medium gray
      expect(css).toContain('color: #F0F2F5'); // FEMA light
    });
  });

  describe('COMPANY_THEMES constant', () => {
    it('should contain all expected theme properties', () => {
      Object.values(COMPANY_THEMES).forEach(theme => {
        expect(theme).toHaveProperty('companyName');
        expect(theme).toHaveProperty('fullName');
        expect(theme).toHaveProperty('domain');
        expect(theme).toHaveProperty('tenantSlug');
        expect(theme).toHaveProperty('colors');
        expect(theme).toHaveProperty('logo');
        expect(theme).toHaveProperty('industry');
        expect(theme).toHaveProperty('description');
        
        // Colors should have all required properties
        expect(theme.colors).toHaveProperty('primary');
        expect(theme.colors).toHaveProperty('secondary');
        expect(theme.colors).toHaveProperty('accent');
        expect(theme.colors).toHaveProperty('background');
        expect(theme.colors).toHaveProperty('gradientFrom');
        expect(theme.colors).toHaveProperty('gradientTo');
        
        // Logo should have text
        expect(theme.logo).toHaveProperty('text');
      });
    });

    it('should have valid color values', () => {
      Object.values(COMPANY_THEMES).forEach(theme => {
        // Check that colors are valid hex codes or CSS classes
        expect(theme.colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$|^\[#[0-9A-Fa-f]{6}\]$/);
        expect(theme.colors.secondary).toMatch(/^#[0-9A-Fa-f]{6}$|^\[#[0-9A-Fa-f]{6}\]$/);
        expect(theme.colors.gradientFrom).toMatch(/^from-/);
        expect(theme.colors.gradientTo).toMatch(/^to-/);
      });
    });

    it('should have unique tenant slugs', () => {
      const slugs = Object.keys(COMPANY_THEMES);
      const uniqueSlugs = [...new Set(slugs)];
      expect(slugs.length).toBe(uniqueSlugs.length);
    });

    it('should have consistent structure across all themes', () => {
      const themes = Object.values(COMPANY_THEMES);
      const firstTheme = themes[0];
      const firstThemeKeys = Object.keys(firstTheme).sort();
      
      themes.forEach(theme => {
        const themeKeys = Object.keys(theme).sort();
        expect(themeKeys).toEqual(firstThemeKeys);
      });
    });
  });
});