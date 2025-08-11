'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  History, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
  Info
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ImportJob {
  id: string
  filename: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial'
  totalRows: number
  processedRows: number
  successRows: number
  errorRows: number
  fileSize: number
  createdAt: string
  completedAt: string | null
  duration: number | null
}

interface ImportStats {
  totalJobs: number
  byStatus: Record<string, number>
  totalRowsProcessed: number
  totalSuccessRows: number
  totalErrorRows: number
  averageSuccessRate: number
  recentActivity: {
    last24Hours: number
    last7Days: number
    last30Days: number
  }
}

export function OKRImportHistory() {
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [stats, setStats] = useState<ImportStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<string | null>(null)

  const fetchHistory = async () => {
    try {
      setLoading(true)
      
      // Fetch history
      const historyResponse = await fetch('/api/upload/okr-file/history?limit=10')
      if (historyResponse.ok) {
        const data = await historyResponse.json()
        setJobs(data.jobs || [])
      }

      // Fetch stats
      const statsResponse = await fetch('/api/upload/okr-file/stats')
      if (statsResponse.ok) {
        const data = await statsResponse.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Processing</Badge>
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>
      case 'partial':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Partial</Badge>
      case 'pending':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Pending</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-'
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const checkJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/upload/okr-file/jobs/${jobId}`)
      if (response.ok) {
        const data = await response.json()
        alert(JSON.stringify(data, null, 2))
      }
    } catch (error) {
      console.error('Failed to fetch job status:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Statistics Card */}
      {stats && (
        <Card className="glass-morphism border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Info className="h-5 w-5" />
              Import Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-white/60 text-sm">Total Imports</p>
                <p className="text-2xl font-bold text-white">{stats.totalJobs}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Success Rate</p>
                <p className="text-2xl font-bold text-green-400">{stats.averageSuccessRate}%</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Rows Processed</p>
                <p className="text-2xl font-bold text-white">{stats.totalRowsProcessed.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Last 24h</p>
                <p className="text-2xl font-bold text-blue-400">{stats.recentActivity.last24Hours}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Card */}
      <Card className="glass-morphism border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <History className="h-5 w-5" />
                Import History
              </CardTitle>
              <CardDescription className="text-white/60">
                Recent file imports and their processing status
              </CardDescription>
            </div>
            <Button
              onClick={fetchHistory}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && jobs.length === 0 ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-white/40 mx-auto mb-4" />
              <p className="text-white/60">Loading import history...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8">
              <FileSpreadsheet className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">No imports yet</p>
              <p className="text-white/40 text-sm mt-2">
                Upload your first OKR file to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => checkJobStatus(job.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-white/60" />
                        <div>
                          <p className="text-white font-medium">{job.filename}</p>
                          <p className="text-white/60 text-sm">
                            {formatFileSize(job.fileSize)} • {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        {getStatusBadge(job.status)}
                        
                        <div className="flex items-center gap-1 text-white/60">
                          <Clock className="h-3 w-3" />
                          {formatDuration(job.duration)}
                        </div>
                        
                        {job.successRows > 0 && (
                          <div className="flex items-center gap-1 text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            {job.successRows} success
                          </div>
                        )}
                        
                        {job.errorRows > 0 && (
                          <div className="flex items-center gap-1 text-red-400">
                            <AlertCircle className="h-3 w-3" />
                            {job.errorRows} errors
                          </div>
                        )}
                      </div>

                      {/* Progress bar for processing jobs */}
                      {job.status === 'processing' && job.totalRows > 0 && (
                        <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                          <div 
                            className="bg-blue-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${(job.processedRows / job.totalRows) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}