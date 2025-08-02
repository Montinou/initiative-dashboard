'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Volume2, 
  VolumeX, 
  ZoomIn, 
  ZoomOut, 
  Palette, 
  Keyboard,
  Eye,
  Settings,
  Monitor,
  Sun
} from "lucide-react"
import { cn } from "@/lib/utils"

// Accessibility settings interface
interface AccessibilitySettings {
  fontSize: 'small' | 'normal' | 'large' | 'extra-large'
  contrast: 'normal' | 'high' | 'higher'
  motionReduced: boolean
  screenReaderAnnouncements: boolean
  keyboardNavigation: boolean
  focusIndicators: 'normal' | 'enhanced'
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
}

// Context for accessibility settings
const AccessibilityContext = createContext<{
  settings: AccessibilitySettings
  updateSettings: (updates: Partial<AccessibilitySettings>) => void
} | null>(null)

// Default accessibility settings
const defaultSettings: AccessibilitySettings = {
  fontSize: 'normal',
  contrast: 'normal',
  motionReduced: false,
  screenReaderAnnouncements: true,
  keyboardNavigation: true,
  focusIndicators: 'normal',
  colorBlindMode: 'none'
}

// Accessibility Provider
export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings)

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('stratix-accessibility-settings')
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings)
          setSettings({ ...defaultSettings, ...parsed })
        } catch (error) {
          console.warn('Failed to parse accessibility settings from localStorage')
        }
      }
    }
  }, [])

  // Save settings to localStorage when changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('stratix-accessibility-settings', JSON.stringify(settings))
      applyAccessibilitySettings(settings)
    }
  }, [settings])

  const updateSettings = (updates: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }

  return (
    <AccessibilityContext.Provider value={{ settings, updateSettings }}>
      {children}
    </AccessibilityContext.Provider>
  )
}

// Hook to use accessibility settings
export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider')
  }
  return context
}

// Apply accessibility settings to the document
function applyAccessibilitySettings(settings: AccessibilitySettings) {
  const root = document.documentElement

  // Font size
  const fontSizeMap = {
    small: '0.875',
    normal: '1',
    large: '1.125',
    'extra-large': '1.25'
  }
  root.style.setProperty('--font-size-multiplier', fontSizeMap[settings.fontSize])

  // Contrast
  const contrastMap = {
    normal: '1',
    high: '1.5',
    higher: '2'
  }
  root.style.setProperty('--contrast-multiplier', contrastMap[settings.contrast])

  // Motion
  if (settings.motionReduced) {
    root.style.setProperty('--animation-duration', '0.01s')
    root.style.setProperty('--transition-duration', '0.01s')
  } else {
    root.style.removeProperty('--animation-duration')
    root.style.removeProperty('--transition-duration')
  }

  // Focus indicators
  if (settings.focusIndicators === 'enhanced') {
    root.classList.add('enhanced-focus')
  } else {
    root.classList.remove('enhanced-focus')
  }

  // Color blind mode
  root.className = root.className.replace(/colorblind-\w+/g, '')
  if (settings.colorBlindMode !== 'none') {
    root.classList.add(`colorblind-${settings.colorBlindMode}`)
  }

  // Screen reader classes
  if (settings.screenReaderAnnouncements) {
    root.classList.add('screen-reader-enabled')
  } else {
    root.classList.remove('screen-reader-enabled')
  }
}

// Accessibility Controls Panel
export function AccessibilityControls() {
  const { settings, updateSettings } = useAccessibility()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="text-white/70 hover:text-white"
        aria-label="Abrir configuraciones de accesibilidad"
      >
        <Settings className="h-4 w-4" />
      </Button>

      {isOpen && (
        <Card className="absolute top-full right-0 mt-2 w-80 z-50 glassmorphic-card">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Eye className="h-5 w-5 mr-2" />
              Configuración de Accesibilidad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Font Size */}
            <div>
              <label className="text-sm font-medium text-white/90 mb-2 block">
                Tamaño de fuente
              </label>
              <div className="flex gap-1">
                {(['small', 'normal', 'large', 'extra-large'] as const).map((size) => (
                  <Button
                    key={size}
                    variant={settings.fontSize === size ? "default" : "ghost"}
                    size="sm"
                    onClick={() => updateSettings({ fontSize: size })}
                    className="text-xs"
                  >
                    {size === 'small' && <ZoomOut className="h-3 w-3" />}
                    {size === 'normal' && 'Normal'}
                    {size === 'large' && <ZoomIn className="h-3 w-3" />}
                    {size === 'extra-large' && '++'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Contrast */}
            <div>
              <label className="text-sm font-medium text-white/90 mb-2 block">
                Contraste
              </label>
              <div className="flex gap-1">
                {(['normal', 'high', 'higher'] as const).map((contrast) => (
                  <Button
                    key={contrast}
                    variant={settings.contrast === contrast ? "default" : "ghost"}
                    size="sm"
                    onClick={() => updateSettings({ contrast })}
                    className="text-xs"
                  >
                    <Monitor className="h-3 w-3 mr-1" />
                    {contrast}
                  </Button>
                ))}
              </div>
            </div>

            {/* Color Blind Support */}
            <div>
              <label className="text-sm font-medium text-white/90 mb-2 block">
                Daltonismo
              </label>
              <select
                value={settings.colorBlindMode}
                onChange={(e) => updateSettings({ colorBlindMode: e.target.value as any })}
                className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm"
              >
                <option value="none">Normal</option>
                <option value="protanopia">Protanopia</option>
                <option value="deuteranopia">Deuteranopia</option>
                <option value="tritanopia">Tritanopia</option>
              </select>
            </div>

            {/* Motion and Focus */}
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/90">
                  Reducir movimiento
                </span>
                <Button
                  variant={settings.motionReduced ? "default" : "ghost"}
                  size="sm"
                  onClick={() => updateSettings({ motionReduced: !settings.motionReduced })}
                  className="text-xs"
                >
                  {settings.motionReduced ? 'Activado' : 'Desactivado'}
                </Button>
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/90">
                  Indicadores de foco mejorados
                </span>
                <Button
                  variant={settings.focusIndicators === 'enhanced' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => updateSettings({ 
                    focusIndicators: settings.focusIndicators === 'enhanced' ? 'normal' : 'enhanced' 
                  })}
                  className="text-xs"
                >
                  {settings.focusIndicators === 'enhanced' ? 'Activado' : 'Desactivado'}
                </Button>
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/90">
                  Anuncios para lectores de pantalla
                </span>
                <Button
                  variant={settings.screenReaderAnnouncements ? "default" : "ghost"}
                  size="sm"
                  onClick={() => updateSettings({ 
                    screenReaderAnnouncements: !settings.screenReaderAnnouncements 
                  })}
                  className="text-xs"
                >
                  <Volume2 className="h-3 w-3 mr-1" />
                  {settings.screenReaderAnnouncements ? 'Activado' : 'Desactivado'}
                </Button>
              </label>
            </div>

            {/* Keyboard Navigation Info */}
            <div className="pt-3 border-t border-white/10">
              <h4 className="text-sm font-medium text-white/90 mb-2">
                Navegación con teclado
              </h4>
              <div className="text-xs text-white/60 space-y-1">
                <div>• Tab: Navegar entre elementos</div>
                <div>• Enter/Espacio: Activar elementos</div>
                <div>• Escape: Cerrar diálogos</div>
                <div>• F6: Cambiar entre secciones</div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="w-full text-white/70 hover:text-white"
            >
              Cerrar
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Screen Reader Announcements
export function ScreenReaderAnnouncement({ message, priority = 'polite' }: {
  message: string
  priority?: 'polite' | 'assertive'
}) {
  const { settings } = useAccessibility()

  if (!settings.screenReaderAnnouncements) {
    return null
  }

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}

// Skip Link Component
export function SkipLink({ targetId, children }: {
  targetId: string
  children: React.ReactNode
}) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium"
    >
      {children}
    </a>
  )
}

// Accessible KPI Card with enhanced screen reader support
export function AccessibleKPICard({ 
  kpi, 
  index 
}: { 
  kpi: any
  index: number 
}) {
  const { settings } = useAccessibility()

  const trendDescription = kpi.trend === 'up' ? 'aumentando' : 
                          kpi.trend === 'down' ? 'disminuyendo' : 'estable'
  
  const priorityDescription = kpi.priority === 'high' ? 'prioridad alta' :
                             kpi.priority === 'medium' ? 'prioridad media' :
                             'prioridad baja'

  return (
    <div
      role="article"
      aria-labelledby={`kpi-title-${index}`}
      aria-describedby={`kpi-description-${index}`}
      className={cn(
        "bg-white/5 backdrop-blur-sm rounded-lg p-4 border transition-all duration-300",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900",
        settings.focusIndicators === 'enhanced' && "focus:ring-4 focus:ring-primary/50"
      )}
      tabIndex={0}
    >
      <div className="sr-only" id={`kpi-description-${index}`}>
        KPI {kpi.name}: {kpi.value}, tendencia {trendDescription} con cambio del {kpi.trendValue}%, {priorityDescription}
      </div>
      
      <h3 id={`kpi-title-${index}`} className="text-sm font-medium text-white/90 mb-1">
        {kpi.name}
      </h3>
      
      <div className="text-2xl font-bold text-white mb-2" aria-label={`Valor: ${kpi.value}`}>
        {kpi.value}
      </div>
      
      <div className="flex items-center justify-between">
        <Badge 
          className={cn(
            "text-xs",
            kpi.priority === 'high' && "border-red-500/50 text-red-400 bg-red-500/10"
          )}
          aria-label={`Prioridad: ${kpi.priority}`}
        >
          {kpi.priority}
        </Badge>
        
        <div 
          className="text-sm flex items-center"
          aria-label={`Tendencia: ${trendDescription}, cambio del ${kpi.trendValue} por ciento`}
        >
          {kpi.trendValue}%
        </div>
      </div>
    </div>
  )
}

// High contrast mode styles
export const accessibilityStyles = `
  .enhanced-focus *:focus {
    outline: 3px solid #0066cc !important;
    outline-offset: 2px !important;
  }

  .colorblind-protanopia {
    filter: url('#protanopia-filter');
  }

  .colorblind-deuteranopia {
    filter: url('#deuteranopia-filter');
  }

  .colorblind-tritanopia {
    filter: url('#tritanopia-filter');
  }

  .screen-reader-enabled .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .screen-reader-enabled .sr-only:focus {
    position: static;
    width: auto;
    height: auto;
    padding: 0.5rem;
    margin: 0;
    overflow: visible;
    clip: auto;
    white-space: normal;
    background: #000;
    color: #fff;
    border: 2px solid #0066cc;
  }

  /* Font size scaling */
  html {
    font-size: calc(16px * var(--font-size-multiplier, 1));
  }

  /* Contrast enhancement */
  body {
    filter: contrast(var(--contrast-multiplier, 1));
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`