'use client'

import React, { Suspense, useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, CheckCircle, AlertCircle, Folder, TrendingUp } from 'lucide-react'
import { DashboardLoadingStates } from '@/components/dashboard/DashboardLoadingStates'
import { FileUploadDropzone } from '@/components/file-upload/FileUploadDropzone'
import { useAuth, useAreaDataFilter } from '@/lib/auth-context'
import { createClient } from '@/utils/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface UploadedFile {
  id: string
  original_filename: string
  file_size: number
  mime_type: string
  upload_status: string
  created_at: string
  file_type: string
}

interface FileStats {
  totalFiles: number
  totalSize: number
  recentFiles: UploadedFile[]
}

function UploadContent() {
  const { profile } = useAuth()
  const { getDataFilters } = useAreaDataFilter()
  const [fileStats, setFileStats] = useState<FileStats>({ totalFiles: 0, totalSize: 0, recentFiles: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch user's file statistics and recent files
  useEffect(() => {
    const fetchFileStats = async () => {
      if (!profile) return

      try {
        const supabase = createClient()
        const filters = getDataFilters()
        
        if (!filters) return

        // Get file statistics
        const { data: files, error: filesError } = await supabase
          .from('uploaded_files')
          .select('id, original_filename, file_size, mime_type, upload_status, created_at, file_type')
          .match(filters)
          .eq('upload_status', 'uploaded')
          .order('created_at', { ascending: false })

        if (filesError) {
          console.error('Error fetching files:', filesError)
          setError('Failed to load file statistics')
          return
        }

        const totalSize = files?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0
        const recentFiles = files?.slice(0, 5) || []

        setFileStats({
          totalFiles: files?.length || 0,
          totalSize,
          recentFiles
        })
      } catch (err) {
        console.error('Error in fetchFileStats:', err)
        setError('Failed to load file information')
      } finally {
        setLoading(false)
      }
    }

    fetchFileStats()
  }, [profile, getDataFilters])

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  const handleUploadComplete = (fileId: string, result: any) => {
    // Refresh file stats after successful upload
    setFileStats(prev => ({
      ...prev,
      totalFiles: prev.totalFiles + 1,
      totalSize: prev.totalSize + (result.fileSize || 0)
    }))
  }

  if (loading) {
    return <DashboardLoadingStates.PageSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-white">File Management</h1>
        <p className="text-white/70">Upload and manage your files securely</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-white">{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* File Upload Dropzone */}
        <div className="lg:col-span-2">
          <Card className="glass-morphism border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Upload Files</CardTitle>
              <CardDescription className="text-white/60">
                Drag and drop files or click to browse. Files are automatically processed and organized.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadDropzone
                maxFiles={10}
                maxFileSize={100 * 1024 * 1024} // 100MB
                acceptedTypes={['.xlsx', '.xls', '.csv', '.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.txt']}
                areaId={profile?.area_id}
                accessLevel="area"
                autoUpload={true}
                showPreview={true}
                showProgress={true}
                userRole={profile?.role}
                canDelete={true}
                canPreview={true}
                onUploadComplete={handleUploadComplete}
                onUploadError={(fileId, error) => {
                  console.error('Upload error:', error)
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* File Statistics */}
        <div className="space-y-6">
          <Card className="glass-morphism border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <CheckCircle className="h-5 w-5" />
                <span>Storage Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">Total Files</span>
                  <span className="text-sm text-white font-medium">{fileStats.totalFiles}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">Storage Used</span>
                  <span className="text-sm text-white font-medium">{formatFileSize(fileStats.totalSize)}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min((fileStats.totalSize / (5 * 1024 * 1024 * 1024)) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-white/60">
                  {((fileStats.totalSize / (5 * 1024 * 1024 * 1024)) * 100).toFixed(1)}% of 5 GB used
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <FileText className="h-5 w-5" />
                <span>Recent Files</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fileStats.recentFiles.length > 0 ? (
                  fileStats.recentFiles.map((file) => (
                    <div key={file.id} className="flex items-center space-x-3 p-2 rounded hover:bg-white/5 transition-colors">
                      <div className="flex-shrink-0">
                        {file.file_type === 'spreadsheet' ? (
                          <TrendingUp className="h-4 w-4 text-green-400" />
                        ) : file.file_type === 'image' ? (
                          <FileText className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Folder className="h-4 w-4 text-purple-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{file.original_filename}</p>
                        <p className="text-xs text-white/40">
                          {formatFileSize(file.file_size)} • {formatTimeAgo(file.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/60 text-center py-4">No files uploaded yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function DashboardUploadPage() {
  return (
    <Suspense fallback={<DashboardLoadingStates.PageSkeleton />}>
      <UploadContent />
    </Suspense>
  )
}