'use client'

import React, { Suspense } from 'react'
import { DashboardLoadingStates } from '@/components/dashboard/DashboardLoadingStates'
import { OKRFileUpload } from '@/components/okr-upload/OKRFileUpload'
import { OKRImportHistory } from '@/components/okr-upload/OKRImportHistory'

function UploadContent() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-white">OKR File Upload</h1>
        <p className="text-white/70">
          Upload CSV or Excel files to import objectives, initiatives, and activities
        </p>
      </div>

      {/* Upload Component */}
      <OKRFileUpload />
      
      {/* Import History */}
      <OKRImportHistory />
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