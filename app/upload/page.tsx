'use client'

import React, { useState } from 'react'
import { ArrowLeft, Upload, BarChart3, FileSpreadsheet, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TemplateDownload } from '@/components/template-download'
import { FileUploadComponent } from '@/components/file-upload'
import Link from 'next/link'

export default function UploadPage() {
  const [uploadResults, setUploadResults] = useState<any[]>([])
  const [showSuccess, setShowSuccess] = useState(false)

  const handleUploadComplete = (result: any) => {
    setUploadResults(prev => [...prev, result])
    
    if (result.success) {
      setShowSuccess(true)
      // Auto-hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="backdrop-blur-sm bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              File Upload & Management
            </h1>
            <p className="text-purple-200/80 text-sm">
              Upload and process your Excel files for dashboard integration
            </p>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="backdrop-blur-xl bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-green-200 font-medium">
              File uploaded and processed successfully!
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template Download Section */}
          <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-purple-400" />
                Download Templates
              </CardTitle>
              <CardDescription className="text-purple-200/70">
                Get standardized Excel templates for data upload
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <TemplateDownload />
            </CardContent>
          </Card>

          {/* File Upload Section */}
          <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent flex items-center gap-2">
                <Upload className="h-6 w-6 text-cyan-400" />
                Upload Files
              </CardTitle>
              <CardDescription className="text-purple-200/70">
                Upload your Excel files for processing and integration
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <FileUploadComponent onUploadComplete={handleUploadComplete} />
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {uploadResults.length > 0 && (
          <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-green-400" />
                Processing Results
              </CardTitle>
              <CardDescription className="text-purple-200/70">
                Review the results of your file uploads
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-4">
                {uploadResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border ${
                      result.success
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">
                        {result.fileName || `Upload ${index + 1}`}
                      </span>
                      <span
                        className={`text-sm px-2 py-1 rounded ${
                          result.success
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {result.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    {result.message && (
                      <p className="text-purple-200/80 text-sm">
                        {result.message}
                      </p>
                    )}
                    {result.data && (
                      <p className="text-purple-200/60 text-xs mt-2">
                        Processed {result.data.length} records
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-lg font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Upload Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <FileSpreadsheet className="h-8 w-8 text-purple-400 mb-2" />
                <h3 className="font-semibold text-white mb-1">Supported Formats</h3>
                <p className="text-purple-200/70 text-sm">Excel (.xlsx, .xls) and CSV files</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <CheckCircle className="h-8 w-8 text-green-400 mb-2" />
                <h3 className="font-semibold text-white mb-1">Validation</h3>
                <p className="text-purple-200/70 text-sm">Automatic data validation and error checking</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <BarChart3 className="h-8 w-8 text-cyan-400 mb-2" />
                <h3 className="font-semibold text-white mb-1">Integration</h3>
                <p className="text-purple-200/70 text-sm">Direct integration with dashboard analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}