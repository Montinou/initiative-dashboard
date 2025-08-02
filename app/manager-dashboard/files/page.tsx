"use client";

import { LazyFileManagementInterface, ProgressiveDashboardLoader } from '@/components/manager/LazyComponents';
import { useAreaDisplay } from '@/components/manager/ManagerAreaProvider';
import { usePageSpecificCacheWarming } from '@/hooks/useCacheWarming';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

/**
 * Manager Dashboard Files Page
 * 
 * Features:
 * - File upload interface with drag-and-drop
 * - Upload history with filtering and management
 * - File statistics and analytics
 * - Recent activity tracking
 * - Area-scoped file access
 * - Real-time upload progress
 * - File validation and error handling
 */
export default function ManagerFilesPage() {
  const { displayName, loading, error } = useAreaDisplay();
  
  // Warm cache for files page
  usePageSpecificCacheWarming('files');

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-2"></div>
          <div className="h-4 bg-muted rounded w-96"></div>
        </div>
        <div className="grid gap-6">
          <div className="h-48 bg-muted rounded"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Unable to Load File Management
          </h2>
          <p className="text-muted-foreground mb-6">
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          File Management - {displayName}
        </h1>
        <p className="text-muted-foreground">
          Upload and manage OKR Excel files, track processing status, and monitor file-related activities
        </p>
      </div>

      {/* File Management Interface */}
      <ProgressiveDashboardLoader priority="high">
        <LazyFileManagementInterface />
      </ProgressiveDashboardLoader>

      {/* Additional Help Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">File Upload Guidelines</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="backdrop-blur-md bg-card/50 border border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">File Format</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload Excel files (.xlsx or .xls) with your OKR data. Use our template for best results.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-card/50 border border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Data Structure</h3>
                  <p className="text-sm text-muted-foreground">
                    Ensure your data follows the OKR structure: Objectives, Key Results, and Activities.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-card/50 border border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Data Security</h3>
                  <p className="text-sm text-muted-foreground">
                    All uploads are area-scoped and encrypted. Only authorized team members can access your files.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}