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
  FileText
} from 'lucide-react'
import { useTranslations } from 'next-intl'

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

  // Download CSV template
  const downloadCSVTemplate = () => {
    // CSV template for inserts/updates (no keys needed - matches by name)
    const csvContent = `area_name,objective_title,objective_description,objective_quarter,objective_priority,objective_status,objective_progress,objective_target_date,initiative_title,initiative_description,initiative_start_date,initiative_due_date,initiative_completion_date,initiative_status,initiative_progress,activity_title,activity_description,activity_is_completed,activity_assigned_to_email
Sales,Increase Revenue,Grow revenue by 25%,Q1,high,in_progress,20,2025-03-31,Launch New Product Line,Develop and launch premium products,2025-01-01,2025-02-28,,in_progress,30,Market Research,Conduct market analysis,false,manager@company.com
Sales,Increase Revenue,Grow revenue by 25%,Q1,high,in_progress,20,2025-03-31,Launch New Product Line,Develop and launch premium products,2025-01-01,2025-02-28,,in_progress,30,Product Design,Create product prototypes,true,designer@company.com
Marketing,Improve Brand Awareness,Increase brand recognition by 40%,Q2,medium,planning,0,2025-06-30,Social Media Campaign,Launch targeted social media strategy,2025-04-01,2025-05-31,,planning,0,,,
Marketing,Improve Brand Awareness,Increase brand recognition by 40%,Q2,medium,planning,0,2025-06-30,Content Marketing,Develop content strategy and blog,2025-04-15,2025-06-15,,planning,0,Write Blog Posts,Create 10 high-quality articles,false,writer@company.com`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'okr-bulk-upload-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Download Excel template (placeholder)
  const downloadExcelTemplate = () => {
    // For now, we'll create a CSV that Excel can open
    // Later this will be replaced with an actual .xlsx file
    const csvContent = `area_name,objective_title,objective_description,objective_quarter,objective_priority,objective_status,objective_progress,objective_target_date,initiative_title,initiative_description,initiative_start_date,initiative_due_date,initiative_completion_date,initiative_status,initiative_progress,activity_title,activity_description,activity_is_completed,activity_assigned_to_email
Sales,Increase Revenue,Grow revenue by 25%,Q1,high,in_progress,20,2025-03-31,Launch New Product Line,Develop and launch premium products,2025-01-01,2025-02-28,,in_progress,30,Market Research,Conduct market analysis,false,manager@company.com
Sales,Increase Revenue,Grow revenue by 25%,Q1,high,in_progress,20,2025-03-31,Launch New Product Line,Develop and launch premium products,2025-01-01,2025-02-28,,in_progress,30,Product Design,Create product prototypes,true,designer@company.com
Marketing,Improve Brand Awareness,Increase brand recognition by 40%,Q2,medium,planning,0,2025-06-30,Social Media Campaign,Launch targeted social media strategy,2025-04-01,2025-05-31,,planning,0,,,
Marketing,Improve Brand Awareness,Increase brand recognition by 40%,Q2,medium,planning,0,2025-06-30,Content Marketing,Develop content strategy and blog,2025-04-15,2025-06-15,,planning,0,Write Blog Posts,Create 10 high-quality articles,false,writer@company.com`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'okr-bulk-upload-template-excel.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    alert(t('excelTemplateNote'))
  }

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card className="glassmorphic-card border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription className="text-white/60">
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Input */}
          <div className="space-y-4">
            <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-white/40 transition-colors bg-gray-900/50">
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
                <Upload className="h-12 w-12 text-white/40 mx-auto mb-4" />
                <p className="text-white mb-2">
                  {t('dragDrop')} {t('browse')}
                </p>
                <p className="text-white/60 text-sm">
                  CSV, XLSX, XLS ({t('maxFileSize')}: 50MB)
                </p>
              </label>
            </div>

            {/* Selected File */}
            {selectedFile && (
              <div className="bg-gray-900/70 rounded-lg p-4 flex items-center justify-between border border-white/10">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-white font-medium">{selectedFile.name}</p>
                    <p className="text-white/60 text-sm">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={uploadStatus.state !== 'idle' && uploadStatus.state !== 'error'}
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity text-white"
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
                  <span className="text-white/60 text-sm">{uploadStatus.message}</span>
                  <span className="text-white/60 text-sm">{uploadStatus.progress}%</span>
                </div>
                <Progress value={uploadStatus.progress} className="h-2" />
              </div>
            )}

            {/* Status Messages */}
            {uploadStatus.state === 'success' && (
              <Alert className="bg-green-500/10 border-green-500/20">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-white">
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
              <Alert className="bg-red-500/10 border-red-500/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-white">
                  {uploadStatus.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Template Downloads */}
          <div className="space-y-3">
            <p className="text-white/60 text-sm">{t('templateDescription')}:</p>
            <div className="flex gap-3">
              <Button
                onClick={downloadCSVTemplate}
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10 hover:border-primary transition-colors flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                CSV {t('downloadTemplate')}
              </Button>
              <Button
                onClick={downloadExcelTemplate}
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10 hover:border-primary transition-colors flex-1"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel {t('downloadTemplate')}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <Alert className="bg-blue-500/10 border-blue-500/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-white">
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