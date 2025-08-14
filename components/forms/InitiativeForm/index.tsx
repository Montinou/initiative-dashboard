/**
 * Role-Based Initiative Form Component
 * 
 * Dynamic form component that adapts to user roles (Manager vs CEO/Admin)
 * with glassmorphism styling, real-time validation, and auto-save functionality
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Target,
  Users,
  Zap,
  TrendingUp,
  Settings,
  Plus,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { InitiativeFormProvider, useInitiativeFormContext, useFormField, useFormSubmission, useStrategicFeatures } from './InitiativeFormContext'
// import { ActivityManager } from '../ActivityManager' // TODO: Create ActivityManager component
import type { Initiative } from '@/lib/types/database'

// ===================================================================================
// COMPONENT INTERFACES
// ===================================================================================

interface InitiativeFormProps {
  initialData?: Partial<Initiative>
  mode: 'create' | 'edit'
  onSuccess?: (initiative: Initiative) => void
  onCancel?: () => void
  className?: string
}

// ===================================================================================
// FORM SECTIONS COMPONENTS
// ===================================================================================

/**
 * Basic Information Section
 */
function BasicInformationSection() {
  const titleField = useFormField('title')
  const descriptionField = useFormField('description')
  const priorityField = useFormField('priority')
  const targetDateField = useFormField('target_date')
  const budgetField = useFormField('budget')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Basic Information</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Title - Full width */}
          <div className="lg:col-span-2">
            <Label htmlFor="title" className="text-sm font-medium text-foreground">
              Initiative Title *
            </Label>
            <Input
              id="title"
              placeholder="Enter initiative title..."
              className=" mt-1"
              value={titleField.value}
              onChange={(e) => titleField.onChange(e.target.value)}
              disabled={titleField.disabled}
            />
            {titleField.hasError && (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-xs text-red-400">{titleField.error[0]}</span>
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <Label htmlFor="priority" className="text-sm font-medium text-foreground">
              Priority
            </Label>
            <Select value={priorityField.value} onValueChange={priorityField.onChange}>
              <SelectTrigger className=" mt-1">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent className="">
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    Low
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    Medium
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                    High
                  </div>
                </SelectItem>
                <SelectItem value="critical">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    Critical
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Date */}
          <div>
            <Label htmlFor="target_date" className="text-sm font-medium text-foreground">
              Target Date
            </Label>
            <Input
              id="target_date"
              type="date"
              className=" mt-1"
              value={targetDateField.value}
              onChange={(e) => targetDateField.onChange(e.target.value)}
              disabled={targetDateField.disabled}
            />
          </div>

          {/* Budget */}
          <div>
            <Label htmlFor="budget" className="text-sm font-medium text-foreground">
              Budget
            </Label>
            <Input
              id="budget"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className=" mt-1"
              value={budgetField.value || ''}
              onChange={(e) => budgetField.onChange(parseFloat(e.target.value) || undefined)}
              disabled={budgetField.disabled}
            />
          </div>

          {/* Description - Full width */}
          <div className="lg:col-span-2">
            <Label htmlFor="description" className="text-sm font-medium text-foreground">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the initiative objectives and scope..."
              className=" mt-1 min-h-[100px]"
              value={descriptionField.value}
              onChange={(e) => descriptionField.onChange(e.target.value)}
              disabled={descriptionField.disabled}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Area Selection Section (CEO/Admin only)
 */
function AreaSelectionSection() {
  const { canSelectArea, areas, loadingAreas } = useInitiativeFormContext()
  const areaField = useFormField('area_id')

  if (!canSelectArea) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Area Assignment</h3>
        </div>

        <div>
          <Label htmlFor="area_id" className="text-sm font-medium text-foreground">
            Assigned Area
          </Label>
          <Select 
            value={areaField.value || ''} 
            onValueChange={areaField.onChange}
            disabled={loadingAreas || areaField.disabled}
          >
            <SelectTrigger className=" mt-1">
              <SelectValue placeholder={loadingAreas ? "Loading areas..." : "Select area"} />
            </SelectTrigger>
            <SelectContent className="">
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  <div className="flex flex-col">
                    <span>{area.name}</span>
                    {area.description && (
                      <span className="text-xs text-muted-foreground">{area.description}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Strategic Features Section (CEO/Admin only)
 */
function StrategicFeaturesSection() {
  const { canCreateStrategic, isStrategic, setStrategic, weightFactor, setWeightFactor } = useStrategicFeatures()
  const kpiCategoryField = useFormField('kpi_category')
  const estimatedHoursField = useFormField('estimated_hours')

  if (!canCreateStrategic) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Strategic Configuration</h3>
          {isStrategic && (
            <Badge className="bg-primary text-primary-foreground">
              <Zap className="w-3 h-3 mr-1" />
              Strategic
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strategic Toggle */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_strategic"
                checked={isStrategic}
                onChange={(e) => setStrategic(e.target.checked)}
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-ring focus:ring-2"
              />
              <Label htmlFor="is_strategic" className="text-sm font-medium text-foreground">
                Mark as Strategic Initiative
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Strategic initiatives have higher visibility and require additional planning
            </p>
          </div>

          {/* KPI Category */}
          <div>
            <Label htmlFor="kpi_category" className="text-sm font-medium text-foreground">
              KPI Category
            </Label>
            <Select value={kpiCategoryField.value} onValueChange={kpiCategoryField.onChange}>
              <SelectTrigger className=" mt-1">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="">
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="strategic">Strategic</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="learning">Learning & Growth</SelectItem>
                <SelectItem value="sustainability">Sustainability</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Weight Factor */}
          <div>
            <Label htmlFor="weight_factor" className="text-sm font-medium text-foreground">
              Weight Factor ({weightFactor})
            </Label>
            <input
              type="range"
              id="weight_factor"
              min="0.1"
              max="3.0"
              step="0.1"
              value={weightFactor}
              onChange={(e) => setWeightFactor(parseFloat(e.target.value))}
              className="w-full mt-2 h-2 bg-secondary rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Low Impact (0.1)</span>
              <span>High Impact (3.0)</span>
            </div>
          </div>

          {/* Estimated Hours */}
          <div>
            <Label htmlFor="estimated_hours" className="text-sm font-medium text-foreground">
              Estimated Hours
            </Label>
            <Input
              id="estimated_hours"
              type="number"
              min="0"
              step="0.5"
              placeholder="0.0"
              className=" mt-1"
              value={estimatedHoursField.value || ''}
              onChange={(e) => estimatedHoursField.onChange(parseFloat(e.target.value) || undefined)}
              disabled={estimatedHoursField.disabled}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Progress Method Section
 */
function ProgressMethodSection() {
  const progressMethodField = useFormField('progress_method')
  const context = useInitiativeFormContext()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Progress Tracking</h3>
        </div>

        <div>
          <Label htmlFor="progress_method" className="text-sm font-medium text-foreground">
            Progress Method
          </Label>
          <Select value={progressMethodField.value} onValueChange={progressMethodField.onChange}>
            <SelectTrigger className=" mt-1">
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent className="">
              <SelectItem value="manual">
                <div className="flex flex-col">
                  <span>Manual Progress</span>
                  <span className="text-xs text-muted-foreground">Progress updated manually</span>
                </div>
              </SelectItem>
              <SelectItem value="subtask_based">
                <div className="flex flex-col">
                  <span>Subtask-Based</span>
                  <span className="text-xs text-muted-foreground">Progress calculated from subtasks</span>
                </div>
              </SelectItem>
              <SelectItem value="hybrid">
                <div className="flex flex-col">
                  <span>Hybrid</span>
                  <span className="text-xs text-muted-foreground">Combines manual and subtask progress</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Show subtask manager for subtask-based or hybrid methods */}
        <AnimatePresence>
          {(['subtask_based', 'hybrid'].includes(progressMethodField.value)) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6"
            >
              <Separator className="mb-6" />
              {/* TODO: Add ActivityManager component */}
              <div className="bg-secondary rounded-lg p-4 text-center text-muted-foreground">
                Activity Manager Component - To be implemented
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/**
 * Form Actions Section
 */
function FormActionsSection() {
  const { canSubmit, isSubmitting, isSaving, submit, cancel, lastSaved } = useFormSubmission()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Auto-save status */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSaving ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Saving draft...
              </>
            ) : lastSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Last saved: {lastSaved.toLocaleTimeString()}
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                Unsaved changes
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={cancel}
              disabled={isSubmitting}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={!canSubmit}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Initiative
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ===================================================================================
// MAIN FORM COMPONENT
// ===================================================================================

/**
 * Internal form component (wrapped by provider)
 */
function InitiativeFormInternal({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-8 p-6", className)}>
      <BasicInformationSection />
      <AreaSelectionSection />
      <StrategicFeaturesSection />
      <ProgressMethodSection />
      <FormActionsSection />
    </div>
  )
}

/**
 * Main exported component with provider wrapper
 */
export function InitiativeForm({
  initialData,
  mode,
  onSuccess,
  onCancel,
  className
}: InitiativeFormProps) {
  return (
    <InitiativeFormProvider
      initialData={initialData}
      mode={mode}
      onSuccess={onSuccess}
      onCancel={onCancel}
      autoSaveInterval={30000} // 30 seconds
    >
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            {mode === 'create' ? 'Create New Initiative' : 'Edit Initiative'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {mode === 'create' 
              ? 'Define a new initiative with KPI tracking and progress management'
              : 'Update initiative details and configuration'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InitiativeFormInternal className={className} />
        </CardContent>
      </Card>
    </InitiativeFormProvider>
  )
}

export default InitiativeForm