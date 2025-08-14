"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DataTable } from '@/components/blocks/tables/data-table'
import { BarChartBlock } from '@/components/blocks/charts/dashboard-charts'
import { FormBuilder, FormFieldConfig } from '@/components/blocks/forms/form-builder'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Plus, 
  Edit, 
  Calendar, 
  Users, 
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  MoreHorizontal
} from 'lucide-react'
import type { InitiativeWithProgress } from '@/hooks/useManagerViews'
import { ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'
import { format } from 'date-fns'

interface InitiativeManagementProps {
  areaId: string
  initiatives: InitiativeWithProgress[]
  onRefresh: () => void
}

// Form schema for new initiative
const initiativeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  start_date: z.date().optional(),
  due_date: z.date().optional(),
  objective_id: z.string().optional()
})

type InitiativeFormData = z.infer<typeof initiativeSchema>

export function InitiativeManagement({ areaId, initiatives, onRefresh }: InitiativeManagementProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedInitiative, setSelectedInitiative] = useState<InitiativeWithProgress | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate statistics
  const totalInitiatives = initiatives.length
  const completedInitiatives = initiatives.filter(init => init.status === 'completed').length
  const inProgressInitiatives = initiatives.filter(init => init.status === 'in_progress').length
  const atRiskInitiatives = initiatives.filter(init => init.is_at_risk).length
  const averageProgress = initiatives.length > 0 
    ? Math.round(initiatives.reduce((sum, init) => sum + init.progress, 0) / initiatives.length)
    : 0

  // Progress distribution data for chart
  const progressDistribution = [
    { range: '0-25%', count: initiatives.filter(i => i.progress <= 25).length },
    { range: '26-50%', count: initiatives.filter(i => i.progress > 25 && i.progress <= 50).length },
    { range: '51-75%', count: initiatives.filter(i => i.progress > 50 && i.progress <= 75).length },
    { range: '76-100%', count: initiatives.filter(i => i.progress > 75).length }
  ]

  // Form fields for creating initiative
  const formFields: FormFieldConfig[] = [
    {
      name: 'title',
      label: 'Initiative Title',
      type: 'text',
      placeholder: 'Enter initiative title',
      required: true
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Enter initiative description'
    },
    {
      name: 'start_date',
      label: 'Start Date',
      type: 'date'
    },
    {
      name: 'due_date',
      label: 'Due Date',
      type: 'date'
    }
  ]

  // Table columns
  const columns: ColumnDef<InitiativeWithProgress>[] = [
    {
      accessorKey: 'title',
      header: 'Initiative',
      cell: ({ row }) => {
        const initiative = row.original
        return (
          <div className="space-y-1">
            <p className="font-medium">{initiative.title}</p>
            {initiative.objective_title && (
              <p className="text-sm text-muted-foreground">
                Objective: {initiative.objective_title}
              </p>
            )}
          </div>
        )
      }
    },
    {
      accessorKey: 'progress',
      header: 'Progress',
      cell: ({ row }) => {
        const progress = row.getValue('progress') as number
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{progress}%</span>
              {progress >= 80 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : progress >= 50 ? (
                <Clock className="h-4 w-4 text-yellow-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const variants = {
          'planning': 'outline' as const,
          'in_progress': 'default' as const,
          'completed': 'secondary' as const,
          'on_hold': 'destructive' as const
        }
        return (
          <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
            {status.replace('_', ' ').toUpperCase()}
          </Badge>
        )
      }
    },
    {
      accessorKey: 'due_date',
      header: 'Due Date',
      cell: ({ row }) => {
        const dueDate = row.getValue('due_date') as string
        const initiative = row.original
        if (!dueDate) return <span className="text-muted-foreground">No date set</span>
        
        const isOverdue = new Date(dueDate) < new Date() && initiative.status !== 'completed'
        return (
          <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
            {format(new Date(dueDate), 'MMM dd, yyyy')}
            {isOverdue && (
              <div className="flex items-center mt-1">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span className="text-xs">Overdue</span>
              </div>
            )}
          </div>
        )
      }
    },
    {
      id: 'activities',
      header: 'Activities',
      cell: ({ row }) => {
        const initiative = row.original
        return (
          <div className="text-sm">
            <span className="font-medium">{initiative.completed_activities}</span>
            <span className="text-muted-foreground">/{initiative.activities_count}</span>
          </div>
        )
      }
    },
    {
      id: 'risk',
      header: 'Risk',
      cell: ({ row }) => {
        const initiative = row.original
        return initiative.is_at_risk ? (
          <Badge variant="destructive" className="text-xs">
            At Risk
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            On Track
          </Badge>
        )
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const initiative = row.original
        return (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSelectedInitiative(initiative)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )
      }
    }
  ]

  const handleCreateInitiative = async (data: InitiativeFormData) => {
    try {
      setIsSubmitting(true)
      
      const response = await fetch('/api/initiatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          area_id: areaId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create initiative')
      }

      setIsCreateModalOpen(false)
      onRefresh()
    } catch (error) {
      console.error('Error creating initiative:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalInitiatives}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{inProgressInitiatives}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedInitiatives}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{atRiskInitiatives}</p>
                <p className="text-sm text-muted-foreground">At Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{averageProgress}%</p>
                <p className="text-sm text-muted-foreground">Avg Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Initiatives Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Initiatives</CardTitle>
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New Initiative
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Initiative</DialogTitle>
                    </DialogHeader>
                    <FormBuilder
                      fields={formFields}
                      schema={initiativeSchema}
                      onSubmit={handleCreateInitiative}
                      submitLabel="Create Initiative"
                      isLoading={isSubmitting}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={initiatives}
                searchKey="title"
              />
            </CardContent>
          </Card>
        </div>

        {/* Progress Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartBlock
              title=""
              data={progressDistribution}
              xKey="range"
              yKey="count"
              config={{
                count: {
                  label: "Initiatives",
                  color: "hsl(var(--chart-1))"
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Initiative Details Modal */}
      {selectedInitiative && (
        <Dialog open={!!selectedInitiative} onOpenChange={() => setSelectedInitiative(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedInitiative.title}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Initiative Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Progress</label>
                  <div className="mt-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{selectedInitiative.progress}%</span>
                    </div>
                    <Progress value={selectedInitiative.progress} className="h-2" />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge>{selectedInitiative.status.replace('_', ' ').toUpperCase()}</Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Activities</label>
                  <div className="mt-1">
                    <span className="text-sm">
                      {selectedInitiative.completed_activities}/{selectedInitiative.activities_count} completed
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedInitiative.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="mt-1 text-sm">{selectedInitiative.description}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedInitiative.start_date && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                    <p className="mt-1 text-sm">
                      {format(new Date(selectedInitiative.start_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}
                
                {selectedInitiative.due_date && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                    <p className="mt-1 text-sm">
                      {format(new Date(selectedInitiative.due_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-4 border-t">
                <Button size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Initiative
                </Button>
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Activities
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  View Report
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}