"use client"

import * as React from "react"
import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface FileWithPreview extends File {
  preview?: string
  id: string
  status: "idle" | "uploading" | "success" | "error"
  progress: number
  error?: string
}

interface FileUploadZoneProps {
  onFilesSelected?: (files: File[]) => void
  onFileRemove?: (fileId: string) => void
  maxFiles?: number
  maxSize?: number // in bytes
  acceptedFileTypes?: string[]
  multiple?: boolean
  disabled?: boolean
  className?: string
}

export function FileUploadZone({
  onFilesSelected,
  onFileRemove,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedFileTypes = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv"],
  multiple = true,
  disabled = false,
  className,
}: FileUploadZoneProps) {
  const [files, setFiles] = React.useState<FileWithPreview[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileWithPreview[] = acceptedFiles.map((file) => ({
      ...file,
      id: Math.random().toString(36).substring(7),
      preview: URL.createObjectURL(file),
      status: "idle" as const,
      progress: 0,
    }))

    setFiles((prev) => [...prev, ...newFiles])
    onFilesSelected?.(acceptedFiles)
  }, [onFilesSelected])

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections,
  } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[`application/*`] = [type]
      return acc
    }, {} as Record<string, string[]>),
    maxSize,
    maxFiles: multiple ? maxFiles : 1,
    multiple,
    disabled,
  })

  const removeFile = (fileId: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === fileId)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((f) => f.id !== fileId)
    })
    onFileRemove?.(fileId)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getStatusIcon = (status: FileWithPreview["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <File className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Card 
        {...getRootProps()} 
        className={cn(
          "border-2 border-dashed cursor-pointer transition-colors hover:bg-muted/50",
          isDragActive && "border-primary bg-primary/5",
          isDragReject && "border-destructive bg-destructive/5",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <input {...getInputProps()} />
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <Upload 
              className={cn(
                "h-10 w-10 text-muted-foreground mb-4",
                isDragActive && "text-primary"
              )} 
            />
            
            {isDragActive ? (
              <p className="text-lg font-medium">Drop the files here</p>
            ) : (
              <>
                <p className="text-lg font-medium">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  {acceptedFileTypes.join(", ")} up to {formatFileSize(maxSize)}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {fileRejections.length > 0 && (
        <div className="space-y-2">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="text-sm text-destructive">
              <p className="font-medium">{file.name}</p>
              <ul className="list-disc list-inside ml-4">
                {errors.map((error) => (
                  <li key={error.code}>{error.message}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Selected Files</h4>
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getStatusIcon(file.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {file.status}
                  </Badge>
                </div>
                
                {file.status === "uploading" && (
                  <div className="flex items-center space-x-2 min-w-0 flex-1 max-w-32">
                    <Progress value={file.progress} className="h-2" />
                    <span className="text-xs">{file.progress}%</span>
                  </div>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  disabled={file.status === "uploading"}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}