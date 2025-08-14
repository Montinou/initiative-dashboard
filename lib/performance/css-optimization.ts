/**
 * CSS Performance Optimization System
 * Optimizes glassmorphism effects and general CSS delivery
 */

// ============================================================================
// CRITICAL CSS EXTRACTION
// ============================================================================

export const extractCriticalCSS = () => {
  // Critical CSS that should be inlined
  return `
    /* Critical layout and typography styles */
    .glass-effect {
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      will-change: backdrop-filter;
    }
    
    .glass-button {
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      transform: translateZ(0);
      will-change: transform, backdrop-filter;
    }
    
    .glass-hover:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }
    
    /* Performance optimized animations */
    .animate-fade-in {
      animation: fade-in 0.2s ease-out;
    }
    
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* Essential button styles */
    .btn-primary {
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      border-radius: 0.375rem;
      padding: 0.5rem 1rem;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    
    .btn-primary:hover {
      background: hsl(var(--primary) / 0.9);
    }
  `;
};

// ============================================================================
// OPTIMIZED GLASSMORPHISM SYSTEM
// ============================================================================

export interface GlassmorphismConfig {
  blur: number;
  opacity: number;
  borderOpacity: number;
  performance: 'high' | 'medium' | 'low';
}

export const createOptimizedGlassStyle = (config: GlassmorphismConfig) => {
  const { blur, opacity, borderOpacity, performance } = config;
  
  // Optimize based on performance level
  const optimizedBlur = performance === 'low' ? Math.min(blur, 8) : blur;
  const useWebkitFallback = performance !== 'low';
  
  return {
    backdropFilter: `blur(${optimizedBlur}px)`,
    ...(useWebkitFallback && { WebkitBackdropFilter: `blur(${optimizedBlur}px)` }),
    background: `rgba(255, 255, 255, ${opacity})`,
    border: `1px solid rgba(255, 255, 255, ${borderOpacity})`,
    willChange: performance === 'high' ? 'backdrop-filter, transform' : 'auto',
    transform: 'translateZ(0)', // Force hardware acceleration
  };
};

// ============================================================================
// CSS LOADING OPTIMIZATION
// ============================================================================

export class CSSOptimizer {
  private loadedStyles = new Set<string>();
  private criticalLoaded = false;
  
  // Load critical CSS synchronously
  loadCriticalCSS() {
    if (this.criticalLoaded) return;
    
    const style = document.createElement('style');
    style.textContent = extractCriticalCSS();
    style.setAttribute('data-critical', 'true');
    document.head.insertBefore(style, document.head.firstChild);
    
    this.criticalLoaded = true;
  }
  
  // Load non-critical CSS asynchronously
  async loadAsyncCSS(href: string, id: string) {
    if (this.loadedStyles.has(id)) return;
    
    return new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.id = id;
      link.onload = () => {
        this.loadedStyles.add(id);
        resolve();
      };
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }
  
  // Preload CSS for better performance
  preloadCSS(href: string) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    document.head.appendChild(link);
    
    // Convert to stylesheet after load
    link.onload = () => {
      link.rel = 'stylesheet';
    };
  }
  
  // Remove unused CSS
  removeUnusedCSS(selectors: string[]) {
    const sheets = Array.from(document.styleSheets);
    
    sheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach((rule, index) => {
          if (rule instanceof CSSStyleRule) {
            const selector = rule.selectorText;
            if (selectors.some(unused => selector.includes(unused))) {
              sheet.deleteRule(index);
            }
          }
        });
      } catch (e) {
        // Cross-origin restrictions or other errors
        console.warn('Could not access stylesheet:', e);
      }
    });
  }
}

// ============================================================================
// PERFORMANCE-OPTIMIZED CSS CLASSES
// ============================================================================

export const optimizedClasses = {
  // Glassmorphism with performance tiers
  glass: {
    high: 'backdrop-blur-xl bg-white/10 border border-white/20 will-change-[backdrop-filter,transform]',
    medium: 'backdrop-blur-lg bg-white/10 border border-white/20',
    low: 'backdrop-blur-md bg-white/15 border border-white/25'
  },
  
  // Optimized animations
  transitions: {
    fast: 'transition-all duration-150 ease-out',
    normal: 'transition-all duration-200 ease-out',
    slow: 'transition-all duration-300 ease-out'
  },
  
  // Hardware-accelerated transforms
  transforms: {
    gpu: 'transform-gpu will-change-transform',
    translate: 'translate-x-0 translate-y-0 translate-z-0',
    hover: 'hover:translate-y-[-2px] hover:scale-[1.02]'
  },
  
  // Optimized layouts
  layouts: {
    flex: 'flex items-center justify-center',
    grid: 'grid place-items-center',
    absolute: 'absolute inset-0'
  }
};

// ============================================================================
// CSS VARIABLES OPTIMIZATION
// ============================================================================

export const injectOptimizedCSSVariables = () => {
  const root = document.documentElement;
  
  // Optimized color variables
  const optimizedColors = {
    '--primary-optimized': 'hsl(222.2 84% 4.9%)',
    '--primary-foreground-optimized': 'hsl(210 40% 98%)',
    '--secondary-optimized': 'hsl(210 40% 96%)',
    '--secondary-foreground-optimized': 'hsl(222.2 84% 4.9%)',
    '--muted-optimized': 'hsl(210 40% 96%)',
    '--muted-foreground-optimized': 'hsl(215.4 16.3% 46.9%)',
    '--accent-optimized': 'hsl(210 40% 96%)',
    '--accent-foreground-optimized': 'hsl(222.2 84% 4.9%)',
    '--border-optimized': 'hsl(214.3 31.8% 91.4%)',
    '--ring-optimized': 'hsl(222.2 84% 4.9%)',
  };
  
  Object.entries(optimizedColors).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  
  // Performance-optimized glassmorphism variables
  const glassVariables = {
    '--glass-bg': 'rgba(255, 255, 255, 0.1)',
    '--glass-border': 'rgba(255, 255, 255, 0.2)',
    '--glass-blur': '12px',
    '--glass-shadow': '0 8px 32px rgba(0, 0, 0, 0.1)',
  };
  
  Object.entries(glassVariables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
};

// ============================================================================
// RESPONSIVE CSS OPTIMIZATION
// ============================================================================

export const createResponsiveGlassClasses = () => {
  return `
    @media (max-width: 768px) {
      .glass-effect {
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        background: rgba(255, 255, 255, 0.15);
      }
    }
    
    @media (min-width: 769px) {
      .glass-effect {
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        background: rgba(255, 255, 255, 0.1);
      }
    }
    
    @media (prefers-reduced-motion: reduce) {
      .glass-effect,
      .glass-button,
      .glass-hover {
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        background: rgba(255, 255, 255, 0.2);
      }
    }
    
    @supports not (backdrop-filter: blur(1px)) {
      .glass-effect,
      .glass-button {
        background: rgba(255, 255, 255, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
    }
  `;
};

// ============================================================================
// CSS BUNDLE ANALYZER
// ============================================================================

export class CSSBundleAnalyzer {
  analyzeCurrentCSS() {
    const analysis = {
      totalRules: 0,
      unusedRules: 0,
      duplicateRules: 0,
      largeRules: 0,
      glassRules: 0,
      recommendations: [] as string[]
    };
    
    const sheets = Array.from(document.styleSheets);
    const seenRules = new Set<string>();
    
    sheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        analysis.totalRules += rules.length;
        
        rules.forEach(rule => {
          if (rule instanceof CSSStyleRule) {
            const ruleText = rule.cssText;
            
            // Check for duplicates
            if (seenRules.has(ruleText)) {
              analysis.duplicateRules++;
            } else {
              seenRules.add(ruleText);
            }
            
            // Check for large rules
            if (ruleText.length > 500) {
              analysis.largeRules++;
            }
            
            // Check for glassmorphism rules
            if (ruleText.includes('backdrop-filter') || ruleText.includes('glass')) {
              analysis.glassRules++;
            }
            
            // Check if rule is used
            const selector = rule.selectorText;
            if (selector && !document.querySelector(selector)) {
              analysis.unusedRules++;
            }
          }
        });
      } catch (e) {
        // Cross-origin or other restrictions
      }
    });
    
    // Generate recommendations
    if (analysis.duplicateRules > 10) {
      analysis.recommendations.push('Consider deduplicating CSS rules');
    }
    
    if (analysis.unusedRules > 50) {
      analysis.recommendations.push('Remove unused CSS rules');
    }
    
    if (analysis.glassRules > 20) {
      analysis.recommendations.push('Optimize glassmorphism effects for better performance');
    }
    
    return analysis;
  }
  
  generateOptimizationReport() {
    const analysis = this.analyzeCurrentCSS();
    
    return {
      ...analysis,
      score: Math.max(0, 100 - (
        (analysis.duplicateRules * 2) + 
        (analysis.unusedRules * 1) + 
        (analysis.largeRules * 3)
      )),
      suggestions: [
        ...analysis.recommendations,
        'Use CSS containment for better performance',
        'Implement critical CSS loading',
        'Optimize backdrop-filter usage'
      ]
    };
  }
}

// ============================================================================
// EXPORT MAIN API
// ============================================================================

export const cssOptimizer = new CSSOptimizer();
export const cssAnalyzer = new CSSBundleAnalyzer();

// Initialize on client
if (typeof window !== 'undefined') {
  // Load critical CSS immediately
  cssOptimizer.loadCriticalCSS();
  
  // Inject optimized variables
  injectOptimizedCSSVariables();
  
  // Add responsive glass classes
  const style = document.createElement('style');
  style.textContent = createResponsiveGlassClasses();
  style.setAttribute('data-responsive-glass', 'true');
  document.head.appendChild(style);
}