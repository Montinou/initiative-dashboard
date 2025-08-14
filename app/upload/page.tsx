'use client'

import React, { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, CheckCircle } from 'lucide-react'
import { DashboardLoadingStates } from '@/components/dashboard/DashboardLoadingStates'
import { ProtectedRoute } from '@/components/protected-route'

function UploadContent() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-foreground">File Upload</h1>
        <p className="text-muted-foreground">Upload and manage your files</p>
      </div>

      {/* Upload Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <Upload className="h-5 w-5" />
              <span>Upload Files</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Drag and drop files or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition-colors cursor-pointer">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">Drop files here or click to upload</p>
              <p className="text-sm text-muted-foreground/70">Supports PDF, DOC, XLS, and image files</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <FileText className="h-5 w-5" />
              <span>Recent Files</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your recently uploaded files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-2 rounded hover:bg-accent/50">
                <FileText className="h-4 w-4 text-blue-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">quarterly_report.pdf</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-2 rounded hover:bg-accent/50">
                <FileText className="h-4 w-4 text-green-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">budget_analysis.xlsx</p>
                  <p className="text-xs text-muted-foreground">1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <CheckCircle className="h-5 w-5" />
              <span>Upload Status</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Current upload progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Total Files</span>
                <span className="text-sm text-foreground font-medium">24</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Storage Used</span>
                <span className="text-sm text-foreground font-medium">2.4 GB</span>
              </div>
              <div className="w-full bg-accent/20 rounded-full h-2">
                <div className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
              <p className="text-xs text-muted-foreground">45% of 5 GB used</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function UploadPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<DashboardLoadingStates.PageSkeleton />}>
        <UploadContent />
      </Suspense>
    </ProtectedRoute>
  )
}