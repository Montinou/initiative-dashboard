/**
 * Initiative Form Demo Component
 * 
 * Demonstration component showing all Phase 2 components integrated:
 * - Role-Based Initiative Form
 * - Dynamic Subtask Manager
 * - Enhanced KPI Dashboard
 * - Glassmorphism UI Components
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  FormIcon as Form, 
  BarChart3, 
  Target, 
  Palette,
  CheckCircle2,
  Sparkles
} from 'lucide-react'
import { InitiativeForm } from './index'
import { KPIDashboard } from '../KPIDashboard/index'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription,
  CardFooter
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import type { Initiative } from '@/lib/types/database'

// ===================================================================================
// DEMO COMPONENT
// ===================================================================================

export function InitiativeFormDemo() {
  const [activeTab, setActiveTab] = useState('form')
  const [demoInitiative, setDemoInitiative] = useState<Initiative | null>(null)

  const handleFormSuccess = (initiative: Initiative) => {
    setDemoInitiative(initiative)
    toast({
      title: 'Success!',
      description: 'Initiative created successfully. View it in the dashboard.'
    })
    setActiveTab('dashboard')
  }

  const handleFormCancel = () => {
    toast({
      title: 'Cancelled',
      description: 'Initiative creation cancelled'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Card variant="glass" effect="elevated" className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center justify-center gap-3">
              <Sparkles className="w-6 h-6 text-primary" />
              Phase 2: Frontend Components Demo
              <Badge className="glass-effect rounded-full">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Complete
              </Badge>
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Interactive demonstration of all Phase 2 components with real API integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">✓</div>
                <div className="text-foreground/90">Role-Based Forms</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">✓</div>
                <div className="text-foreground/90">Subtask Manager</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">✓</div>
                <div className="text-foreground/90">KPI Dashboard</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">✓</div>
                <div className="text-foreground/90">Glassmorphism UI</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Demo Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="glassmorphic-card p-1">
            <TabsTrigger value="form" className="glassmorphic-button-ghost">
              <Form className="w-4 h-4 mr-2" />
              Initiative Form
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="glassmorphic-button-ghost">
              <BarChart3 className="w-4 h-4 mr-2" />
              KPI Dashboard
            </TabsTrigger>
            <TabsTrigger value="components" className="glassmorphic-button-ghost">
              <Palette className="w-4 h-4 mr-2" />
              UI Components
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Initiative Form Tab */}
        <TabsContent value="form" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <InitiativeForm
              mode="create"
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              className="max-w-4xl mx-auto"
            />
          </motion.div>
        </TabsContent>

        {/* KPI Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <KPIDashboard 
              autoRefresh={true}
              refreshInterval={60000}
              className="max-w-7xl mx-auto"
            />
          </motion.div>
        </TabsContent>

        {/* UI Components Tab */}
        <TabsContent value="components" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-4xl mx-auto space-y-8"
          >
            {/* Glassmorphism Cards Demo */}
            <Card variant="glass" effect="elevated">
              <CardHeader>
                <CardTitle>Glassmorphism Cards</CardTitle>
                <CardDescription>Various card variants with different styling</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card variant="glass" size="sm" padding="sm">
                    <div className="text-center">
                      <Target className="w-8 h-8 text-primary mx-auto mb-2" />
                      <h3 className="font-semibold text-foreground mb-1">Default Card</h3>
                      <p className="text-xs text-muted-foreground">Standard glassmorphism styling</p>
                    </div>
                  </Card>

                  <Card variant="glass-strong" size="sm" padding="sm" effect="glow">
                    <div className="text-center">
                      <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                      <h3 className="font-semibold text-foreground mb-1">Strong + Glow</h3>
                      <p className="text-xs text-muted-foreground">Enhanced visual emphasis</p>
                    </div>
                  </Card>

                  <Card variant="glass-interactive" size="sm" padding="sm" interactive>
                    <div className="text-center">
                      <BarChart3 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <h3 className="font-semibold text-foreground mb-1">Interactive</h3>
                      <p className="text-xs text-muted-foreground">Click me!</p>
                    </div>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Glassmorphism Inputs Demo */}
            <Card variant="glass" effect="elevated">
              <CardHeader>
                <CardTitle>Glassmorphism Inputs</CardTitle>
                <CardDescription>Form inputs with validation states and accessibility</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Input
                      variant="glass"
                      label="Standard Input"
                      placeholder="Enter text..."
                      helperText="This is a standard glass input field"
                    />
                    
                    <Input
                      variant="glass"
                      label="Success State"
                      placeholder="Valid input"
                      success="This input is valid!"
                    />
                    
                    <Input
                      variant="glass"
                      label="Error State"
                      placeholder="Invalid input"
                      error={["This field is required", "Must be at least 5 characters"]}
                    />
                  </div>

                  <div className="space-y-4">
                    <Textarea
                      variant="glass"
                      label="Glass Textarea"
                      placeholder="Enter description..."
                      helperText="Auto-resizing textarea with glassmorphism styling"
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Glassmorphism Buttons Demo */}
            <Card variant="glass" effect="elevated">
              <CardHeader>
                <CardTitle>Glassmorphism Buttons</CardTitle>
                <CardDescription>Interactive buttons with different variants and states</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Button Variants */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground/90 mb-3">Button Variants</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="glass">Glass</Button>
                      <Button variant="glass-ghost">Glass Ghost</Button>
                      <Button variant="glass-outline">Glass Outline</Button>
                      <Button variant="glass-destructive">Destructive</Button>
                      <Button variant="glass-success">Success</Button>
                      <Button variant="default">Standard</Button>
                    </div>
                  </div>

                  {/* Button Sizes */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground/90 mb-3">Button Sizes</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="xs" variant="glass">XS</Button>
                      <Button size="sm" variant="glass">Small</Button>
                      <Button size="default" variant="glass">Medium</Button>
                      <Button size="lg" variant="glass">Large</Button>
                      <Button size="xl" variant="glass">XL</Button>
                    </div>
                  </div>

                  {/* Button States */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground/90 mb-3">Button States</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="glass">Normal</Button>
                      <Button variant="glass" loading loadingText="Saving...">
                        Loading
                      </Button>
                      <Button variant="glass" disabled>Disabled</Button>
                      <Button variant="glass" effect="glow">With Glow</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Integration Summary */}
            <Card variant="glass" className="border-l-4 border-l-green-500/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  Component Consolidation Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-foreground/90">
                    All glassmorphism components have been successfully consolidated into shadcn/ui equivalents:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <h5 className="font-semibold text-foreground">✅ Components Replaced</h5>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• GlassButton → Button with glass variants</li>
                        <li>• GlassCard → Card with glass variants</li>
                        <li>• GlassInput → Input with glass variants</li>
                        <li>• Maintained visual parity</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-semibold text-foreground">✅ Improvements Achieved</h5>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Better TypeScript support</li>
                        <li>• Improved maintainability</li>
                        <li>• Reduced code duplication</li>
                        <li>• Enhanced accessibility</li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/10">
                    <p className="text-xs text-muted-foreground">
                      Migration: 100% complete • Visual design: preserved • Functionality: enhanced
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default InitiativeFormDemo