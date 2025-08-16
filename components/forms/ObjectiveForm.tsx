"use client"

import * as React from "react"
import { z } from "zod"
import { FormBuilder, FormFieldConfig } from "@/components/blocks/forms/form-builder"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Plus, Target, Calendar, TrendingUp } from "lucide-react"
import { Objective, Area } from "@/lib/database.types"

// Zod schemas for validation
const objectiveSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().optional(),
  area_id: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  status: z.enum(['planning', 'in_progress', 'completed', 'overdue']).default('planning'),
  progress: z.number().min(0).max(100).default(0),
  target_date: z.date().optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
})

const metricSchema = z.object({
  name: z.string().min(1, "Metric name is required"),
  target: z.string().min(1, "Target value is required"),
  unit: z.string().optional(),
  current: z.string().optional(),
})

type ObjectiveFormData = z.infer<typeof objectiveSchema>
type MetricFormData = z.infer<typeof metricSchema>

interface ObjectiveFormProps {
  mode: 'create' | 'edit'
  initialData?: Partial<Objective>
  availableAreas?: Area[]
  onSubmit: (data: ObjectiveFormData, metrics: MetricFormData[]) => Promise<void>
  onCancel?: () => void
  loading?: boolean
}

export function ObjectiveForm({
  mode,
  initialData,
  availableAreas = [],
  onSubmit,
  onCancel,
  loading = false,
}: ObjectiveFormProps) {
  const [metrics, setMetrics] = React.useState<MetricFormData[]>(
    initialData?.metrics ? initialData.metrics.map(metric => ({
      name: metric.name || '',
      target: metric.target || '',
      unit: metric.unit || '',
      current: metric.current || '',
    })) : []
  )
  

  const objectiveFields: FormFieldConfig[] = [
    {
      name: "title",
      label: "Objective Title",
      type: "text",
      placeholder: "Enter objective title",
      description: "A clear, measurable objective that aligns with your strategy",
      required: true,
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "Describe the objective in detail, including success criteria",
      description: "Detailed description of what success looks like for this objective",
    },
    {
      name: "area_id",
      label: "Responsible Area",
      type: "select",
      placeholder: "Select area (optional)",
      description: "The area primarily responsible for achieving this objective",
      options: [
        { value: '', label: 'Organization-wide' },
        ...availableAreas.map(area => ({
          value: area.id,
          label: area.name,
        })),
      ],
    },
    {
      name: "priority",
      label: "Priority",
      type: "select",
      placeholder: "Select priority",
      description: "Strategic importance of this objective",
      options: [
        { value: 'high', label: 'High Priority' },
        { value: 'medium', label: 'Medium Priority' },
        { value: 'low', label: 'Low Priority' },
      ],
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      placeholder: "Select status",
      description: "Current status of the objective",
      options: [
        { value: 'planning', label: 'Planning' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'overdue', label: 'Overdue' },
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
      description: "When work on this objective begins",
    },
    {
      name: "end_date",
      label: "End Date",
      type: "date",
      placeholder: "Select end date",
      description: "Target completion date for this objective",
    },
    {
      name: "target_date",
      label: "Target Date",
      type: "date",
      placeholder: "Select target date",
      description: "Key milestone or review date",
    },
  ]

  const addMetric = () => {
    setMetrics(prev => [...prev, {
      name: '',
      target: '',
      unit: '',
      current: '',
    }])
  }

  const removeMetric = (index: number) => {
    setMetrics(prev => prev.filter((_, i) => i !== index))
  }

  const updateMetric = (index: number, field: keyof MetricFormData, value: string) => {
    setMetrics(prev => prev.map((metric, i) => 
      i === index ? { ...metric, [field]: value } : metric
    ))
  }


  const handleSubmit = async (data: ObjectiveFormData) => {
    const validMetrics = metrics.filter(metric => metric.name && metric.target)
    await onSubmit(data, validMetrics)
  }

  const defaultValues: Partial<ObjectiveFormData> = {
    title: initialData?.title || '',
    description: initialData?.description || '',
    area_id: initialData?.area_id || '',
    priority: initialData?.priority || 'medium',
    status: initialData?.status || 'planning',
    progress: initialData?.progress || 0,
    start_date: initialData?.start_date ? new Date(initialData.start_date) : undefined,
    end_date: initialData?.end_date ? new Date(initialData.end_date) : undefined,
    target_date: initialData?.target_date ? new Date(initialData.target_date) : undefined,
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>{mode === 'create' ? 'Create New Objective' : 'Edit Objective'}</span>
          </CardTitle>
          <CardDescription>
            {mode === 'create' 
              ? 'Define a strategic objective that drives your organization forward'
              : 'Update objective details and success metrics'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormBuilder
            fields={objectiveFields}
            schema={objectiveSchema}
            onSubmit={handleSubmit}
            defaultValues={defaultValues}
            submitLabel={loading ? "Saving..." : (mode === 'create' ? "Create Objective" : "Update Objective")}
            isLoading={loading}
          />
        </CardContent>
      </Card>


      {/* Success Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Success Metrics</span>
              <Badge variant="secondary">{metrics.length}</Badge>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMetric}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Metric
            </Button>
          </CardTitle>
          <CardDescription>
            Define measurable criteria for success. What will indicate that this objective has been achieved?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.map((metric, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium">Metric {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMetric(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`metric-name-${index}`}>Metric Name</Label>
                      <Input
                        id={`metric-name-${index}`}
                        placeholder="e.g., Revenue Growth"
                        value={metric.name}
                        onChange={(e) => updateMetric(index, 'name', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`metric-target-${index}`}>Target Value</Label>
                      <Input
                        id={`metric-target-${index}`}
                        placeholder="e.g., 1000000"
                        value={metric.target}
                        onChange={(e) => updateMetric(index, 'target', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`metric-unit-${index}`}>Unit</Label>
                      <Input
                        id={`metric-unit-${index}`}
                        placeholder="e.g., USD, %, units"
                        value={metric.unit}
                        onChange={(e) => updateMetric(index, 'unit', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`metric-current-${index}`}>Current Value</Label>
                      <Input
                        id={`metric-current-${index}`}
                        placeholder="e.g., 750000"
                        value={metric.current}
                        onChange={(e) => updateMetric(index, 'current', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {metrics.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No metrics defined yet</p>
                <p className="text-sm">Click "Add Metric" to define measurable success criteria</p>
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
          form="objective-form"
          disabled={loading}
        >
          {loading ? "Saving..." : (mode === 'create' ? "Create Objective" : "Update Objective")}
        </Button>
      </div>
    </div>
  )
}