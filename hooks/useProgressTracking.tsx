"use client"

import { useState, useEffect, useCallback } from 'react'
import type { InitiativeProgressHistory } from '@/lib/types/database'
import { useAuth } from '@/lib/auth-context'

// Extended progress entry with additional metrics
export interface ProgressEntry extends InitiativeProgressHistory {
  change_delta?: number
  change_percentage?: number
  days_since_update?: number
  trend?: 'increasing' | 'decreasing' | 'stable'
}

// Progress statistics for an entity
export interface ProgressStatistics {
  current_progress: number
  average_daily_change: number
  total_change: number
  days_tracked: number
  last_update: string | null
  trend: 'increasing' | 'decreasing' | 'stable'
  projected_completion_date?: string
  is_on_track: boolean
}

interface UseProgressTrackingParams {
  initiative_id?: string
  area_id?: string
  objective_id?: string
  date_from?: string
  date_to?: string
  limit?: number
}

export function useProgressTracking(params: UseProgressTrackingParams = {}) {
  const [history, setHistory] = useState<ProgressEntry[]>([])
  const [statistics, setStatistics] = useState<ProgressStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { profile, session } = useAuth()

  const fetchProgressHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!profile?.tenant_id || !session?.user) {
        console.log('useProgressTracking: No tenant or session context')
        setHistory([])
        return
      }

      // Build query params
      const queryParams = new URLSearchParams({
        tenant_id: profile.tenant_id,
        limit: String(params.limit || 100)
      })

      // Add filters
      if (params.initiative_id) {
        queryParams.append('initiative_id', params.initiative_id)
      }
      if (params.area_id) {
        queryParams.append('area_id', params.area_id)
      }
      if (params.objective_id) {
        queryParams.append('objective_id', params.objective_id)
      }
      if (params.date_from) {
        queryParams.append('date_from', params.date_from)
      }
      if (params.date_to) {
        queryParams.append('date_to', params.date_to)
      }

      const response = await fetch(`/api/progress-tracking?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch progress history: ${response.status}`)
      }

      const data = await response.json()
      
      // Process history entries
      const processedHistory: ProgressEntry[] = processProgressHistory(data.history || [])
      
      setHistory(processedHistory)
      
      // Calculate statistics if we have data
      if (processedHistory.length > 0) {
        const stats = calculateProgressStatistics(processedHistory)
        setStatistics(stats)
      }
      
      console.log('useProgressTracking: Fetched', processedHistory.length, 'progress entries')
    } catch (err) {
      console.error('Error fetching progress history:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch progress history'))
      setHistory([])
      setStatistics(null)
    } finally {
      setLoading(false)
    }
  }, [profile, session, params])

  // Record new progress update
  const recordProgress = async (initiativeId: string, progress: number, notes?: string) => {
    try {
      if (!profile?.tenant_id || !session?.user) {
        throw new Error('No tenant or session context')
      }

      const requestBody = {
        initiative_id: initiativeId,
        progress_value: progress,
        changed_by: profile.id,
        change_notes: notes
      }

      const response = await fetch('/api/progress-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to record progress')
      }

      const newEntry = await response.json()
      
      // Refresh history
      await fetchProgressHistory()
      
      return newEntry
    } catch (err) {
      console.error('Error recording progress:', err)
      throw err
    }
  }

  // Get progress trend for a specific period
  const getProgressTrend = (days: number = 30): 'increasing' | 'decreasing' | 'stable' => {
    if (history.length < 2) return 'stable'
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    const recentHistory = history.filter(entry => 
      new Date(entry.changed_at) >= cutoffDate
    )
    
    if (recentHistory.length < 2) return 'stable'
    
    const firstValue = recentHistory[recentHistory.length - 1].progress_value
    const lastValue = recentHistory[0].progress_value
    const change = lastValue - firstValue
    
    if (Math.abs(change) < 5) return 'stable'
    return change > 0 ? 'increasing' : 'decreasing'
  }

  // Calculate projected completion date
  const getProjectedCompletionDate = (): Date | null => {
    if (history.length < 2 || !statistics) return null
    
    const currentProgress = statistics.current_progress
    const averageDailyChange = statistics.average_daily_change
    
    if (currentProgress >= 100 || averageDailyChange <= 0) return null
    
    const remainingProgress = 100 - currentProgress
    const daysToComplete = Math.ceil(remainingProgress / averageDailyChange)
    
    const completionDate = new Date()
    completionDate.setDate(completionDate.getDate() + daysToComplete)
    
    return completionDate
  }

  // Generate progress report
  const generateProgressReport = async (format: 'json' | 'csv' = 'json') => {
    try {
      if (!session?.user) {
        throw new Error('No session available')
      }

      const queryParams = new URLSearchParams({
        tenant_id: profile?.tenant_id || '',
        format
      })

      // Add same filters
      if (params.initiative_id) queryParams.append('initiative_id', params.initiative_id)
      if (params.area_id) queryParams.append('area_id', params.area_id)
      if (params.objective_id) queryParams.append('objective_id', params.objective_id)
      if (params.date_from) queryParams.append('date_from', params.date_from)
      if (params.date_to) queryParams.append('date_to', params.date_to)

      const response = await fetch(`/api/progress-tracking/report?${queryParams}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to generate progress report')
      }

      if (format === 'csv') {
        // Download CSV file
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `progress-report-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        return await response.json()
      }
    } catch (err) {
      console.error('Error generating progress report:', err)
      throw err
    }
  }

  // Batch update progress for multiple initiatives
  const batchUpdateProgress = async (updates: Array<{
    initiative_id: string
    progress: number
    notes?: string
  }>) => {
    try {
      if (!profile?.tenant_id || !session?.user) {
        throw new Error('No tenant or session context')
      }

      const requestBody = {
        updates: updates.map(update => ({
          ...update,
          changed_by: profile.id
        }))
      }

      const response = await fetch('/api/progress-tracking/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to batch update progress')
      }

      const results = await response.json()
      
      // Refresh history
      await fetchProgressHistory()
      
      return results
    } catch (err) {
      console.error('Error batch updating progress:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchProgressHistory()
  }, [fetchProgressHistory])

  return {
    history,
    statistics,
    loading,
    error,
    refetch: fetchProgressHistory,
    recordProgress,
    getProgressTrend,
    getProjectedCompletionDate,
    generateProgressReport,
    batchUpdateProgress
  }
}

// Helper function to process progress history
function processProgressHistory(history: any[]): ProgressEntry[] {
  if (!history || history.length === 0) return []
  
  const processed: ProgressEntry[] = []
  
  for (let i = 0; i < history.length; i++) {
    const entry = history[i]
    const prevEntry = history[i + 1]
    
    const changeDelta = prevEntry 
      ? entry.progress_value - prevEntry.progress_value 
      : 0
    
    const changePercentage = prevEntry && prevEntry.progress_value > 0
      ? ((entry.progress_value - prevEntry.progress_value) / prevEntry.progress_value) * 100
      : 0
    
    const daysSinceUpdate = i > 0
      ? Math.floor((new Date(entry.changed_at).getTime() - new Date(history[i - 1].changed_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0
    
    processed.push({
      ...entry,
      change_delta: changeDelta,
      change_percentage: changePercentage,
      days_since_update: daysSinceUpdate,
      trend: changeDelta > 5 ? 'increasing' : changeDelta < -5 ? 'decreasing' : 'stable'
    })
  }
  
  return processed
}

// Helper function to calculate progress statistics
function calculateProgressStatistics(history: ProgressEntry[]): ProgressStatistics {
  if (history.length === 0) {
    return {
      current_progress: 0,
      average_daily_change: 0,
      total_change: 0,
      days_tracked: 0,
      last_update: null,
      trend: 'stable',
      is_on_track: false
    }
  }
  
  const currentProgress = history[0].progress_value
  const firstEntry = history[history.length - 1]
  const lastEntry = history[0]
  
  const totalChange = currentProgress - firstEntry.progress_value
  const daysTracked = Math.max(1, Math.floor(
    (new Date(lastEntry.changed_at).getTime() - new Date(firstEntry.changed_at).getTime()) / (1000 * 60 * 60 * 24)
  ))
  
  const averageDailyChange = daysTracked > 0 ? totalChange / daysTracked : 0
  
  // Determine trend based on recent changes
  const recentEntries = history.slice(0, Math.min(5, history.length))
  let recentTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  
  if (recentEntries.length >= 2) {
    const recentChanges = recentEntries.slice(0, -1).map((entry, i) => 
      entry.progress_value - recentEntries[i + 1].progress_value
    )
    const avgRecentChange = recentChanges.reduce((a, b) => a + b, 0) / recentChanges.length
    
    if (avgRecentChange > 2) recentTrend = 'increasing'
    else if (avgRecentChange < -2) recentTrend = 'decreasing'
  }
  
  // Calculate if on track (assuming linear progress)
  const expectedProgress = daysTracked > 0 ? (daysTracked / 90) * 100 : 0 // Assuming 90-day quarters
  const isOnTrack = currentProgress >= expectedProgress * 0.8 // 80% of expected
  
  return {
    current_progress: currentProgress,
    average_daily_change: averageDailyChange,
    total_change: totalChange,
    days_tracked: daysTracked,
    last_update: lastEntry.changed_at,
    trend: recentTrend,
    is_on_track: isOnTrack,
    projected_completion_date: calculateProjectedCompletion(currentProgress, averageDailyChange)
  }
}

// Helper function to calculate projected completion
function calculateProjectedCompletion(currentProgress: number, avgDailyChange: number): string | undefined {
  if (currentProgress >= 100 || avgDailyChange <= 0) return undefined
  
  const remainingProgress = 100 - currentProgress
  const daysToComplete = Math.ceil(remainingProgress / avgDailyChange)
  
  const completionDate = new Date()
  completionDate.setDate(completionDate.getDate() + daysToComplete)
  
  return completionDate.toISOString().split('T')[0]
}