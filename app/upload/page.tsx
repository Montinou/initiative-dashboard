'use client'

import React, { useState } from 'react'
import { ArrowLeft, Upload, BarChart3, FileSpreadsheet, CheckCircle, FileText, Database } from 'lucide-react'
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
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 p-6">
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
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent">
              File Upload & Management
            </h1>
            <p className="text-foreground/80 text-sm">
              Upload and process your Excel files for dashboard integration
            </p>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="backdrop-blur-xl bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-green-300 font-medium">
              File uploaded and processed successfully!
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template Download Section */}
          <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
                Download Templates
              </CardTitle>
              <CardDescription className="text-foreground/70">
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
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent flex items-center gap-2">
                <Upload className="h-6 w-6 text-secondary" />
                Upload Files
              </CardTitle>
              <CardDescription className="text-foreground/70">
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
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-accent" />
                Processing Results
              </CardTitle>
              <CardDescription className="text-foreground/70">
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
                      <p className="text-foreground/80 text-sm">
                        {result.message}
                      </p>
                    )}
                    
                    {/* Processing Summary */}
                    {result.data && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-foreground/70 text-sm">
                          <Database className="h-4 w-4" />
                          <span>Total: {result.data.recordsProcessed} records processed</span>
                          {result.data.savedInitiatives > 0 && (
                            <span className="text-green-400">• {result.data.savedInitiatives} saved to database</span>
                          )}
                        </div>
                        
                        {/* Sheet Processing Details */}
                        {result.data.sheetDetails && result.data.sheetDetails.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-foreground/60 mb-1">
                              Sheets processed ({result.data.sheetsProcessed}):
                            </div>
                            <div className="space-y-1">
                              {result.data.sheetDetails.map((sheet, sheetIndex) => (
                                <div key={sheetIndex} className="flex items-center gap-2 text-xs text-foreground/70 pl-2">
                                  <FileText className="h-3 w-3 text-accent" />
                                  <span className="font-medium">{sheet.sheetName}</span>
                                  <span className="text-foreground/50">•</span>
                                  <span>{sheet.recordCount} record{sheet.recordCount !== 1 ? 's' : ''}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Error Summary */}
                        {result.data.errors && result.data.errors.length > 0 && (
                          <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs">
                            <div className="text-yellow-400 font-medium mb-1">
                              ⚠️ {result.data.errors.length} warning{result.data.errors.length !== 1 ? 's' : ''}:
                            </div>
                            <div className="space-y-1 text-yellow-300/80 max-h-24 overflow-y-auto">
                              {result.data.errors.slice(0, 3).map((error, errorIndex) => (
                                <div key={errorIndex}>• {error}</div>
                              ))}
                              {result.data.errors.length > 3 && (
                                <div className="text-yellow-400">
                                  ... and {result.data.errors.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
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
            <CardTitle className="text-lg font-bold bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent">
              Upload Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <FileSpreadsheet className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold text-white mb-1">Multi-Sheet Support</h3>
                <p className="text-foreground/70 text-sm">Process multiple Excel sheets automatically</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <FileText className="h-8 w-8 text-accent mb-2" />
                <h3 className="font-semibold text-white mb-1">Smart Detection</h3>
                <p className="text-foreground/70 text-sm">Recognizes OKR sheets, summary data, and more</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <CheckCircle className="h-8 w-8 text-green-400 mb-2" />
                <h3 className="font-semibold text-white mb-1">Validation</h3>
                <p className="text-foreground/70 text-sm">Automatic data validation and error checking</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <BarChart3 className="h-8 w-8 text-secondary mb-2" />
                <h3 className="font-semibold text-white mb-1">Integration</h3>
                <p className="text-foreground/70 text-sm">Direct integration with dashboard analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}