/**
 * Dynamic Activity Manager Component
 * 
 * Component for managing activities within initiatives, matching the database schema
 * where activities are tasks that compose an initiative.
 * 
 * @date 2025-08-07
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
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  Target,
  User,
  ListTodo
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { Activity, UserProfile } from '@/lib/types/database'

// ===================================================================================
// TYPES
// ===================================================================================

export interface ActivityFormData {
  id?: string
  title: string
  description?: string | null
  is_completed: boolean
  assigned_to?: string | null
}

interface ActivityManagerProps {
  initiativeId: string
  activities: ActivityFormData[]
  onActivitiesChange: (activities: ActivityFormData[]) => void
  availableUsers?: UserProfile[]
  isSubmitting?: boolean
  className?: string
}

// ===================================================================================
// ACTIVITY ITEM COMPONENT
// ===================================================================================

interface ActivityItemProps {
  activity: ActivityFormData
  index: number
  onUpdate: (index: number, updates: Partial<ActivityFormData>) => void
  onRemove: (index: number) => void
  availableUsers?: UserProfile[]
  isSubmitting?: boolean
}

function ActivityItem({ 
  activity, 
  index, 
  onUpdate, 
  onRemove, 
  availableUsers,
  isSubmitting 
}: ActivityItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Reorder.Item
      value={activity}
      id={`activity-${index}`}
      className="group"
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          "glassmorphic-card p-4 border-l-4 transition-all duration-200",
          activity.is_completed 
            ? "border-l-green-500/50 bg-green-500/5" 
            : "border-l-primary/50"
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <div className="flex-shrink-0 mt-1">
            <GripVertical className="w-4 h-4 text-white/40 cursor-grab active:cursor-grabbing" />
          </div>

          {/* Checkbox */}
          <div className="flex-shrink-0 mt-1">
            <Checkbox
              checked={activity.is_completed}
              onCheckedChange={(checked) => 
                onUpdate(index, { is_completed: checked as boolean })
              }
              disabled={isSubmitting}
              className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
            />
          </div>

          {/* Content */}
          <div className="flex-grow">
            {/* Title */}
            <div className="mb-2">
              <Input
                placeholder="Activity title..."
                value={activity.title}
                onChange={(e) => onUpdate(index, { title: e.target.value })}
                className={cn(
                  "glassmorphic-input text-sm",
                  activity.is_completed && "line-through opacity-60"
                )}
                disabled={isSubmitting}
              />
            </div>

            {/* Assignee and Actions Row */}
            <div className="flex items-center gap-3">
              {/* Assignee Select */}
              {availableUsers && availableUsers.length > 0 && (
                <div className="flex-grow">
                  <Select 
                    value={activity.assigned_to || ''} 
                    onValueChange={(value) => 
                      onUpdate(index, { assigned_to: value || null })
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="glassmorphic-input h-8 text-xs">
                      <User className="w-3 h-3 mr-1" />
                      <SelectValue placeholder="Assign to..." />
                    </SelectTrigger>
                    <SelectContent className="glassmorphic-dropdown">
                      <SelectItem value="">Unassigned</SelectItem>
                      {availableUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Status Badge */}
              <Badge 
                variant={activity.is_completed ? "default" : "secondary"}
                className={cn(
                  "text-xs",
                  activity.is_completed 
                    ? "bg-green-500/20 text-green-300 border-green-500/30" 
                    : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                )}
              >
                {activity.is_completed ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Completed
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </>
                )}
              </Badge>

              <div className="flex gap-1">
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

        {/* Expanded Section - Description */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-14 mt-3 pt-3 border-t border-white/10"
            >
              <div>
                <Label className="text-xs text-white/70">Description</Label>
                <Textarea
                  placeholder="Activity description..."
                  value={activity.description || ''}
                  onChange={(e) => onUpdate(index, { description: e.target.value })}
                  className={cn(
                    "glassmorphic-input mt-1 text-sm min-h-[80px]",
                    activity.is_completed && "opacity-60"
                  )}
                  disabled={isSubmitting}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Reorder.Item>
  )
}

// ===================================================================================
// PROGRESS SUMMARY
// ===================================================================================

function ProgressSummary({ activities }: { activities: ActivityFormData[] }) {
  const completedCount = activities.filter(a => a.is_completed).length
  const totalCount = activities.length
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  if (totalCount === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glassmorphic-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white/90">Progress Overview</h4>
        <Badge className="text-xs bg-primary/20 text-primary-foreground border-primary/30">
          {completedCount} / {totalCount} completed
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white/10 rounded-full h-2 mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            progressPercentage === 100 
              ? "bg-green-500" 
              : progressPercentage > 66 
              ? "bg-blue-500" 
              : progressPercentage > 33 
              ? "bg-yellow-500" 
              : "bg-orange-500"
          )}
        />
      </div>

      {/* Stats */}
      <div className="flex justify-between text-xs text-white/70">
        <span>{progressPercentage.toFixed(0)}% Complete</span>
        <span>
          {progressPercentage === 100 ? (
            <span className="text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              All activities completed!
            </span>
          ) : (
            <span className="text-yellow-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {totalCount - completedCount} activities remaining
            </span>
          )}
        </span>
      </div>
    </motion.div>
  )
}

// ===================================================================================
// MAIN ACTIVITY MANAGER COMPONENT
// ===================================================================================

export function ActivityManager({
  initiativeId,
  activities,
  onActivitiesChange,
  availableUsers,
  isSubmitting = false,
  className
}: ActivityManagerProps) {
  const { toast } = useToast()
  const [reorderedActivities, setReorderedActivities] = useState(activities)

  // Sync with parent when activities change
  React.useEffect(() => {
    setReorderedActivities(activities)
  }, [activities])

  const handleReorder = (newOrder: ActivityFormData[]) => {
    setReorderedActivities(newOrder)
    onActivitiesChange(newOrder)
  }

  const handleAddActivity = () => {
    const newActivity: ActivityFormData = {
      title: '',
      description: null,
      is_completed: false,
      assigned_to: null
    }
    onActivitiesChange([...activities, newActivity])
  }

  const handleUpdateActivity = (index: number, updates: Partial<ActivityFormData>) => {
    const updatedActivities = [...activities]
    updatedActivities[index] = { ...updatedActivities[index], ...updates }
    onActivitiesChange(updatedActivities)
  }

  const handleRemoveActivity = (index: number) => {
    const updatedActivities = activities.filter((_, i) => i !== index)
    onActivitiesChange(updatedActivities)
    toast({
      title: 'Activity removed',
      description: 'The activity has been removed from the list'
    })
  }

  const handleMarkAllComplete = () => {
    const updatedActivities = activities.map(activity => ({
      ...activity,
      is_completed: true
    }))
    onActivitiesChange(updatedActivities)
    toast({
      title: 'All activities marked as complete',
      description: `${activities.length} activities have been marked as completed`
    })
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-primary" />
          <h3 className="font-medium text-white/90">Activities</h3>
          <Badge variant="outline" className="text-xs">
            {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
          </Badge>
        </div>

        <div className="flex gap-2">
          {activities.length > 0 && activities.some(a => !a.is_completed) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllComplete}
              disabled={isSubmitting}
              className="glassmorphic-button-ghost text-xs"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Mark All Complete
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddActivity}
            disabled={isSubmitting}
            className="glassmorphic-button-ghost text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Activity
          </Button>
        </div>
      </div>

      {/* Progress Summary */}
      <ProgressSummary activities={activities} />

      {/* Activities List */}
      <AnimatePresence>
        {activities.length > 0 ? (
          <Reorder.Group
            axis="y"
            values={reorderedActivities}
            onReorder={handleReorder}
            className="space-y-3"
          >
            {reorderedActivities.map((activity, index) => (
              <ActivityItem
                key={`activity-${index}`}
                activity={activity}
                index={index}
                onUpdate={handleUpdateActivity}
                onRemove={handleRemoveActivity}
                availableUsers={availableUsers}
                isSubmitting={isSubmitting}
              />
            ))}
          </Reorder.Group>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glassmorphic-card p-8 text-center"
          >
            <ListTodo className="w-8 h-8 text-white/40 mx-auto mb-3" />
            <p className="text-white/70 mb-4">No activities defined yet</p>
            <Button
              variant="outline"
              onClick={handleAddActivity}
              disabled={isSubmitting}
              className="glassmorphic-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Activity
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helpful hint */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glassmorphic-card p-4 border-l-4 border-l-primary/50"
      >
        <div className="flex items-start gap-3">
          <Target className="w-4 h-4 text-primary mt-0.5" />
          <div className="text-xs text-white/70">
            <p className="font-medium text-white/90 mb-1">Activity Management Tips:</p>
            <ul className="space-y-1">
              <li>• Activities are specific tasks that compose an initiative</li>
              <li>• Mark activities as completed to track progress</li>
              <li>• Assign team members to activities for accountability</li>
              <li>• Reorder activities by dragging to prioritize tasks</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default ActivityManager