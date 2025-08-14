/**
 * Enhanced Initiative Card Component
 * 
 * Mobile-optimized initiative card with:
 * - Swipe gestures for mobile interactions
 * - Enhanced accessibility with proper ARIA labels
 * - Touch-friendly interaction targets
 * - Screen reader announcements
 * - Keyboard navigation support
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar, 
  Target, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TouchTarget, useAccessibility } from '@/components/ui/accessibility'
import { useKeyboardNavigation } from '@/components/ui/accessibility'

// ===================================================================================
// TYPES
// ===================================================================================

interface Initiative {
  id: string
  title: string // Changed from 'name' to 'title' in new schema
  description?: string
  progress: number
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold'
  priority: 'low' | 'medium' | 'high' | 'critical'
  start_date?: string // Added in new schema
  due_date?: string // Changed from target_date to due_date in new schema
  completion_date?: string // Added in new schema
  area_id?: string // Added for referencing
  area_name?: string
  objective_id?: string // Added for linking to objectives
  objective_title?: string // Added for display
  created_by?: string // Added in new schema
  created_by_name?: string // For display
  owner_name?: string
  budget?: number
  kpi_category?: string
  tenant_id?: string // Added for multi-tenancy
  activities_count?: number // Added for activity tracking
  completed_activities?: number // Added for activity tracking
}

interface EnhancedInitiativeCardProps {
  initiative: Initiative
  onEdit?: (initiative: Initiative) => void
  onDelete?: (initiative: Initiative) => void
  onView?: (initiative: Initiative) => void
  className?: string
  showActions?: boolean
  compact?: boolean
}

// ===================================================================================
// UTILITY COMPONENTS
// ===================================================================================

function StatusBadge({ status }: { status: Initiative['status'] }) {
  const statusConfig = {
    planning: { label: 'Planificación', color: 'bg-secondary text-secondary-foreground border-border', icon: Target },
    in_progress: { label: 'En Progreso', color: 'bg-accent/20 text-accent-foreground border-accent/30', icon: Clock },
    completed: { label: 'Completado', color: 'bg-primary/20 text-primary-foreground border-primary/30', icon: CheckCircle2 },
    on_hold: { label: 'En Pausa', color: 'bg-destructive/20 text-destructive-foreground border-destructive/30', icon: AlertCircle },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge className={cn('flex items-center gap-1 px-2 py-1', config.color)}>
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span>{config.label}</span>
    </Badge>
  )
}

function PriorityIndicator({ priority }: { priority: Initiative['priority'] }) {
  const priorityConfig = {
    low: { color: 'bg-green-500', label: 'Prioridad baja' },
    medium: { color: 'bg-yellow-500', label: 'Prioridad media' },
    high: { color: 'bg-orange-500', label: 'Prioridad alta' },
    critical: { color: 'bg-red-500', label: 'Prioridad crítica' },
  }

  const config = priorityConfig[priority]

  return (
    <div 
      className={cn('w-1 h-full rounded-full', config.color)}
      aria-label={config.label}
      role="img"
    />
  )
}

// ===================================================================================
// MAIN COMPONENT
// ===================================================================================

export function EnhancedInitiativeCard({
  initiative,
  onEdit,
  onDelete,
  onView,
  className,
  showActions = true,
  compact = false
}: EnhancedInitiativeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showActionsMenu, setShowActionsVisible] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  
  const { announceToScreenReader, prefersReducedMotion } = useAccessibility()
  const { handleKeyDown, createKeyboardHandlers } = useKeyboardNavigation()

  // ===================================================================================
  // SWIPE GESTURE HANDLERS
  // ===================================================================================

  const handleSwipeLeft = () => {
    if (onEdit) {
      setSwipeDirection('left')
      announceToScreenReader('Desliza hacia la izquierda para editar la iniciativa', 'polite')
      setTimeout(() => onEdit(initiative), 200)
    }
  }

  const handleSwipeRight = () => {
    if (onView) {
      setSwipeDirection('right')
      announceToScreenReader('Desliza hacia la derecha para ver los detalles de la iniciativa', 'polite')
      setTimeout(() => onView(initiative), 200)
    }
  }

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50
    
    if (Math.abs(info.offset.x) > swipeThreshold) {
      if (info.offset.x > 0 && onView) {
        handleSwipeRight()
      } else if (info.offset.x < 0 && onEdit) {
        handleSwipeLeft()
      }
    }
  }

  // ===================================================================================
  // KEYBOARD NAVIGATION
  // ===================================================================================

  const keyboardHandlers = createKeyboardHandlers(
    [
      { action: () => onView?.(initiative), label: 'Ver detalles' },
      { action: () => onEdit?.(initiative), label: 'Editar iniciativa' },
      { action: () => setIsExpanded(!isExpanded), label: 'Alternar detalles' },
    ],
    0,
    (index) => {
      // Handle keyboard selection
      if (index === 0) onView?.(initiative)
      else if (index === 1) onEdit?.(initiative)
      else if (index === 2) setIsExpanded(!isExpanded)
    }
  )

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    handleKeyDown(e, keyboardHandlers)
  }

  // ===================================================================================
  // RENDER
  // ===================================================================================

  const progressPercentage = Math.min(Math.max(initiative.progress, 0), 100)
  const isOverdue = initiative.due_date && new Date(initiative.due_date) < new Date() && initiative.status !== 'completed'

  return (
    <motion.div
      ref={cardRef}
      layout
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.02, zIndex: 10 }}
      animate={{
        x: swipeDirection === 'left' ? -20 : swipeDirection === 'right' ? 20 : 0,
        opacity: swipeDirection ? 0.8 : 1
      }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
      className={cn('relative group', className)}
    >
      <Card 
        className={cn(
          'bg-card hover:border-primary/30 transition-all duration-200 cursor-pointer focus-within:ring-2 focus-within:ring-ring border-border',
          isOverdue && 'border-destructive/30 bg-destructive/5',
          compact ? 'p-4' : 'p-6'
        )}
        role="article"
        aria-labelledby={`initiative-title-${initiative.id}`}
        aria-describedby={`initiative-description-${initiative.id}`}
        tabIndex={0}
        onKeyDown={handleCardKeyDown}
        onClick={() => onView?.(initiative)}
      >
        {/* Priority Indicator */}
        <div className="absolute left-0 top-0 bottom-0 w-1">
          <PriorityIndicator priority={initiative.priority} />
        </div>

        <CardHeader className={cn('pb-3', compact && 'pb-2')}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle 
                id={`initiative-title-${initiative.id}`}
                className={cn(
                  'text-foreground line-clamp-2',
                  compact ? 'text-base' : 'text-lg'
                )}
              >
                {initiative.title}
              </CardTitle>
              
              {initiative.area_name && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" aria-hidden="true" />
                  <span>{initiative.area_name}</span>
                </div>
              )}
              
              {initiative.objective_title && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Target className="w-3 h-3" aria-hidden="true" />
                  <span>{initiative.objective_title}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={initiative.status} />
              
              {showActions && (
                <TouchTarget
                  onTap={() => setShowActionsVisible(!showActionsMenu)}
                  aria-label="Más acciones"
                  className="p-1"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    aria-haspopup="menu"
                    aria-expanded={showActionsMenu}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TouchTarget>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className={cn('space-y-4', compact && 'space-y-3')}>
          {/* Description */}
          {initiative.description && !compact && (
            <p 
              id={`initiative-description-${initiative.id}`}
              className="text-sm text-muted-foreground line-clamp-2"
            >
              {initiative.description}
            </p>
          )}

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-foreground font-medium">{progressPercentage}%</span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-2"
              aria-label={`Initiative progress: ${progressPercentage}%`}
            />
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {initiative.due_date && (
              <div className={cn(
                'flex items-center gap-1',
                isOverdue && 'text-destructive'
              )}>
                <Calendar className="w-3 h-3" aria-hidden="true" />
                <span>
                  {new Date(initiative.due_date).toLocaleDateString()}
                  {isOverdue && <span className="sr-only"> (overdue)</span>}
                </span>
              </div>
            )}
            
            {initiative.activities_count !== undefined && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                <span>{initiative.completed_activities || 0}/{initiative.activities_count} Activities</span>
              </div>
            )}
            
            {initiative.kpi_category && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" aria-hidden="true" />
                <span>{initiative.kpi_category}</span>
              </div>
            )}
          </div>

          {/* Expanded Details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                className="space-y-3 pt-3 border-t border-border"
              >
                {initiative.created_by_name && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Created by: </span>
                    <span className="text-foreground">{initiative.created_by_name}</span>
                  </div>
                )}
                
                {initiative.owner_name && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Owner: </span>
                    <span className="text-foreground">{initiative.owner_name}</span>
                  </div>
                )}
                
                {initiative.start_date && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Start Date: </span>
                    <span className="text-foreground">{new Date(initiative.start_date).toLocaleDateString()}</span>
                  </div>
                )}
                
                {initiative.completion_date && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Completed: </span>
                    <span className="text-foreground">{new Date(initiative.completion_date).toLocaleDateString()}</span>
                  </div>
                )}
                
                {initiative.budget && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Budget: </span>
                    <span className="text-foreground">${initiative.budget.toLocaleString()}</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        {/* Actions Menu */}
        <AnimatePresence>
          {showActionsMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute top-2 right-2 bg-popover border border-border rounded-lg p-1 shadow-xl z-10"
              role="menu"
              aria-label="Initiative actions"
            >
              {onView && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    onView(initiative)
                    setShowActionsVisible(false)
                  }}
                  role="menuitem"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </Button>
              )}
              
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(initiative)
                    setShowActionsVisible(false)
                  }}
                  role="menuitem"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              )}
              
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive/80"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(initiative)
                    setShowActionsVisible(false)
                  }}
                  role="menuitem"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Swipe Hints for Mobile */}
        <div className="absolute inset-0 pointer-events-none md:hidden">
          {/* Left swipe hint */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity">
            <div className="bg-primary/20 rounded-full p-2">
              <Edit className="w-4 h-4 text-primary" />
            </div>
          </div>
          
          {/* Right swipe hint */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity">
            <div className="bg-primary/20 rounded-full p-2">
              <Eye className="w-4 h-4 text-primary" />
            </div>
          </div>
        </div>
      </Card>

      {/* Screen Reader Instructions */}
      <div className="sr-only">
        Initiative: {initiative.title}. 
        Status: {initiative.status}. 
        Progress: {progressPercentage}%. 
        Priority: {initiative.priority}.
        {initiative.objective_title && ` Objective: ${initiative.objective_title}.`}
        {initiative.due_date && ` Due: ${new Date(initiative.due_date).toLocaleDateString()}.`}
        {isOverdue && ' This initiative is overdue.'}
        {initiative.activities_count !== undefined && ` ${initiative.completed_activities || 0} of ${initiative.activities_count} activities completed.`}
        Press Enter to view details, or use arrow keys to navigate options.
        On mobile, swipe right to view or swipe left to edit.
      </div>
    </motion.div>
  )
}