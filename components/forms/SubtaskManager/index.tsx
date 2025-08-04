/**
 * Dynamic Subtask Manager Component
 * 
 * Advanced component for managing subtasks with weighted progress tracking,
 * drag & drop reordering, and automatic weight redistribution
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
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
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  Shuffle,
  Target,
  Percent
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSubtaskManager } from '../InitiativeForm/InitiativeFormContext'
import { toast } from '@/hooks/use-toast'
import type { SubtaskFormData } from '../InitiativeForm/ValidationSchemas'

// ===================================================================================
// SUBTASK ITEM COMPONENT
// ===================================================================================

interface SubtaskItemProps {
  subtask: SubtaskFormData
  index: number
  onUpdate: (index: number, updates: Partial<SubtaskFormData>) => void
  onRemove: (index: number) => void
  showWeights: boolean
  isSubmitting: boolean
  hasWeightError?: boolean
}

function SubtaskItem({ 
  subtask, 
  index, 
  onUpdate, 
  onRemove, 
  showWeights, 
  isSubmitting,
  hasWeightError 
}: SubtaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-300 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  return (
    <Reorder.Item
      value={subtask}
      id={`subtask-${index}`}
      className="group"
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          "glassmorphic-card p-4 border-l-4 transition-all duration-200",
          hasWeightError ? "border-l-red-500/50" : "border-l-primary/50"
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Drag handle */}
          <div className="flex-shrink-0 mt-1">
            <GripVertical className="w-4 h-4 text-white/40 cursor-grab active:cursor-grabbing" />
          </div>

          {/* Content */}
          <div className="flex-grow">
            {/* Title and Weight Row */}
            <div className="flex items-start gap-3 mb-2">
              <div className="flex-grow">
                <Input
                  placeholder="Subtask title..."
                  value={subtask.title}
                  onChange={(e) => onUpdate(index, { title: e.target.value })}
                  className="glassmorphic-input text-sm"
                  disabled={isSubmitting}
                />
              </div>

              {showWeights && (
                <div className="flex-shrink-0 w-24">
                  <div className="relative">
                    <Input
                      type="number"
                      min="0.1"
                      max="100"
                      step="0.1"
                      value={subtask.weight_percentage}
                      onChange={(e) => onUpdate(index, { 
                        weight_percentage: parseFloat(e.target.value) || 0.1 
                      })}
                      className={cn(
                        "glassmorphic-input text-sm text-center pr-6",
                        hasWeightError && "border-red-500/50 focus:border-red-500/70"
                      )}
                      disabled={isSubmitting}
                    />
                    <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
                  </div>
                </div>
              )}
            </div>

            {/* Priority and Status Row */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-grow">
                <Select 
                  value={subtask.priority} 
                  onValueChange={(value) => onUpdate(index, { priority: value as any })}
                >
                  <SelectTrigger className="glassmorphic-input h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glassmorphic-dropdown">
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Badge className={cn("text-xs", getPriorityColor(subtask.priority))}>
                {subtask.priority}
              </Badge>
            </div>

            {/* Estimated Hours */}
            <div className="flex items-center gap-3">
              <div className="flex-grow">
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Estimated hours"
                  value={subtask.estimated_hours || ''}
                  onChange={(e) => onUpdate(index, { 
                    estimated_hours: parseFloat(e.target.value) || undefined 
                  })}
                  className="glassmorphic-input h-8 text-xs"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-2">
                {/* Expand/Collapse */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                >
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    className="w-4 h-4"
                  >
                    <Target className="w-4 h-4" />
                  </motion.div>
                </Button>

                {/* Remove */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(index)}
                  disabled={isSubmitting}
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Section */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-7 pt-3 border-t border-white/10"
            >
              <div className="space-y-3">
                {/* Description */}
                <div>
                  <Label className="text-xs text-white/70">Description</Label>
                  <Textarea
                    placeholder="Subtask description..."
                    value={subtask.description || ''}
                    onChange={(e) => onUpdate(index, { description: e.target.value })}
                    className="glassmorphic-input mt-1 text-sm min-h-[60px]"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Due Date */}
                <div>
                  <Label className="text-xs text-white/70">Due Date</Label>
                  <Input
                    type="date"
                    value={subtask.due_date || ''}
                    onChange={(e) => onUpdate(index, { due_date: e.target.value })}
                    className="glassmorphic-input mt-1 text-sm"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-xs text-white/70">Notes</Label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={subtask.notes || ''}
                    onChange={(e) => onUpdate(index, { notes: e.target.value })}
                    className="glassmorphic-input mt-1 text-sm min-h-[50px]"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Reorder.Item>
  )
}

// ===================================================================================
// WEIGHT DISTRIBUTION SUMMARY
// ===================================================================================

function WeightDistributionSummary({ 
  subtasks, 
  showWeights, 
  errors 
}: { 
  subtasks: SubtaskFormData[]
  showWeights: boolean
  errors: string[]
}) {
  if (!showWeights || subtasks.length === 0) return null

  const totalWeight = subtasks.reduce((sum, subtask) => sum + subtask.weight_percentage, 0)
  const isValid = Math.abs(totalWeight - 100) < 0.01
  const completedTasks = subtasks.filter(s => s.title.trim().length > 0).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glassmorphic-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white/90">Weight Distribution</h4>
        <Badge className={cn(
          "text-xs",
          isValid ? "bg-green-500/20 text-green-300 border-green-500/30" 
                  : "bg-red-500/20 text-red-300 border-red-500/30"
        )}>
          {totalWeight.toFixed(1)}% / 100%
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white/10 rounded-full h-2 mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(totalWeight, 100)}%` }}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            isValid ? "bg-green-500" : totalWeight > 100 ? "bg-red-500" : "bg-yellow-500"
          )}
        />
      </div>

      {/* Stats */}
      <div className="flex justify-between text-xs text-white/70">
        <span>{completedTasks} subtasks defined</span>
        <span>
          {isValid ? (
            <span className="text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Valid distribution
            </span>
          ) : (
            <span className="text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {totalWeight > 100 ? 'Over 100%' : 'Under 100%'}
            </span>
          )}
        </span>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-red-400">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ===================================================================================
// MAIN SUBTASK MANAGER COMPONENT
// ===================================================================================

export function SubtaskManager() {
  const {
    subtasks,
    addSubtask,
    updateSubtask,
    removeSubtask,
    redistributeWeights,
    progressMethod,
    errors,
    hasErrors,
    isSubmitting
  } = useSubtaskManager()

  const [reorderedSubtasks, setReorderedSubtasks] = useState(subtasks)
  const showWeights = progressMethod === 'subtask_based'

  // Sync with context when subtasks change
  React.useEffect(() => {
    setReorderedSubtasks(subtasks)
  }, [subtasks])

  const handleReorder = (newOrder: SubtaskFormData[]) => {
    setReorderedSubtasks(newOrder)
    // Reorder API call will be implemented when backend reordering is available
  }

  const handleAddSubtask = () => {
    const newSubtask: Partial<SubtaskFormData> = {
      title: '',
      weight_percentage: showWeights ? (100 / (subtasks.length + 1)) : 0,
      priority: 'medium',
      dependencies: []
    }
    addSubtask(newSubtask)
  }

  const handleRedistributeWeights = () => {
    redistributeWeights()
    toast({
      title: 'Weights Redistributed',
      description: `Weights evenly distributed across ${subtasks.length} subtasks`
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="font-medium text-white/90">Subtasks</h3>
          <Badge variant="outline" className="text-xs">
            {subtasks.length} tasks
          </Badge>
        </div>

        <div className="flex gap-2">
          {showWeights && subtasks.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRedistributeWeights}
              disabled={isSubmitting}
              className="glassmorphic-button-ghost text-xs"
            >
              <Shuffle className="w-3 h-3 mr-1" />
              Redistribute
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddSubtask}
            disabled={isSubmitting}
            className="glassmorphic-button-ghost text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Subtask
          </Button>
        </div>
      </div>

      {/* Weight Distribution Summary */}
      <WeightDistributionSummary 
        subtasks={subtasks}
        showWeights={showWeights}
        errors={errors}
      />

      {/* Subtasks List */}
      <AnimatePresence>
        {subtasks.length > 0 ? (
          <Reorder.Group
            axis="y"
            values={reorderedSubtasks}
            onReorder={handleReorder}
            className="space-y-3"
          >
            {reorderedSubtasks.map((subtask, index) => (
              <SubtaskItem
                key={`subtask-${index}`}
                subtask={subtask}
                index={index}
                onUpdate={updateSubtask}
                onRemove={removeSubtask}
                showWeights={showWeights}
                isSubmitting={isSubmitting}
                hasWeightError={hasErrors && showWeights}
              />
            ))}
          </Reorder.Group>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glassmorphic-card p-8 text-center"
          >
            <Target className="w-8 h-8 text-white/40 mx-auto mb-3" />
            <p className="text-white/70 mb-4">No subtasks defined yet</p>
            <Button
              variant="outline"
              onClick={handleAddSubtask}
              disabled={isSubmitting}
              className="glassmorphic-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Subtask
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helpful hints */}
      {showWeights && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glassmorphic-card p-4 border-l-4 border-l-primary/50"
        >
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-primary mt-0.5" />
            <div className="text-xs text-white/70">
              <p className="font-medium text-white/90 mb-1">Subtask-Based Progress Tips:</p>
              <ul className="space-y-1">
                <li>• Total weight percentage must equal exactly 100%</li>
                <li>• Higher weight = greater impact on overall progress</li>
                <li>• Use "Redistribute" to evenly distribute weights</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default SubtaskManager