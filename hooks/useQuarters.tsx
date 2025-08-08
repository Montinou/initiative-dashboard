"use client"

import { useState, useEffect, useCallback } from 'react'
import type { Quarter, InitiativeQuarter } from '@/lib/types/database'
import type { QuarterPlanning } from '@/lib/types/multi-tenant'
import { useAuth } from '@/lib/auth-context'

// Extended quarter type with statistics
export interface QuarterWithStats extends Quarter {
  objectives_count: number
  initiatives_count: number
  activities_count: number
  average_progress: number
  status: 'upcoming' | 'active' | 'completed'
}

interface UseQuartersParams {
  year?: number
  include_stats?: boolean
}

export function useQuarters(params: UseQuartersParams = {}) {
  const [quarters, setQuarters] = useState<QuarterWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { profile } = useAuth()

  const fetchQuarters = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!profile?.tenant_id) {
        console.log('useQuarters: No tenant ID available')
        setQuarters([])
        return
      }

      // Build query params
      const queryParams = new URLSearchParams({
        tenant_id: profile.tenant_id
      })

      // Add year filter
      if (params.year) {
        queryParams.append('year', params.year.toString())
      }

      // Include statistics
      if (params.include_stats) {
        queryParams.append('include_stats', 'true')
      }

      const response = await fetch(`/api/quarters?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch quarters: ${response.status}`)
      }

      const data = await response.json()
      
      // Map response to include status and stats
      const quartersWithStats: QuarterWithStats[] = (data.quarters || []).map((quarter: any) => ({
        ...quarter,
        objectives_count: quarter.objectives_count || 0,
        initiatives_count: quarter.initiatives_count || 0,
        activities_count: quarter.activities_count || 0,
        average_progress: quarter.average_progress || 0,
        status: getQuarterStatus(quarter.start_date, quarter.end_date)
      }))

      setQuarters(quartersWithStats)
      console.log('useQuarters: Fetched', quartersWithStats.length, 'quarters')
    } catch (err) {
      console.error('Error fetching quarters:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch quarters'))
      setQuarters([])
    } finally {
      setLoading(false)
    }
  }, [profile, params.year, params.include_stats])

  const createQuarter = async (quarter: {
    quarter_name: InitiativeQuarter
    start_date: string
    end_date: string
  }) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available')
      }

      // Validate that quarter doesn't already exist
      const existingQuarter = quarters.find(q => 
        q.quarter_name === quarter.quarter_name && 
        new Date(q.start_date).getFullYear() === new Date(quarter.start_date).getFullYear()
      )

      if (existingQuarter) {
        throw new Error(`Quarter ${quarter.quarter_name} already exists for this year`)
      }

      const requestBody = {
        ...quarter,
        tenant_id: profile.tenant_id
      }

      const response = await fetch('/api/quarters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create quarter')
      }

      const newQuarter = await response.json()
      
      // Refresh list
      await fetchQuarters()
      
      return newQuarter
    } catch (err) {
      console.error('Error creating quarter:', err)
      throw err
    }
  }

  const updateQuarter = async (id: string, updates: {
    start_date?: string
    end_date?: string
  }) => {
    try {
      const response = await fetch(`/api/quarters/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update quarter')
      }

      const updatedQuarter = await response.json()
      
      // Update local state
      setQuarters(prev => prev.map(q => 
        q.id === id ? { 
          ...q, 
          ...updatedQuarter,
          status: getQuarterStatus(updatedQuarter.start_date, updatedQuarter.end_date)
        } : q
      ))
      
      return updatedQuarter
    } catch (err) {
      console.error('Error updating quarter:', err)
      throw err
    }
  }

  const deleteQuarter = async (id: string) => {
    try {
      // Check if quarter has linked objectives
      const quarter = quarters.find(q => q.id === id)
      if (quarter && quarter.objectives_count > 0) {
        throw new Error('Cannot delete quarter with linked objectives')
      }

      const response = await fetch(`/api/quarters/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete quarter')
      }

      // Remove from local state
      setQuarters(prev => prev.filter(q => q.id !== id))
    } catch (err) {
      console.error('Error deleting quarter:', err)
      throw err
    }
  }

  const createYearQuarters = async (year: number) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available')
      }

      // Create all 4 quarters for the year
      const quarterDefinitions: Array<{
        quarter_name: InitiativeQuarter
        start_date: string
        end_date: string
      }> = [
        {
          quarter_name: 'Q1',
          start_date: `${year}-01-01`,
          end_date: `${year}-03-31`
        },
        {
          quarter_name: 'Q2',
          start_date: `${year}-04-01`,
          end_date: `${year}-06-30`
        },
        {
          quarter_name: 'Q3',
          start_date: `${year}-07-01`,
          end_date: `${year}-09-30`
        },
        {
          quarter_name: 'Q4',
          start_date: `${year}-10-01`,
          end_date: `${year}-12-31`
        }
      ]

      const createdQuarters = []
      for (const quarterDef of quarterDefinitions) {
        try {
          const quarter = await createQuarter(quarterDef)
          createdQuarters.push(quarter)
        } catch (err) {
          console.warn(`Quarter ${quarterDef.quarter_name} may already exist:`, err)
        }
      }

      // Refresh list
      await fetchQuarters()
      
      return createdQuarters
    } catch (err) {
      console.error('Error creating year quarters:', err)
      throw err
    }
  }

  const getCurrentQuarter = (): QuarterWithStats | undefined => {
    const today = new Date()
    return quarters.find(q => {
      const start = new Date(q.start_date)
      const end = new Date(q.end_date)
      return today >= start && today <= end
    })
  }

  const getQuarterByDate = (date: Date): QuarterWithStats | undefined => {
    return quarters.find(q => {
      const start = new Date(q.start_date)
      const end = new Date(q.end_date)
      return date >= start && date <= end
    })
  }

  useEffect(() => {
    fetchQuarters()
  }, [fetchQuarters])

  return {
    quarters,
    loading,
    error,
    refetch: fetchQuarters,
    createQuarter,
    updateQuarter,
    deleteQuarter,
    createYearQuarters,
    getCurrentQuarter,
    getQuarterByDate
  }
}

// Helper function to determine quarter status
function getQuarterStatus(start_date: string, end_date: string): 'upcoming' | 'active' | 'completed' {
  const today = new Date()
  const start = new Date(start_date)
  const end = new Date(end_date)
  
  if (today < start) return 'upcoming'
  if (today > end) return 'completed'
  return 'active'
}