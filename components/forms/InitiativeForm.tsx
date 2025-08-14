"use client"

import * as React from "react"
import { z } from "zod"
import { FormBuilder, FormFieldConfig } from "@/components/blocks/forms/form-builder"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Plus, User, Calendar, Target } from "lucide-react"
import { Initiative, Activity, Area, UserProfile, Objective } from "@/lib/database.types"

// Zod schemas for validation
const initiativeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().optional(),
  area_id: z.string().min(1, "Area is required"),
  status: z.enum(['planning', 'in_progress', 'completed', 'on_hold']).default('planning'),
  progress: z.number().min(0).max(100).default(0),
  start_date: z.date().optional(),
  due_date: z.date().optional(),
  objective_ids: z.array(z.string()).optional(),
})

const activitySchema = z.object({
  title: z.string().min(1, "Activity title is required"),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  is_completed: z.boolean().default(false),
})

type InitiativeFormData = z.infer<typeof initiativeSchema>
type ActivityFormData = z.infer<typeof activitySchema>

interface InitiativeFormProps {
  mode: 'create' | 'edit'
  initialData?: Partial<Initiative>
  initialActivities?: Activity[]
  availableAreas?: Area[]
  availableUsers?: UserProfile[]
  availableObjectives?: Objective[]
  onSubmit: (data: InitiativeFormData, activities: ActivityFormData[]) => Promise<void>
  onCancel?: () => void
  loading?: boolean
}

export function InitiativeForm({
  mode,
  initialData,
  initialActivities = [],
  availableAreas = [],
  availableUsers = [],
  availableObjectives = [],
  onSubmit,
  onCancel,
  loading = false,
}: InitiativeFormProps) {
  const [activities, setActivities] = React.useState<ActivityFormData[]>(
    initialActivities.map(activity => ({
      title: activity.title,
      description: activity.description || '',
      assigned_to: activity.assigned_to || '',
      is_completed: activity.is_completed || false,
    }))
  )
  const [selectedObjectives, setSelectedObjectives] = React.useState<string[]>(
    initialData?.objective_ids || []
  )

  const initiativeFields: FormFieldConfig[] = [
    {
      name: "title",
      label: "Initiative Title",
      type: "text",
      placeholder: "Enter initiative title",
      description: "A clear, descriptive title for your initiative",
      required: true,
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "Describe the initiative goals, scope, and expected outcomes",
      description: "Detailed description of what this initiative aims to achieve",
    },
    {
      name: "area_id",
      label: "Area",
      type: "select",
      placeholder: "Select an area",
      description: "The organizational area responsible for this initiative",
      required: true,
      options: availableAreas.map(area => ({
        value: area.id,
        label: area.name,
      })),
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      placeholder: "Select status",
      description: "Current status of the initiative",
      options: [
        { value: 'planning', label: 'Planning' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'on_hold', label: 'On Hold' },
      ],
    },
    {
      name: "progress",
      label: "Progress (%)",
      type: "number",
      placeholder: "0",
      description: "Current completion percentage (0-100)",
    },
    {
      name: "start_date",
      label: "Start Date",
      type: "date",
      placeholder: "Select start date",
      description: "When work on this initiative begins",
    },
    {
      name: "due_date",
      label: "Due Date",
      type: "date",
      placeholder: "Select due date",
      description: "Target completion date for this initiative",
    },
  ]

  const activityFields: FormFieldConfig[] = [
    {
      name: "title",
      label: "Activity Title",
      type: "text",
      placeholder: "Enter activity title",
      required: true,
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "Describe what needs to be done",
    },
    {
      name: "assigned_to",
      label: "Assign To",
      type: "select",
      placeholder: "Select team member",
      options: [
        { value: '', label: 'Unassigned' },
        ...availableUsers.map(user => ({
          value: user.id,
          label: user.full_name || user.email,
        })),
      ],
    },
    {
      name: "is_completed",
      label: "Mark as Completed",
      type: "checkbox",
    },
  ]

  const addActivity = () => {
    setActivities(prev => [...prev, {
      title: '',
      description: '',
      assigned_to: '',
      is_completed: false,
    }])
  }

  const removeActivity = (index: number) => {
    setActivities(prev => prev.filter((_, i) => i !== index))
  }

  const updateActivity = (index: number, data: ActivityFormData) => {
    setActivities(prev => prev.map((activity, i) => 
      i === index ? data : activity
    ))
  }

  const toggleObjective = (objectiveId: string) => {
    setSelectedObjectives(prev => 
      prev.includes(objectiveId)
        ? prev.filter(id => id !== objectiveId)
        : [...prev, objectiveId]
    )
  }

  const handleSubmit = async (data: InitiativeFormData) => {
    const formattedData = {
      ...data,
      objective_ids: selectedObjectives,
    }
    await onSubmit(formattedData, activities)
  }

  const defaultValues: Partial<InitiativeFormData> = {
    title: initialData?.title || '',
    description: initialData?.description || '',
    area_id: initialData?.area_id || '',
    status: initialData?.status || 'planning',
    progress: initialData?.progress || 0,
    start_date: initialData?.start_date ? new Date(initialData.start_date) : undefined,
    due_date: initialData?.due_date ? new Date(initialData.due_date) : undefined,
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>{mode === 'create' ? 'Create New Initiative' : 'Edit Initiative'}</span>
          </CardTitle>
          <CardDescription>
            {mode === 'create' 
              ? 'Create a new initiative to track progress towards your objectives'
              : 'Update initiative details and manage associated activities'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormBuilder
            fields={initiativeFields}
            schema={initiativeSchema}
            onSubmit={handleSubmit}
            defaultValues={defaultValues}
            submitLabel={loading ? "Saving..." : (mode === 'create' ? "Create Initiative" : "Update Initiative")}
            isLoading={loading}
          />
        </CardContent>
      </Card>

      {/* Objectives Selection */}
      {availableObjectives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Link to Objectives</span>
            </CardTitle>
            <CardDescription>
              Connect this initiative to strategic objectives (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {availableObjectives.map((objective) => (
                <div 
                  key={objective.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedObjectives.includes(objective.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleObjective(objective.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{objective.title}</h4>
                      {objective.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {objective.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {objective.priority && (
                        <Badge variant="outline">{objective.priority}</Badge>
                      )}
                      {selectedObjectives.includes(objective.id) && (
                        <Badge variant="default">Linked</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activities Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Activities</span>
              <Badge variant="secondary">{activities.length}</Badge>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addActivity}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          </CardTitle>
          <CardDescription>
            Break down the initiative into specific, actionable activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium">Activity {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeActivity(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <FormBuilder
                    fields={activityFields}
                    schema={activitySchema}
                    onSubmit={(data) => updateActivity(index, data)}
                    defaultValues={activity}
                    submitLabel="Update Activity"
                    className="space-y-4"
                  />
                </CardContent>
              </Card>
            ))}
            
            {activities.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activities added yet</p>
                <p className="text-sm">Click "Add Activity" to break down this initiative into actionable tasks</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
          form="initiative-form"
          disabled={loading}
        >
          {loading ? "Saving..." : (mode === 'create' ? "Create Initiative" : "Update Initiative")}
        </Button>
      </div>
    </div>
  )
}