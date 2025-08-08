"use client"

import { useState } from 'react'
import { useQuarters } from '@/hooks/useQuarters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar,
  Plus,
  Edit,
  Trash2,
  Target,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, differenceInDays } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QuarterForm } from './QuarterForm'
import type { QuarterWithStats } from '@/hooks/useQuarters'

interface QuartersViewProps {
  year?: number
  className?: string
}

export function QuartersView({ year = new Date().getFullYear(), className }: QuartersViewProps) {
  const [selectedYear, setSelectedYear] = useState(year)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingQuarter, setEditingQuarter] = useState<QuarterWithStats | null>(null)
  
  const { 
    quarters, 
    loading, 
    error, 
    createQuarter, 
    updateQuarter, 
    deleteQuarter,
    createYearQuarters,
    getCurrentQuarter 
  } = useQuarters({ 
    year: selectedYear, 
    include_stats: true 
  })

  const currentQuarter = getCurrentQuarter()

  const handleCreateQuarter = async (data: any) => {
    try {
      await createQuarter(data)
      setShowCreateDialog(false)
    } catch (error) {
      console.error('Failed to create quarter:', error)
    }
  }

  const handleUpdateQuarter = async (id: string, data: any) => {
    try {
      await updateQuarter(id, data)
      setEditingQuarter(null)
    } catch (error) {
      console.error('Failed to update quarter:', error)
    }
  }

  const handleDeleteQuarter = async (id: string) => {
    if (confirm('Are you sure you want to delete this quarter?')) {
      try {
        await deleteQuarter(id)
      } catch (error) {
        console.error('Failed to delete quarter:', error)
      }
    }
  }

  const handleCreateYearQuarters = async () => {
    try {
      await createYearQuarters(selectedYear)
    } catch (error) {
      console.error('Failed to create year quarters:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500">
        Failed to load quarters. Please try again.
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Quarter Planning</h2>
          <p className="text-white/60 text-sm mt-1">
            Manage quarters and track progress for {selectedYear}
          </p>
        </div>
        
        <div className="flex gap-2">
          {quarters.length === 0 && (
            <Button 
              onClick={handleCreateYearQuarters}
              variant="outline"
              className="glassmorphic-button"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Create {selectedYear} Quarters
            </Button>
          )}
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="glassmorphic-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Quarter
          </Button>
        </div>
      </div>

      {/* Year Selector */}
      <div className="flex gap-2">
        {[selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
          <Button
            key={y}
            variant={y === selectedYear ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedYear(y)}
            className={cn(
              "glassmorphic-button",
              y === selectedYear && "bg-primary/20 border-primary"
            )}
          >
            {y}
          </Button>
        ))}
      </div>

      {/* Quarters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quarters.map(quarter => (
          <QuarterCard
            key={quarter.id}
            quarter={quarter}
            isCurrent={currentQuarter?.id === quarter.id}
            onEdit={() => setEditingQuarter(quarter)}
            onDelete={() => handleDeleteQuarter(quarter.id)}
          />
        ))}
      </div>

      {/* Empty State */}
      {quarters.length === 0 && (
        <Card className="glassmorphic-card text-center p-8">
          <Calendar className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Quarters Defined</h3>
          <p className="text-white/60 mb-4">
            Create quarters to organize your objectives and initiatives
          </p>
          <Button onClick={handleCreateYearQuarters} className="glassmorphic-button">
            <Plus className="w-4 h-4 mr-2" />
            Create {selectedYear} Quarters
          </Button>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || !!editingQuarter} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false)
          setEditingQuarter(null)
        }
      }}>
        <DialogContent className="glassmorphic-card">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingQuarter ? 'Edit Quarter' : 'Create New Quarter'}
            </DialogTitle>
          </DialogHeader>
          <QuarterForm
            quarter={editingQuarter}
            onSubmit={editingQuarter 
              ? (data) => handleUpdateQuarter(editingQuarter.id, data)
              : handleCreateQuarter
            }
            onCancel={() => {
              setShowCreateDialog(false)
              setEditingQuarter(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Quarter Card Component
function QuarterCard({ 
  quarter, 
  isCurrent,
  onEdit, 
  onDelete 
}: { 
  quarter: QuarterWithStats
  isCurrent: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const startDate = new Date(quarter.start_date)
  const endDate = new Date(quarter.end_date)
  const today = new Date()
  const daysRemaining = quarter.status === 'active' 
    ? differenceInDays(endDate, today) 
    : null
  const totalDays = differenceInDays(endDate, startDate)
  const daysElapsed = quarter.status === 'active' 
    ? differenceInDays(today, startDate)
    : quarter.status === 'completed' ? totalDays : 0
  const timeProgress = Math.round((daysElapsed / totalDays) * 100)

  const statusConfig = {
    upcoming: { 
      icon: Clock, 
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      label: 'Upcoming'
    },
    active: { 
      icon: Activity, 
      color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      label: 'Active'
    },
    completed: { 
      icon: CheckCircle2, 
      color: 'text-green-400 bg-green-500/10 border-green-500/20',
      label: 'Completed'
    }
  }

  const config = statusConfig[quarter.status]
  const StatusIcon = config.icon

  return (
    <Card className={cn(
      "glassmorphic-card hover:border-primary/30 transition-all relative overflow-hidden",
      isCurrent && "ring-2 ring-primary/50"
    )}>
      {isCurrent && (
        <div className="absolute top-2 right-2">
          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
            Current
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white text-lg">
              {quarter.quarter_name}
            </CardTitle>
            <CardDescription className="text-white/60 text-xs mt-1">
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </CardDescription>
          </div>
          
          <Badge className={cn("text-xs", config.color)}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-white/60 mb-1">Objectives</p>
            <p className="text-white font-semibold flex items-center gap-1">
              <Target className="w-3 h-3" />
              {quarter.objectives_count || 0}
            </p>
          </div>
          <div>
            <p className="text-white/60 mb-1">Initiatives</p>
            <p className="text-white font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {quarter.initiatives_count || 0}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/60">Progress</span>
              <span className="text-white">{quarter.average_progress || 0}%</span>
            </div>
            <Progress value={quarter.average_progress || 0} className="h-1.5" />
          </div>

          {quarter.status === 'active' && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/60">Time Elapsed</span>
                <span className="text-white">{timeProgress}%</span>
              </div>
              <Progress value={timeProgress} className="h-1.5 bg-white/10" />
            </div>
          )}
        </div>

        {/* Days Remaining */}
        {daysRemaining !== null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">Days Remaining</span>
            <span className={cn(
              "font-medium",
              daysRemaining < 15 ? "text-red-400" : "text-white"
            )}>
              {daysRemaining} days
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-white/60 hover:text-white h-7 px-2"
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={quarter.objectives_count > 0}
            className="text-red-400 hover:text-red-300 h-7 px-2 disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}