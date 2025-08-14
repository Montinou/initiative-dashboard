'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  FileText,
  ChevronDown
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface UploadStatus {
  state: 'idle' | 'calculating' | 'uploading' | 'processing' | 'success' | 'error'
  progress: number
  message: string
  jobId?: string
}

export function OKRFileUpload() {
  const t = useTranslations('upload.fileUpload')
  const tErrors = useTranslations('upload.errors')
  const tMessages = useTranslations('upload.messages')
  
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    state: 'idle',
    progress: 0,
    message: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Calculate SHA256 checksum
  const calculateChecksum = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  }

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    
    if (!validTypes.includes(file.type)) {
      setUploadStatus({
        state: 'error',
        progress: 0,
        message: tErrors('invalidFileType')
      })
      return
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadStatus({
        state: 'error',
        progress: 0,
        message: tErrors('fileTooLarge')
      })
      return
    }

    setSelectedFile(file)
    setUploadStatus({ state: 'idle', progress: 0, message: '' })
  }

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      // Step 1: Calculate checksum
      setUploadStatus({
        state: 'calculating',
        progress: 10,
        message: tMessages('calculatingChecksum')
      })
      
      const checksum = await calculateChecksum(selectedFile)

      // Step 2: Request signed URL
      setUploadStatus({
        state: 'uploading',
        progress: 20,
        message: tMessages('requestingUrl')
      })

      const signedUrlResponse = await fetch('/api/upload/okr-file/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type,
          checksum,
          size: selectedFile.size
        })
      })

      if (!signedUrlResponse.ok) {
        const error = await signedUrlResponse.json()
        throw new Error(error.error || tErrors('uploadFailed'))
      }

      const { uploadUrl, fields, objectPath } = await signedUrlResponse.json()

      // Step 3: Upload to GCS
      setUploadStatus({
        state: 'uploading',
        progress: 40,
        message: tMessages('uploadingFile')
      })

      const formData = new FormData()
      
      // Add all fields from the signed URL response
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string)
      })
      
      // Add the file last (important for GCS)
      formData.append('file', selectedFile)

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error(tErrors('uploadFailed'))
      }

      // Step 4: Notify backend
      setUploadStatus({
        state: 'processing',
        progress: 70,
        message: tMessages('processingFile')
      })

      const notifyResponse = await fetch('/api/upload/okr-file/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectPath })
      })

      if (!notifyResponse.ok) {
        const error = await notifyResponse.json()
        throw new Error(error.error || tErrors('processingFailed'))
      }

      const { jobId, status, message } = await notifyResponse.json()

      // Step 5: Success
      setUploadStatus({
        state: 'success',
        progress: 100,
        message: message || t('fileUploaded'),
        jobId
      })

      // Reset after 3 seconds
      setTimeout(() => {
        setSelectedFile(null)
        setUploadStatus({ state: 'idle', progress: 0, message: '' })
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 3000)

    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus({
        state: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : tErrors('uploadFailed')
      })
    }
  }

  // Download CSV template for specific entity
  const downloadCSVTemplate = async (entityType: string) => {
    try {
      const response = await fetch(`/api/upload/okr-file/template/csv/${entityType}`)
      if (!response.ok) throw new Error('Failed to download template')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `okr_${entityType}_template.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading CSV template:', error)
      setUploadStatus({
        state: 'error',
        progress: 0,
        message: 'Failed to download CSV template'
      })
    }
  }

  // Download Excel template with all sheets
  const downloadExcelTemplate = async () => {
    try {
      const response = await fetch('/api/upload/okr-file/template/excel')
      if (!response.ok) throw new Error('Failed to download template')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'okr_import_template.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading Excel template:', error)
      setUploadStatus({
        state: 'error',
        progress: 0,
        message: 'Failed to download Excel template'
      })
    }
  }

  // Show template preview/examples
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)
  const [templateExamples, setTemplateExamples] = useState<any>(null)

  const fetchTemplateExamples = async () => {
    try {
      const response = await fetch('/api/upload/okr-file/template/examples')
      if (!response.ok) throw new Error('Failed to fetch examples')
      
      const data = await response.json()
      setTemplateExamples(data)
      setShowTemplatePreview(true)
    } catch (error) {
      console.error('Error fetching template examples:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Input */}
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors bg-muted">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                disabled={uploadStatus.state !== 'idle' && uploadStatus.state !== 'error'}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer"
              >
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground mb-2">
                  {t('dragDrop')} {t('browse')}
                </p>
                <p className="text-muted-foreground text-sm">
                  CSV, XLSX, XLS ({t('maxFileSize')}: 50MB)
                </p>
              </label>
            </div>

            {/* Selected File */}
            {selectedFile && (
              <div className="bg-muted rounded-lg p-4 flex items-center justify-between border border-border">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-foreground font-medium">{selectedFile.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={uploadStatus.state !== 'idle' && uploadStatus.state !== 'error'}
                  variant="default"
                >
                  {uploadStatus.state === 'idle' || uploadStatus.state === 'error' ? (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {t('uploadButton')}
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('processing')}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Upload Progress */}
            {uploadStatus.state !== 'idle' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{uploadStatus.message}</span>
                  <span className="text-muted-foreground text-sm">{uploadStatus.progress}%</span>
                </div>
                <Progress value={uploadStatus.progress} className="h-2" />
              </div>
            )}

            {/* Status Messages */}
            {uploadStatus.state === 'success' && (
              <Alert className="border-primary bg-primary/10">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-foreground">
                  {uploadStatus.message}
                  {uploadStatus.jobId && (
                    <span className="block text-sm mt-1">
                      Job ID: {uploadStatus.jobId}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {uploadStatus.state === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {uploadStatus.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Template Downloads */}
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">{t('templateDescription')}:</p>
            <div className="flex gap-3">
              {/* CSV Templates Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-border hover:bg-accent hover:text-accent-foreground transition-colors flex-1"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    CSV Templates
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-card border-border">
                  <DropdownMenuLabel className="text-muted-foreground">Choose Entity Type</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-accent" />
                  <DropdownMenuItem 
                    onClick={() => downloadCSVTemplate('objectives')}
                    className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Objectives Template
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => downloadCSVTemplate('initiatives')}
                    className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Initiatives Template
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => downloadCSVTemplate('activities')}
                    className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Activities Template
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-accent" />
                  <DropdownMenuItem 
                    onClick={() => downloadCSVTemplate('users')}
                    className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Users Template
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => downloadCSVTemplate('areas')}
                    className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Areas Template
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Excel Template (All in One) */}
              <Button
                onClick={downloadExcelTemplate}
                variant="outline"
                className="border-border hover:bg-accent hover:text-accent-foreground transition-colors flex-1"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel Template (All)
              </Button>

              {/* Preview Examples */}
              <Button
                onClick={fetchTemplateExamples}
                variant="outline"
                className="border-border hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>

          {/* Template Preview Modal (simplified) */}
          {showTemplatePreview && templateExamples && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowTemplatePreview(false)}>
              <div className="bg-gray-900 rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto border border-border" onClick={e => e.stopPropagation()}>
                <h3 className="text-foreground text-lg font-semibold mb-4">Template Format Examples</h3>
                <div className="space-y-4">
                  {Object.entries(templateExamples).map(([entity, data]: [string, any]) => (
                    <div key={entity} className="border border-border rounded p-4">
                      <h4 className="text-foreground font-medium mb-2 capitalize">{entity}</h4>
                      <div className="overflow-x-auto">
                        <table className="text-xs text-muted-foreground">
                          <thead>
                            <tr className="border-b border-border">
                              {data.columns.map((col: any) => (
                                <th key={col.field} className="px-2 py-1 text-left">
                                  {col.header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.examples.slice(0, 2).map((row: any, idx: number) => (
                              <tr key={idx} className="border-b border-border/50">
                                {data.columns.map((col: any) => (
                                  <td key={col.field} className="px-2 py-1">
                                    {String(row[col.field] || '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => setShowTemplatePreview(false)}
                  className="mt-4 bg-primary hover:bg-primary/80 text-foreground"
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-foreground">
              <strong>{t('guidelines.title')}:</strong>
              <br />
              • {t('guidelines.format')}
              <br />
              • {t('guidelines.columns')}
              <br />
              • {t('guidelines.size')}
              <br />
              • {t('guidelines.encoding')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}