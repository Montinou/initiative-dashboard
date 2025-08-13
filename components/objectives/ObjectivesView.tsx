"use client"

import { useState } from 'react'
import { useObjectives } from '@/hooks/useObjectives'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Target, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  TrendingUp,
  Users,
  ChevronRight,
  Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ObjectiveForm } from './ObjectiveForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ObjectiveWithRelations } from '@/hooks/useObjectives'

interface ObjectivesViewProps {
  areaId?: string
  quarterId?: string
  className?: string
}

export function ObjectivesView({ areaId, quarterId, className }: ObjectivesViewProps) {
  const [selectedQuarter, setSelectedQuarter] = useState(quarterId)
  const [selectedArea, setSelectedArea] = useState(areaId)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingObjective, setEditingObjective] = useState<ObjectiveWithRelations | null>(null)
  
  const { objectives, loading, error, createObjective, updateObjective, deleteObjective } = useObjectives({
    area_id: selectedArea,
    quarter_id: selectedQuarter,
    include_initiatives: true
  })
  
  // Date range for current period (can be customized)
  const currentPeriod = { start: new Date(), end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }

  const handleCreateObjective = async (data: any) => {
    try {
      await createObjective(data)
      setShowCreateDialog(false)
    } catch (error) {
      console.error('Failed to create objective:', error)
    }
  }

  const handleUpdateObjective = async (id: string, data: any) => {
    try {
      await updateObjective(id, data)
      setEditingObjective(null)
    } catch (error) {
      console.error('Failed to update objective:', error)
    }
  }

  const handleDeleteObjective = async (id: string) => {
    if (confirm('Are you sure you want to delete this objective?')) {
      try {
        await deleteObjective(id)
      } catch (error) {
        console.error('Failed to delete objective:', error)
      }
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
        Failed to load objectives. Please try again.
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Strategic Objectives</h2>
          <p className="text-white/60 text-sm mt-1">
            Manage and track your strategic objectives
          </p>
        </div>
        
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="glassmorphic-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Objective
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Date range filter can be added here if needed */}

        {/* Additional filters can be added here */}
      </div>

      {/* Objectives Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="glassmorphic-card">
          <TabsTrigger value="all">All ({objectives.length})</TabsTrigger>
          <TabsTrigger value="on-track">
            On Track ({objectives.filter(o => o.is_on_track).length})
          </TabsTrigger>
          <TabsTrigger value="at-risk">
            At Risk ({objectives.filter(o => !o.is_on_track).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          {objectives.map(objective => (
            <ObjectiveCard
              key={objective.id}
              objective={objective}
              onEdit={() => setEditingObjective(objective)}
              onDelete={() => handleDeleteObjective(objective.id)}
            />
          ))}
        </TabsContent>

        <TabsContent value="on-track" className="space-y-4 mt-6">
          {objectives.filter(o => o.is_on_track).map(objective => (
            <ObjectiveCard
              key={objective.id}
              objective={objective}
              onEdit={() => setEditingObjective(objective)}
              onDelete={() => handleDeleteObjective(objective.id)}
            />
          ))}
        </TabsContent>

        <TabsContent value="at-risk" className="space-y-4 mt-6">
          {objectives.filter(o => !o.is_on_track).map(objective => (
            <ObjectiveCard
              key={objective.id}
              objective={objective}
              onEdit={() => setEditingObjective(objective)}
              onDelete={() => handleDeleteObjective(objective.id)}
            />
          ))}
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {objectives.length === 0 && (
        <Card className="glassmorphic-card text-center p-8">
          <Target className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Objectives Yet</h3>
          <p className="text-white/60 mb-4">
            Create your first strategic objective to get started
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="glassmorphic-button">
            <Plus className="w-4 h-4 mr-2" />
            Create Objective
          </Button>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || !!editingObjective} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false)
          setEditingObjective(null)
        }
      }}>
        <DialogContent className="glassmorphic-card max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingObjective ? 'Edit Objective' : 'Create New Objective'}
            </DialogTitle>
          </DialogHeader>
          <ObjectiveForm
            objective={editingObjective}
            onSubmit={editingObjective 
              ? (data) => handleUpdateObjective(editingObjective.id, data)
              : handleCreateObjective
            }
            onCancel={() => {
              setShowCreateDialog(false)
              setEditingObjective(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Objective Card Component
function ObjectiveCard({ 
  objective, 
  onEdit, 
  onDelete 
}: { 
  objective: ObjectiveWithRelations
  onEdit: () => void
  onDelete: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="glassmorphic-card hover:border-primary/30 transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-primary" />
              <CardTitle className="text-white">{objective.title}</CardTitle>
            </div>
            
            {objective.description && (
              <CardDescription className="text-white/60 mt-2">
                {objective.description}
              </CardDescription>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-white/60">
              {objective.area_name && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{objective.area_name}</span>
                </div>
              )}
              
              {(objective.start_date || objective.end_date) && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {objective.start_date ? new Date(objective.start_date).toLocaleDateString() : ''}
                    {objective.start_date && objective.end_date && ' - '}
                    {objective.end_date ? new Date(objective.end_date).toLocaleDateString() : ''}
                  </span>
                </div>
              )}

              <Badge 
                variant={objective.is_on_track ? "default" : "destructive"}
                className="text-xs"
              >
                {objective.is_on_track ? "On Track" : "At Risk"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="text-white/60 hover:text-white"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Progress Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Overall Progress</span>
            <span className="text-white font-medium">{objective.completion_percentage || 0}%</span>
          </div>
          <Progress value={objective.completion_percentage || 0} className="h-2" />
        </div>

        {/* Initiative Summary */}
        {objective.initiative_count > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <Button
              variant="ghost"
              className="w-full justify-between text-white/60 hover:text-white p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <span className="text-sm">
                {objective.initiative_count} Initiative{objective.initiative_count !== 1 ? 's' : ''}
              </span>
              <ChevronRight className={cn(
                "w-4 h-4 transition-transform",
                isExpanded && "rotate-90"
              )} />
            </Button>

            {isExpanded && objective.initiatives && (
              <div className="mt-3 space-y-2">
                {objective.initiatives.map(initiative => (
                  <div 
                    key={initiative.id} 
                    className="flex items-center justify-between p-2 rounded bg-white/5"
                  >
                    <span className="text-sm text-white/80">{initiative.title}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={initiative.progress || 0} className="w-20 h-1" />
                      <span className="text-xs text-white/60">{initiative.progress || 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}