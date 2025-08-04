'use client'

import React, { Suspense, useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, CheckCircle, AlertCircle, Folder, TrendingUp, Upload, Sparkles, Database } from 'lucide-react'
import { DashboardLoadingStates } from '@/components/dashboard/DashboardLoadingStates'
import { FileUploadDropzone } from '@/components/file-upload/FileUploadDropzone'
import { ExcelImportWizard } from '@/components/excel-import/ExcelImportWizard'
import { useAuth, useAreaDataFilter } from '@/lib/auth-context'
import { createClient } from '@/utils/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
  const [activeTab, setActiveTab] = useState('enhanced-import')
  const [showImportWizard, setShowImportWizard] = useState(false)

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

  const handleImportComplete = (summary: any) => {
    // Handle successful import
    setShowImportWizard(false)
    setActiveTab('files')
    
    // Refresh file stats
    const fetchFileStats = async () => {
      if (!profile) return

      try {
        const supabase = createClient()
        const filters = getDataFilters()
        
        if (!filters) return

        const { data: files } = await supabase
          .from('uploaded_files')
          .select('id, original_filename, file_size, mime_type, upload_status, created_at, file_type')
          .match(filters)
          .eq('upload_status', 'uploaded')
          .order('created_at', { ascending: false })

        if (files) {
          const totalSize = files.reduce((sum, file) => sum + (file.file_size || 0), 0)
          const recentFiles = files.slice(0, 5)

          setFileStats({
            totalFiles: files.length,
            totalSize,
            recentFiles
          })
        }
      } catch (err) {
        console.error('Error refreshing file stats:', err)
      }
    }

    fetchFileStats()
  }

  const handleImportCancel = () => {
    setShowImportWizard(false)
  }

  if (loading) {
    return <DashboardLoadingStates.PageSkeleton />
  }

  if (showImportWizard) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Excel Import Wizard</h1>
            <p className="text-white/70">Import initiatives and objectives from Excel files with advanced validation</p>
          </div>
        </div>

        {/* Excel Import Wizard */}
        <ExcelImportWizard
          onImportComplete={handleImportComplete}
          onImportCancel={handleImportCancel}
          userRole={profile?.role}
          areaId={profile?.area_id}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-white">File Management</h1>
        <p className="text-white/70">Upload and manage your files securely with enhanced Excel import capabilities</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-white">{error}</AlertDescription>
        </Alert>
      )}

      {/* Enhanced Import Options */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur-sm">
          <TabsTrigger 
            value="enhanced-import" 
            className="data-[state=active]:bg-primary data-[state=active]:text-white text-white/70"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Excel Import Wizard
          </TabsTrigger>
          <TabsTrigger 
            value="quick-upload" 
            className="data-[state=active]:bg-primary data-[state=active]:text-white text-white/70"
          >
            <Upload className="h-4 w-4 mr-2" />
            Quick Upload
          </TabsTrigger>
          <TabsTrigger 
            value="files" 
            className="data-[state=active]:bg-primary data-[state=active]:text-white text-white/70"
          >
            <Database className="h-4 w-4 mr-2" />
            File Library
          </TabsTrigger>
        </TabsList>

        {/* Enhanced Excel Import */}
        <TabsContent value="enhanced-import" className="space-y-6">
          <Card className="glass-morphism border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Enhanced Excel Import
              </CardTitle>
              <CardDescription className="text-white/60">
                Import initiatives and objectives from Excel files with advanced validation, intelligent column mapping, and KPI integration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                  <CheckCircle className="h-8 w-8 text-blue-400 mb-3" />
                  <h3 className="text-white font-medium mb-2">Smart Validation</h3>
                  <p className="text-white/60 text-sm">
                    Advanced data validation with detailed error reporting and suggestions for data quality improvement.
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-4">
                  <TrendingUp className="h-8 w-8 text-green-400 mb-3" />
                  <h3 className="text-white font-medium mb-2">KPI Integration</h3>
                  <p className="text-white/60 text-sm">
                    Automatic KPI calculation and integration with your existing dashboard metrics and analytics.
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-4">
                  <Database className="h-8 w-8 text-purple-400 mb-3" />
                  <h3 className="text-white font-medium mb-2">Smart Mapping</h3>
                  <p className="text-white/60 text-sm">
                    Intelligent column detection and mapping that works with all existing SIGA templates automatically.
                  </p>
                </div>
              </div>

              <Alert className="bg-blue-500/10 border-blue-500/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-white">
                  <strong>Compatible formats:</strong> All existing SIGA Excel templates, OKR spreadsheets, and custom CSV files.
                  <br />
                  <strong>Features:</strong> Backward compatibility, duplicate detection, progress tracking, and real-time KPI updates.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={() => setShowImportWizard(true)}
                  className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white flex-1"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Excel Import Wizard
                </Button>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <FileText className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Upload */}
        <TabsContent value="quick-upload" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* File Upload Dropzone */}
            <div className="lg:col-span-2">
              <Card className="glass-morphism border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Quick File Upload</CardTitle>
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
            </div>
          </div>
        </TabsContent>

        {/* File Library */}
        <TabsContent value="files" className="space-y-6">
          <Card className="glass-morphism border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Database className="h-5 w-5" />
                <span>File Library</span>
              </CardTitle>
              <CardDescription className="text-white/60">
                Manage and organize your uploaded files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Storage Overview */}
                <div className="space-y-4">
                  <h4 className="text-white font-medium">Storage Overview</h4>
                  <div className="bg-white/5 rounded-lg p-4 space-y-3">
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
                </div>

                {/* Recent Files */}
                <div className="space-y-4">
                  <h4 className="text-white font-medium">Recent Files</h4>
                  <div className="bg-white/5 rounded-lg p-4">
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
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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