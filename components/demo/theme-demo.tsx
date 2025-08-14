'use client'

import React from 'react'
import { useTenantTheme, getTenantColors } from '@/lib/utils/tenant-theme'
import { useTheme } from 'next-themes'

/**
 * Theme Demo Component
 * Demonstrates the CSS variable-based theming system
 */
export function ThemeDemo() {
  const { theme: tenantTheme, applyTheme } = useTenantTheme()
  const { theme: darkMode, setTheme } = useTheme()
  const colors = getTenantColors(tenantTheme)

  const tenants = [
    { id: 'default', name: 'Default' },
    { id: 'siga', name: 'SIGA Turismo' },
    { id: 'fema', name: 'FEMA Electricidad' },
    { id: 'stratix', name: 'Stratix Platform' }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Theme Controls */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Tenant Theme:</label>
          <div className="flex gap-2">
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => applyTheme(tenant.id)}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  tenantTheme === tenant.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {tenant.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Dark Mode:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`px-3 py-1 text-xs rounded border transition-colors ${
                darkMode === 'light'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-3 py-1 text-xs rounded border transition-colors ${
                darkMode === 'dark'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              Dark
            </button>
          </div>
        </div>
      </div>

      {/* Current Theme Info */}
      <div className="rounded-lg border bg-card text-card-foreground p-4">
        <h3 className="font-semibold mb-2">Current Theme: {colors.name}</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <div className="w-full h-8 rounded border" style={{ backgroundColor: colors.primary }}></div>
            <span className="text-muted-foreground">Primary</span>
          </div>
          <div>
            <div className="w-full h-8 rounded border" style={{ backgroundColor: colors.secondary }}></div>
            <span className="text-muted-foreground">Secondary</span>
          </div>
          <div>
            <div className="w-full h-8 rounded border" style={{ backgroundColor: colors.accent }}></div>
            <span className="text-muted-foreground">Accent</span>
          </div>
          <div>
            <div className="w-full h-8 rounded border" style={{ backgroundColor: colors.background }}></div>
            <span className="text-muted-foreground">Background</span>
          </div>
          <div>
            <div className="w-full h-8 rounded border" style={{ backgroundColor: colors.foreground }}></div>
            <span className="text-muted-foreground">Foreground</span>
          </div>
        </div>
      </div>

      {/* Component Examples */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Primary Components */}
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">Primary Components</h4>
          <button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded transition-colors">
            Primary Button
          </button>
          <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded">
            Primary Alert
          </div>
          <div className="w-full bg-primary/5 border-l-4 border-primary px-4 py-2">
            <div className="text-primary font-medium">Primary Border</div>
            <div className="text-primary/70">With subtle background</div>
          </div>
        </div>

        {/* Secondary Components */}
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">Secondary Components</h4>
          <button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded transition-colors">
            Secondary Button
          </button>
          <div className="bg-warning/10 border border-warning/20 text-warning px-4 py-2 rounded">
            Warning Alert
          </div>
          <div className="bg-success/10 border border-success/20 text-success px-4 py-2 rounded">
            Success Alert
          </div>
        </div>

        {/* Card & Surface Examples */}
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">Cards & Surfaces</h4>
          <div className="bg-card text-card-foreground border border-border rounded-lg p-4">
            <h5 className="font-medium mb-2">Card Component</h5>
            <p className="text-muted-foreground text-sm">This card uses CSS variables for consistent theming.</p>
          </div>
          <div className="bg-muted text-muted-foreground rounded-lg p-4">
            <span className="text-sm">Muted Background Area</span>
          </div>
        </div>
      </div>

      {/* Form Components */}
      <div className="space-y-4">
        <h4 className="font-semibold text-foreground">Form Components</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Input field"
            className="bg-input border border-border text-foreground px-3 py-2 rounded focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
          />
          <select className="bg-input border border-border text-foreground px-3 py-2 rounded focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none">
            <option>Select option</option>
            <option>Option 1</option>
            <option>Option 2</option>
          </select>
        </div>
      </div>

      {/* Semantic Colors */}
      <div className="space-y-4">
        <h4 className="font-semibold text-foreground">Semantic Colors</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded text-center">
            Destructive
          </div>
          <div className="bg-success/10 border border-success/20 text-success px-4 py-2 rounded text-center">
            Success
          </div>
          <div className="bg-warning/10 border border-warning/20 text-warning px-4 py-2 rounded text-center">
            Warning
          </div>
          <div className="bg-info/10 border border-info/20 text-info px-4 py-2 rounded text-center">
            Info
          </div>
        </div>
      </div>

      {/* Chart Colors Preview */}
      <div className="space-y-4">
        <h4 className="font-semibold text-foreground">Chart Color Palette</h4>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-16 h-16 rounded border bg-chart-${i} text-white flex items-center justify-center font-bold`}
            >
              {i}
            </div>
          ))}
        </div>
      </div>

      {/* CSS Variables Reference */}
      <div className="space-y-4">
        <h4 className="font-semibold text-foreground">CSS Variables Reference</h4>
        <div className="bg-muted p-4 rounded-lg text-sm font-mono">
          <div className="text-muted-foreground">Current tenant: <span className="text-foreground">{tenantTheme}</span></div>
          <div className="text-muted-foreground">HTML attribute: <span className="text-foreground">data-tenant="{tenantTheme}"</span></div>
          <div className="text-muted-foreground">Dark mode: <span className="text-foreground">{darkMode}</span></div>
        </div>
      </div>
    </div>
  )
}

export default ThemeDemo