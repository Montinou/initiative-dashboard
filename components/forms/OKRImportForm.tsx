"use client"

import * as React from "react"
import { z } from "zod"
import { FormBuilder, FormFieldConfig } from "@/components/blocks/forms/form-builder"
import { FileUploadZone } from "@/components/blocks/file-upload/file-upload-zone"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  Download,
  Eye,
  RefreshCw,
  FileText
} from "lucide-react"
import { Area } from "@/lib/database.types"

// Zod schema for validation
const importSchema = z.object({
  area_id: z.string().optional(),
  file_type: z.enum(['objectives', 'initiatives', 'activities', 'mixed']).default('mixed'),
  overwrite_existing: z.boolean().default(false),
  send_notifications: z.boolean().default(true),
})

type ImportFormData = z.infer<typeof importSchema>

interface ImportProgress {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  message: string
  details?: {
    total_rows: number
    processed_rows: number
    success_rows: number
    error_rows: number
    errors?: Array<{ row: number; message: string }>
  }
}

interface OKRImportFormProps {
  availableAreas?: Area[]
  onSubmit: (data: ImportFormData, file: File) => Promise<void>
  onCancel?: () => void
  loading?: boolean
}

export function OKRImportForm({
  availableAreas = [],
  onSubmit,
  onCancel,
  loading = false,
}: OKRImportFormProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [importProgress, setImportProgress] = React.useState<ImportProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  })
  const [previewData, setPreviewData] = React.useState<any[]>([])
  const [showPreview, setShowPreview] = React.useState(false)

  const importFields: FormFieldConfig[] = [
    {
      name: "area_id",
      label: "Import to Area",
      type: "select",
      placeholder: "Select area (optional)",
      description: "If specified, all imported items will be assigned to this area",
      options: [
        { value: '', label: 'Detect from file or leave unassigned' },
        ...availableAreas.map(area => ({
          value: area.id,
          label: area.name,
        })),
      ],
    },
    {
      name: "file_type",
      label: "File Content Type",
      type: "select",
      placeholder: "Select content type",
      description: "What type of data does your file contain?",
      options: [
        { value: 'mixed', label: 'Mixed (Objectives, Initiatives, Activities)' },
        { value: 'objectives', label: 'Objectives Only' },
        { value: 'initiatives', label: 'Initiatives Only' },
        { value: 'activities', label: 'Activities Only' },
      ],
    },
    {
      name: "overwrite_existing",
      label: "Overwrite Existing Data",
      type: "checkbox",
      description: "If enabled, existing items with matching titles will be updated",
    },
    {
      name: "send_notifications",
      label: "Send Notifications",
      type: "checkbox",
      description: "Notify team members when new items are assigned to them",
    },
  ]

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0])
      // Reset progress and preview
      setImportProgress({
        status: 'idle',
        progress: 0,
        message: '',
      })
      setShowPreview(false)
      setPreviewData([])
    }
  }

  const handlePreview = async () => {
    if (!selectedFile) return

    setImportProgress({
      status: 'processing',
      progress: 50,
      message: 'Generating preview...',
    })

    try {
      // In a real implementation, this would call an API to parse the file
      // For now, we'll simulate the preview
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockPreview = [
        { row: 1, type: 'Objective', title: 'Increase Market Share', area: 'Sales', status: 'Valid' },
        { row: 2, type: 'Initiative', title: 'Launch Product X', area: 'Product', status: 'Valid' },
        { row: 3, type: 'Activity', title: 'Market Research', assigned_to: 'john@example.com', status: 'Valid' },
        { row: 4, type: 'Objective', title: 'Improve Customer Satisfaction', area: 'Support', status: 'Warning' },
      ]
      
      setPreviewData(mockPreview)
      setShowPreview(true)
      setImportProgress({
        status: 'completed',
        progress: 100,
        message: 'Preview generated successfully',
      })
    } catch (error) {
      setImportProgress({
        status: 'error',
        progress: 0,
        message: 'Failed to generate preview',
      })
    }
  }

  const handleSubmit = async (data: ImportFormData) => {
    if (!selectedFile) {
      throw new Error("Please select a file to import")
    }

    setImportProgress({
      status: 'uploading',
      progress: 10,
      message: 'Uploading file...',
    })

    try {
      await onSubmit(data, selectedFile)
      
      // Simulate import progress
      const progressSteps = [
        { progress: 30, message: 'Validating file format...' },
        { progress: 50, message: 'Processing data...' },
        { progress: 70, message: 'Creating objectives...' },
        { progress: 85, message: 'Creating initiatives...' },
        { progress: 95, message: 'Creating activities...' },
        { progress: 100, message: 'Import completed successfully!' },
      ]

      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 500))
        setImportProgress(prev => ({
          ...prev,
          progress: step.progress,
          message: step.message,
          status: step.progress === 100 ? 'completed' : 'processing',
        }))
      }

      // Mock success details
      setImportProgress(prev => ({
        ...prev,
        details: {
          total_rows: 50,
          processed_rows: 50,
          success_rows: 47,
          error_rows: 3,
          errors: [
            { row: 15, message: 'Invalid email address for assignee' },
            { row: 23, message: 'Area not found: Marketing' },
            { row: 34, message: 'Duplicate objective title' },
          ]
        }
      }))
    } catch (error) {
      setImportProgress({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Import failed',
      })
    }
  }

  const downloadTemplate = () => {
    // In a real implementation, this would download an actual template file
    console.log('Downloading template...')
  }

  const resetForm = () => {
    setSelectedFile(null)
    setImportProgress({
      status: 'idle',
      progress: 0,
      message: '',
    })
    setShowPreview(false)
    setPreviewData([])
  }

  const defaultValues: Partial<ImportFormData> = {
    file_type: 'mixed',
    overwrite_existing: false,
    send_notifications: true,
  }

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Import OKR Data</span>
          </CardTitle>
          <CardDescription>
            Upload a CSV or Excel file containing objectives, initiatives, and activities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUploadZone
            onFilesSelected={handleFileSelect}
            maxFiles={1}
            maxSize={10 * 1024 * 1024} // 10MB
            acceptedFileTypes={['.csv', '.xlsx', '.xls']}
            multiple={false}
          />
          
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="h-8 w-8 text-blue-500" />
              <div>
                <h4 className="font-medium">Need a template?</h4>
                <p className="text-sm text-muted-foreground">
                  Download our template to ensure your data is formatted correctly
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Settings */}
      {selectedFile && (
        <Card>
          <CardHeader>
            <CardTitle>Import Settings</CardTitle>
            <CardDescription>
              Configure how the data should be imported
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormBuilder
              fields={importFields}
              schema={importSchema}
              onSubmit={handleSubmit}
              defaultValues={defaultValues}
              submitLabel={loading ? "Importing..." : "Start Import"}
              isLoading={loading || importProgress.status === 'processing'}
            />
          </CardContent>
        </Card>
      )}

      {/* File Preview */}
      {selectedFile && !showPreview && importProgress.status === 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>File Preview</span>
              </div>
              <Button variant="outline" onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-2" />
                Generate Preview
              </Button>
            </CardTitle>
            <CardDescription>
              Preview your file to check for any issues before importing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 p-4 border rounded-lg">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Results */}
      {showPreview && previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Results</CardTitle>
            <CardDescription>
              Here's what will be imported from your file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{previewData.length}</p>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {previewData.filter(item => item.status === 'Valid').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Valid</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">
                    {previewData.filter(item => item.status === 'Warning').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-3 border-b">
                  <h4 className="font-medium">Preview Data</h4>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {previewData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border-b last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">{item.type}</Badge>
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Row {item.row} • {item.area || 'No area'}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={item.status === 'Valid' ? 'default' : 'secondary'}
                        className={item.status === 'Valid' ? 'bg-green-500' : 'bg-yellow-500'}
                      >
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Progress */}
      {importProgress.status !== 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {importProgress.status === 'completed' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : importProgress.status === 'error' ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : (
                <RefreshCw className="h-5 w-5 animate-spin" />
              )}
              <span>Import Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{importProgress.message}</span>
                <span>{importProgress.progress}%</span>
              </div>
              <Progress value={importProgress.progress} className="w-full" />
            </div>

            {importProgress.status === 'error' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {importProgress.message}
                </AlertDescription>
              </Alert>
            )}

            {importProgress.status === 'completed' && importProgress.details && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Import completed! {importProgress.details.success_rows} items imported successfully.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xl font-bold text-blue-600">{importProgress.details.total_rows}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xl font-bold text-green-600">{importProgress.details.success_rows}</p>
                    <p className="text-xs text-muted-foreground">Success</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-xl font-bold text-red-600">{importProgress.details.error_rows}</p>
                    <p className="text-xs text-muted-foreground">Errors</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xl font-bold text-gray-600">{importProgress.details.processed_rows}</p>
                    <p className="text-xs text-muted-foreground">Processed</p>
                  </div>
                </div>

                {importProgress.details.errors && importProgress.details.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-600">Errors</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {importProgress.details.errors.map((error, index) => (
                        <div key={index} className="text-sm p-2 bg-red-50 rounded border-l-4 border-red-500">
                          <span className="font-medium">Row {error.row}:</span> {error.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-4">
        {(importProgress.status === 'completed' || importProgress.status === 'error') && (
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Import Another File
          </Button>
        )}
        
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading || importProgress.status === 'processing'}
          >
            {importProgress.status === 'processing' ? 'Cancel Import' : 'Cancel'}
          </Button>
        )}
      </div>
    </div>
  )
}