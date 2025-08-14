"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DataTable } from '@/components/blocks/tables/data-table'
import { FormBuilder, FormFieldConfig } from '@/components/blocks/forms/form-builder'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Plus, 
  User, 
  Calendar, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Activity,
  AssignmentIcon as Assignment,
  Filter
} from 'lucide-react'
import type { ActivityWithAssignment, TeamMember } from '@/hooks/useManagerViews'
import { ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'
import { format } from 'date-fns'

interface ActivityAssignmentProps {
  areaId: string
  activities: ActivityWithAssignment[]
  teamMembers: TeamMember[]
  onRefresh: () => void
}

// Form schema for new activity
const activitySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  initiative_id: z.string().min(1, 'Initiative is required')
})

type ActivityFormData = z.infer<typeof activitySchema>

export function ActivityAssignment({ 
  areaId, 
  activities, 
  teamMembers, 
  onRefresh 
}: ActivityAssignmentProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false)
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [filterAssigned, setFilterAssigned] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter activities based on current filters
  const filteredActivities = activities.filter(activity => {
    const assignedMatch = filterAssigned === 'all' || 
      (filterAssigned === 'assigned' && activity.assigned_to) ||
      (filterAssigned === 'unassigned' && !activity.assigned_to)
    
    const statusMatch = filterStatus === 'all' ||
      (filterStatus === 'completed' && activity.is_completed) ||
      (filterStatus === 'pending' && !activity.is_completed)
    
    return assignedMatch && statusMatch
  })

  // Calculate statistics
  const totalActivities = activities.length
  const assignedActivities = activities.filter(a => a.assigned_to).length
  const completedActivities = activities.filter(a => a.is_completed).length
  const overdueActivities = activities.filter(a => a.days_overdue && a.days_overdue > 0).length

  // Form fields for creating activity
  const formFields: FormFieldConfig[] = [
    {
      name: 'title',
      label: 'Activity Title',
      type: 'text',
      placeholder: 'Enter activity title',
      required: true
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Enter activity description'
    },
    {
      name: 'initiative_id',
      label: 'Initiative',
      type: 'select',
      required: true,
      options: [] // Would be populated with initiatives from props
    },
    {
      name: 'assigned_to',
      label: 'Assign To',
      type: 'select',
      options: teamMembers.map(member => ({
        value: member.id,
        label: member.full_name || 'Unknown'
      }))
    }
  ]

  // Table columns
  const columns: ColumnDef<ActivityWithAssignment>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value)
            if (value) {
              setSelectedActivities(filteredActivities.map(a => a.id))
            } else {
              setSelectedActivities([])
            }
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedActivities.includes(row.original.id)}
          onCheckedChange={(value) => {
            if (value) {
              setSelectedActivities(prev => [...prev, row.original.id])
            } else {
              setSelectedActivities(prev => prev.filter(id => id !== row.original.id))
            }
          }}
          aria-label="Select row"
        />
      )
    },
    {
      accessorKey: 'title',
      header: 'Activity',
      cell: ({ row }) => {
        const activity = row.original
        return (
          <div className="space-y-1">
            <p className="font-medium">{activity.title}</p>
            {activity.initiative_title && (
              <p className="text-sm text-muted-foreground">
                Initiative: {activity.initiative_title}
              </p>
            )}
          </div>
        )
      }
    },
    {
      id: 'assigned_to',
      header: 'Assigned To',
      cell: ({ row }) => {
        const activity = row.original
        if (!activity.assigned_to) {
          return (
            <Badge variant="outline" className="text-muted-foreground">
              Unassigned
            </Badge>
          )
        }
        
        const assignee = teamMembers.find(m => m.id === activity.assigned_to)
        return (
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={assignee?.avatar_url || ''} />
              <AvatarFallback className="text-xs">
                {assignee?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{activity.assigned_to_name || 'Unknown'}</span>
          </div>
        )
      }
    },
    {
      accessorKey: 'is_completed',
      header: 'Status',
      cell: ({ row }) => {
        const isCompleted = row.getValue('is_completed') as boolean
        const activity = row.original
        
        if (isCompleted) {
          return (
            <Badge variant="secondary" className="text-green-700">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )
        }
        
        if (activity.days_overdue && activity.days_overdue > 0) {
          return (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Overdue
            </Badge>
          )
        }
        
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        )
      }
    },
    {
      id: 'priority',
      header: 'Priority',
      cell: ({ row }) => {
        const priority = row.original.priority || 'medium'
        const variants = {
          high: 'destructive' as const,
          medium: 'default' as const,
          low: 'outline' as const
        }
        return (
          <Badge variant={variants[priority]} className="text-xs">
            {priority.toUpperCase()}
          </Badge>
        )
      }
    },
    {
      id: 'due_info',
      header: 'Due Date Info',
      cell: ({ row }) => {
        const activity = row.original
        if (activity.days_overdue && activity.days_overdue > 0) {
          return (
            <span className="text-sm text-red-600 font-medium">
              {activity.days_overdue} days overdue
            </span>
          )
        }
        return (
          <span className="text-sm text-muted-foreground">
            On schedule
          </span>
        )
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const activity = row.original
        return (
          <Select
            onValueChange={(userId) => handleAssignActivity(activity.id, userId)}
            defaultValue={activity.assigned_to || ''}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Assign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }
    }
  ]

  const handleAssignActivity = async (activityId: string, userId: string) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ assigned_to: userId || null })
      })

      if (!response.ok) {
        throw new Error('Failed to assign activity')
      }

      onRefresh()
    } catch (error) {
      console.error('Error assigning activity:', error)
    }
  }

  const handleBulkAssign = async (userId: string) => {
    try {
      setIsSubmitting(true)
      
      const assignments = selectedActivities.map(activityId => ({
        activity_id: activityId,
        user_id: userId
      }))

      const response = await fetch('/api/activities/bulk-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ assignments })
      })

      if (!response.ok) {
        throw new Error('Failed to bulk assign activities')
      }

      setSelectedActivities([])
      setIsBulkAssignModalOpen(false)
      onRefresh()
    } catch (error) {
      console.error('Error bulk assigning activities:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateActivity = async (data: ActivityFormData) => {
    try {
      setIsSubmitting(true)
      
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Failed to create activity')
      }

      setIsCreateModalOpen(false)
      onRefresh()
    } catch (error) {
      console.error('Error creating activity:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalActivities}</p>
                <p className="text-sm text-muted-foreground">Total Activities</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{assignedActivities}</p>
                <p className="text-sm text-muted-foreground">Assigned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedActivities}</p>
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
                <p className="text-2xl font-bold">{overdueActivities}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activities Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activities</CardTitle>
            <div className="flex items-center space-x-2">
              {/* Filters */}
              <Select value={filterAssigned} onValueChange={setFilterAssigned}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              {/* Bulk Assign Button */}
              {selectedActivities.length > 0 && (
                <Dialog open={isBulkAssignModalOpen} onOpenChange={setIsBulkAssignModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Users className="h-4 w-4 mr-2" />
                      Bulk Assign ({selectedActivities.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Bulk Assign Activities</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Assign {selectedActivities.length} selected activities to:
                      </p>
                      <Select onValueChange={handleBulkAssign}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={member.avatar_url || ''} />
                                  <AvatarFallback className="text-xs">
                                    {member.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{member.full_name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Activity
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Activity</DialogTitle>
                  </DialogHeader>
                  <FormBuilder
                    fields={formFields}
                    schema={activitySchema}
                    onSubmit={handleCreateActivity}
                    submitLabel="Create Activity"
                    isLoading={isSubmitting}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredActivities}
            searchKey="title"
          />
        </CardContent>
      </Card>
    </div>
  )
}