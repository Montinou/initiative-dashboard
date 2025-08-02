'use client'

import React, { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, CheckCircle } from 'lucide-react'
import { DashboardLoadingStates } from '@/components/dashboard/DashboardLoadingStates'

function UploadContent() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-white">File Upload</h1>
        <p className="text-white/70">Upload and manage your files</p>
      </div>

      {/* Upload Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="glass-morphism border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Upload className="h-5 w-5" />
              <span>Upload Files</span>
            </CardTitle>
            <CardDescription className="text-white/60">
              Drag and drop files or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-white/40 transition-colors cursor-pointer">
              <Upload className="h-12 w-12 mx-auto mb-4 text-white/40" />
              <p className="text-white/60 mb-2">Drop files here or click to upload</p>
              <p className="text-sm text-white/40">Supports PDF, DOC, XLS, and image files</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-morphism border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <FileText className="h-5 w-5" />
              <span>Recent Files</span>
            </CardTitle>
            <CardDescription className="text-white/60">
              Your recently uploaded files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-2 rounded hover:bg-white/5">
                <FileText className="h-4 w-4 text-blue-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">quarterly_report.pdf</p>
                  <p className="text-xs text-white/40">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-2 rounded hover:bg-white/5">
                <FileText className="h-4 w-4 text-green-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">budget_analysis.xlsx</p>
                  <p className="text-xs text-white/40">1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-morphism border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <CheckCircle className="h-5 w-5" />
              <span>Upload Status</span>
            </CardTitle>
            <CardDescription className="text-white/60">
              Current upload progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">Total Files</span>
                <span className="text-sm text-white font-medium">24</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">Storage Used</span>
                <span className="text-sm text-white font-medium">2.4 GB</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
              <p className="text-xs text-white/60">45% of 5 GB used</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function UploadPage() {
  return (
    <Suspense fallback={<DashboardLoadingStates.PageSkeleton />}>
      <UploadContent />
    </Suspense>
  )
}