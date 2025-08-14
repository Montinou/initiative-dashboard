'use client'

import React, { useState } from 'react'
import { useTheme } from 'next-themes'

/**
 * Theme Demo Component
 * Demonstrates the shadcn CSS variable-based theming system
 */
export function ThemeDemo() {
  const { theme: darkMode, setTheme } = useTheme()
  const [currentTenant, setCurrentTenant] = useState('siga')

  const tenants = [
    { id: 'siga', name: 'SIGA Turismo' },
    { id: 'fema', name: 'FEMA Electricidad' },
    { id: 'stratix', name: 'Stratix Platform' }
  ]

  const applyTenantTheme = (tenantId: string) => {
    setCurrentTenant(tenantId)
    document.documentElement.setAttribute('data-theme', tenantId)
  }

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
                onClick={() => applyTenantTheme(tenant.id)}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  currentTenant === tenant.id
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
        <h3 className="font-semibold mb-2">Current Theme: {tenants.find(t => t.id === currentTenant)?.name}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="w-full h-8 rounded border bg-primary"></div>
            <span className="text-muted-foreground">Primary</span>
          </div>
          <div>
            <div className="w-full h-8 rounded border bg-secondary"></div>
            <span className="text-muted-foreground">Secondary</span>
          </div>
          <div>
            <div className="w-full h-8 rounded border bg-accent"></div>
            <span className="text-muted-foreground">Accent</span>
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
          <div className="bg-secondary/10 border border-secondary/20 text-secondary px-4 py-2 rounded">
            Secondary Alert
          </div>
          <div className="bg-accent/10 border border-accent/20 text-accent px-4 py-2 rounded">
            Accent Alert
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
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-2 rounded text-center">
            Success
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-4 py-2 rounded text-center">
            Warning
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 px-4 py-2 rounded text-center">
            Info
          </div>
        </div>
      </div>

      {/* CSS Variables Reference */}
      <div className="space-y-4">
        <h4 className="font-semibold text-foreground">CSS Variables Reference</h4>
        <div className="bg-muted p-4 rounded-lg text-sm font-mono">
          <div className="text-muted-foreground">Current tenant: <span className="text-foreground">{currentTenant}</span></div>
          <div className="text-muted-foreground">HTML attribute: <span className="text-foreground">data-theme="{currentTenant}"</span></div>
          <div className="text-muted-foreground">Dark mode: <span className="text-foreground">{darkMode}</span></div>
        </div>
      </div>
    </div>
  )
}

export default ThemeDemo