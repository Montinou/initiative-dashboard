"use client"

import { useMemo } from "react"
import { X, Calendar, MapPin, Target, Lightbulb, User, TrendingUp, AlertCircle, Flag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface FilterChip {
  id: string
  type: 'date' | 'area' | 'objective' | 'initiative' | 'user' | 'progress' | 'status' | 'priority' | 'search'
  label: string
  value: string | string[] | number | [number, number]
  color?: string
  icon?: React.ReactNode
}

interface FilterChipsProps {
  filters: {
    startDate?: string | null
    endDate?: string | null
    areas?: string[]
    objectiveIds?: string[]
    initiativeIds?: string[]
    assignedTo?: string[]
    progressMin?: number
    progressMax?: number
    statuses?: string[]
    priorities?: string[]
    searchQuery?: string
  }
  labels?: {
    areas?: Record<string, string>
    objectives?: Record<string, string>
    initiatives?: Record<string, string>
    users?: Record<string, string>
  }
  onRemove: (type: string, value?: string | number) => void
  onClearAll: () => void
  className?: string
  maxVisible?: number
  compact?: boolean
}

export function FilterChips({
  filters,
  labels = {},
  onRemove,
  onClearAll,
  className,
  maxVisible = 10,
  compact = false
}: FilterChipsProps) {
  // Convert filters to chips
  const chips = useMemo(() => {
    const result: FilterChip[] = []

    // Date range
    if (filters.startDate || filters.endDate) {
      const dateLabel = []
      if (filters.startDate) {
        dateLabel.push(`Desde ${new Date(filters.startDate).toLocaleDateString('es', { month: 'short', day: 'numeric' })}`)
      }
      if (filters.endDate) {
        dateLabel.push(`Hasta ${new Date(filters.endDate).toLocaleDateString('es', { month: 'short', day: 'numeric' })}`)
      }
      
      result.push({
        id: 'date-range',
        type: 'date',
        label: 'Fechas',
        value: [filters.startDate, filters.endDate] as [string | null, string | null],
        color: 'blue',
        icon: <Calendar className="h-3 w-3" />
      })
    }

    // Areas
    if (filters.areas && filters.areas.length > 0) {
      filters.areas.forEach(areaId => {
        result.push({
          id: `area-${areaId}`,
          type: 'area',
          label: 'Área',
          value: labels.areas?.[areaId] || areaId,
          color: 'green',
          icon: <MapPin className="h-3 w-3" />
        })
      })
    }

    // Objectives
    if (filters.objectiveIds && filters.objectiveIds.length > 0) {
      filters.objectiveIds.forEach(objectiveId => {
        result.push({
          id: `objective-${objectiveId}`,
          type: 'objective',
          label: 'Objetivo',
          value: labels.objectives?.[objectiveId] || objectiveId,
          color: 'indigo',
          icon: <Target className="h-3 w-3" />
        })
      })
    }

    // Initiatives
    if (filters.initiativeIds && filters.initiativeIds.length > 0) {
      filters.initiativeIds.forEach(initiativeId => {
        result.push({
          id: `initiative-${initiativeId}`,
          type: 'initiative',
          label: 'Iniciativa',
          value: labels.initiatives?.[initiativeId] || initiativeId,
          color: 'cyan',
          icon: <Lightbulb className="h-3 w-3" />
        })
      })
    }

    // Users
    if (filters.assignedTo && filters.assignedTo.length > 0) {
      filters.assignedTo.forEach(userId => {
        result.push({
          id: `user-${userId}`,
          type: 'user',
          label: 'Asignado a',
          value: labels.users?.[userId] || userId,
          color: 'purple',
          icon: <User className="h-3 w-3" />
        })
      })
    }

    // Quarters
    if (filters.quarterIds && filters.quarterIds.length > 0) {
      filters.quarterIds.forEach(quarterId => {
        result.push({
          id: `quarter-${quarterId}`,
          type: 'quarter',
          label: 'Trimestre',
          value: labels.quarters?.[quarterId] || quarterId,
          color: 'emerald',
          icon: <Calendar className="h-3 w-3" />
        })
      })
    }

    // Progress range
    if ((filters.progressMin !== undefined && filters.progressMin > 0) || 
        (filters.progressMax !== undefined && filters.progressMax < 100)) {
      result.push({
        id: 'progress-range',
        type: 'progress',
        label: 'Progreso',
        value: `${filters.progressMin || 0}% - ${filters.progressMax || 100}%`,
        color: 'orange',
        icon: <TrendingUp className="h-3 w-3" />
      })
    }

    // Statuses
    if (filters.statuses && filters.statuses.length > 0) {
      filters.statuses.forEach(status => {
        const statusLabels: Record<string, string> = {
          'planning': 'Planificación',
          'in_progress': 'En Progreso',
          'completed': 'Completado',
          'on_hold': 'En Pausa',
          'overdue': 'Atrasado'
        }
        
        result.push({
          id: `status-${status}`,
          type: 'status',
          label: 'Estado',
          value: statusLabels[status] || status,
          color: getStatusColor(status),
          icon: <AlertCircle className="h-3 w-3" />
        })
      })
    }

    // Priorities
    if (filters.priorities && filters.priorities.length > 0) {
      filters.priorities.forEach(priority => {
        const priorityLabels: Record<string, string> = {
          'high': 'Alta',
          'medium': 'Media',
          'low': 'Baja'
        }
        
        result.push({
          id: `priority-${priority}`,
          type: 'priority',
          label: 'Prioridad',
          value: priorityLabels[priority] || priority,
          color: getPriorityColor(priority),
          icon: <Flag className="h-3 w-3" />
        })
      })
    }

    // Search query
    if (filters.searchQuery) {
      result.push({
        id: 'search',
        type: 'search',
        label: 'Búsqueda',
        value: filters.searchQuery.substring(0, 50), // Limit display length
        color: 'gray',
        icon: <Search className="h-3 w-3" />
      })
    }

    return result
  }, [filters, labels])

  const visibleChips = chips.slice(0, maxVisible)
  const hiddenCount = chips.length - maxVisible

  const handleRemoveChip = (chip: FilterChip) => {
    switch (chip.type) {
      case 'date':
        onRemove('date')
        break
      case 'area':
        onRemove('area', chip.value as string)
        break
      case 'objective':
        onRemove('objective', chip.value as string)
        break
      case 'initiative':
        onRemove('initiative', chip.value as string)
        break
      case 'user':
        onRemove('user', chip.value as string)
        break
      case 'quarter':
        onRemove('quarter', chip.value as string)
        break
      case 'progress':
        onRemove('progress')
        break
      case 'status':
        onRemove('status', chip.value as string)
        break
      case 'priority':
        onRemove('priority', chip.value as string)
        break
      case 'search':
        onRemove('search')
        break
    }
  }

  if (chips.length === 0) {
    return null
  }

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <AnimatePresence mode="popLayout">
        {visibleChips.map((chip) => (
          <motion.div
            key={chip.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <FilterChipItem
              chip={chip}
              onRemove={() => handleRemoveChip(chip)}
              compact={compact}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Hidden count badge */}
      {hiddenCount > 0 && (
        <Badge
          variant="secondary"
          className="bg-white/10 text-white/70 border-white/20"
        >
          +{hiddenCount} más
        </Badge>
      )}

      {/* Clear all button */}
      {chips.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className={cn(
            "text-white/60 hover:text-white/80 hover:bg-white/10",
            compact ? "h-6 px-2 text-xs" : "h-8 px-3"
          )}
        >
          <X className={cn("mr-1", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          Limpiar todo
        </Button>
      )}
    </div>
  )
}

// Individual chip component
interface FilterChipItemProps {
  chip: FilterChip
  onRemove: () => void
  compact?: boolean
}

function FilterChipItem({ chip, onRemove, compact = false }: FilterChipItemProps) {
  const colorStyles = getChipColorStyles(chip.color || 'gray')

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border transition-all duration-200",
        "hover:shadow-lg hover:scale-105",
        colorStyles.bg,
        colorStyles.text,
        colorStyles.border,
        compact ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      {/* Icon */}
      {chip.icon && (
        <div className={colorStyles.icon}>
          {chip.icon}
        </div>
      )}

      {/* Label (optional in compact mode) */}
      {!compact && chip.label && (
        <span className="text-xs opacity-70">{chip.label}:</span>
      )}

      {/* Value - properly escaped to prevent XSS */}
      <span className="font-medium">
        {Array.isArray(chip.value) && chip.type === 'date' 
          ? formatDateRange(chip.value as [string | null, string | null])
          : typeof chip.value === 'string' 
            ? escapeHtml(chip.value)
            : chip.value
        }
      </span>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className={cn(
          "ml-1 rounded-full transition-all duration-200",
          "hover:bg-white/20 hover:scale-110",
          "focus:outline-none focus:ring-2 focus:ring-white/30",
          compact ? "p-0.5" : "p-0.5"
        )}
        aria-label={`Remove ${chip.label} filter`}
      >
        <X className={cn(compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
      </button>
    </div>
  )
}

// Helper functions
function getChipColorStyles(color: string) {
  const styles: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    blue: {
      bg: 'bg-blue-500/20',
      text: 'text-blue-100',
      border: 'border-blue-400/30',
      icon: 'text-blue-300'
    },
    green: {
      bg: 'bg-green-500/20',
      text: 'text-green-100',
      border: 'border-green-400/30',
      icon: 'text-green-300'
    },
    indigo: {
      bg: 'bg-indigo-500/20',
      text: 'text-indigo-100',
      border: 'border-indigo-400/30',
      icon: 'text-indigo-300'
    },
    cyan: {
      bg: 'bg-cyan-500/20',
      text: 'text-cyan-100',
      border: 'border-cyan-400/30',
      icon: 'text-cyan-300'
    },
    purple: {
      bg: 'bg-purple-500/20',
      text: 'text-purple-100',
      border: 'border-purple-400/30',
      icon: 'text-purple-300'
    },
    emerald: {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-100',
      border: 'border-emerald-400/30',
      icon: 'text-emerald-300'
    },
    orange: {
      bg: 'bg-orange-500/20',
      text: 'text-orange-100',
      border: 'border-orange-400/30',
      icon: 'text-orange-300'
    },
    red: {
      bg: 'bg-red-500/20',
      text: 'text-red-100',
      border: 'border-red-400/30',
      icon: 'text-red-300'
    },
    yellow: {
      bg: 'bg-yellow-500/20',
      text: 'text-yellow-100',
      border: 'border-yellow-400/30',
      icon: 'text-yellow-300'
    },
    gray: {
      bg: 'bg-gray-500/20',
      text: 'text-gray-100',
      border: 'border-gray-400/30',
      icon: 'text-gray-300'
    }
  }

  return styles[color] || styles.gray
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'planning': 'blue',
    'in_progress': 'orange',
    'completed': 'green',
    'on_hold': 'gray',
    'overdue': 'red'
  }
  return colors[status] || 'gray'
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    'high': 'red',
    'medium': 'yellow',
    'low': 'blue'
  }
  return colors[priority] || 'gray'
}

function formatDateRange(range: [string | null, string | null]): string {
  const [start, end] = range
  const parts = []
  
  if (start) {
    parts.push(`Desde ${new Date(start).toLocaleDateString('es', { month: 'short', day: 'numeric' })}`)
  }
  if (end) {
    parts.push(`Hasta ${new Date(end).toLocaleDateString('es', { month: 'short', day: 'numeric' })}`)
  }
  
  return parts.join(' - ')
}

// Missing import
import { Search } from "lucide-react"

// XSS prevention helper
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}