"use client"

import * as React from "react"
import { z } from "zod"
import { FormBuilder, FormFieldConfig } from "@/components/blocks/forms/form-builder"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle2, Circle, User, Calendar, AlertTriangle, Clock } from "lucide-react"
import { Activity, UserProfile, Initiative } from "@/lib/database.types"
import { format, isAfter, differenceInDays } from "date-fns"

// Zod schema for validation
const activitySchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  is_completed: z.boolean().default(false),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  due_date: z.date().optional(),
  estimated_hours: z.number().min(0).optional(),
  actual_hours: z.number().min(0).optional(),
})

type ActivityFormData = z.infer<typeof activitySchema>

interface UserWithWorkload {
  id: string;
  email: string;
  full_name?: string;
  assigned_activities?: number;
  completed_activities?: number;
  active_initiatives?: number;
}

interface ActivityFormProps {
  mode: 'create' | 'edit'
  initialData?: Partial<Activity & { priority?: string; due_date?: string; estimated_hours?: number; actual_hours?: number }>
  parentInitiative?: Initiative
  availableUsers?: UserProfile[]
  onSubmit: (data: ActivityFormData) => Promise<void>
  onCancel?: () => void
  loading?: boolean
  showAssigneeDetails?: boolean
}

export function ActivityForm({
  mode,
  initialData,
  parentInitiative,
  availableUsers = [],
  onSubmit,
  onCancel,
  loading = false,
  showAssigneeDetails = true,
}: ActivityFormProps) {
  const [selectedUser, setSelectedUser] = React.useState<UserProfile | null>(
    availableUsers.find(user => user.id === initialData?.assigned_to) || null
  )

  const activityFields: FormFieldConfig[] = [
    {
      name: "title",
      label: "Activity Title",
      type: "text",
      placeholder: "Enter activity title",
      description: "A clear, actionable title for this activity",
      required: true,
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "Describe what needs to be done, including any requirements or constraints",
      description: "Detailed description of the work to be performed",
    },
    {
      name: "assigned_to",
      label: "Assign To",
      type: "select",
      placeholder: "Select team member",
      description: "Who is responsible for completing this activity",
      options: [
        { value: '', label: 'Unassigned' },
        ...availableUsers.map(user => ({
          value: user.id,
          label: `${user.full_name || user.email}${user.area_name ? ` (${user.area_name})` : ''}`,
        })),
      ],
    },
    {
      name: "priority",
      label: "Priority",
      type: "select",
      placeholder: "Select priority",
      description: "How critical is this activity to the initiative's success",
      options: [
        { value: 'high', label: 'High Priority' },
        { value: 'medium', label: 'Medium Priority' },
        { value: 'low', label: 'Low Priority' },
      ],
    },
    {
      name: "due_date",
      label: "Due Date",
      type: "date",
      placeholder: "Select due date",
      description: "When this activity should be completed",
    },
    {
      name: "estimated_hours",
      label: "Estimated Hours",
      type: "number",
      placeholder: "0",
      description: "How many hours do you estimate this will take",
    },
  ]

  // Add actual hours field if activity is completed or in edit mode
  if (mode === 'edit' || initialData?.is_completed) {
    activityFields.push({
      name: "actual_hours",
      label: "Actual Hours",
      type: "number",
      placeholder: "0",
      description: "How many hours were actually spent on this activity",
    })
  }

  activityFields.push({
    name: "is_completed",
    label: "Mark as Completed",
    type: "checkbox",
    description: "Check this box when the activity is finished",
  })

  const handleUserChange = (userId: string) => {
    const user = availableUsers.find(u => u.id === userId) || null
    setSelectedUser(user)
  }

  const handleSubmit = async (data: ActivityFormData) => {
    await onSubmit(data)
  }

  const defaultValues: Partial<ActivityFormData> = {
    title: initialData?.title || '',
    description: initialData?.description || '',
    assigned_to: initialData?.assigned_to || '',
    is_completed: initialData?.is_completed || false,
    priority: (initialData?.priority as 'high' | 'medium' | 'low') || 'medium',
    due_date: initialData?.due_date ? new Date(initialData.due_date) : undefined,
    estimated_hours: initialData?.estimated_hours || undefined,
    actual_hours: initialData?.actual_hours || undefined,
  }

  // Calculate if activity is overdue
  const isOverdue = initialData?.due_date && !initialData?.is_completed 
    ? isAfter(new Date(), new Date(initialData.due_date))
    : false

  const daysOverdue = initialData?.due_date 
    ? differenceInDays(new Date(), new Date(initialData.due_date))
    : 0

  return (
    <div className="space-y-6">
      {/* Initiative Context */}
      {parentInitiative && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <div>
                <p className="text-sm font-medium">Part of Initiative:</p>
                <p className="text-lg font-semibold">{parentInitiative.title}</p>
                {parentInitiative.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {parentInitiative.description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Status */}
      {mode === 'edit' && initialData && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {initialData.is_completed ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : (
                  <Circle className="h-8 w-8 text-gray-400" />
                )}
                <div>
                  <p className="font-medium">
                    {initialData.is_completed ? 'Activity Completed' : 'Activity In Progress'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Created on {format(new Date(initialData.created_at!), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              
              {isOverdue && (
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  <div className="text-right">
                    <p className="font-medium">Overdue</p>
                    <p className="text-sm">{daysOverdue} days past due</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>{mode === 'create' ? 'Create New Activity' : 'Edit Activity'}</span>
          </CardTitle>
          <CardDescription>
            {mode === 'create' 
              ? 'Create a specific, actionable activity that contributes to the initiative'
              : 'Update activity details and track progress'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormBuilder
            fields={activityFields.map(field => ({
              ...field,
              ...(field.name === 'assigned_to' && {
                onChange: handleUserChange
              })
            }))}
            schema={activitySchema}
            onSubmit={handleSubmit}
            defaultValues={defaultValues}
            submitLabel={loading ? "Saving..." : (mode === 'create' ? "Create Activity" : "Update Activity")}
            isLoading={loading}
          />
        </CardContent>
      </Card>

      {/* Assignee Details */}
      {showAssigneeDetails && selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Assignee Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedUser.avatar_url} alt={selectedUser.full_name} />
                <AvatarFallback>
                  {selectedUser.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 
                   selectedUser.email.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h3 className="font-medium">{selectedUser.full_name || selectedUser.email}</h3>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                {selectedUser.area_name && (
                  <Badge variant="outline" className="mt-1">
                    {selectedUser.area_name}
                  </Badge>
                )}
              </div>
              
              <div className="text-right">
                <Badge className={
                  selectedUser.role === 'CEO' ? 'bg-purple-500' :
                  selectedUser.role === 'Admin' ? 'bg-blue-500' :
                  'bg-green-500'
                }>
                  {selectedUser.role}
                </Badge>
                {selectedUser.phone && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedUser.phone}
                  </p>
                )}
              </div>
            </div>
            
            {/* User's current workload (if available) */}
            {(selectedUser as any).assigned_activities !== undefined && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Current Workload</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {(selectedUser as any).assigned_activities || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Assigned Activities</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {(selectedUser as any).completed_activities || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">
                      {(selectedUser as any).active_initiatives || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Active Initiatives</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Time Tracking */}
      {(initialData?.estimated_hours || initialData?.actual_hours) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Time Tracking</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {initialData?.estimated_hours || 0}h
                </p>
                <p className="text-sm text-muted-foreground">Estimated</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {initialData?.actual_hours || 0}h
                </p>
                <p className="text-sm text-muted-foreground">Actual</p>
              </div>
            </div>
            
            {initialData?.estimated_hours && initialData?.actual_hours && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {initialData.actual_hours > initialData.estimated_hours ? 'Over' : 'Under'} estimate by{' '}
                  <span className="font-medium">
                    {Math.abs(initialData.actual_hours - initialData.estimated_hours)}h
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          form="activity-form"
          disabled={loading}
        >
          {loading ? "Saving..." : (mode === 'create' ? "Create Activity" : "Update Activity")}
        </Button>
      </div>
    </div>
  )
}