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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Upload, 
  File, 
  FileText, 
  FileImage, 
  FileVideo, 
  FileSpreadsheet,
  CheckCircle, 
  AlertTriangle, 
  X,
  Download,
  Eye,
  Share2,
  Calendar,
  User
} from "lucide-react"
import { format } from "date-fns"

// Zod schema for validation
const uploadSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().optional(),
  category: z.enum(['document', 'image', 'spreadsheet', 'presentation', 'video', 'other']).default('document'),
  is_public: z.boolean().default(false),
  tags: z.string().optional(),
})

type UploadFormData = z.infer<typeof uploadSchema>

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedBy: string
  uploadedAt: string
  category: string
  description?: string
  tags?: string[]
}

interface DocumentUploadProps {
  contextType: 'initiative' | 'area' | 'objective' | 'organization'
  contextId: string
  contextTitle?: string
  existingFiles?: UploadedFile[]
  onUpload: (data: UploadFormData, files: File[]) => Promise<void>
  onDelete?: (fileId: string) => Promise<void>
  onCancel?: () => void
  loading?: boolean
  maxFiles?: number
  maxFileSize?: number
}

export function DocumentUpload({
  contextType,
  contextId,
  contextTitle,
  existingFiles = [],
  onUpload,
  onDelete,
  onCancel,
  loading = false,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
}: DocumentUploadProps) {
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])
  const [uploadProgress, setUploadProgress] = React.useState<{[key: string]: number}>({})
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'uploading' | 'completed' | 'error'>('idle')
  const [uploadMessage, setUploadMessage] = React.useState('')

  const uploadFields: FormFieldConfig[] = [
    {
      name: "title",
      label: "Document Title",
      type: "text",
      placeholder: "Enter document title",
      description: "A descriptive title for the uploaded document(s)",
      required: true,
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "Describe the content and purpose of these documents",
      description: "Additional context about the uploaded files",
    },
    {
      name: "category",
      label: "Category",
      type: "select",
      placeholder: "Select category",
      description: "Categorize the document for better organization",
      options: [
        { value: 'document', label: 'Document (PDF, DOC, TXT)' },
        { value: 'spreadsheet', label: 'Spreadsheet (XLS, CSV)' },
        { value: 'presentation', label: 'Presentation (PPT, KEY)' },
        { value: 'image', label: 'Image (JPG, PNG, SVG)' },
        { value: 'video', label: 'Video (MP4, MOV, AVI)' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      name: "is_public",
      label: "Make Public",
      type: "checkbox",
      description: "Allow all team members to view these documents",
    },
    {
      name: "tags",
      label: "Tags",
      type: "text",
      placeholder: "meeting, proposal, analysis (comma-separated)",
      description: "Add tags to help categorize and search for documents",
    },
  ]

  const getFileIcon = (filename: string, category?: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    
    if (category === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) {
      return <FileImage className="h-8 w-8 text-blue-500" />
    }
    if (category === 'video' || ['mp4', 'mov', 'avi', 'mkv', 'wmv'].includes(ext || '')) {
      return <FileVideo className="h-8 w-8 text-red-500" />
    }
    if (category === 'spreadsheet' || ['xls', 'xlsx', 'csv', 'ods'].includes(ext || '')) {
      return <FileSpreadsheet className="h-8 w-8 text-green-500" />
    }
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')) {
      return <FileText className="h-8 w-8 text-orange-500" />
    }
    return <File className="h-8 w-8 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files)
    setUploadStatus('idle')
    setUploadMessage('')
    setUploadProgress({})
  }

  const handleSubmit = async (data: UploadFormData) => {
    if (selectedFiles.length === 0) {
      throw new Error("Please select at least one file to upload")
    }

    setUploadStatus('uploading')
    setUploadMessage('Uploading files...')

    try {
      // Simulate upload progress for each file
      const progressUpdates = selectedFiles.map((file, index) => {
        return new Promise<void>((resolve) => {
          let progress = 0
          const interval = setInterval(() => {
            progress += Math.random() * 30
            if (progress >= 100) {
              progress = 100
              clearInterval(interval)
              resolve()
            }
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: Math.min(progress, 100)
            }))
          }, 200)
        })
      })

      await Promise.all(progressUpdates)
      await onUpload(data, selectedFiles)

      setUploadStatus('completed')
      setUploadMessage(`Successfully uploaded ${selectedFiles.length} file(s)`)
      
      // Reset form after successful upload
      setTimeout(() => {
        setSelectedFiles([])
        setUploadProgress({})
        setUploadStatus('idle')
        setUploadMessage('')
      }, 2000)

    } catch (error) {
      setUploadStatus('error')
      setUploadMessage(error instanceof Error ? error.message : 'Upload failed')
    }
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleDeleteExisting = async (fileId: string) => {
    if (onDelete) {
      await onDelete(fileId)
    }
  }

  const defaultValues: Partial<UploadFormData> = {
    category: 'document',
    is_public: false,
  }

  return (
    <div className="space-y-6">
      {/* Context Information */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="flex items-center space-x-3">
            <Upload className="h-6 w-6 text-blue-500" />
            <div>
              <h3 className="font-medium">
                Upload Documents to {contextType.charAt(0).toUpperCase() + contextType.slice(1)}
              </h3>
              {contextTitle && (
                <p className="text-sm text-muted-foreground mt-1">
                  {contextTitle}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Select Files</CardTitle>
          <CardDescription>
            Upload documents, images, spreadsheets, and other files relevant to this {contextType}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadZone
            onFilesSelected={handleFileSelect}
            maxFiles={maxFiles}
            maxSize={maxFileSize}
            acceptedFileTypes={[
              '.pdf', '.doc', '.docx', '.txt', '.md',
              '.xls', '.xlsx', '.csv',
              '.ppt', '.pptx', '.key',
              '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
              '.mp4', '.mov', '.avi', '.mkv',
              '.zip', '.rar', '.7z'
            ]}
            multiple={true}
          />
        </CardContent>
      </Card>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Files ({selectedFiles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file.name)}
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {uploadProgress[file.name] !== undefined && (
                      <div className="w-24">
                        <Progress value={uploadProgress[file.name]} className="h-2" />
                      </div>
                    )}
                    
                    {uploadStatus !== 'uploading' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSelectedFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Form */}
      {selectedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Document Details</CardTitle>
            <CardDescription>
              Provide information about the files you're uploading
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormBuilder
              fields={uploadFields}
              schema={uploadSchema}
              onSubmit={handleSubmit}
              defaultValues={defaultValues}
              submitLabel={loading ? "Uploading..." : "Upload Files"}
              isLoading={loading || uploadStatus === 'uploading'}
            />
          </CardContent>
        </Card>
      )}

      {/* Upload Status */}
      {uploadStatus !== 'idle' && (
        <Card>
          <CardContent className="pt-4">
            {uploadStatus === 'uploading' && (
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                <span>{uploadMessage}</span>
              </div>
            )}
            
            {uploadStatus === 'completed' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{uploadMessage}</AlertDescription>
              </Alert>
            )}
            
            {uploadStatus === 'error' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{uploadMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing Files */}
      {existingFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Existing Documents ({existingFiles.length})</CardTitle>
            <CardDescription>
              Files already attached to this {contextType}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {existingFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getFileIcon(file.name, file.category)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{file.name}</h4>
                        <Badge variant="outline">{file.category}</Badge>
                      </div>
                      {file.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {file.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{file.uploadedBy}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(file.uploadedAt), 'MMM dd, yyyy')}</span>
                        </div>
                        <span>{formatFileSize(file.size)}</span>
                      </div>
                      {file.tags && file.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {file.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    {onDelete && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteExisting(file.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
            disabled={loading || uploadStatus === 'uploading'}
          >
            {uploadStatus === 'uploading' ? 'Cancel Upload' : 'Close'}
          </Button>
        )}
      </div>
    </div>
  )
}